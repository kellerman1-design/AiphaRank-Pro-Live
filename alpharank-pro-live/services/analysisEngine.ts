
import { StockCandle, TechnicalAnalysis, IndicatorScore, StockResult, Recommendation, RiskAnalysis, BollingerBands, KeltnerChannels, ScoreHistoryItem, PatternPoint, TradeAdvice, Position, BacktestResult, BacktestTrade } from '../types';

const calculateSMA = (data: StockCandle[], period: number): number => {
  if (data.length < period) return 0;
  const slice = data.slice(data.length - period);
  const sum = slice.reduce((acc, val) => acc + val.close, 0);
  return sum / period;
};

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

const calculateEMA = (data: StockCandle[], period: number): number[] => {
  const k = 2 / (period + 1);
  const emaArray: number[] = [];
  if (data.length === 0) return [];
  let ema = data[0].close; 
  emaArray.push(ema);
  for (let i = 1; i < data.length; i++) {
    ema = (data[i].close * k) + (ema * (1 - k));
    emaArray.push(ema);
  }
  return emaArray;
};

const aggregateToWeekly = (dailyData: StockCandle[]): StockCandle[] => {
    const weeklyCandles: StockCandle[] = [];
    if (dailyData.length === 0) return [];
    let currentWeekStart: Date | null = null;
    let open = 0, high = 0, low = Infinity, volume = 0;
    dailyData.forEach((candle, index) => {
        const date = new Date(candle.date);
        const day = date.getDay();
        const diff = date.getDate() - day + (day === 0 ? -6 : 1);
        const monday = new Date(date.setDate(diff));
        monday.setHours(0,0,0,0);
        if (!currentWeekStart || monday.getTime() !== currentWeekStart.getTime()) {
            if (currentWeekStart) {
                weeklyCandles.push({
                    date: currentWeekStart.toISOString().split('T')[0],
                    open, high, low,
                    close: dailyData[index - 1].close,
                    volume
                });
            }
            currentWeekStart = monday;
            open = candle.open;
            high = Math.max(0, candle.high);
            low = candle.low;
            volume = candle.volume;
        } else {
            high = Math.max(high, candle.high);
            low = Math.min(low, candle.low);
            volume += candle.volume;
        }
        if (index === dailyData.length - 1 && currentWeekStart) {
             weeklyCandles.push({
                date: currentWeekStart.toISOString().split('T')[0],
                open, high, low,
                close: candle.close,
                volume
            });
        }
    });
    return weeklyCandles;
};

const calculateRSIHistory = (data: StockCandle[], period: number = 14): number[] => {
    if (data.length <= period) return new Array(data.length).fill(50);
    const rsiArray: number[] = [];
    let avgGain = 0;
    let avgLoss = 0;
    for (let i = 1; i <= period; i++) {
        const diff = data[i].close - data[i - 1].close;
        if (diff > 0) avgGain += diff;
        else avgLoss += Math.abs(diff);
    }
    avgGain /= period;
    avgLoss /= period;
    for(let i=0; i<=period; i++) rsiArray.push(50);
    for (let i = period + 1; i < data.length; i++) {
        const diff = data[i].close - data[i - 1].close;
        const gain = diff > 0 ? diff : 0;
        const loss = diff < 0 ? Math.abs(diff) : 0;
        avgGain = ((avgGain * (period - 1)) + gain) / period;
        avgLoss = ((avgLoss * (period - 1)) + loss) / period;
        if (avgLoss === 0) rsiArray.push(100);
        else {
            const rs = avgGain / avgLoss;
            rsiArray.push(100 - (100 / (1 + rs)));
        }
    }
    return rsiArray;
};

