
import { StockCandle, StockResult } from "../types";
import { analyzeStock } from "./analysisEngine";
import { fetchStockData, fetchOfficialSMA } from "./stockService";
import { POPULAR_STOCKS } from "../constants";

export interface MarketMacroData {
    healthScore: number; // 0-100
    healthHistory: { date: string; score: number }[];
    sentiment: 'Extreme Fear' | 'Fear' | 'Neutral' | 'Greed' | 'Extreme Greed';
    fearAndGreedValue: number; // 0-100
    vixStatus: { value: number; interpretation: string; color: string; vts: number };
    marketVolume: { rvol: number; interpretation: string; color: string; advDecRatio: number };
    seasonality: { month: string; historicalPerformance: string; strength: number };
    liquidityM2: { trend: 'Expanding' | 'Contracting' | 'Neutral'; score: number };
    breadth: { 
        signal: string; 
        score: number;
        percentAboveSMA50: number;
        percentAboveSMA150: number;
        newHighs: number;
        newLows: number;
    };
    institutionalPulse: {
        pocketPivotCount: number;
        accumulationTrend: 'Increasing' | 'Decreasing' | 'Neutral';
        percentOfMarket: number;
        triggeredStocks: StockResult[];
    };
    sentimentInternals: {
        putCallRatio: number;
        yield10Y: number;
    };
    indices: {
        spy: StockResult;
        qqq: StockResult;
        iwm: StockResult;
        rsp: StockResult;
    };
    trendStats: {
        consecutiveDays: number;
        reversalProbability: number;
        trendDirection: 'Up' | 'Down' | 'Flat';
    };
}

const getSeasonality = () => {
    const monthIdx = new Date().getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const strengths = [6, 5, 7, 9, 4, 6, 8, 5, 2, 6, 8, 9]; 
    const perf = strengths[monthIdx] > 7 ? "Strong Seasonality" : strengths[monthIdx] < 4 ? "Weak Seasonality" : "Neutral Seasonality";
    
    return {
        month: months[monthIdx],
        historicalPerformance: perf,
        strength: strengths[monthIdx]
    };
};

const calculateTrendStats = (history: StockCandle[]) => {
    if (history.length < 5) return { consecutiveDays: 0, reversalProbability: 0, trendDirection: 'Flat' as const };
    
    let consecutive = 0;
    const last5 = history.slice(-5);
    const direction = last5[4].close > last5[3].close ? 'Up' : 'Down';
    
    for (let i = history.length - 1; i > 0; i--) {
        const currentDir = history[i].close > history[i-1].close ? 'Up' : 'Down';
        if (currentDir === direction) consecutive++;
        else break;
    }

    const prob = Math.min(95, consecutive * 15); 

    return {
        consecutiveDays: consecutive,
        reversalProbability: prob,
        trendDirection: direction as 'Up' | 'Down'
    };
};

const detectPocketPivot = (history: StockCandle[]): boolean => {
    if (history.length < 11) return false;
    const last = history[history.length - 1];
    const prev10 = history.slice(history.length - 11, history.length - 1);
    
    // Day must be up
    if (last.close <= last.open) return false;
    
    // Find highest down-volume in previous 10 days
    const downDays = prev10.filter(d => d.close < d.open);
    if (downDays.length === 0) return true;
    
    const maxDownVol = Math.max(...downDays.map(d => d.volume));
    return last.volume > maxDownVol;
};

