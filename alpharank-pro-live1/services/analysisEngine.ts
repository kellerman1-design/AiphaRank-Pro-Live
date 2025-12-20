
import { StockCandle, TechnicalAnalysis, IndicatorScore, StockResult, Recommendation, RiskAnalysis, BollingerBands, KeltnerChannels, ScoreHistoryItem, PatternPoint, TradeAdvice, Position, BacktestResult, BacktestTrade } from '../types';

// --- Helper Math Functions ---

// Standard Simple Moving Average
const calculateSMA = (data: StockCandle[], period: number): number => {
  if (data.length < period) return 0;
  const slice = data.slice(data.length - period);
  const sum = slice.reduce((acc, val) => acc + val.close, 0);
  return sum / period;
};

// Volume Weighted Moving Average (VWMA) - Acts as VWAP proxy for daily charts
const calculateVWMA = (data: StockCandle[], period: number): number => {
    if (data.length < period) return 0;
    const slice = data.slice(data.length - period);
    
    let sumPriceVol = 0;
    let sumVol = 0;

    for (const candle of slice) {
        sumPriceVol += (candle.close * candle.volume);
        sumVol += candle.volume;
    }

    return sumVol === 0 ? 0 : sumPriceVol / sumVol;
};

// Exponential Moving Average
const calculateEMA = (data: StockCandle[], period: number): number[] => {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  
  // Initialize with SMA for the first point
  let ema = data[0].close; 
  emaArray.push(ema);

  for (let i = 1; i < data.length; i++) {
    ema = (data[i].close * k) + (ema * (1 - k));
    emaArray.push(ema);
  }
  return emaArray;
};

const getLatestEMA = (data: StockCandle[], period: number): number => {
    const arr = calculateEMA(data, period);
    return arr[arr.length - 1];
};

// Standard Deviation
const calculateStandardDeviation = (data: StockCandle[], period: number, mean: number): number => {
  if (data.length < period) return 0;
  const slice = data.slice(data.length - period);
  const variance = slice.reduce((acc, val) => acc + Math.pow(val.close - mean, 2), 0) / period;
  return Math.sqrt(variance);
};

// Wilder's Smoothing Method (Critical for accurate RSI and ADX)
const calculateWildersSmoothing = (values: number[], period: number): number => {
    if (values.length < period) return 0;
    
    // First value is simple SMA
    let smoothed = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
    
    // Subsequent values: Previous * (period-1) + Current / period
    for (let i = period; i < values.length; i++) {
        smoothed = ((smoothed * (period - 1)) + values[i]) / period;
    }
    return smoothed;
};

// --- Aggregate Data for Multi-Timeframe ---
const aggregateToWeekly = (dailyData: StockCandle[]): StockCandle[] => {
    const weeklyCandles: StockCandle[] = [];
    if (dailyData.length === 0) return [];

    let currentWeekStart: Date | null = null;
    let open = 0, high = 0, low = Infinity, volume = 0;
    
    dailyData.forEach((candle, index) => {
        const date = new Date(candle.date);
        
        const day = date.getDay(); // 0-6
        const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is sunday
        const monday = new Date(date.setDate(diff));
        monday.setHours(0,0,0,0);

        if (!currentWeekStart || monday.getTime() !== currentWeekStart.getTime()) {
            if (currentWeekStart) {
                // Push previous week
                weeklyCandles.push({
                    date: currentWeekStart.toISOString().split('T')[0],
                    open,
                    high,
                    low,
                    close: dailyData[index - 1].close,
                    volume
                });
            }
            // Start new week
            currentWeekStart = monday;
            open = candle.open;
            high = Math.max(high, candle.high);
            low = Math.min(low, candle.low);
            volume = candle.volume;
        } else {
            // Update current week
            high = Math.max(high, candle.high);
            low = Math.min(low, candle.low);
            volume += candle.volume;
        }

        // Push last week
        if (index === dailyData.length - 1 && currentWeekStart) {
             weeklyCandles.push({
                date: currentWeekStart.toISOString().split('T')[0],
                open,
                high,
                low,
                close: candle.close,
                volume
            });
        }
    });

    return weeklyCandles;
};

// --- Accurate Indicators ---

// Calculates RSI Array for the entire dataset to enable Divergence detection
const calculateRSIHistory = (data: StockCandle[], period: number = 14): number[] => {
    if (data.length <= period) return new Array(data.length).fill(50);

    const rsiArray: number[] = [];
    let avgGain = 0;
    let avgLoss = 0;

    // First RSI calculation
    for (let i = 1; i <= period; i++) {
        const diff = data[i].close - data[i - 1].close;
        if (diff > 0) avgGain += diff;
        else avgLoss += Math.abs(diff);
    }
    avgGain /= period;
    avgLoss /= period;

    // Fill initial undefined periods with 50
    for(let i=0; i<=period; i++) rsiArray.push(50);

    // Calculate subsequent RSI values using Wilder's smoothing
    for (let i = period + 1; i < data.length; i++) {
        const diff = data[i].close - data[i - 1].close;
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? Math.abs(diff) : 0;

        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;

        if (avgLoss === 0) {
            rsiArray.push(100);
        } else {
            const rs = avgGain / avgLoss;
            rsiArray.push(100 - (100 / (1 + rs)));
        }
    }
    return rsiArray;
};

// Simple wrapper for legacy calls requesting single value
const calculateRSI = (data: StockCandle[], period: number = 14): number => {
    const history = calculateRSIHistory(data, period);
    return history[history.length - 1];
};

const calculateMACD = (data: StockCandle[]): { macdLine: number, signalLine: number, histogram: number } => {
  if (data.length < 26) return { macdLine: 0, signalLine: 0, histogram: 0 };

  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);

  const macdLineHistory: number[] = [];
  for(let i = 0; i < data.length; i++) {
     macdLineHistory.push(ema12[i] - ema26[i]);
  }

  // Signal line is EMA 9 of MACD Line
  const k9 = 2 / (9 + 1);
  let signal = macdLineHistory[0]; 
  const signalHistory: number[] = [];

  for (let i = 0; i < macdLineHistory.length; i++) {
      if (i === 0) {
          signal = macdLineHistory[0];
      } else {
          signal = (macdLineHistory[i] * k9) + (signal * (1 - k9));
      }
      signalHistory.push(signal);
  }

  const currentMACD = macdLineHistory[macdLineHistory.length - 1];
  const currentSignal = signalHistory[signalHistory.length - 1];

  return {
    macdLine: currentMACD,
    signalLine: currentSignal,
    histogram: currentMACD - currentSignal
  };
};

const calculateATR = (data: StockCandle[], period: number = 14): number => {
  if (data.length < period + 1) return 0;
  
  const trs: number[] = [];
  for(let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i-1].close;
    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trs.push(tr);
  }
  
  // Use Wilder's for ATR
  return calculateWildersSmoothing(trs, period);
};

