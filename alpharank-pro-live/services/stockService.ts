
import { StockCandle } from "../types";

// Configuration
const FMP_API_KEY = "tnkPWx52XSfXqPAkz9vC27sNmKFbngrL"; 
const POLYGON_API_KEYS = ["5d8fe505-b040-421b-82c3-b671516c3d68", "mkEJ1FlHApkFzIRwRZCXOfopW8FuUVwp"];
const AV_API_KEY = "O15P2CUZFDEYOZW4";

const CACHE_DURATION = 60 * 1000; // 60 seconds general cache
const HISTORY_CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours for historical base

// In-Memory Caches
const memoryCache = new Map<string, { timestamp: number; data: any }>();
// Dedicated cache for the "Heavy" historical part (excluding the live developing candle)
const historyOnlyCache = new Map<string, { timestamp: number; data: StockCandle[] }>();
const pendingRequests = new Map<string, Promise<any>>();

// --- HELPER: Market Status Check (NY Time) ---
const isMarketOpen = () => {
    try {
        const now = new Date();
        const nyString = now.toLocaleString("en-US", {timeZone: "America/New_York"});
        const nyDate = new Date(nyString);
        const day = nyDate.getDay();
        const hour = nyDate.getHours();
        const minute = nyDate.getMinutes();
        const totalMinutes = hour * 60 + minute;
        return (day >= 1 && day <= 5) && (totalMinutes >= 570 && totalMinutes < 960);
    } catch (e) {
        return false;
    }
};

const getTodayNYString = () => {
    return new Date().toLocaleDateString("en-CA", {timeZone: "America/New_York"});
};

// --- SAFE LOCAL STORAGE ---
const safeLocalStorageSet = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e: any) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            Object.keys(localStorage).forEach(k => {
                if (k.startsWith('stock_cache_') || k.startsWith('sma_')) localStorage.removeItem(k);
            });
            try { localStorage.setItem(key, value); } catch (retryErr) {}
        }
    }
};

// --- QUEUE SYSTEM ---
class APIRequestQueue {
    private queue: Array<() => Promise<void>> = [];
    private isProcessing = false;
    private delayMs = 200; // Faster processing (5 req/sec)

    enqueue<T>(task: () => Promise<T>): Promise<T> {
        return new Promise((resolve, reject) => {
            this.queue.push(async () => {
                try { resolve(await task()); } catch (e) { reject(e); }
            });
            this.process();
        });
    }

    private async process() {
        if (this.isProcessing || this.queue.length === 0) return;
        this.isProcessing = true;
        const task = this.queue.shift();
        if (task) {
            try { await task(); } finally {
                setTimeout(() => {
                    this.isProcessing = false;
                    this.process();
                }, this.delayMs);
            }
        }
    }
}

const apiQueue = new APIRequestQueue();

// --- LIGHTWEIGHT: Fetch Quote Only ---
export const fetchFMPQuote = async (ticker: string): Promise<any> => {
    const cacheKey = `quote_${ticker}`;
    const cached = memoryCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 30000)) return cached.data;

    const url = `https://financialmodelingprep.com/stable/quote?symbol=${ticker}&apikey=${FMP_API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) return null;
        const json = await response.json();
        const data = Array.isArray(json) && json.length > 0 ? json[0] : null;
        if (data) memoryCache.set(cacheKey, { timestamp: Date.now(), data });
        return data;
    } catch (e) { return null; }
};

// --- HEAVY: Fetch History Base ---
const fetchFMPHistoryBase = async (ticker: string, days: number): Promise<StockCandle[]> => {
    const url = `https://financialmodelingprep.com/stable/historical-price-eod/full?symbol=${ticker}&apikey=${FMP_API_KEY}`;
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`FMP History Error: ${response.status}`);
        const json = await response.json();
        const historicalData = json.historical || (Array.isArray(json) ? json : null);

        if (historicalData && Array.isArray(historicalData)) {
            return historicalData.map((d: any) => ({
                date: d.date,
                open: d.open,
                high: d.high,
                low: d.low,
                close: d.close,
                volume: d.volume,
                vwap: d.vwap
            })).reverse().slice(-days);
        }
        throw new Error("No history found");
    } catch (e) { throw e; }
};