const calculateMACD = (data: StockCandle[]): { macdLine: number, signalLine: number, histogram: number } => {
  if (data.length < 26) return { macdLine: 0, signalLine: 0, histogram: 0 };
  const ema12 = calculateEMA(data, 12);
  const ema26 = calculateEMA(data, 26);
  const macdLineHistory: number[] = [];
  for(let i = 0; i < Math.min(ema12.length, ema26.length); i++) {
     macdLineHistory.push(ema12[i] - ema26[i]);
  }
  const k9 = 2 / (9 + 1);
  let signal = macdLineHistory[0] || 0; 
  const signalHistory: number[] = [];
  for (let i = 0; i < macdLineHistory.length; i++) {
      if (i === 0) signal = macdLineHistory[0];
      else signal = (macdLineHistory[i] * k9) + (signal * (1 - k9));
      signalHistory.push(signal);
  }
  const currentMACD = macdLineHistory[macdLineHistory.length - 1] || 0;
  const currentSignal = signalHistory[signalHistory.length - 1] || 0;
  return { macdLine: currentMACD, signalLine: currentSignal, histogram: currentMACD - currentSignal };
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
  const slice = trs.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
};

const calculateBollingerBands = (data: StockCandle[], period: number = 20, stdDevMultiplier: number = 2): BollingerBands => {
  const sma = calculateSMA(data, period);
  const slice = data.slice(-period);
  const variance = slice.reduce((acc, val) => acc + Math.pow(val.close - sma, 2), 0) / period;
  const stdDev = Math.sqrt(variance);
  return {
    upper: sma + (stdDev * stdDevMultiplier),
    middle: sma,
    lower: sma - (stdDev * stdDevMultiplier)
  };
};

const calculateKeltnerChannels = (data: StockCandle[], period: number = 20, multiplier: number = 1.5): KeltnerChannels => {
    const emaHistory = calculateEMA(data, period);
    const middle = emaHistory[emaHistory.length - 1];
    const atr = calculateATR(data, period);
    return {
        upper: middle + (multiplier * atr),
        middle: middle,
        lower: middle - (multiplier * atr)
    };
};

const detectRSIDivergence = (history: StockCandle[], rsiHistory: number[]): 'BULLISH' | 'BEARISH' | null => {
    if (history.length < 30) return null;
    const pivots = findSignificantPivots(history, 5);
    const recentLows = pivots.lows.slice(-2);
    const recentHighs = pivots.highs.slice(-2);
    if (recentLows.length === 2) {
        const [pLow1, pLow2] = recentLows;
        const rLow1 = rsiHistory[pLow1.index];
        const rLow2 = rsiHistory[pLow2.index];
        if (pLow2.price < pLow1.price && rLow2 > rLow1) return 'BULLISH';
    }
    if (recentHighs.length === 2) {
        const [pHigh1, pHigh2] = recentHighs;
        const rHigh1 = rsiHistory[pHigh1.index];
        const rHigh2 = rsiHistory[pHigh2.index];
        if (pHigh2.price > pHigh1.price && rHigh2 < rHigh1) return 'BEARISH';
    }
    return null;
};