const calculateBollingerBands = (data: StockCandle[], period: number = 20, stdDevMultiplier: number = 2): BollingerBands => {
  const sma = calculateSMA(data, period);
  const stdDev = calculateStandardDeviation(data, period, sma);
  
  return {
    upper: sma + (stdDev * stdDevMultiplier),
    middle: sma,
    lower: sma - (stdDev * stdDevMultiplier)
  };
};

// NEW: Keltner Channels for Squeeze Detection
const calculateKeltnerChannels = (data: StockCandle[], atr: number, period: number = 20, multiplier: number = 1.5): KeltnerChannels => {
    const ema20 = getLatestEMA(data, period);
    return {
        upper: ema20 + (multiplier * atr),
        middle: ema20,
        lower: ema20 - (multiplier * atr)
    };
};

const calculateADX = (data: StockCandle[], period: number = 14): { adx: number, pdi: number, ndi: number } => {
  if (data.length < period * 2) return { adx: 20, pdi: 20, ndi: 20 };

  const trs: number[] = [];
  const plusDMs: number[] = [];
  const minusDMs: number[] = [];

  for (let i = 1; i < data.length; i++) {
    const curr = data[i];
    const prev = data[i-1];
    
    const tr = Math.max(curr.high - curr.low, Math.abs(curr.high - prev.close), Math.abs(curr.low - prev.close));
    const upMove = curr.high - prev.high;
    const downMove = prev.low - curr.low;
    
    let plusDM = 0;
    let minusDM = 0;

    if (upMove > downMove && upMove > 0) {
        plusDM = upMove;
    }
    if (downMove > upMove && downMove > 0) {
        minusDM = downMove;
    }

    trs.push(tr);
    plusDMs.push(plusDM);
    minusDMs.push(minusDM);
  }

  const smoothedTR = calculateWildersSmoothing(trs, period);
  const smoothedPlusDM = calculateWildersSmoothing(plusDMs, period);
  const smoothedMinusDM = calculateWildersSmoothing(minusDMs, period);

  const pdi = (smoothedPlusDM / smoothedTR) * 100;
  const ndi = (smoothedMinusDM / smoothedTR) * 100;
  
  const dxVal = Math.abs(pdi - ndi) / (pdi + ndi) * 100;
  
  return { adx: dxVal, pdi, ndi }; 
};

const calculateParabolicSAR = (data: StockCandle[], accelerationFactor: number = 0.02, maxAcceleration: number = 0.2): number => {
  if (data.length < 2) return data[data.length-1].close;

  let isRising = true;
  let sar = data[0].low;
  let ep = data[0].high; 
  let af = accelerationFactor;

  for (let i = 1; i < data.length; i++) {
    const prevSar = sar;
    sar = prevSar + af * (ep - prevSar);

    if (isRising) {
      if (data[i].high > ep) {
        ep = data[i].high;
        af = Math.min(af + accelerationFactor, maxAcceleration);
      }
      if (data[i].low < sar) {
        isRising = false;
        sar = ep;
        ep = data[i].low;
        af = accelerationFactor;
      }
    } else {
      if (data[i].low < ep) {
        ep = data[i].low;
        af = Math.min(af + accelerationFactor, maxAcceleration);
      }
      if (data[i].high > sar) {
        isRising = true;
        sar = ep;
        ep = data[i].high;
        af = accelerationFactor;
      }
    }
  }
  return sar;
};

// --- Advanced Pattern Recognition 2.0 (Strict & Robust) ---

// Helper: Identify Highs and Lows (Pivots) with noise filtering
const findSignificantPivots = (data: StockCandle[], lookback: number = 10): { highs: {index: number, price: number}[], lows: {index: number, price: number}[] } => {
    const highs = [];
    const lows = [];
    
    // Require a pivot to be the highest/lowest in +/- lookback period
    for (let i = lookback; i < data.length - lookback; i++) {
        const currentHigh = data[i].high;
        const currentLow = data[i].low;
        
        let isLocalHigh = true;
        let isLocalLow = true;

        for (let j = 1; j <= lookback; j++) {
            if (data[i-j].high >= currentHigh || data[i+j].high >= currentHigh) isLocalHigh = false;
            if (data[i-j].low <= currentLow || data[i+j].low <= currentLow) isLocalLow = false;
        }

        if (isLocalHigh) highs.push({index: i, price: currentHigh});
        if (isLocalLow) lows.push({index: i, price: currentLow});
    }
    return { highs, lows };
};

const generateCupCurve = (startIdx: number, endIdx: number, bottomIdx: number, startPrice: number, endPrice: number, bottomPrice: number, history: StockCandle[]): PatternPoint[] => {
    const points: PatternPoint[] = [];
    
    // Left Side (Rim to Bottom)
    const leftWidth = bottomIdx - startIdx;
    if (leftWidth > 0) {
        for (let i = startIdx; i <= bottomIdx; i++) {
            const progress = (i - startIdx) / leftWidth; // 0 to 1
            const factor = Math.cos(progress * (Math.PI / 2)); // 1 -> 0
            const easedFactor = Math.pow(factor, 2.5); 
            const price = bottomPrice + (startPrice - bottomPrice) * easedFactor;
            points.push({ date: history[i].date, price: price, label: i === startIdx ? 'L. Rim' : undefined });
        }
    }

    // Right Side (Bottom to Rim)
    const rightWidth = endIdx - bottomIdx;
    if (rightWidth > 0) {
        for (let i = bottomIdx + 1; i <= endIdx; i++) {
            const progress = (i - bottomIdx) / rightWidth; // 0 to 1
            const factor = Math.sin(progress * (Math.PI / 2)); // 0 -> 1
            const easedFactor = Math.pow(factor, 2.5);
            const price = bottomPrice + (endPrice - bottomPrice) * easedFactor;
            points.push({ date: history[i].date, price: price, label: i === bottomIdx + 1 ? 'Bottom' : (i === endIdx ? 'R. Rim' : undefined) });
        }
    }

    return points;
};