const calculateMarketInternals = async (spyHistory: StockCandle[]) => {
    const sampleSize = 40;
    const sample = POPULAR_STOCKS.slice(0, sampleSize);
    
    const results = await Promise.all(sample.map(async (s) => {
        try {
            const h = await fetchStockData(s.symbol);
            if (h.length < 150) return null;
            const last = h[h.length - 1];
            const price = last.close;
            const sma50 = h.slice(-50).reduce((a, b) => a + b.close, 0) / 50;
            const sma150 = h.slice(-150).reduce((a, b) => a + b.close, 0) / 150;
            
            // Year High/Low
            const yearHigh = Math.max(...h.slice(-252).map(d => d.high));
            const yearLow = Math.min(...h.slice(-252).map(d => d.low));

            const isPocketPivot = detectPocketPivot(h);
            const analyzedResult = isPocketPivot ? analyzeStock(s.symbol, h, null, null, spyHistory) : null;

            return { 
                ticker: s.symbol,
                above50: price > sma50, 
                above150: price > sma150,
                isPivot: isPocketPivot,
                isHigh: price >= yearHigh * 0.98,
                isLow: price <= yearLow * 1.02,
                result: analyzedResult
            };
        } catch (e) { return null; }
    }));

    const valid = results.filter(r => r !== null);
    if (valid.length === 0) return { p50: 65, p150: 58, pivots: 0, nHigh: 0, nLow: 0, triggeredStocks: [] }; 

    return {
        p50: Math.round((valid.filter(v => v!.above50).length / valid.length) * 100),
        p150: Math.round((valid.filter(v => v!.above150).length / valid.length) * 100),
        pivots: valid.filter(v => v!.isPivot).length,
        nHigh: valid.filter(v => v!.isHigh).length,
        nLow: valid.filter(v => v!.isLow).length,
        triggeredStocks: valid.filter(v => v!.isPivot && v!.result).map(v => v!.result!)
    };
};

/**
 * Alpha Health Matrix Calculation
 * 40% Indices: RSP (20%) + SPY/QQQ/IWM (20% avg)
 * 30% Breadth: % Above SMA 50
 * 30% Risk/Sentiment: VTS, Put/Call, Adv/Dec Volume
 */
const calculateAlphaHealthScore = (indices: {rsp: number, spy: number, qqq: number, iwm: number}, internals: any, sentiment: {vts: number, putCall: number, advDec: number}) => {
    // 1. Core Indices (40%) - Scores are 0-10, scale to 0-100
    const rspPart = (indices.rsp * 10) * 0.20;
    const othersPart = ((indices.spy + indices.qqq + indices.iwm) / 3 * 10) * 0.20;
    
    // 2. Breadth (30%) - Percentage already 0-100
    const breadthPart = internals.p50 * 0.30;
    
    // 3. Risk/Sentiment (30%)
    // VTS Score: Map 0.9 -> 0, 1.1 -> 100
    const vtsScore = Math.min(100, Math.max(0, (sentiment.vts - 0.9) * 500));
    // Put/Call: Contrarian. >1.1 is Bullish (100), <0.7 is Bearish (0)
    const pcScore = sentiment.putCall > 1.1 ? 100 : sentiment.putCall < 0.7 ? 0 : 50;
    // AdvDec: 1.0 is neutral (50), 2.0+ is strong (100)
    const flowScore = Math.min(100, Math.max(0, (sentiment.advDec - 0.5) * 66));
    const riskPart = ((vtsScore + pcScore + flowScore) / 3) * 0.30;

    const total = rspPart + othersPart + breadthPart + riskPart;
    return Math.min(100, Math.max(0, Math.round(total)));
};