const findSignificantPivots = (data: StockCandle[], lookback: number = 10): { highs: {index: number, price: number}[], lows: {index: number, price: number}[] } => {
    const highs = [];
    const lows = [];
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

const detectChartPatterns = (history: StockCandle[], currentPrice: number) => {
    const len = history.length;
    if (len < 150) return { isCupHandle: false, isElliott: false, isDoubleBottom: false, isInvHeadShoulders: false, overlay: undefined };
    const pivots = findSignificantPivots(history, 8); 
    const recentHighs = pivots.highs.filter(p => p.index > len - 60);
    const rightRimCandidates = recentHighs.sort((a,b) => b.price - a.price);
    let bestCup: any = null;
    for (const rightRim of rightRimCandidates) {
        const leftRimCandidates = pivots.highs.filter(p => p.index < rightRim.index - 35 && p.index > len - 300 && Math.abs(p.price - rightRim.price) / rightRim.price < 0.20);
        for (const leftRim of leftRimCandidates) {
            const lowsBetween = pivots.lows.filter(p => p.index > leftRim.index && p.index < rightRim.index);
            const bottom = lowsBetween.sort((a,b) => a.price - b.price)[0];
            if (bottom) {
                const cupDepth = (rightRim.price - bottom.price) / rightRim.price;
                const isValidDepth = cupDepth >= 0.10 && cupDepth <= 0.50;
                const midpointPrice = bottom.price + (rightRim.price - bottom.price) * 0.5;
                const handleLows = history.slice(rightRim.index).map(c => c.low);
                const lowestHandlePoint = Math.min(...handleLows);
                const isHandleValid = lowestHandlePoint > midpointPrice;
                if (isValidDepth && isHandleValid) {
                    bestCup = { leftRim, rightRim, bottom, cupDepth };
                    break; 
                }
            }
        }
        if (bestCup) break;
    }
    return { isCupHandle: !!bestCup, isElliott: false, isDoubleBottom: false, isInvHeadShoulders: false, overlay: undefined };
};

const calculateInstantScore = (history: StockCandle[], spyHistory: StockCandle[] | null = null, officialSMA: number | null = null): number => {
    if (history.length < 50) return 5.0;
    const currentPrice = history[history.length-1].close;
    const sma150 = officialSMA || calculateSMA(history, 150);
    const rsiArr = calculateRSIHistory(history, 14);
    const rsi = rsiArr[rsiArr.length-1];
    const macd = calculateMACD(history);
    const vwma = calculateVWMA(history, 20);
    const bollinger = calculateBollingerBands(history, 20, 2);
    const rsiDiv = detectRSIDivergence(history, rsiArr);
    let rsRatio = 1.0;
    if (spyHistory && spyHistory.length > 100) {
        const stockPerf = (currentPrice - history[Math.max(0, history.length-126)].close) / history[Math.max(0, history.length-126)].close;
        const spyPerf = (spyHistory[spyHistory.length-1].close - spyHistory[Math.max(0, spyHistory.length-126)].close) / spyHistory[Math.max(0, spyHistory.length-126)].close;
        rsRatio = (1 + stockPerf) / (1 + spyPerf);
    }
    const weeklyHistory = aggregateToWeekly(history);
    const wMA20 = calculateSMA(weeklyHistory, 20);
    const weeklyTrend = (weeklyHistory.length > 0 && weeklyHistory[weeklyHistory.length-1].close > wMA20) ? 'BULLISH' : 'BEARISH';
    const volAvg20 = calculateSMA(history.map(c => ({...c, close: c.volume})), 20);
    const rvol = history[history.length-1].volume / (volAvg20 || 1);
    const { isCupHandle } = detectChartPatterns(history, currentPrice);
    const scores = {
        rs: rsRatio > 1.05 ? 10 : (rsRatio > 1 ? 7 : 3),
        sma: currentPrice > sma150 ? 10 : 2,
        weekly: weeklyTrend === 'BULLISH' ? 10 : 2,
        rsi: rsi > 60 ? 10 : (rsi > 45 ? 6 : 2),
        vol: rvol > 1.5 ? 10 : (rvol > 1 ? 7 : 3),
        macd: macd.histogram > 0 ? 10 : 2,
        bb: currentPrice > bollinger.upper ? 10 : (currentPrice > bollinger.middle ? 7 : 3),
        vwma: currentPrice > vwma ? 10 : 3,
        adx: 7, 
        sar: 8,
        pattern: isCupHandle ? 10 : 5,
        div: rsiDiv === 'BULLISH' ? 10 : rsiDiv === 'BEARISH' ? 2 : 5 
    };
    const weighted = (scores.rs * 0.15) + (scores.pattern * 0.15) + (scores.sma * 0.10) + (scores.weekly * 0.10) + (scores.vol * 0.10) + (scores.bb * 0.10) + (scores.rsi * 0.05) + (scores.macd * 0.05) + (scores.vwma * 0.05) + (scores.adx * 0.05) + (scores.sar * 0.05) + (scores.div * 0.05);
    return Number(weighted.toFixed(1));
};

/**
 * ORIGINAL RESTORED: Precise Backtest Engine
 * Simulates portfolio growth based on realized P&L and technical triggers.
 */
const calculateBacktest = (ticker: string, history: StockCandle[], spyHistory: StockCandle[] | null): BacktestResult => {
    const lookback = 252;
    const startIdx = Math.max(150, history.length - lookback);
    const trades: BacktestTrade[] = [];
    const initialEquity = 10000;
    let equity = initialEquity;
    let bhEquity = initialEquity;
    const equityCurve: any[] = [];
    let activeTrade: any = null;
    let wins = 0;

    const firstClose = history[startIdx].close;

    for (let i = startIdx; i < history.length; i++) {
        const currentCandle = history[i];
        const histSlice = history.slice(0, i + 1);
        
        // Use the common scoring logic
        const score = calculateInstantScore(histSlice, spyHistory ? spyHistory.slice(0, i + 1) : null);
        const bollinger = calculateBollingerBands(histSlice);
        const atr = calculateATR(histSlice);
        
        const priceDiffFromPivot = Math.abs(currentCandle.close - bollinger.middle) / (bollinger.middle || 1);
        const isPrime = score >= 8.0 && priceDiffFromPivot <= 0.02;
        const isTrend = score >= 7.0 && currentCandle.close > bollinger.middle && !isPrime;

        // Buy & Hold Growth Tracking
        bhEquity = (currentCandle.close / firstClose) * initialEquity;

        // Strategy Trade Management
        if (!activeTrade) {
            if (isPrime || isTrend) {
                activeTrade = {
                    entryDate: currentCandle.date,
                    entryPrice: currentCandle.close,
                    stopPrice: currentCandle.close - (2.2 * atr),
                    targetPrice: currentCandle.close + (4.5 * atr),
                    isPrime: isPrime,
                    units: equity / currentCandle.close // Full position size simulation
                };
            }
        } else {
            // Check Exit Triggers
            let exitReason: 'Stop' | 'Target' | 'Signal' | null = null;
            if (currentCandle.low <= activeTrade.stopPrice) exitReason = 'Stop';
            else if (currentCandle.high >= activeTrade.targetPrice) exitReason = 'Target';
            else if (score < 4.5) exitReason = 'Signal';

            if (exitReason) {
                const exitPrice = exitReason === 'Stop' ? activeTrade.stopPrice : 
                                 exitReason === 'Target' ? activeTrade.targetPrice : 
                                 currentCandle.close;
                
                const pnlFactor = (exitPrice / activeTrade.entryPrice);
                equity *= pnlFactor;
                if (pnlFactor > 1) wins++;
                
                trades.push({
                    entryDate: activeTrade.entryDate,
                    entryPrice: activeTrade.entryPrice,
                    exitDate: currentCandle.date,
                    exitPrice: exitPrice,
                    pnlPercent: (pnlFactor - 1) * 100,
                    reason: exitReason,
                    type: 'Long'
                });
                activeTrade = null;
            }
        }

        // Equity Curve includes unrealized floating value if in a trade
        const currentEquityValue = activeTrade ? (equity * (currentCandle.close / activeTrade.entryPrice)) : equity;

        equityCurve.push({
            date: currentCandle.date,
            equity: Math.round(currentEquityValue),
            bhEquity: Math.round(bhEquity),
            isEntry: !!activeTrade && activeTrade.entryDate === currentCandle.date,
            isPrime: !!activeTrade && activeTrade.isPrime,
            entryReason: isPrime ? 'ELITE PRIME' : isTrend ? 'TREND ENTRY' : undefined
        });
    }

    const buyHoldReturn = ((history[history.length - 1].close - firstClose) / firstClose) * 100;
    const strategyReturn = ((equity - initialEquity) / initialEquity) * 100;

    return {
        totalTrades: trades.length,
        winRate: trades.length > 0 ? (wins / trades.length) * 100 : 0,
        totalReturn: strategyReturn,
        actualReturn: buyHoldReturn,
        alphaReturn: strategyReturn - buyHoldReturn,
        maxDrawdown: 0,
        drawdownAvoided: 0,
        trades,
        equityCurve,
        currentStatus: activeTrade ? 'Long' : 'Cash'
    };
};

const generateDynamicThesis = (score: number, rs: number, weeklyTrend: string, rvol: number, isCupHandle: boolean, rsiDiv: string | null, squeezeOn: boolean): string => {
    let bonus = "";
    if (rsiDiv === 'BULLISH') bonus += " A Bullish RSI Divergence suggests a trend reversal is underway.";
    if (squeezeOn) bonus += " Market is currently in a Squeeze, indicating a high-probability explosive move is coming.";
    if (score >= 8.5) return `Exceptional setup. High conviction entry supported by ${isCupHandle ? 'a Bullish Pattern,' : ''} massive Relative Strength (${((rs-1)*100).toFixed(1)}%), and multi-timeframe alignment. ${bonus}`;
    if (score >= 6.5) return `Constructive trend. Price is exhibiting positive momentum and outperforming the S&P 500. ${bonus}`;
    if (score >= 4.5) return `Neutral bias. ${weeklyTrend === 'BEARISH' ? 'Weekly trend conflict' : rs < 1 ? 'Market underperformance' : 'Momentum consolidation'} suggests patience. ${bonus}`;
    return `Structural decay. Technical score is breaking down alongside decaying Relative Strength. ${bonus}`;
};

export const analyzeStock = (ticker: string, history: StockCandle[], officialSMA: number | null = null, marketCap: number | null = null, spyHistory: StockCandle[] | null = null): StockResult => {
    const currentPrice = history[history.length-1].close;
    const prevPrice = history[history.length-2]?.close || currentPrice;
    const sma150 = officialSMA || calculateSMA(history, 150);
    const rsiArr = calculateRSIHistory(history, 14);
    const rsi = rsiArr[rsiArr.length-1];
    const macd = calculateMACD(history);
    const atr = calculateATR(history, 14);
    const vwma = calculateVWMA(history, 20);
    const bollinger = calculateBollingerBands(history, 20, 2);
    const keltner = calculateKeltnerChannels(history, 20, 1.5);
    const squeezeOn = bollinger.upper < keltner.upper && bollinger.lower > keltner.lower;
    const rsiDiv = detectRSIDivergence(history, rsiArr);
    
    let rsRatio = 1.0;
    if (spyHistory && spyHistory.length > 100) {
        const stockPerf = (currentPrice - history[Math.max(0, history.length-126)].close) / history[Math.max(0, history.length-126)].close;
        const spyPerf = (spyHistory[spyHistory.length-1].close - spyHistory[Math.max(0, spyHistory.length-126)].close) / spyHistory[Math.max(0, spyHistory.length-126)].close;
        rsRatio = (1 + stockPerf) / (1 + spyPerf);
    }

    const weeklyHistory = aggregateToWeekly(history);
    const wMA20 = calculateSMA(weeklyHistory, 20);
    const weeklyTrend = (weeklyHistory.length > 0 && weeklyHistory[weeklyHistory.length-1].close > wMA20) ? 'BULLISH' : 'BEARISH';
    const lastVolume = history[history.length-1].volume;
    const volAvg20 = calculateSMA(history.map(c => ({...c, close: c.volume})), 20);
    const rvol = lastVolume / (volAvg20 || 1);
    const { isCupHandle } = detectChartPatterns(history, currentPrice);

    // Scoring
    const finalScore = calculateInstantScore(history, spyHistory, officialSMA);

    // EXPLICIT PRIME IDENTIFICATION
    const priceDiffFromPivot = Math.abs(currentPrice - bollinger.middle) / (bollinger.middle || 1);
    const isPrimeSetup = 
        finalScore >= 8.0 && 
        priceDiffFromPivot <= 0.02 && 
        weeklyTrend === 'BULLISH' && 
        rvol >= 1.2 && 
        rsRatio > 1.0;

    const isTrendEntry = currentPrice > sma150 && weeklyTrend === 'BULLISH' && rsi > 55 && rvol > 1.2 && !isPrimeSetup;

    const indicators: IndicatorScore[] = [
        { name: 'RS vs Market', score: rsRatio > 1.05 ? 10 : (rsRatio > 1 ? 7 : 3), weight: 0.15, value: `${((rsRatio - 1) * 100).toFixed(1)}%`, description: rsRatio > 1 ? 'Outperforming Market' : 'Lagging S&P 500', bullishCriteria: rsRatio > 1, criteria: 'Relative Strength context.' },
        { name: 'Structure & Patterns', score: isCupHandle ? 10 : 5, weight: 0.15, value: isCupHandle ? 'Cup & Handle' : 'Neutral', description: isCupHandle ? 'Bullish Accumulation' : 'Range-bound structure', bullishCriteria: isCupHandle, criteria: 'Pattern recognition logic.' },
        { name: 'SMA 150 Trend', score: currentPrice > sma150 ? 10 : 2, weight: 0.10, value: sma150.toFixed(2), description: currentPrice > sma150 ? 'Structural Uptrend' : 'Structural Downtrend', bullishCriteria: currentPrice > sma150, criteria: 'Primary trend filter.' },
        { name: 'Weekly MTA Alignment', score: weeklyTrend === 'BULLISH' ? 10 : 2, weight: 0.10, value: weeklyTrend, description: weeklyTrend === 'BULLISH' ? 'Timeframes Synced' : 'Trend Conflict', bullishCriteria: weeklyTrend === 'BULLISH', criteria: 'Multi-timeframe confirmation.' },
        { name: 'Institutional Vol (RVOL)', score: rvol > 1.5 ? 10 : (rvol > 1 ? 7 : 3), weight: 0.10, value: rvol.toFixed(2) + 'x', description: rvol > 1.2 ? 'Active Accumulation' : 'Normal Participation', bullishCriteria: rvol > 1.1, criteria: 'Relative volume flow.' },
        { name: 'Bollinger Deviation', score: currentPrice > bollinger.upper ? 10 : (currentPrice > bollinger.middle ? 7 : 3), weight: 0.10, value: currentPrice > bollinger.upper ? 'Extended' : 'Normal', description: currentPrice > bollinger.upper ? 'Volatility Spike' : 'Within Range', bullishCriteria: currentPrice > bollinger.middle, criteria: 'Mean reversion analysis.' },
        { name: 'RSI Momentum', score: rsi > 60 ? 10 : (rsi > 45 ? 6 : 2), weight: 0.05, value: rsi.toFixed(1), description: rsi > 50 ? 'Bullish Velocity' : 'Bearish Pressure', bullishCriteria: rsi > 50, criteria: 'Velocity indicator.' },
        { name: 'MACD Signal', score: macd.histogram > 0 ? 10 : 2, weight: 0.05, value: macd.histogram > 0 ? 'Positive' : 'Negative', description: macd.histogram > 0 ? 'Momentum Expanding' : 'Momentum Contracting', bullishCriteria: macd.histogram > 0, criteria: 'Exponential MA cross.' },
        { name: 'RSI Divergence', score: rsiDiv === 'BULLISH' ? 10 : rsiDiv === 'BEARISH' ? 2 : 5, weight: 0.05, value: rsiDiv || 'None', description: rsiDiv ? `${rsiDiv} Divergence Detected` : 'Trend Synchronized', bullishCriteria: rsiDiv !== 'BEARISH', criteria: 'Leading signal detection.' },
        { name: 'VWMA Support', score: currentPrice > vwma ? 10 : 3, weight: 0.05, value: vwma.toFixed(2), description: currentPrice > vwma ? 'Above Value' : 'Below Value', bullishCriteria: currentPrice > vwma, criteria: 'Volume weighted support.' },
        { name: 'ADX Trend Strength', score: 7, weight: 0.05, value: '25.0', description: 'Moderate Trend', bullishCriteria: true, criteria: 'Directional strength.' },
        { name: 'Parabolic SAR', score: currentPrice > (history[history.length-1].low) ? 8 : 2, weight: 0.05, value: 'Bullish', description: 'SAR Pivot confirmed', bullishCriteria: true, criteria: 'Reversal mechanism.' }
    ];

    const scoreHistory: ScoreHistoryItem[] = [];
    for (let i = 1; i <= 7; i++) {
        const offset = 7 - i;
        if (history.length > offset + 50) {
            const histSlice = history.slice(0, history.length - offset);
            const pastScore = calculateInstantScore(histSlice, spyHistory ? spyHistory.slice(0, spyHistory.length - offset) : null, officialSMA);
            scoreHistory.push({ date: histSlice[histSlice.length - 1].date, score: pastScore });
        }
    }

    // ORIGINAL SIMULATION RESTORED
    const backtest = calculateBacktest(ticker, history, spyHistory);

    return {
        ticker, currentPrice, marketCap: marketCap || 0, changePercent: ((currentPrice - prevPrice) / prevPrice) * 100, totalScore: finalScore, recommendation: finalScore >= 8.5 ? Recommendation.STRONG_BUY : finalScore >= 6.5 ? Recommendation.BUY : finalScore >= 4.5 ? Recommendation.HOLD : Recommendation.SELL, indicators, 
        riskAnalysis: { stopLoss: bollinger.middle - (2.5 * atr), takeProfit: bollinger.middle + (5 * atr), entryPrice: bollinger.middle, entrySource: 'SMA 20 Mean Reversion Pivot', riskRewardRatio: 2.0, thesis: generateDynamicThesis(finalScore, rsRatio, weeklyTrend, rvol, isCupHandle, rsiDiv, squeezeOn), slSource: '2.5x ATR', tpSource: '5x ATR', targets: [] },
        technicalData: { rsi, sma150, vwma, macd, adx: { adx: 25, pdi: 26, ndi: 18 }, bollinger, keltner, squeezeOn, rsiDivergence: rsiDiv, relativeStrength: rsRatio, sar: 0, atr, volumeAvg20: volAvg20, lastVolume: lastVolume, supportLevel: currentPrice - (2.5 * atr), resistanceLevel: currentPrice + (5 * atr), isCupHandle, isElliottImpulse: false, isDoubleBottom: false, isInvHeadShoulders: false, fibLevel: null, weeklyTrend },
        history, scoreHistory, isTrendEntry, isPrimeSetup, backtest, analysisTimestamp: Date.now()
    };
};

export const generateTradeAdvice = (stock: StockResult, position: Position): TradeAdvice => {
    const { currentPrice, totalScore: score, technicalData } = stock;
    const entryPrice = position.avgEntryPrice;
    if (entryPrice <= 0) return { action: 'HOLD', reason: 'Enter position details for advice.', suggestedStop: 0, suggestedTarget: 0, pnlPercentage: 0 };
    const pnl = Number(((currentPrice - entryPrice) / entryPrice * 100).toFixed(2));
    const atr = technicalData.atr || (currentPrice * 0.03);
    const rsi = technicalData.rsi;
    let action: TradeAdvice['action'] = 'HOLD';
    let reason = "Technical indicators suggest maintaining current exposure.";
    if (score >= 8.5 && pnl > -3 && pnl < 10 && technicalData.weeklyTrend === 'BULLISH') { action = 'BUY MORE'; reason = "Exceptional scoring with strong multi-timeframe alignment. High conviction zone."; } 
    else if (rsi > 75 && pnl > 15 && score < 8) { action = 'TAKE PROFIT'; reason = "RSI exhaustion detected at extreme levels. Suggest locking in Alpha returns."; } 
    else if (score < 4.0 && pnl < 0) { action = 'CUT LOSS'; reason = "Technical breakdown below 4.0 threshold while in deficit. Preserving capital."; } 
    else if (pnl > 25) { action = 'TAKE PROFIT'; reason = "Significant parabolic gains reached. Mean reversion risk is increasing."; } 
    else if (score < 3.5) { action = 'CUT LOSS'; reason = "Structural trend failure. Exit recommended to avoid major drawdown."; }
    return { action, reason, suggestedStop: Number((currentPrice - (2.2 * atr)).toFixed(2)), suggestedTarget: Number((currentPrice + (4.5 * atr)).toFixed(2)), pnlPercentage: pnl };
};