const detectChartPatterns = (history: StockCandle[], currentPrice: number) => {
    const len = history.length;
    // Need at least 150 days of data for reliable Elliot/Cup detection
    if (len < 150) return { isCupHandle: false, isElliott: false, isDoubleBottom: false, isInvHeadShoulders: false, overlay: undefined };
    
    // Use a variable lookback to find major structural points, not just noise
    const pivots = findSignificantPivots(history, 8); 
    
    // --- 1. Cup & Handle (Strict O'Neil Rules) ---
    // Rule 1: Cup Duration min 7 weeks (35 trading days)
    // Rule 2: Cup Depth max 50% (ideally 12-33%)
    // Rule 3: Handle formation in upper half
    // Rule 4: Handle drift is mild or flat
    
    const recentHighs = pivots.highs.filter(p => p.index > len - 60); // Highs in last 3 months
    // Sort by Price Descending to find the "Right Rim" candidate
    const rightRimCandidates = recentHighs.sort((a,b) => b.price - a.price);
    
    let bestCup: any = null;

    for (const rightRim of rightRimCandidates) {
        // Find Left Rim: Must be older than 35 days (approx 7 weeks) from Right Rim
        // And Left Rim price should be close to Right Rim (within 20%)
        const leftRimCandidates = pivots.highs.filter(p => 
            p.index < rightRim.index - 35 && 
            p.index > len - 300 &&
            Math.abs(p.price - rightRim.price) / rightRim.price < 0.20
        );

        for (const leftRim of leftRimCandidates) {
            // Find Bottom between rims
            const lowsBetween = pivots.lows.filter(p => p.index > leftRim.index && p.index < rightRim.index);
            const bottom = lowsBetween.sort((a,b) => a.price - b.price)[0];
            
            if (bottom) {
                // Check Depth
                const cupDepth = (rightRim.price - bottom.price) / rightRim.price;
                const isValidDepth = cupDepth >= 0.10 && cupDepth <= 0.50; // 10% to 50% correction
                
                // Check Handle (Price action AFTER Right Rim)
                // The current price is part of the handle or breakout.
                // Handle Low should not drop below the upper half of the cup (Fib 0.5)
                const midpointPrice = bottom.price + (rightRim.price - bottom.price) * 0.5;
                const handleLows = history.slice(rightRim.index).map(c => c.low);
                const lowestHandlePoint = Math.min(...handleLows);
                
                const isHandleValid = lowestHandlePoint > midpointPrice;
                
                // Handle Length: Must be at least 5 days from Right Rim to now
                const handleDuration = len - rightRim.index;
                const isHandleDurationValid = handleDuration >= 5;

                if (isValidDepth && isHandleValid && isHandleDurationValid) {
                    // Valid Cup found
                    bestCup = { leftRim, rightRim, bottom, cupDepth };
                    break; 
                }
            }
        }
        if (bestCup) break;
    }

    if (bestCup) {
        const { leftRim, rightRim, bottom } = bestCup;
        const cupOverlay = generateCupCurve(leftRim.index, rightRim.index, bottom.index, leftRim.price, rightRim.price, bottom.price, history);
        
        // Handle Overlay: Trendline from Right Rim to Current Price
        // If breakout, this line will slope up. If consolidating, it slopes down/flat.
        const handleOverlay: PatternPoint[] = [
            { date: history[rightRim.index].date, price: rightRim.price, label: 'Handle Start' },
            { date: history[len-1].date, price: Math.max(currentPrice, history[len-1].high), label: 'Current' }
        ];

        return { 
            isCupHandle: true, isElliott: false, isDoubleBottom: false, isInvHeadShoulders: false, 
            overlay: [...cupOverlay, ...handleOverlay] 
        };
    }

    // --- 2. Elliott Wave Impulse (1-2-3-4-5) ---
    // Strict Rules:
    // 1. Wave 2 cannot retrace more than 100% of Wave 1 (Start < L2)
    // 2. Wave 3 cannot be the shortest of 1, 3, 5
    // 3. Wave 4 cannot overlap Wave 1 (L4 > H1) -- Note: In diagonals it can, but we look for Impulse here.
    
    // Identify potential L4 (recent low)
    const lows = pivots.lows.sort((a,b) => b.index - a.index); // Newest first
    const highs = pivots.highs.sort((a,b) => b.index - a.index); 

    // We iterate to find a fitting 5-point structure
    // Structure: Start(L) -> H1 -> L2 -> H3 -> L4 -> (Current Price is developing H5)
    
    // Look for L4 in the last 60 days
    const candidateL4s = lows.filter(l => l.index > len - 60);

    for (const L4 of candidateL4s) {
        // Look for H3 (Higher than L4, occurred before L4)
        const candidateH3s = highs.filter(h => h.index < L4.index && h.price > L4.price);
        
        for (const H3 of candidateH3s) {
            // Look for L2 (Lower than H3, before H3)
            const candidateL2s = lows.filter(l => l.index < H3.index && l.price < H3.price);
            
            for (const L2 of candidateL2s) {
                // Look for H1 (Lower than H3 usually, before L2)
                const candidateH1s = highs.filter(h => h.index < L2.index && h.index > L2.index - 100);
                
                for (const H1 of candidateH1s) {
                    // Look for Start (Lower than H1, before H1)
                    const candidateStarts = lows.filter(l => l.index < H1.index);
                    
                    for (const Start of candidateStarts) {
                        // --- VALIDATION OF RULES ---
                        
                        // Rule 1: Wave 2 does not retrace 100% of Wave 1
                        if (L2.price <= Start.price) continue;

                        // Rule 2: Wave 4 does not enter price territory of Wave 1 (Strict Impulse)
                        if (L4.price <= H1.price) continue;

                        // Calculate Wave Lengths (Price change)
                        const wave1Len = H1.price - Start.price;
                        const wave3Len = H3.price - L2.price;
                        // Wave 5 is currently developing from L4 to Current Price
                        const wave5Len = currentPrice - L4.price;

                        // Rule 3: Wave 3 is not the shortest
                        const minWave = Math.min(wave1Len, wave3Len, wave5Len);
                        if (minWave === wave3Len) continue; // Invalid if W3 is shortest

                        // Guideline: Wave 2 Retracement (Usually 0.382 - 0.786)
                        const w2Retrace = (H1.price - L2.price) / wave1Len;
                        if (w2Retrace < 0.2 || w2Retrace > 0.9) continue; // Looser bounds for flexibility

                        // If all pass, we have a valid count
                        // VISUAL FIX: Use 'close' prices for overlay to match the Area chart and avoid "floating" points
                        const waveOverlay: PatternPoint[] = [
                            { date: history[Start.index].date, price: history[Start.index].close, label: '0' },
                            { date: history[H1.index].date, price: history[H1.index].close, label: '1' },
                            { date: history[L2.index].date, price: history[L2.index].close, label: '2' },
                            { date: history[H3.index].date, price: history[H3.index].close, label: '3' },
                            { date: history[L4.index].date, price: history[L4.index].close, label: '4' },
                            { date: history[len-1].date, price: currentPrice, label: '5?' }
                        ];

                        return { 
                            isCupHandle: false, isElliott: true, isDoubleBottom: false, isInvHeadShoulders: false, 
                            overlay: waveOverlay 
                        };
                    }
                }
            }
        }
    }

    // --- 3. Double Bottom ("W" Pattern) ---
    // High -> Low1 -> MidHigh -> Low2 -> Breakout
    // Low2 should be within 3% of Low1.
    const recentLows = pivots.lows.filter(p => p.index > len - 60);
    if (recentLows.length >= 2) {
        const sortedLows = recentLows.sort((a,b) => b.index - a.index); // Newest first
        const low2 = sortedLows[0]; // Most recent low
        const low1 = sortedLows.find(l => l.index < low2.index - 10); // Previous low at least 10 days ago

        if (low1) {
            // Price Match: Lows within 4% of each other
            const priceMatch = Math.abs(low1.price - low2.price) / low1.price < 0.04;
            
            // Peak between lows
            const peaksBetween = pivots.highs.filter(h => h.index > low1.index && h.index < low2.index);
            const midPeak = peaksBetween.sort((a,b) => b.price - a.price)[0];

            if (priceMatch && midPeak) {
                // Depth check: Peak must be at least 5% above lows
                const depth = (midPeak.price - low1.price) / low1.price;
                if (depth > 0.05) {
                    // VISUAL FIX: Use 'close' for overlay
                    const wPattern: PatternPoint[] = [
                        { date: history[low1.index].date, price: history[low1.index].close, label: 'Btm 1' },
                        { date: history[midPeak.index].date, price: history[midPeak.index].close, label: 'Peak' },
                        { date: history[low2.index].date, price: history[low2.index].close, label: 'Btm 2' },
                        { date: history[len-1].date, price: currentPrice, label: 'Breakout' }
                    ];
                    return { isCupHandle: false, isElliott: false, isDoubleBottom: true, isInvHeadShoulders: false, overlay: wPattern };
                }
            }
        }
    }

    // --- 4. Inverse Head & Shoulders ---
    // Left Shoulder (Low) -> Head (Lower Low) -> Right Shoulder (Higher Low)
    const lowsByDate = pivots.lows.sort((a,b) => b.index - a.index); // Newest first
    if (lowsByDate.length >= 3) {
        const rs = lowsByDate[0]; // Right Shoulder (Recent)
        const head = lowsByDate[1]; // Head
        const ls = lowsByDate[2]; // Left Shoulder

        // Logic: Head must be lower than shoulders. Shoulders roughly equal.
        const isHeadLowest = head.price < rs.price && head.price < ls.price;
        const shouldersMatch = Math.abs(rs.price - ls.price) / ls.price < 0.08; // 8% tolerance
        const symmetry = (rs.index - head.index) > 10 && (head.index - ls.index) > 10; 

        if (isHeadLowest && shouldersMatch && symmetry) {
             // VISUAL FIX: Use 'close' for overlay
             const hnsOverlay: PatternPoint[] = [
                { date: history[ls.index].date, price: history[ls.index].close, label: 'L. Shldr' },
                { date: history[head.index].date, price: history[head.index].close, label: 'Head' },
                { date: history[rs.index].date, price: history[rs.index].close, label: 'R. Shldr' },
                { date: history[len-1].date, price: currentPrice }
             ];
             return { isCupHandle: false, isElliott: false, isDoubleBottom: false, isInvHeadShoulders: true, overlay: hnsOverlay };
        }
    }

    return { isCupHandle: false, isElliott: false, isDoubleBottom: false, isInvHeadShoulders: false, overlay: undefined };
};

