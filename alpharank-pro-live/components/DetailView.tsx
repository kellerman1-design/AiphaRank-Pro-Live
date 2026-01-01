
import React, { useState, useEffect, useMemo } from 'react';
import { StockResult, Recommendation, StockCandle, TradeAdvice, Position } from '../types';
import { ResponsiveContainer, ComposedChart, Area, AreaChart, XAxis, YAxis, Tooltip, CartesianGrid, ReferenceLine, Line, ReferenceArea, Scatter } from 'recharts';
import { X, CheckCircle, AlertTriangle, ShieldAlert, TrendingUp, TrendingDown, Ruler, RotateCcw, Bell, Briefcase, Save, Clock, Loader2, Layers, Target, Activity, Zap, Crosshair, ArrowUpRight, ExternalLink, Info } from 'lucide-react';
import AlertModal from './AlertModal';
import { userService } from '../services/userService';
import { generateTradeAdvice, analyzeStock } from '../services/analysisEngine';
import { fetchStockData, fetchOfficialSMA, fetchMarketCap, fetchCompanyProfile } from '../services/stockService';
import { POPULAR_STOCKS } from '../constants';

interface Props {
  stock: StockResult;
  onClose: () => void;
}

// ... (formatMarketCap, formatVolumeCompact, formatDateTick, calculateHistoricalSMA, calculateHistoricalVWMA, calculateHistoricalBollinger kept same)
const formatMarketCap = (marketCap: number | undefined) => {
    if (!marketCap) return 'N/A';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toLocaleString()}`;
};

const formatVolumeCompact = (vol: number) => {
    if (vol >= 1e9) return `${(vol / 1e9).toFixed(2)}B`;
    if (vol >= 1e6) return `${(vol / 1e6).toFixed(2)}M`;
    if (vol >= 1e3) return `${(vol / 1e3).toFixed(1)}K`;
    return vol.toLocaleString();
};

const formatDateTick = (val: any) => {
    if (typeof val !== 'string') return val;
    const parts = val.split('-');
    if (parts.length < 2) return val;
    const year = parts[0];
    const month = parts[1];
    if (month === '01') return year;
    const date = new Date(parseInt(year), parseInt(month) - 1, 1);
    return date.toLocaleString('en-US', { month: 'short' });
};

const calculateHistoricalSMA = (history: StockCandle[], period: number) => {
  if (!history || history.length === 0) return [];
  const smaValues: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < history.length; i++) {
    sum += history[i].close;
    if (i >= period) sum -= history[i - period].close;
    if (i >= period - 1) smaValues.push(sum / period);
    else smaValues.push(null);
  }
  return smaValues;
};

const calculateHistoricalVWMA = (history: StockCandle[], period: number) => {
  if (!history || history.length === 0) return [];
  const vwmaValues: (number | null)[] = [];
  for (let i = 0; i < history.length; i++) {
    if (i < period - 1) { vwmaValues.push(null); continue; }
    const slice = history.slice(i - period + 1, i + 1);
    let pvSum = 0; let vSum = 0;
    for(const c of slice) { pvSum += (c.close * c.volume); vSum += c.volume; }
    vwmaValues.push(vSum ? pvSum / vSum : null);
  }
  return vwmaValues;
};

const calculateHistoricalBollinger = (history: StockCandle[], period: number = 20, stdDevMultiplier: number = 2) => {
  if (!history || history.length === 0) return [];
  const bands: { upper: number | null, lower: number | null, middle: number | null }[] = [];
  let sum = 0; let sumSq = 0;
  for (let i = 0; i < history.length; i++) {
    const val = history[i].close;
    sum += val; sumSq += val * val;
    if (i >= period) { const removeVal = history[i - period].close; sum -= removeVal; sumSq -= removeVal * removeVal; }
    if (i >= period - 1) {
      const mean = sum / period;
      const variance = (sumSq / period) - (mean * mean);
      const stdDev = Math.sqrt(Math.max(0, variance));
      bands.push({ upper: mean + (stdDev * stdDevMultiplier), lower: mean - (stdDev * stdDevMultiplier), middle: mean });
    } else {
      bands.push({ upper: null, lower: null, middle: null });
    }
  }
  return bands;
};

const DetailView: React.FC<Props> = ({ stock, onClose }) => {
  const [displayStock, setDisplayStock] = useState<StockResult>(() => {
      const known = POPULAR_STOCKS.find(s => s.symbol === stock.ticker);
      return { ...stock, companyName: stock.companyName || (known ? known.name : undefined), sector: stock.sector || (known ? known.sector : undefined) };
  });
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isChartReady, setIsChartReady] = useState(false);
  const [fibMode, setFibMode] = useState(false);
  const [fibPoints, setFibPoints] = useState<{price: number, date: string}[]>([]);
  const [riskMode, setRiskMode] = useState(false);
  const [customRiskEntry, setCustomRiskEntry] = useState<number | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [showBacktest, setShowBacktest] = useState(false);
  const [hasPosition, setHasPosition] = useState(false);
  const [entryPrice, setEntryPrice] = useState<string>('');
  const [shares, setShares] = useState<string>('');
  const [tradeAdvice, setTradeAdvice] = useState<TradeAdvice | null>(null);

  useEffect(() => {
      const timer = requestAnimationFrame(() => { setIsChartReady(true); });
      return () => cancelAnimationFrame(timer);
  }, []);

  useEffect(() => {
    if (stock.ticker !== displayStock.ticker) {
        const known = POPULAR_STOCKS.find(s => s.symbol === stock.ticker);
        setDisplayStock({ ...stock, companyName: stock.companyName || (known ? known.name : undefined), sector: stock.sector || (known ? known.sector : undefined) });
        setIsChartReady(false);
        requestAnimationFrame(() => setIsChartReady(true));
    }
  }, [stock]);

  useEffect(() => {
      const loadData = async () => {
          const needsHistory = !displayStock.history || displayStock.history.length === 0;
          const needsProfile = !displayStock.companyName || !displayStock.sector || displayStock.beta === undefined;
          const needsMarketCap = !displayStock.marketCap;
          if (needsHistory || needsProfile || needsMarketCap) {
              setLoadingHistory(needsHistory);
              try {
                  const [history, sma, profile, mCap, spyData] = await Promise.all([
                      needsHistory ? fetchStockData(displayStock.ticker) : Promise.resolve(displayStock.history),
                      fetchOfficialSMA(displayStock.ticker),
                      needsProfile ? fetchCompanyProfile(displayStock.ticker) : Promise.resolve(null),
                      needsMarketCap ? fetchMarketCap(displayStock.ticker) : Promise.resolve(displayStock.marketCap),
                      fetchStockData('SPY')
                  ]);
                  let fullData: StockResult;
                  if (needsHistory && history.length > 0) fullData = analyzeStock(displayStock.ticker, history, sma, mCap, spyData);
                  else { fullData = { ...displayStock }; if (mCap) fullData.marketCap = mCap; }
                  if (profile) { fullData.companyName = profile.companyName; fullData.sector = profile.sector; fullData.beta = profile.beta; }
                  setDisplayStock(fullData);
              } catch (e) { console.error("Error loading details", e); } finally { setLoadingHistory(false); }
          }
      };
      loadData();
  }, [displayStock.ticker]);

  useEffect(() => {
    const pos = userService.getPosition(displayStock.ticker);
    if (pos) {
        setHasPosition(true); setEntryPrice(pos.avgEntryPrice.toString()); setShares(pos.quantity.toString());
        setTradeAdvice(generateTradeAdvice(displayStock, pos));
    }
  }, [displayStock]);

  const handleSavePosition = () => {
    if (!hasPosition) { userService.removePosition(displayStock.ticker); setTradeAdvice(null); return; }
    if (entryPrice && shares) {
        const newPos: Position = { ticker: displayStock.ticker, avgEntryPrice: parseFloat(entryPrice), quantity: parseFloat(shares), entryDate: new Date().toISOString() };
        userService.updatePosition(newPos);
        setTradeAdvice(generateTradeAdvice(displayStock, newPos));
    }
  };

  const chartData = useMemo(() => {
    if (!displayStock.history || displayStock.history.length === 0) return [];
    const sma150History = calculateHistoricalSMA(displayStock.history, 150);
    const vwmaHistory = calculateHistoricalVWMA(displayStock.history, 20);
    const bbHistory = calculateHistoricalBollinger(displayStock.history, 20, 2);
    const patternMap = new Map<string, {price: number, label?: string}>();
    if (displayStock.patternOverlay) displayStock.patternOverlay.forEach(p => patternMap.set(p.date, { price: p.price, label: p.label }));
    return displayStock.history.map((h, i) => {
        const lowerBB = bbHistory[i]?.lower; const upperBB = bbHistory[i]?.upper;
        const pat = patternMap.get(h.date);
        return {
            date: h.date, price: Number(h.close.toFixed(1)),
            sma150: sma150History[i] ? Number(sma150History[i]?.toFixed(1)) : null,
            vwma: vwmaHistory[i] ? Number(vwmaHistory[i]?.toFixed(1)) : null,
            upper: upperBB ? Number(upperBB.toFixed(1)) : null,
            lower: lowerBB ? Number(lowerBB.toFixed(1)) : null,
            bbRange: (lowerBB && upperBB) ? [Number(lowerBB.toFixed(1)), Number(upperBB.toFixed(1))] : null,
            sar: displayStock.technicalData.sar ? Number(displayStock.technicalData.sar.toFixed(1)) : null,
            pattern: pat ? pat.price : null, patternLabel: pat ? pat.label : null
        };
    });
  }, [displayStock.history, displayStock.technicalData, displayStock.patternOverlay]);

  const actualReturnFromEngine = displayStock.backtest?.actualReturn || 0;
  const indicatorsSorted = [...displayStock.indicators].sort((a, b) => b.score - a.score);

  const handleChartClick = (e: any) => {
    if (!e || !e.activePayload) return;
    const clickedPrice = e.activePayload[0].payload.price;
    const clickedDate = e.activePayload[0].payload.date;
    if (fibMode) {
      if (fibPoints.length < 2) {
        setFibPoints(prev => [...prev, { price: clickedPrice, date: clickedDate }]);
        if (fibPoints.length === 1) setFibMode(false);
      }
      return;
    }
    if (riskMode) setCustomRiskEntry(clickedPrice);
  };

  const clearFib = () => { setFibPoints([]); setFibMode(false); };
  const toggleRiskMode = () => { if (riskMode) { setRiskMode(false); setCustomRiskEntry(null); } else { setRiskMode(true); setFibMode(false); setFibPoints([]); } };

  const renderFibLines = () => {
    if (fibPoints.length !== 2) return null;
    const start = fibPoints[0]; const end = fibPoints[1];
    const isUptrend = end.price > start.price; const range = Math.abs(end.price - start.price);
    const levels = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];
    return levels.map(level => {
      let yValue = isUptrend ? end.price - (range * level) : end.price + (range * level);
      return (
        <ReferenceLine key={level} y={yValue} stroke="#FCD34D" strokeDasharray={level === 0 || level === 1 ? "0" : "3 3"} strokeWidth={level === 0 || level === 1 ? 2 : 1}
          label={{ position: 'right', value: `${(level * 100).toFixed(1)}% ($${yValue.toFixed(1)})`, fill: '#FCD34D', fontSize: 10, fontWeight: level === 0.618 ? 'bold' : 'normal' }} 
        />
      );
    });
  };

  const renderRiskVisuals = () => {
    if (!riskMode) return null;
    const baseEntry = customRiskEntry || displayStock.riskAnalysis.entryPrice;
    const atr = displayStock.technicalData.atr;
    const slDistance = customRiskEntry ? (2 * atr) : (displayStock.riskAnalysis.entryPrice - displayStock.riskAnalysis.stopLoss);
    const finalSlDist = Math.abs(slDistance) > 0 ? Math.abs(slDistance) : 2 * atr;
    const slPrice = baseEntry - finalSlDist; const tpPrice = baseEntry + (finalSlDist * 2);
    return (
      <>
        <ReferenceArea y1={baseEntry} y2={tpPrice} fill="#10B981" fillOpacity={0.1} />
        <ReferenceArea y1={slPrice} y2={baseEntry} fill="#EF4444" fillOpacity={0.1} />
        <ReferenceLine y={baseEntry} stroke="#3B82F6" strokeDasharray="3 3" label={{ position: 'insideLeft', value: 'ENTRY', fill: '#3B82F6', fontSize: 10 }} />
        <ReferenceLine y={slPrice} stroke="#EF4444" label={{ position: 'insideLeft', value: `STOP $${slPrice.toFixed(2)}`, fill: '#EF4444', fontSize: 10 }} />
        <ReferenceLine y={tpPrice} stroke="#10B981" label={{ position: 'insideLeft', value: `TARGET $${tpPrice.toFixed(2)} (1:2)`, fill: '#10B981', fontSize: 10 }} />
      </>
    );
  };

  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 p-3 rounded-lg shadow-2xl text-xs z-50 min-w-[140px]">
          <p className="font-mono font-bold text-gray-300 mb-2 border-b border-gray-700 pb-1">{new Date(data.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</p>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center gap-4"><span className="text-blue-400 font-semibold">Price</span><span className="font-mono text-white">${data.price.toFixed(2)}</span></div>
            {data.sma150 && (<div className="flex justify-between items-center gap-4"><span className="text-yellow-500">SMA 150</span><span className="font-mono text-gray-200">${data.sma150.toFixed(2)}</span></div>)}
            {data.vwma && (<div className="flex justify-between items-center gap-4"><span className="text-purple-400">VWAP (20)</span><span className="font-mono text-gray-200">${data.vwma.toFixed(2)}</span></div>)}
            {data.upper && (<div className="flex justify-between items-center gap-4"><span className="text-emerald-400">BB High</span><span className="font-mono text-gray-200">${data.upper.toFixed(2)}</span></div>)}
            {data.lower && (<div className="flex justify-between items-center gap-4"><span className="text-emerald-400">BB Low</span><span className="font-mono text-gray-200">${data.lower.toFixed(2)}</span></div>)}
            {data.sar && (<div className="flex justify-between items-center gap-4"><span className="text-purple-400">SAR</span><span className="font-mono text-gray-200">${data.sar.toFixed(2)}</span></div>)}
          </div>
        </div>
      );
    }
    return null;
  };

  const BacktestTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const equity = data.equity;
      const startEquity = 10000;
      const percentChange = ((equity - startEquity) / startEquity) * 100;
      const trades = displayStock.backtest?.trades || [];
      const currentDatStr = data.date;
      
      const activeTrade = trades.find(t => {
          const isAfterOrOnEntry = currentDatStr >= t.entryDate;
          const isBeforeExit = !t.exitDate || currentDatStr < t.exitDate;
          return isAfterOrOnEntry && isBeforeExit;
      });

      const status = activeTrade ? "LONG (In Market)" : "CASH (Sidelines)";
      const statusColor = activeTrade ? "text-green-400" : "text-gray-400";

      return (
        <div className="bg-gray-900/95 backdrop-blur-md border border-gray-700 p-3 rounded-lg shadow-2xl text-xs z-50 min-w-[160px]">
          <p className="font-mono font-bold text-gray-300 mb-2 border-b border-gray-700 pb-1">{new Date(data.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center gap-4"><span className="text-purple-400 font-semibold">Equity</span><span className="font-mono text-white text-lg font-bold">${Math.round(equity).toLocaleString()}</span></div>
            <div className="flex justify-between items-center gap-4"><span className="text-gray-400">Return</span><span className={`font-mono font-bold ${percentChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>{percentChange > 0 ? '+' : ''}{percentChange.toFixed(2)}%</span></div>
            {data.isEntry && (
              <div className="mt-2 pt-2 border-t border-gray-800">
                <div className={`${data.isPrime ? 'text-yellow-400' : 'text-blue-400'} font-bold text-[10px] uppercase flex items-center gap-1`}>
                  <Target size={10} /> {data.entryReason || 'Signal Detected'}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center gap-4 mt-2 pt-2 border-t border-gray-800"><span className="text-gray-500">Status</span><span className={`font-bold uppercase ${statusColor}`}>{status}</span></div>
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomPrimeMarker = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.isEntry) {
      const isPrime = payload.isPrime;
      return (
        <g>
          <circle cx={cx} cy={cy} r={isPrime ? 6 : 4} fill={isPrime ? "#FACC15" : "#3B82F6"} className={isPrime ? "animate-pulse" : ""} />
          <circle cx={cx} cy={cy} r={isPrime ? 3 : 1.5} fill="#000" />
        </g>
      );
    }
    return null;
  };

  const isDataLive = displayStock.analysisTimestamp && (Date.now() - displayStock.analysisTimestamp) < 300000;
  const analysisTime = displayStock.analysisTimestamp ? new Date(displayStock.analysisTimestamp).toLocaleTimeString() : '';
  const avgHistoryScore = displayStock.scoreHistory.length > 0 ? displayStock.scoreHistory.reduce((sum, item) => sum + item.score, 0) / displayStock.scoreHistory.length : displayStock.totalScore;
  const isTrendUp = displayStock.totalScore >= avgHistoryScore;
  const getScoreColorHex = (score: number) => { if (score >= 7) return '#10B981'; if (score >= 4.5) return '#FACC15'; return '#EF4444'; };
  const currentScoreColor = getScoreColorHex(displayStock.totalScore);
  const patternStr = displayStock.indicators.find(i => i.name === 'Structure & Patterns')?.value as string;
  let detectedPattern: string | null = null; let patternColor = "#8B5CF6"; let patternWidth = 2; let patternDash = "5 5"; let patternType: "monotone" | "linear" = "linear"; let showPatternDots = true;
  if (patternStr && patternStr.includes('Cup')) { detectedPattern = 'Cup & Handle'; patternColor = "#FACC15"; patternWidth = 4; patternDash = "0"; patternType = "monotone"; showPatternDots = false; }
  else if (patternStr && patternStr.includes('Elliott')) { detectedPattern = 'Elliott Impulse'; patternColor = "#FFFFFF"; patternWidth = 2; patternDash = "0"; patternType = "linear"; showPatternDots = true; }
  else if (patternStr && patternStr.includes('Reversal')) { detectedPattern = 'Double Bottom / Inv. H&S'; patternColor = "#10B981"; patternWidth = 3; patternDash = "2 2"; patternType = "linear"; showPatternDots = true; }
  const CustomPatternDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (payload.pattern && payload.patternLabel) {
      return (
        <g><circle cx={cx} cy={cy} r={4} fill={patternColor} stroke="none" />
          <text x={cx} y={cy - 10} fill={patternColor} textAnchor="middle" fontSize={12} fontWeight="bold" style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.8)' }}>{payload.patternLabel}</text>
        </g>
      );
    }
    if (payload.pattern && showPatternDots) return <circle cx={cx} cy={cy} r={4} fill={patternColor} stroke="none" />;
    return null;
  };
  const hasHistory = displayStock.history && displayStock.history.length > 0;
  
  // FIX: Use isPrimeSetup from engine for consistency across all views
  const isPrime = displayStock.isPrimeSetup;

  const isSqueeze = displayStock.technicalData.squeezeOn; const rsiDiv = displayStock.technicalData.rsiDivergence;
  const atrPercent = displayStock.currentPrice > 0 ? (displayStock.technicalData.atr / displayStock.currentPrice) * 100 : 0;
  const avgVol30 = displayStock.history && displayStock.history.length > 0 ? displayStock.history.slice(Math.max(0, displayStock.history.length - 30)).reduce((acc, c) => acc + c.volume, 0) / Math.min(30, displayStock.history.length) : displayStock.technicalData.volumeAvg20;
  const rvol = displayStock.technicalData.volumeAvg20 > 0 ? displayStock.technicalData.lastVolume / displayStock.technicalData.volumeAvg20 : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>
      <div className="relative bg-gray-900 border border-gray-700 w-full max-w-7xl max-h-[95vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col custom-scrollbar">
        <div className="sticky top-0 z-10 bg-gray-900/95 border-b border-gray-800 p-4 sm:p-6 flex justify-between items-start backdrop-blur">
          <div className="flex-1 pr-2">
             <div className="flex items-start gap-4 mb-4">
                 <div className="w-12 h-12 sm:w-14 sm:h-14 bg-white rounded-xl flex items-center justify-center overflow-hidden border border-gray-600 shrink-0 p-1.5 shadow-lg">
                    <img src={`https://financialmodelingprep.com/image-stock/${displayStock.ticker}.png`} alt={displayStock.ticker} className="w-full h-full object-contain" onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${displayStock.ticker}&background=0f172a&color=fff&size=128&font-size=0.33&bold=true`; }} />
                 </div>
                 <div className="flex-1 min-w-0">
                     <div className="flex flex-col sm:flex-row sm:items-baseline gap-2 mb-1">
                        <h2 className="text-2xl sm:text-3xl font-bold text-white leading-tight">{displayStock.companyName || displayStock.ticker}</h2>
                        <span className="text-xl sm:text-2xl font-mono text-gray-500 font-medium">({displayStock.ticker})</span>
                        <div className="flex flex-wrap items-center gap-2 mt-1 sm:mt-0 sm:ml-2">
                            <span className={`text-xs font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${displayStock.recommendation === Recommendation.STRONG_BUY ? 'bg-green-500/20 text-green-400 border-green-500/30' : displayStock.recommendation === Recommendation.BUY ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : displayStock.recommendation === Recommendation.HOLD ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' : 'bg-red-500/20 text-red-400 border-red-500/30'}`}>{displayStock.recommendation}</span>
                            {isPrime && (<span className="bg-yellow-500/20 text-yellow-400 border border-yellow-500/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 animate-pulse"><Target size={12} /> Prime</span>)}
                            {isSqueeze && (<span className="bg-orange-500/20 text-orange-400 border border-orange-500/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Zap size={12} className="fill-current" /> Squeeze</span>)}
                            {rsiDiv === 'BULLISH' && (<span className="bg-blue-500/20 text-blue-400 border border-blue-500/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><Activity size={12} /> RSI Div+</span>)}
                            {rsiDiv === 'BEARISH' && (<span className="bg-red-500/20 text-red-400 border border-red-500/40 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"><AlertTriangle size={12} /> RSI Div-</span>)}
                        </div>
                     </div>
                     <div className="flex flex-wrap items-center gap-4">{displayStock.sector ? (<span className="flex items-center gap-1.5 text-purple-300 text-sm font-medium tracking-wide"><Layers size={14} /> {displayStock.sector}</span>) : (<span className="text-gray-500 text-xs italic">Loading sector...</span>)}</div>
                 </div>
             </div>
             <div className="flex items-end gap-3 mb-2 flex-wrap"><div className="flex items-end gap-2"><span className="text-xl sm:text-2xl font-mono text-white">${displayStock.currentPrice.toFixed(2)}</span><span className={`text-sm font-medium mb-1 ${displayStock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>{displayStock.changePercent > 0 ? '+' : ''}{displayStock.changePercent.toFixed(2)}%</span></div></div>
             <div className="hidden sm:flex items-center gap-3 mt-2 bg-gray-800/50 px-3 py-2 rounded-md border border-gray-700 w-fit"><p className="text-gray-300 text-sm font-medium">Analysis Thesis: <span className="text-blue-300 italic">{displayStock.riskAnalysis.thesis}</span></p></div>
             <div className="hidden sm:flex items-center gap-4 mt-2"><div className="flex items-center gap-2"><span className={`w-2 h-2 rounded-full ${isDataLive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`}></span><span className="text-[10px] text-gray-500 uppercase tracking-wider">Data: {isDataLive ? 'Live / Intraday' : 'End of Day'} • Updated: {analysisTime}</span></div><div className="flex items-center gap-2"><Activity size={12} className="text-purple-400" /><span className="text-[10px] text-gray-500 uppercase tracking-wider">Weekly Trend: <span className={`font-bold ${displayStock.technicalData.weeklyTrend === 'BULLISH' ? 'text-green-400' : displayStock.technicalData.weeklyTrend === 'BEARISH' ? 'text-red-400' : 'text-gray-400'}`}>{displayStock.technicalData.weeklyTrend}</span></span></div></div>
          </div>
          <div className="flex flex-col items-end gap-2 sm:flex-row-reverse sm:items-center"><button onClick={onClose} className="p-1.5 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white"><X size={24} /></button><button onClick={() => setShowAlertModal(true)} className="flex items-center justify-center p-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors shadow-lg shadow-blue-900/20" title="Set Alert"><Bell size={20} /><span className="hidden sm:inline ml-2 text-sm font-semibold">Set Alert</span></button></div>
        </div>
        {/* ... Rest of the component kept same ... */}
        <div className="sm:hidden px-4 py-3 bg-gray-800/30 border-b border-gray-800"><div className="flex flex-col gap-2 mb-2"><p className="text-gray-300 text-xs italic leading-tight">{displayStock.riskAnalysis.thesis}</p></div><div className="flex justify-between mt-2"><div className="flex items-center gap-2"><span className={`w-1.5 h-1.5 rounded-full ${isDataLive ? 'bg-green-500' : 'bg-gray-500'}`}></span><span className="text-[10px] text-gray-500 uppercase">{isDataLive ? 'Live' : 'EOD'}</span></div><span className="text-[10px] text-gray-500 uppercase">Wkly: <span className={`font-bold ${displayStock.technicalData.weeklyTrend === 'BULLISH' ? 'text-green-400' : displayStock.technicalData.weeklyTrend === 'BEARISH' ? 'text-red-400' : 'text-gray-400'}`}>{displayStock.technicalData.weeklyTrend}</span></span></div></div>
        <div className="p-4 sm:p-6 grid grid-cols-1 xl:grid-cols-3 gap-8">
          <div className="xl:col-span-2 space-y-6">
            <div className="bg-gray-850 rounded-xl p-4 border border-gray-800 relative">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-semibold text-gray-200">Price Action</h3>
                <div className="flex items-center gap-2"><button onClick={() => setShowBacktest(!showBacktest)} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border ${showBacktest ? 'bg-purple-500/20 text-purple-400 border-purple-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`}><Clock size={16} /><span className="hidden sm:inline">Backtest</span></button><div className="flex items-center gap-1">{fibPoints.length > 0 && (<button onClick={clearFib} className="flex items-center gap-1 text-xs px-2 py-1 bg-red-900/30 text-red-400 rounded border border-red-900/50 hover:bg-red-900/50"><RotateCcw size={12} /></button>)}<button onClick={() => { setFibMode(!fibMode); setFibPoints([]); setRiskMode(false); }} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border ${fibMode ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`} title="Fibonacci Retracement"><Ruler size={16} /><span className="hidden sm:inline">{fibMode ? (fibPoints.length === 0 ? 'Click Start' : 'Click End') : 'Fib Tool'}</span></button></div><button onClick={toggleRiskMode} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-all border ${riskMode ? 'bg-blue-500/20 text-blue-400 border-blue-500/50' : 'bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700'}`} title="Risk/Reward Visualizer"><Crosshair size={16} /><span className="hidden sm:inline">Risk Tool</span></button></div>
              </div>
              <div className={`h-[300px] sm:h-[400px] w-full min-w-0 min-h-0 ${fibMode || riskMode ? 'cursor-crosshair' : ''} relative`}>
                 {(!hasHistory || loadingHistory) && (<div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gray-900/50 backdrop-blur-sm rounded-lg"><Loader2 className="animate-spin text-blue-500 mb-2" size={32} /><span className="text-sm text-gray-300">Loading Full History...</span></div>)}
                 {hasHistory && !showBacktest && isChartReady && (
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <AreaChart data={chartData} onClick={handleChartClick} margin={{ right: 40 }} >
                        <defs><linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/><stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/></linearGradient></defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                        <XAxis dataKey="date" tick={{fill: '#9CA3AF', fontSize: 12}} tickFormatter={formatDateTick} minTickGap={30} />
                        <YAxis domain={['auto', 'auto']} tick={{fill: '#9CA3AF', fontSize: 12}} width={40} tickFormatter={(val) => Number(val).toFixed(1)} />
                        <Tooltip content={<CustomChartTooltip />} cursor={{ stroke: '#6B7280', strokeWidth: 1, strokeDasharray: '4 4' }} />
                        <Area type="monotone" dataKey="bbRange" stroke="none" fill={displayStock.technicalData.squeezeOn ? "#F97316" : "#10B981"} fillOpacity={0.15} isAnimationActive={false} />
                        <Area type="monotone" dataKey="upper" stroke={displayStock.technicalData.squeezeOn ? "#F97316" : "#10B981"} fill="none" strokeWidth={1} strokeOpacity={0.5} name="Upper BB" isAnimationActive={false} dot={false} />
                        <Area type="monotone" dataKey="lower" stroke={displayStock.technicalData.squeezeOn ? "#F97316" : "#10B981"} fill="none" strokeWidth={1} strokeOpacity={0.5} name="Lower BB" isAnimationActive={false} dot={false} />
                        <Area type="monotone" dataKey="price" stroke="#3B82F6" fillOpacity={1} fill="url(#colorPrice)" strokeWidth={2} isAnimationActive={false} />
                        <Area type="monotone" dataKey="sma150" stroke="#F59E0B" fill="none" strokeWidth={1.5} strokeDasharray="5 5" name="SMA 150" isAnimationActive={false} dot={false} />
                        <Area type="monotone" dataKey="vwma" stroke="#A855F7" fill="none" strokeWidth={1.5} name="VWAP (20)" isAnimationActive={false} dot={false} />
                        {displayStock.patternOverlay && (<Line type={patternType} dataKey="pattern" stroke={patternColor} strokeWidth={patternWidth} strokeDasharray={patternDash} dot={<CustomPatternDot />} connectNulls={true} name="Chart Pattern" isAnimationActive={true} animationDuration={1500} />)}
                        {detectedPattern && (<ReferenceLine y={displayStock.technicalData.resistanceLevel} stroke="none" strokeWidth={1} strokeDasharray="2 2" label={{ position: 'insideTopLeft', value: `⚑ ${detectedPattern}`, fill: patternColor, fontSize: 12, fontWeight: 'bold', dy: -10 }} />)}
                        {renderFibLines()}
                        {fibPoints.map((pt, idx) => (<ReferenceLine key={idx} x={pt.date} stroke="#FCD34D" strokeDasharray="3 3" />))}
                        {renderRiskVisuals()}
                      </AreaChart>
                    </ResponsiveContainer>
                 )}
                 {hasHistory && showBacktest && displayStock.backtest && isChartReady && (
                     <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                         <ComposedChart data={displayStock.backtest.equityCurve}>
                             <defs><linearGradient id="equityGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/><stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/></linearGradient></defs>
                             <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
                             <XAxis dataKey="date" tick={{fill: '#9CA3AF', fontSize: 12}} minTickGap={30} tickFormatter={formatDateTick}/>
                             <YAxis domain={['auto', 'auto']} tick={{fill: '#9CA3AF', fontSize: 12}} width={40}/>
                             <Tooltip content={<BacktestTooltip />} cursor={{ stroke: '#6B7280', strokeWidth: 1, strokeDasharray: '4 4' }} />
                             <Area type="monotone" dataKey="equity" stroke="#8B5CF6" fill="url(#equityGradient)" name="Account Equity ($)" />
                             <Scatter dataKey="equity" shape={<CustomPrimeMarker />} />
                         </ComposedChart>
                     </ResponsiveContainer>
                 )}
              </div>
              {showBacktest && displayStock.backtest && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-4 bg-gray-900 rounded-lg p-4 border border-purple-500/20">
                      <div><p className="text-[10px] text-gray-500 uppercase">Trades</p><p className="text-white font-mono font-bold">{displayStock.backtest.totalTrades}</p></div>
                      <div><p className="text-[10px] text-gray-500 uppercase">Win Rate</p><p className={`${displayStock.backtest.winRate > 50 ? 'text-green-400' : 'text-red-400'} font-mono font-bold`}>{displayStock.backtest.winRate.toFixed(1)}%</p></div>
                      <div><p className="text-[10px] text-gray-500 uppercase">Est. Return (252D)</p><p className={`${displayStock.backtest.totalReturn > 0 ? 'text-green-400' : 'text-red-400'} font-mono font-bold`}>{displayStock.backtest.totalReturn > 0 ? '+' : ''}{displayStock.backtest.totalReturn.toFixed(1)}%</p></div>
                      <div><p className="text-[10px] text-gray-500 uppercase">Act. Return (B&H)</p><p className={`${actualReturnFromEngine > 0 ? 'text-green-400' : 'text-red-400'} font-mono font-bold`}>{actualReturnFromEngine > 0 ? '+' : ''}{actualReturnFromEngine.toFixed(1)}%</p></div>
                      <div className="flex flex-col items-end justify-center"><p className="text-[10px] text-gray-500 uppercase">Current Status</p><p className={`font-mono font-bold uppercase ${displayStock.backtest.currentStatus === 'Long' ? 'text-green-400' : 'text-gray-400'}`}>{displayStock.backtest.currentStatus || 'CASH'}</p></div>
                  </div>
              )}
              {showBacktest && (
                <div className="mt-2 text-center text-[10px] text-gray-600 flex items-center justify-center gap-4 uppercase tracking-widest">
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-yellow-400" /> Elite Prime Signal</div>
                  <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-blue-500" /> Standard Technical Entry</div>
                </div>
              )}
              {fibMode && (<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"><div className="bg-gray-900/90 border border-yellow-500/30 px-4 py-2 rounded text-yellow-400 text-sm shadow-xl">{fibPoints.length === 0 ? 'Select Swing High/Low' : 'Select Second Point'}</div></div>)}
              {riskMode && (<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"><div className="bg-gray-900/90 border border-blue-500/30 px-4 py-2 rounded text-blue-400 text-sm shadow-xl">{customRiskEntry ? 'Showing Risk Zones' : 'Click Chart to Plan Entry'}</div></div>)}
            </div>
            {/* ... Remaining part of the file kept same ... */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <div className="bg-gray-850 p-3 rounded-xl border border-gray-800"><p className="text-xs text-gray-400 mb-1">Market Cap</p><p className="font-mono text-lg font-bold text-white tracking-tight">{formatMarketCap(displayStock.marketCap)}</p></div>
              <div className="bg-gray-850 p-3 rounded-xl border border-gray-800"><p className="text-xs text-gray-400 mb-1">Beta</p><p className={`font-mono text-lg font-bold ${(displayStock.beta || 1) > 1.3 ? 'text-orange-400' : (displayStock.beta || 1) < 0.8 ? 'text-blue-400' : 'text-white'}`}>{displayStock.beta ? displayStock.beta.toFixed(2) : 'N/A'}</p></div>
              <div className="bg-gray-850 p-3 rounded-xl border border-gray-800"><p className="text-xs text-gray-400 mb-1">Rel Vol (RVOL)</p><p className={`font-mono text-lg font-bold ${rvol >= 1.2 ? 'text-green-400' : rvol >= 0.8 ? 'text-white' : 'text-red-400'}`}>{rvol.toFixed(2)}x</p></div>
              <div className="bg-gray-850 p-3 rounded-xl border border-gray-800"><p className="text-xs text-gray-400 mb-1">Avg Vol (30D)</p><p className="font-mono text-lg font-bold text-blue-400">{formatVolumeCompact(avgVol30)}</p></div>
              <div className="bg-gray-850 p-3 rounded-xl border border-gray-800"><p className="text-xs text-gray-400 mb-1">Volatility (ATR)</p><p className="font-mono text-lg font-bold text-white">{atrPercent.toFixed(2)}%</p></div>
            </div>
            <div className="bg-gray-850 rounded-xl border border-gray-700 overflow-hidden">
               <div className="bg-gray-800/80 px-6 py-3 border-b border-gray-700 flex justify-between items-center"><h3 className="font-bold text-white flex items-center gap-2"><ShieldAlert className="text-blue-400" size={20} />Risk Management Plan</h3><div className="text-sm text-gray-400">Risk/Reward: <span className="text-white font-bold">{displayStock.riskAnalysis.riskRewardRatio.toFixed(2)}</span></div></div>
               <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-red-900/10 border border-red-900/30 rounded-lg p-4 relative group hover:bg-red-900/20 transition-colors"><div className="absolute top-3 right-3 text-red-500 opacity-50"><ShieldAlert size={18}/></div><p className="text-xs text-red-300 uppercase font-bold tracking-wider mb-1">Stop Loss (SL)</p><p className="text-2xl font-mono text-white">${displayStock.riskAnalysis.stopLoss.toFixed(2)}</p><p className="text-xs text-red-400 mt-2">{((displayStock.riskAnalysis.stopLoss - displayStock.riskAnalysis.entryPrice) / displayStock.riskAnalysis.entryPrice * 100).toFixed(2)}% Downside</p><div className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-red-900/30">Source: {displayStock.riskAnalysis.slSource}</div></div>
                  <div className="bg-gray-800/30 border border-gray-700 rounded-lg p-4 relative text-center flex flex-col justify-center"><p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Recommended Entry</p><p className="text-3xl font-mono text-white font-bold">${displayStock.riskAnalysis.entryPrice.toFixed(2)}</p><div className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-gray-700/50">{displayStock.riskAnalysis.entrySource}</div></div>
                  <div className="bg-green-900/10 border border-green-900/30 rounded-lg p-4 relative group hover:bg-green-900/20 transition-colors"><div className="absolute top-3 right-3 text-green-500 opacity-50"><ArrowUpRight size={18}/></div><p className="text-xs text-green-300 uppercase font-bold tracking-wider mb-1">Take Profit (TP)</p><p className="text-2xl font-mono text-white">${displayStock.riskAnalysis.takeProfit.toFixed(2)}</p><p className="text-xs text-green-400 mt-2">+{((displayStock.riskAnalysis.takeProfit - displayStock.riskAnalysis.entryPrice) / displayStock.riskAnalysis.entryPrice * 100).toFixed(2)}% Upside</p><div className="text-[10px] text-gray-500 mt-2 pt-2 border-t border-green-900/30">Source: {displayStock.riskAnalysis.tpSource}</div></div>
               </div>
            </div>
            <div className="bg-gray-850 rounded-xl border border-gray-700 overflow-hidden">
                <div className="bg-gray-800/80 px-6 py-3 border-b border-gray-700 flex justify-between items-center"><h3 className="font-bold text-white flex items-center gap-2"><Briefcase className="text-blue-400" size={20} />Position Management</h3><div className="flex items-center gap-2"><input type="checkbox" id="hasPos" checked={hasPosition} onChange={(e) => { setHasPosition(e.target.checked); if(!e.target.checked) setTradeAdvice(null); }} className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-blue-600 focus:ring-blue-500"/><label htmlFor="hasPos" className="text-sm text-gray-300 cursor-pointer select-none">I hold this stock</label></div></div>
                <div className="p-6">{hasPosition ? (<div className="grid grid-cols-1 md:grid-cols-2 gap-8"><div className="space-y-4"><div className="grid grid-cols-2 gap-4"><div><label className="text-xs text-gray-500 mb-1 block">Avg Entry Price</label><div className="relative"><span className="absolute left-3 top-2 text-gray-500">$</span><input type="number" value={entryPrice} onChange={(e) => setEntryPrice(e.target.value)} placeholder="0.00" className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 pl-6 text-white focus:outline-none focus:border-blue-500"/></div></div><div><label className="text-xs text-gray-500 mb-1 block">Shares</label><input type="number" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="0" className="w-full bg-gray-800 border border-gray-600 rounded px-3 py-2 text-white focus:outline-none focus:border-blue-500"/></div></div><button onClick={handleSavePosition} className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition-colors text-sm font-semibold"><Save size={16} /> Update Position</button>{tradeAdvice && (<div className="mt-4 p-3 bg-gray-800/50 rounded-lg flex justify-between items-center border border-gray-700"><div><p className="text-xs text-gray-400">Current P&L</p><p className={`text-lg font-bold ${tradeAdvice.pnlPercentage >= 0 ? 'text-green-400' : 'text-red-400'}`}>{tradeAdvice.pnlPercentage > 0 ? '+' : ''}{tradeAdvice.pnlPercentage}%</p></div><div className="text-right"><p className="text-xs text-gray-400">Value</p><p className="text-lg font-bold text-white">${(displayStock.currentPrice * (parseFloat(shares) || 0)).toLocaleString()}</p></div></div>)}</div><div className="bg-gray-800/30 border border-gray-700 rounded-xl p-5 relative overflow-hidden">{tradeAdvice ? (<><div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div><h4 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3 flex items-center gap-2">AI Trade Advisor</h4><div className="flex items-center gap-3 mb-4"><div className={`px-3 py-1.5 rounded-lg font-bold text-sm uppercase ${tradeAdvice.action === 'BUY MORE' ? 'bg-green-500/20 text-green-400' : tradeAdvice.action === 'SELL / TRIM' ? 'bg-orange-500/20 text-orange-400' : tradeAdvice.action === 'CUT LOSS' ? 'bg-red-500/20 text-red-400' : tradeAdvice.action === 'TAKE PROFIT' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{tradeAdvice.action}</div><span className="text-xs text-gray-500">Based on score {displayStock.totalScore} & entry</span></div><p className="text-sm text-gray-300 italic mb-4">"{tradeAdvice.reason}"</p><div className="grid grid-cols-2 gap-4 border-t border-gray-700/50 pt-3"><div><p className="text-[10px] text-gray-500 uppercase">Suggested Stop</p><p className="text-red-400 font-mono font-bold">${tradeAdvice.suggestedStop}</p></div><div><p className="text-[10px] text-gray-500 uppercase">Next Target</p><p className="text-green-400 font-mono font-bold">${tradeAdvice.suggestedTarget}</p></div></div></>) : (<div className="h-full flex flex-col items-center justify-center text-center text-gray-500 p-4"><Briefcase className="mb-2 opacity-20" size={32} /><p className="text-sm">Enter position details to get live AI management advice.</p></div>)}</div></div>) : (<div className="text-center py-6 text-gray-500"><p>Check the box above to track your position and receive active management advice.</p></div>)}</div>
            </div>
          </div>
          <div className="flex flex-col gap-6 h-full">
            <div className="bg-gray-850 p-6 rounded-xl border border-gray-800 text-center shadow-lg relative overflow-hidden flex-shrink-0"><div className="absolute top-2 right-2 opacity-20">{isTrendUp ? <TrendingUp size={80} className="text-green-500" /> : <TrendingDown size={80} className="text-red-500" />}</div><p className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-4">Total Technical Score</p><div className="relative inline-flex items-center justify-center"><svg viewBox="0 0 160 160" className="w-32 h-32 transform -rotate-90"><circle className="text-gray-800" strokeWidth="10" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80"/><circle className={`${displayStock.totalScore >= 7 ? 'text-accent-green' : displayStock.totalScore >= 4 ? 'text-yellow-500' : 'text-accent-red'}`} strokeWidth="10" strokeDasharray={440} strokeDashoffset={440 - (440 * displayStock.totalScore) / 10} strokeLinecap="round" stroke="currentColor" fill="transparent" r="70" cx="80" cy="80"/></svg><div className="absolute flex flex-col items-center"><span className="text-4xl font-bold text-white">{displayStock.totalScore}</span><span className="text-xs text-gray-500 uppercase mt-1">out of 10</span></div></div>{displayStock.scoreHistory && displayStock.scoreHistory.length > 0 && (<div className="mt-6 pt-4 border-t border-gray-700"><div className="flex justify-between items-center mb-2"><p className="text-[10px] uppercase text-gray-500 tracking-wider">7-Day Score Trend</p><div className={`flex items-center text-xs font-bold ${isTrendUp ? 'text-green-400' : 'text-red-400'}`}>{isTrendUp ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}{isTrendUp ? 'Rising' : 'Falling'}</div></div><div className="h-24 w-full mt-2 min-w-0 min-h-0"><ResponsiveContainer width="100%" height="100%" minWidth={0}><AreaChart data={[...displayStock.scoreHistory, { date: 'Today', score: displayStock.totalScore }]}><defs><linearGradient id="scoreGradient" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={currentScoreColor} stopOpacity={0.3}/><stop offset="95%" stopColor={currentScoreColor} stopOpacity={0}/></linearGradient></defs><XAxis dataKey="date" hide /><YAxis domain={[0, 10]} hide /><Tooltip contentStyle={{backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', fontSize: '12px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} itemStyle={{color: '#fff'}} formatter={(value: any) => [value, 'Score']} labelStyle={{color: '#9CA3AF', marginBottom: '4px'}}/><Area type="monotone" dataKey="score" stroke={currentScoreColor} fill="url(#scoreGradient)" strokeWidth={2} dot={{ fill: currentScoreColor, r: 3, strokeWidth: 0 }}/></AreaChart></ResponsiveContainer></div></div>)}</div>
            <div className="bg-gray-850 rounded-xl border border-gray-800 overflow-hidden xl:flex-1 flex flex-col"><div className="p-4 bg-gray-800/50 border-b border-gray-700 flex-shrink-0"><h3 className="font-semibold text-white">Indicator Breakdown</h3></div><div className="p-3 space-y-1 overflow-y-auto pr-2 custom-scrollbar h-[300px] xl:h-0 xl:flex-1 xl:min-h-0">{indicatorsSorted.map((ind, idx) => (<div key={idx} title={ind.criteria} className="flex items-start gap-3 p-1.5 hover:bg-gray-800/40 rounded-lg transition-colors cursor-help"><div className={`mt-1 p-1 rounded-full ${ind.score >= 7 ? 'bg-green-500/20 text-green-400' : ind.score <= 3 ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400'}`}>{ind.score >= 7 ? <CheckCircle size={14} /> : ind.score <= 3 ? <AlertTriangle size={14} /> : <div className="w-3.5 h-3.5 rounded-full bg-gray-500" />}</div><div className="flex-1"><div className="flex justify-between items-center mb-1"><span className="text-sm font-medium text-gray-200">{ind.name}</span><div className="flex items-center gap-2"><span className="text-[10px] text-gray-600 bg-gray-800 px-1 rounded">{(ind.weight * 100).toFixed(0)}%</span><span className={`text-sm font-bold ${ind.score >= 8 ? 'text-green-400' : ind.score <= 3 ? 'text-red-400' : 'text-yellow-400'}`}>{ind.score}</span></div></div><p className="text-xs text-gray-500 leading-tight">{ind.description}</p><div className="mt-1 text-[10px] text-gray-500">Val: <span className="text-gray-300 font-mono">{ind.value}</span></div></div></div>))}</div></div>
          </div>
        </div>
      </div>
      {showAlertModal && (<AlertModal stock={displayStock} onClose={() => setShowAlertModal(false)} />)}
    </div>
  );
};

export default DetailView;