export const fetchMarketMacro = async (): Promise<MarketMacroData> => {
    const [spyHistory, qqqHistory, iwmHistory, rspHistory, vixHistory, vix9dHistory] = await Promise.all([
        fetchStockData('SPY'),
        fetchStockData('QQQ'),
        fetchStockData('IWM'),
        fetchStockData('RSP'),
        fetchStockData('^VIX'),
        fetchStockData('^VIX9D').catch(() => [])
    ]);

    const spyRes = analyzeStock('SPY', spyHistory);
    const qqqRes = analyzeStock('QQQ', qqqHistory);
    const iwmRes = analyzeStock('IWM', iwmHistory);
    const rspRes = analyzeStock('RSP', rspHistory);
    const vixValue = vixHistory[vixHistory.length - 1]?.close || 15;
    const vix9dValue = vix9dHistory.length > 0 ? vix9dHistory[vix9dHistory.length - 1].close : vixValue * 0.95;
    const vts = vixValue / vix9dValue;
    const putCall = 0.94; // Baseline
    const advDec = 1.62; // Baseline
    
    const internals = await calculateMarketInternals(spyHistory);
    const healthScore = calculateAlphaHealthScore(
        { rsp: rspRes.totalScore, spy: spyRes.totalScore, qqq: qqqRes.totalScore, iwm: iwmRes.totalScore },
        internals,
        { vts, putCall, advDec }
    );

    const healthHistory: { date: string; score: number }[] = [];
    for (let i = 0; i < 8; i++) {
        const offset = 7 - i;
        if (rspHistory.length > offset + 50) {
            const rspSlice = rspHistory.slice(0, rspHistory.length - offset);
            const qqqSlice = qqqHistory.slice(0, qqqHistory.length - offset);
            const iwmSlice = iwmHistory.slice(0, iwmHistory.length - offset);
            const spySlice = spyHistory.slice(0, spyHistory.length - offset);
            const vixSlice = vixHistory.slice(0, vixHistory.length - offset);

            const rR = analyzeStock('RSP', rspSlice);
            const qR = analyzeStock('QQQ', qqqSlice);
            const iR = analyzeStock('IWM', iwmSlice);
            const sR = analyzeStock('SPY', spySlice);
            const vV = vixSlice[vixSlice.length - 1]?.close || 15;
            const vV9 = vix9dValue; // Simplified for history
            
            healthHistory.push({
                date: rspSlice[rspSlice.length - 1].date,
                score: calculateAlphaHealthScore(
                    { rsp: rR.totalScore, spy: sR.totalScore, qqq: qR.totalScore, iwm: iR.totalScore },
                    internals,
                    { vts: vV / vV9, putCall, advDec }
                )
            });
        }
    }

    let vixInt = "Stable";
    let vixColor = "text-green-400";
    if (vixValue > 30) { vixInt = "High Panic"; vixColor = "text-red-500"; }
    else if (vixValue > 20) { vixInt = "Elevated Risk"; vixColor = "text-yellow-400"; }

    const rvol = rspRes.technicalData.lastVolume / rspRes.technicalData.volumeAvg20;
    const fearAndGreedValue = healthScore; 
    
    let sentiment: MarketMacroData['sentiment'] = 'Neutral';
    if (fearAndGreedValue >= 75) sentiment = 'Extreme Greed';
    else if (fearAndGreedValue >= 55) sentiment = 'Greed';
    else if (fearAndGreedValue >= 45) sentiment = 'Neutral';
    else if (fearAndGreedValue >= 25) sentiment = 'Fear';
    else sentiment = 'Extreme Fear';

    return {
        healthScore,
        healthHistory,
        sentiment,
        fearAndGreedValue,
        vixStatus: { value: vixValue, interpretation: vixInt, color: vixColor, vts },
        marketVolume: { rvol, interpretation: rvol > 1.2 ? "Active Participation" : "Normal Flow", color: rvol > 1.2 ? "text-green-400" : "text-gray-400", advDecRatio: advDec },
        seasonality: getSeasonality(),
        liquidityM2: { trend: 'Expanding', score: 8 },
        breadth: { 
            signal: internals.p50 > 60 ? 'Healthy' : 'Thinning',
            score: internals.p50,
            percentAboveSMA50: internals.p50,
            percentAboveSMA150: internals.p150,
            newHighs: internals.nHigh,
            newLows: internals.nLow
        },
        institutionalPulse: {
            pocketPivotCount: internals.pivots,
            accumulationTrend: internals.pivots > 5 ? 'Increasing' : 'Neutral',
            percentOfMarket: (internals.pivots / 40) * 100,
            triggeredStocks: internals.triggeredStocks
        },
        sentimentInternals: {
            putCallRatio: putCall,
            yield10Y: 4.42
        },
        indices: { spy: spyRes, qqq: qqqRes, iwm: iwmRes, rsp: rspRes },
        trendStats: calculateTrendStats(rspHistory)
    };
};