// --- RSI Divergence Detection ---
const detectRSIDivergence = (history: StockCandle[], rsiValues: number[]): 'BULLISH' | 'BEARISH' | null => {
    // Need at least 30 candles for meaningful pivot comparison
    if (history.length < 30) return null;

    // Use a smaller window to find local pivots for divergence (e.g., 3-5 days)
    const window = 3;
    const len = history.length;
    const lows: {index: number, price: number, rsi: number}[] = [];
    const highs: {index: number, price: number, rsi: number}[] = [];

    // Identify pivots in the last 40 bars only (for relevance)
    const startScan = Math.max(window, len - 40);

    for (let i = startScan; i < len - window; i++) {
        const price = history[i].low; // For lows
        const rsi = rsiValues[i];
        
        // Check Low Pivot
        let isLow = true;
        for(let j=1; j<=window; j++) {
            if (history[i-j].low < price || history[i+j].low < price) isLow = false;
        }
        if (isLow) lows.push({index: i, price, rsi});

        // Check High Pivot
        const priceHigh = history[i].high;
        let isHigh = true;
        for(let j=1; j<=window; j++) {
            if (history[i-j].high > priceHigh || history[i+j].high > priceHigh) isHigh = false;
        }
        if (isHigh) highs.push({index: i, price: priceHigh, rsi});
    }

    // Check Bullish Divergence (Price Lower Low, RSI Higher Low)
    if (lows.length >= 2) {
        const lastLow = lows[lows.length - 1];
        const prevLow = lows[lows.length - 2];
        
        // Ensure the last pivot is relatively recent (within last 15 days)
        if (len - lastLow.index <= 15) {
            if (lastLow.price < prevLow.price && lastLow.rsi > prevLow.rsi) {
                // Additional filter: RSI should be somewhat oversold/recovering (e.g. < 50)
                if (lastLow.rsi < 50) return 'BULLISH';
            }
        }
    }

    // Check Bearish Divergence (Price Higher High, RSI Lower High)
    if (highs.length >= 2) {
        const lastHigh = highs[highs.length - 1];
        const prevHigh = highs[highs.length - 2];

        if (len - lastHigh.index <= 15) {
            if (lastHigh.price > prevHigh.price && lastHigh.rsi < prevHigh.rsi) {
                // Additional filter: RSI should be somewhat overbought/falling (e.g. > 50)
                if (lastHigh.rsi > 50) return 'BEARISH';
            }
        }
    }

    return null;
};

// --- NEW: Relative Strength Calculation with Date Matching ---
const calculateRelativeStrength = (stockHistory: StockCandle[], spyHistory: StockCandle[] | null): number => {
    // If no SPY data or insufficient history, neutral 1.0
    if (!spyHistory || spyHistory.length < 50 || stockHistory.length < 50) return 1.0;

    const currentStock = stockHistory[stockHistory.length - 1];
    const currentDateStr = currentStock.date;

    // Find index in SPY that matches currentStock date
    // Since arrays are typically sorted ascending, we search from end
    let spyCurrentIdx = -1;
    for (let i = spyHistory.length - 1; i >= 0; i--) {
        if (spyHistory[i].date <= currentDateStr) {
            spyCurrentIdx = i;
            break;
        }
    }

    if (spyCurrentIdx === -1) return 1.0; // Date mismatch or SPY data ends before stock data starts

    // RS Period: ~6 months (126 trading days)
    const rsPeriod = 126;
    
    // Check if we have enough history in stock
    if (stockHistory.length <= rsPeriod) return 1.0;

    // Old Stock Point
    const stockOldIdx = stockHistory.length - 1 - rsPeriod;
    const stockOld = stockHistory[stockOldIdx];
    const oldDateStr = stockOld.date;

    // Old SPY Point: Match date
    let spyOldIdx = -1;
    // Simple linear back scan from current SPY index
    for (let i = spyCurrentIdx - 1; i >= 0; i--) {
        if (spyHistory[i].date <= oldDateStr) {
            spyOldIdx = i;
            break;
        }
    }

    // If we can't find exact old date, assume it's roughly the index difference
    // This handles cases where SPY might miss a day that the Stock has
    if (spyOldIdx === -1) {
        spyOldIdx = Math.max(0, spyCurrentIdx - rsPeriod);
    }

    const stockPriceCurrent = currentStock.close;
    const stockPriceOld = stockOld.close;
    const spyPriceCurrent = spyHistory[spyCurrentIdx].close;
    const spyPriceOld = spyHistory[spyOldIdx].close;

    if (stockPriceOld === 0 || spyPriceOld === 0) return 1.0;

    const stockPerf = (stockPriceCurrent - stockPriceOld) / stockPriceOld;
    const spyPerf = (spyPriceCurrent - spyPriceOld) / spyPriceOld;

    // RS Ratio: (1 + Stock%) / (1 + Spy%)
    return (1 + stockPerf) / (1 + spyPerf);
};