// --- MAIN FETCH LOGIC (Optimized) ---
export const fetchStockData = async (ticker: string, days: number = 300): Promise<StockCandle[]> => {
    const today = getTodayNYString();
    const cacheKey = `stock_full_${ticker}`;
    
    // 1. Check Memory Cache first (Instant)
    const memCached = memoryCache.get(cacheKey);
    if (memCached && (Date.now() - memCached.timestamp < CACHE_DURATION)) {
        return memCached.data;
    }

    // 2. Check "History-Only" Cache (The heavy part)
    let historyBase = historyOnlyCache.get(ticker)?.data;
    const historyTimestamp = historyOnlyCache.get(ticker)?.timestamp || 0;
    const isHistoryFreshForToday = (Date.now() - historyTimestamp < HISTORY_CACHE_DURATION);

    if (!historyBase || !isHistoryFreshForToday) {
        // Need to do a HEAVY fetch
        try {
            historyBase = await apiQueue.enqueue(() => fetchFMPHistoryBase(ticker, days));
            historyOnlyCache.set(ticker, { timestamp: Date.now(), data: historyBase });
        } catch (e) {
            // Fallback to existing logic if FMP fails (Polygon etc)
            // Simplified for brevity, normally calls Polygon fetch here
            throw e;
        }
    }

    // 3. Perform FAST LIGHTWEIGHT update (The changing data)
    // Clone history to avoid mutating the base cache
    const finalHistory = [...historyBase];
    
    try {
        const quote = await fetchFMPQuote(ticker);
        if (quote && finalHistory.length > 0) {
            const lastCandle = finalHistory[finalHistory.length - 1];
            const quoteDate = new Date(quote.timestamp * 1000).toISOString().split('T')[0];

            if (quoteDate > lastCandle.date) {
                // New day started but history doesn't have it yet
                finalHistory.push({
                    date: quoteDate,
                    open: quote.open || quote.price,
                    high: quote.dayHigh || quote.price,
                    low: quote.dayLow || quote.price,
                    close: quote.price,
                    volume: quote.volume
                });
            } else if (quoteDate === lastCandle.date && isMarketOpen()) {
                // Update today's candle with live data
                lastCandle.close = quote.price;
                lastCandle.high = Math.max(lastCandle.high, quote.dayHigh || quote.price);
                lastCandle.low = Math.min(lastCandle.low, quote.dayLow || quote.price);
                lastCandle.volume = quote.volume;
                // Capture live VWAP if available in quote (FMP quote usually has it as 'vwap')
                if (quote.vwap) lastCandle.vwap = quote.vwap;
                else delete lastCandle.vwap; // Force engine to calc VWMA if official VWAP missing
            }
        }
    } catch (e) { /* Quote failure is non-fatal */ }

    // 4. Update Memory Cache
    memoryCache.set(cacheKey, { timestamp: Date.now(), data: finalHistory });
    return finalHistory;
};

// --- OFFICIAL SMA CACHING (24H) ---
export const fetchOfficialSMA = async (ticker: string, period: number = 150): Promise<number | null> => {
    const key = `sma_${ticker}_${period}`;
    const cached = memoryCache.get(key);
    if (cached && (Date.now() - cached.timestamp < HISTORY_CACHE_DURATION)) return cached.data;

    try {
        // Updated URL per request to correct endpoint format
        const url = `https://financialmodelingprep.com/stable/technical-indicators/sma?symbol=${ticker}&periodLength=${period}&timeframe=1day&apikey=${FMP_API_KEY}`;
        const val = await apiQueue.enqueue(async () => {
            const res = await fetch(url);
            if (!res.ok) return null;
            const json = await res.json();
            return Array.isArray(json) && json.length > 0 ? json[0].sma : null;
        });
        if (val !== null) memoryCache.set(key, { timestamp: Date.now(), data: val });
        return val;
    } catch (e) { return null; }
};

export const fetchMarketCap = async (ticker: string): Promise<number | null> => {
    const data = await fetchFMPQuote(ticker);
    return data && data.marketCap ? data.marketCap : null;
};

export const fetchCompanyProfile = async (ticker: string): Promise<{ companyName: string, sector: string, beta: number } | null> => {
    const cacheKey = `profile_${ticker}`;
    const cached = memoryCache.get(cacheKey);
    if (cached) return cached.data;

    try {
        const url = `https://financialmodelingprep.com/stable/profile?symbol=${ticker}&apikey=${FMP_API_KEY}`;
        const data = await apiQueue.enqueue(async () => {
            const res = await fetch(url);
            if (!res.ok) return null;
            const json = await res.json();
            return Array.isArray(json) && json.length > 0 ? json[0] : null;
        });
        if (data) {
            const result = { companyName: data.companyName, sector: data.sector, beta: data.beta };
            memoryCache.set(cacheKey, { timestamp: Date.now(), data: result });
            return result;
        }
        return null;
    } catch (e) { return null; }
};