// --- Scoring Logic ---

const getScore_Volume = (lastVol: number, avgVol: number): number => {
  const ratio = lastVol / avgVol;
  if (ratio >= 2.0) return 10;
  if (ratio >= 1.5) return 8;
  if (ratio >= 1.0) return 6;
  if (ratio >= 0.5) return 4;
  return 1;
};

const getScore_SMA150 = (price: number, sma: number): number => {
  if (sma === 0) return 5;
  const diffPercent = ((price - sma) / sma) * 100;
  if (diffPercent >= 10) return 10;
  if (diffPercent > 0) return 7;
  if (diffPercent > -10) return 4;
  return 1;
};

const getScore_VWMA = (price: number, vwma: number): number => {
    if (vwma === 0) return 5;
    return price > vwma ? 10 : 3;
}

const getScore_RSI = (rsi: number): number => {
  if (rsi >= 70) return 10; // Strong momentum
  if (rsi >= 60) return 8;
  if (rsi >= 50) return 6;
  if (rsi >= 40) return 4;
  return 1;
};

const getScore_MACD = (macd: number, signal: number): number => {
  if (macd > signal && macd > 0) return 10;
  if (macd > signal && macd <= 0) return 7;
  if (macd < signal && macd > 0) return 4;
  return 1;
};

const getScore_ADX = (adxObj: { adx: number, pdi: number, ndi: number }): number => {
  if (adxObj.adx > 25 && adxObj.pdi > adxObj.ndi) return 10;
  if (adxObj.pdi > adxObj.ndi) return 7;
  if (adxObj.adx > 25 && adxObj.pdi < adxObj.ndi) return 2;
  return 5; 
};

const getScore_Bollinger = (price: number, bands: BollingerBands): number => {
  if (price > bands.upper) return 10;
  if (price > bands.middle + (bands.upper - bands.middle)/2) return 8;
  if (price > bands.middle) return 6;
  return 3;
};

const getScore_SAR = (price: number, sar: number): number => {
  return price > sar ? 10 : 1;
};

const getScore_RS = (rs: number): number => {
    if (rs > 1.2) return 10; // Beating market by 20%+
    if (rs > 1.05) return 8; // Beating market
    if (rs > 0.95) return 5; // Performing with market
    return 2; // Underperforming
};

// --- Risk Management Logic ---

const calculateRiskManagement = (
    currentPrice: number, 
    atr: number, 
    sar: number, 
    resistance: number, 
    fibLevel: number | null,
    bollinger: BollingerBands,
    totalScore: number
): RiskAnalysis => {
  
  // 1. Determine Recommended Entry Price FIRST
  let entryPrice = currentPrice;
  let entrySource = "Current Price";

  if (totalScore >= 8) {
      if (currentPrice > bollinger.upper) {
          entryPrice = bollinger.upper;
          entrySource = "Breakout Retest";
      } else if (currentPrice > bollinger.middle * 1.02) {
          entryPrice = bollinger.middle;
          entrySource = "Pullback to SMA 20";
      } else {
          entryPrice = currentPrice;
          entrySource = "Momentum Entry";
      }
  } else if (totalScore >= 6) {
      entryPrice = Math.max(bollinger.lower, currentPrice - atr);
      entrySource = "Deep Pullback / Supp";
  }

  // 2. Stop Loss Strategy
  let volatilityStop = entryPrice - (2 * atr);
  let stopLoss = volatilityStop;
  let slSource = "Volatility (2x ATR)";
  
  if (sar < entryPrice) {
      if (sar > volatilityStop && (entryPrice - sar) > (0.5 * atr)) {
          stopLoss = sar;
          slSource = "Parabolic SAR (Trend)";
      }
  }

  if (stopLoss <= 0) stopLoss = entryPrice * 0.90;

  const riskPerShare = entryPrice - stopLoss;
  
  // 3. Take Profit Strategy
  // Ensure TP reflects risk, but check resistance first
  let tp1 = entryPrice + (riskPerShare * 1.5);
  let tp2 = entryPrice + (riskPerShare * 3.0);
  let tpSource = "3.0x Risk Target";

  if (resistance > entryPrice) {
      // If resistance is very close, it caps the trade
      const distToRes = resistance - entryPrice;
      if (distToRes < riskPerShare * 1.0) {
          // Resistance is close, trade is risky
          tp2 = resistance; 
          tpSource = "Cap at Resistance";
      } else if (distToRes >= riskPerShare * 2.0 && resistance < tp2) {
          // Resistance is a good target
          tp2 = resistance;
          tpSource = "Key Resistance Level";
      }
  }
  
  const takeProfit = tp2;
  const riskRewardRatio = riskPerShare > 0 ? (takeProfit - entryPrice) / riskPerShare : 0;
  
  // 4. Generate Thesis (Fix: Prioritize Score over simple Math)
  let thesis = "";

  if (totalScore < 4.5) {
      thesis = "Bearish technicals. Momentum is negative. Wait for confirmed reversal.";
  }
  else if (totalScore < 6.5) {
      thesis = "Neutral/Choppy. No clear edge currently. Wait for breakout above resistance.";
  }
  else {
      // High Score -> Now check R/R
      if (riskRewardRatio >= 2.5) {
           thesis = `Prime Setup (Score ${totalScore}). Excellent R/R (> 1:2.5). Look for entry near $${entryPrice.toFixed(2)}.`;
      } else if (riskRewardRatio >= 1.5) {
           thesis = `Solid Setup. Good momentum, but upside may be capped by resistance.`;
      } else {
           thesis = `Extended. Price is high relative to stop. Wait for pullback to improve R/R.`;
      }
  }

  return {
    stopLoss: Number(stopLoss.toFixed(2)),
    takeProfit: Number(takeProfit.toFixed(2)),
    entryPrice: Number(entryPrice.toFixed(2)),
    entrySource,
    riskRewardRatio: Number(riskRewardRatio.toFixed(2)),
    thesis,
    slSource,
    tpSource,
    targets: [
      { price: Number(tp1.toFixed(2)), ratio: 1.5, label: "TP1 (Conservative)" },
      { price: Number(tp2.toFixed(2)), ratio: riskRewardRatio, label: "TP2 (Aggressive)" }
    ]
  };
};

// --- Trade Advisor Logic ---
export const generateTradeAdvice = (stock: StockResult, position: Position): TradeAdvice => {
    const { currentPrice, totalScore, riskAnalysis, technicalData } = stock;
    const { avgEntryPrice } = position;
    const pnlPercent = avgEntryPrice > 0 ? ((currentPrice - avgEntryPrice) / avgEntryPrice) * 100 : 0;
    
    let suggestedStop = riskAnalysis.stopLoss; 
    
    if (pnlPercent > 5) {
        suggestedStop = Math.max(suggestedStop, avgEntryPrice);
    }
    if (pnlPercent > 10) {
        suggestedStop = Math.max(suggestedStop, technicalData.bollinger.middle); 
    }

    let action: TradeAdvice['action'] = 'HOLD';
    let reason = "";

    if (totalScore < 4) {
        action = 'SELL / TRIM';
        reason = `Technical score dropped to ${totalScore}. Momentum has reversed significantly. Protect capital.`;
        if (pnlPercent < -5) {
             action = 'CUT LOSS';
             reason = `Thesis failed (Score ${totalScore}). Price is down ${pnlPercent.toFixed(1)}%. Recommend exit to prevent further drawdown.`;
        }
    } 
    else if (totalScore >= 8) {
        if (pnlPercent > 15) {
            action = 'TAKE PROFIT';
            reason = `Excellent run (+${pnlPercent.toFixed(1)}%). Consider scaling out 25-50% and trailing stop to $${suggestedStop.toFixed(2)}.`;
        } else if (pnlPercent > 0) {
            action = 'BUY MORE';
            reason = `Strong momentum (Score ${totalScore}) confirmed. Consider adding on pullbacks to SMA 20 if risk allows.`;
        } else {
            action = 'HOLD';
            reason = "Thesis remains valid. Price is consolidating near entry. Give it room.";
        }
    }
    else {
        if (pnlPercent > 5) {
             action = 'HOLD';
             reason = "Trend is stable but cooling. Ensure Stop Loss is at Break Even.";
        } else if (pnlPercent < -3) {
             action = 'SELL / TRIM';
             reason = "Price struggling below entry with neutral momentum. Consider reducing risk.";
        } else {
             action = 'HOLD';
             reason = "Market is choppy. maintain position with defined stops.";
        }
    }

    return {
        action,
        reason,
        suggestedStop: Number(suggestedStop.toFixed(2)),
        suggestedTarget: riskAnalysis.takeProfit,
        pnlPercentage: Number(pnlPercent.toFixed(2))
    };
};

// --- Backtesting Engine ---
const runBacktest = (history: StockCandle[], entryThreshold: number = 8.5, exitThreshold: number = 4.5): BacktestResult => {
    const trades: BacktestTrade[] = [];
    let equity = 10000;
    const equityCurve = [{ date: history[0]?.date || '', equity }];
    let inPosition = false;
    let entryPrice = 0;
    let shares = 0;
    let stopLoss = 0;
    let takeProfit = 0;
    
    const startIdx = Math.max(50, history.length - 200);

    // Calculate Buy & Hold (Actual Return) for the same period
    const bhStartPrice = history[startIdx]?.close || 0;
    const bhEndPrice = history[history.length - 1]?.close || 0;
    const actualReturn = bhStartPrice > 0 ? ((bhEndPrice - bhStartPrice) / bhStartPrice) * 100 : 0;

    for (let i = startIdx; i < history.length; i++) {
        const slice = history.slice(0, i + 1);
        const candle = history[i];
        
        const ma50 = calculateSMA(slice, 50);
        const ma20 = calculateSMA(slice, 20);
        const rsi = calculateRSI(slice, 14);
        const prevRsi = calculateRSI(slice.slice(0, slice.length-1), 14); 
        const atr = calculateATR(slice, 14);
        
        let score = 0;
        if (candle.close > ma50) score += 3;
        if (candle.close > ma20) score += 2;
        if (rsi > 50) score += 2;
        if (rsi > 70) score += 1;
        if (rsi > prevRsi) score += 2;

        if (inPosition) {
             let exitReason: 'Stop' | 'Target' | 'Signal' | null = null;
             
             if (candle.low <= stopLoss) {
                 exitReason = 'Stop';
                 equity = shares * stopLoss;
             } else if (candle.high >= takeProfit) {
                 exitReason = 'Target';
                 equity = shares * takeProfit;
             } else if (score < exitThreshold) {
                 exitReason = 'Signal';
                 equity = shares * candle.close;
             }

             if (exitReason) {
                 const exitPrice = equity / shares;
                 const pnl = (exitPrice - entryPrice) / entryPrice * 100;
                 trades.push({
                     entryDate: trades[trades.length-1].entryDate,
                     entryPrice,
                     exitDate: candle.date,
                     exitPrice,
                     pnlPercent: pnl,
                     reason: exitReason,
                     type: 'Long'
                 });
                 inPosition = false;
                 shares = 0;
             } else {
                 if (candle.close > entryPrice + (2*atr)) {
                     stopLoss = Math.max(stopLoss, candle.close - (2*atr));
                 }
             }
        } else {
            if (score >= entryThreshold) {
                inPosition = true;
                entryPrice = candle.close;
                stopLoss = entryPrice - (2 * atr);
                takeProfit = entryPrice + (4 * atr); 
                shares = equity / entryPrice;
                trades.push({
                    entryDate: candle.date,
                    entryPrice,
                    pnlPercent: 0,
                    reason: 'Open',
                    type: 'Long'
                });
            }
        }

        if (inPosition) {
            equityCurve.push({ date: candle.date, equity: shares * candle.close });
        } else {
            equityCurve.push({ date: candle.date, equity });
        }
    }

    const wins = trades.filter(t => t.exitPrice && t.pnlPercent > 0).length;
    const totalClosed = trades.filter(t => t.exitPrice).length;
    const winRate = totalClosed > 0 ? (wins / totalClosed) * 100 : 0;
    const totalReturn = ((equity - 10000) / 10000) * 100;

    return {
        totalTrades: totalClosed,
        winRate,
        totalReturn,
        actualReturn,
        trades: trades, // Return ALL trades including open ones
        equityCurve,
        currentStatus: inPosition ? 'Long' : 'Cash'
    };
};

// --- Core Calculation Helper ---
const calculateIndicatorsAndScore = (historySlice: StockCandle[], officialSMA: number | null = null, spyHistory: StockCandle[] | null = null) => {
    if (historySlice.length < 50) return { totalScore: 0, technicalData: null, indicators: [] };

    const currentCandle = historySlice[historySlice.length - 1];
    const prevCandle = historySlice[historySlice.length - 2];
    const currentPrice = currentCandle.close;
    const changePercent = ((currentPrice - prevCandle.close) / prevCandle.close) * 100;

    const calculatedSMA150 = calculateSMA(historySlice, 150);
    const sma150 = officialSMA !== null ? officialSMA : calculatedSMA150;
    
    // --- UPDATED VWMA LOGIC ---
    let vwma = 0;
    if (currentCandle.vwap) {
        vwma = currentCandle.vwap;
    } else {
        vwma = calculateVWMA(historySlice, 20);
    }

    // Use full history calculation for RSI to enable divergence check
    const rsiArray = calculateRSIHistory(historySlice, 14);
    const rsi = rsiArray[rsiArray.length - 1];
    
    const macdData = calculateMACD(historySlice);
    const atr = calculateATR(historySlice, 14);
    const adxData = calculateADX(historySlice, 14);
    const bollinger = calculateBollingerBands(historySlice, 20, 2);
    
    const keltner = calculateKeltnerChannels(historySlice, atr, 20, 1.5);
    const squeezeOn = bollinger.upper < keltner.upper && bollinger.lower > keltner.lower;

    const sar = calculateParabolicSAR(historySlice);
    const rsiDivergence = detectRSIDivergence(historySlice, rsiArray);
    
    // Calculate Relative Strength (RS) with full SPY history passed
    // Date matching is now handled inside calculating function
    const rsRatio = calculateRelativeStrength(historySlice, spyHistory);

    const volSlice = historySlice.slice(Math.max(0, historySlice.length - 20));
    const volumeAvg20 = volSlice.reduce((acc, c) => acc + c.volume, 0) / 20;
    const lastVolume = currentCandle.volume;

    const high52 = Math.max(...historySlice.slice(Math.max(0, historySlice.length - 250)).map(c => c.high));
    const isBreakout = currentPrice >= high52 * 0.98;

    const { isCupHandle, isElliott, isDoubleBottom, isInvHeadShoulders, overlay } = detectChartPatterns(historySlice, currentPrice);

    // Calculate Raw Sub-Scores (0-10)
    const scores = {
        sma: getScore_SMA150(currentPrice, sma150),
        vwma: getScore_VWMA(currentPrice, vwma),
        adx: getScore_ADX(adxData),
        sar: getScore_SAR(currentPrice, sar),
        vol: getScore_Volume(lastVolume, volumeAvg20),
        bb: getScore_Bollinger(currentPrice, bollinger),
        rsi: getScore_RSI(rsi),
        macd: getScore_MACD(macdData.macdLine, macdData.signalLine),
        pattern: (isCupHandle ? 10 : 0) + (isBreakout ? 10 : 0) + (isElliott ? 8 : 0) + (isDoubleBottom ? 10 : 0) + (isInvHeadShoulders ? 9 : 0),
        // Score for divergence: Bullish=10, Bearish=1, None=5 (Neutral)
        rsiDiv: rsiDivergence === 'BULLISH' ? 10 : (rsiDivergence === 'BEARISH' ? 1 : 5),
        rs: getScore_RS(rsRatio)
    };
    
    const normalizedPatternScore = Math.min(10, Math.max(1, scores.pattern > 0 ? scores.pattern : 5));

    // Return raw scores to be weighted in analyzeStock
    return {
        totalScore: 0, // Placeholder, calculated in analyzeStock
        technicalData: {
            rsi, sma150, vwma, macd: macdData, adx: adxData, bollinger, sar, atr,
            volumeAvg20, lastVolume, resistanceLevel: high52,
            isCupHandle, isElliottImpulse: isElliott,
            keltner, squeezeOn, rsiDivergence,
            relativeStrength: rsRatio
        },
        scores: { ...scores, pattern: normalizedPatternScore },
        raw: { currentPrice, changePercent, high52 },
        overlay
    };
};

export const analyzeStock = (ticker: string, history: StockCandle[], officialSMA: number | null = null, marketCap: number | null = null, spyHistory: StockCandle[] | null = null): StockResult => {
  const currentAnalysis = calculateIndicatorsAndScore(history, officialSMA, spyHistory);
  const { technicalData, raw, scores, overlay } = currentAnalysis;
  
  if (!technicalData) throw new Error("Insufficient Data");

  // Define isBreakout here based on raw data
  const isBreakout = raw.currentPrice >= raw.high52 * 0.98;

  // --- Multi-Timeframe Analysis (MTA) ---
  const weeklyHistory = aggregateToWeekly(history);
  let weeklyTrend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let weeklyScore = 5; // Default Neutral score

  if (weeklyHistory.length > 50) {
      const wSMA20 = calculateSMA(weeklyHistory, 20);
      const wPrice = weeklyHistory[weeklyHistory.length - 1].close;
      if (wPrice > wSMA20) {
          weeklyTrend = 'BULLISH';
          weeklyScore = 10;
      } else {
          weeklyTrend = 'BEARISH';
          weeklyScore = 1;
      }
  }

  // --- Final Weighted Score Calculation (100% Total) ---
  // All 12 Indicators
  const weightedSum = 
        (scores.sma * 0.10) +      // Trend (SMA 150)
        (scores.rs * 0.15) +       // RS vs Market (INCREASED WEIGHT)
        (scores.vol * 0.10) +      // Volume
        (scores.rsi * 0.05) +      // Momentum (RSI) - Reduced slightly for RS
        (scores.macd * 0.05) +     // Momentum (MACD)
        (scores.bb * 0.10) +       // Volatility (Bollinger)
        (scores.pattern * 0.15) +  // Structure/Breakouts
        (scores.rsiDiv * 0.05) +   // Divergence Signal
        (weeklyScore * 0.10) +     // Weekly Trend
        (scores.vwma * 0.05) +     // Institutional Support (VWAP)
        (scores.adx * 0.05) +      // Trend Strength
        (scores.sar * 0.05);       // Trailing Stop

  const adjustedScore = Number(weightedSum.toFixed(1));

  // --- Backtesting ---
  const backtestResult = runBacktest(history);

  const recentHigh = Math.max(...history.slice(history.length - 100).map(c => c.high));
  const recentLow = Math.min(...history.slice(history.length - 100).map(c => c.low));
  const range = recentHigh - recentLow;
  const fib50 = recentLow + (range * 0.5);
  const fib618 = recentLow + (range * 0.618);
  const fibLevel = raw.currentPrice > fib618 ? 0.618 : (raw.currentPrice > fib50 ? 0.5 : null);

  const riskAnalysis = calculateRiskManagement(
      raw.currentPrice, 
      technicalData.atr, 
      technicalData.sar, 
      raw.high52, 
      fibLevel,
      technicalData.bollinger,
      adjustedScore
  );

  const scoreHistory: ScoreHistoryItem[] = [];
  // Historical scores
  for (let i = 1; i <= 7; i++) {
     if (history.length > i + 50) { 
         const slice = history.slice(0, history.length - i);
         // Pass FULL spyHistory now; calculation function handles date matching
         const histAnalysis = calculateIndicatorsAndScore(slice, null, spyHistory);
         
         // Approximate historical weight without full weekly recalculation
         const simpleWeighted = 
            (histAnalysis.scores.sma * 0.10) + (histAnalysis.scores.rs * 0.15) + (histAnalysis.scores.vol * 0.10) + 
            (histAnalysis.scores.rsi * 0.05) + (histAnalysis.scores.macd * 0.05) + (histAnalysis.scores.bb * 0.10) + 
            (histAnalysis.scores.pattern * 0.15) + (histAnalysis.scores.rsiDiv * 0.05) + (histAnalysis.scores.vwma * 0.05) + 
            (histAnalysis.scores.adx * 0.05) + (histAnalysis.scores.sar * 0.05) + 5 * 0.10; // avg weekly

         scoreHistory.push({
             date: slice[slice.length - 1].date,
             score: Number(simpleWeighted.toFixed(1))
         });
     }
  }
  scoreHistory.reverse(); 

  const indicators: IndicatorScore[] = [
    {
        name: 'RS vs Market', score: scores.rs, weight: 0.15,
        value: `${((technicalData.relativeStrength - 1) * 100).toFixed(1)}%`,
        description: technicalData.relativeStrength > 1 ? 'Outperforming SPY' : 'Underperforming',
        bullishCriteria: technicalData.relativeStrength > 1.0,
        criteria: 'Stock performance vs SPY over 6 months.'
    },
    {
        name: 'SMA 150 Trend', score: scores.sma, weight: 0.10, 
        value: technicalData.sma150.toFixed(2), 
        description: raw.currentPrice > technicalData.sma150 ? 'Bullish Trend' : 'Bearish Trend', 
        bullishCriteria: raw.currentPrice > technicalData.sma150,
        criteria: raw.currentPrice > (technicalData.sma150 * 1.1) ? 'Price is > 10% above SMA 150 (Strong Uptrend)' : raw.currentPrice > technicalData.sma150 ? 'Price is above SMA 150 (Uptrend)' : 'Price is below SMA 150 (Downtrend)'
    },
    {
        name: 'Weekly Trend', score: weeklyScore, weight: 0.10,
        value: weeklyTrend,
        description: weeklyTrend === 'BULLISH' ? 'Aligned (Bullish)' : 'Divergent',
        bullishCriteria: weeklyTrend === 'BULLISH',
        criteria: 'Weekly Price is above Weekly SMA 20 (MTA Alignment).'
    },
    {
        name: 'Structure & Patterns', score: scores.pattern, weight: 0.15, 
        value: technicalData.isCupHandle ? 'Cup & Handle' : (technicalData.isElliottImpulse ? 'Elliott Impulse' : (isBreakout ? 'Breakout' : (scores.pattern > 8 ? 'Reversal Pattern' : 'Consolidation'))), 
        description: 'Chart Formation', 
        bullishCriteria: technicalData.isCupHandle || technicalData.isElliottImpulse || isBreakout || scores.pattern > 8,
        criteria: technicalData.isCupHandle ? 'Cup & Handle detected.' : technicalData.isElliottImpulse ? 'Elliott Impulse detected.' : raw.currentPrice >= raw.high52 * 0.98 ? 'Price testing 52-Week High.' : 'No major bullish pattern.'
    },
    {
        name: 'Volume Spike', score: scores.vol, weight: 0.10, 
        value: `${(technicalData.lastVolume / 1000000).toFixed(1)}M`, 
        description: `Vol ${(technicalData.lastVolume/technicalData.volumeAvg20 * 100).toFixed(0)}% of Avg`, 
        bullishCriteria: technicalData.lastVolume > technicalData.volumeAvg20,
        criteria: 'Volume > Avg 20 indicates institutional participation.'
    },
    {
        name: 'RSI Momentum', score: scores.rsi, weight: 0.05, 
        value: technicalData.rsi.toFixed(1), 
        description: technicalData.rsi > 70 ? 'Strong (>70)' : technicalData.rsi < 30 ? 'Oversold' : 'Neutral', 
        bullishCriteria: technicalData.rsi > 50,
        criteria: 'RSI > 50 is Bullish. RSI > 70 is Strong Momentum.'
    },
    {
        name: 'Bollinger Bands', score: scores.bb, weight: 0.10, 
        value: raw.currentPrice > technicalData.bollinger.upper ? 'Breakout' : 'In Range', 
        description: raw.currentPrice > technicalData.bollinger.upper ? 'Upper Band Breach' : 'Within Bands', 
        bullishCriteria: raw.currentPrice > technicalData.bollinger.upper,
        criteria: 'Price relative to Bollinger Bands.'
    },
    {
        name: 'RSI Divergence', score: scores.rsiDiv, weight: 0.05,
        value: technicalData.rsiDivergence || 'None',
        description: technicalData.rsiDivergence === 'BULLISH' ? 'Bullish Divergence' : (technicalData.rsiDivergence === 'BEARISH' ? 'Bearish Divergence' : 'Neutral/None'),
        bullishCriteria: technicalData.rsiDivergence === 'BULLISH',
        criteria: 'Checks for divergence between Price and RSI pivots.'
    },
    {
        name: 'MACD Momentum', score: scores.macd, weight: 0.05,
        value: `${technicalData.macd.macdLine.toFixed(2)} / ${technicalData.macd.signalLine.toFixed(2)}`,
        description: scores.macd >= 7 ? 'Bullish Cross' : 'Bearish/Weak',
        bullishCriteria: scores.macd >= 7,
        criteria: 'MACD Line above Signal Line.'
    },
    {
        name: 'Inst. Support (VWAP)', score: scores.vwma, weight: 0.05,
        value: technicalData.vwma.toFixed(2),
        description: raw.currentPrice > technicalData.vwma ? 'Price > VWAP' : 'Price < VWAP',
        bullishCriteria: raw.currentPrice > technicalData.vwma,
        criteria: 'Price above Volume Weighted Average Price (or VWMA 20).'
    },
    {
        name: 'ADX Trend Strength', score: scores.adx, weight: 0.05,
        value: technicalData.adx.adx.toFixed(1),
        description: scores.adx >= 7 ? 'Strong Trend' : 'Weak/Choppy',
        bullishCriteria: scores.adx >= 7,
        criteria: 'ADX > 25 indicates strong trend; +DI > -DI is bullish.'
    },
    {
        name: 'Parabolic SAR', score: scores.sar, weight: 0.05,
        value: technicalData.sar.toFixed(2),
        description: raw.currentPrice > technicalData.sar ? 'Uptrend (Dots Below)' : 'Downtrend',
        bullishCriteria: raw.currentPrice > technicalData.sar,
        criteria: 'Price above SAR dots indicates uptrend.'
    }
  ];

  let rec = Recommendation.SELL;
  if (adjustedScore >= 8.5) rec = Recommendation.STRONG_BUY;
  else if (adjustedScore >= 6.5) rec = Recommendation.BUY;
  else if (adjustedScore >= 4.5) rec = Recommendation.HOLD;

  return {
    ticker,
    currentPrice: raw.currentPrice,
    marketCap: marketCap || 0, // Add to result
    changePercent: raw.changePercent,
    totalScore: adjustedScore,
    recommendation: rec,
    indicators,
    riskAnalysis,
    technicalData: {
      ...technicalData,
      supportLevel: riskAnalysis.stopLoss,
      fibLevel,
      weeklyTrend
    },
    history,
    scoreHistory,
    analysisTimestamp: Date.now(),
    patternOverlay: overlay,
    backtest: backtestResult
  };
};
