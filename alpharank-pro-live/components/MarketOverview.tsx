
import React, { useEffect, useState } from 'react';
import { MarketMacroData, fetchMarketMacro } from '../services/marketService';
import { TrendingUp, TrendingDown, Activity, Zap, Globe, BarChart3, Compass, ShieldCheck, Database, Target, Percent, Scale, LineChart, Landmark, Loader2, X, ChevronRight, DollarSign, Calendar, AlertTriangle, ArrowUpRight, Info, ExternalLink, EyeOff } from 'lucide-react';
import { StockResult } from '../types';
import { ResponsiveContainer, AreaChart, Area, Tooltip, XAxis } from 'recharts';

interface Props {
    onSelectIndex: (stock: StockResult) => void;
}

const VitalTooltip: React.FC<{ title: string; body: string; current: string | number }> = ({ title, body, current }) => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 bg-gray-950 border border-gray-700 p-4 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 scale-95 group-hover:scale-100 origin-bottom">
        <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest">{title}</h4>
        </div>
        <p className="text-gray-400 text-[11px] leading-relaxed mb-3 border-b border-gray-800 pb-3">{body}</p>
        <div className="flex justify-between items-center text-[9px] font-black">
            <span className="text-gray-600 uppercase tracking-widest">LIVE DATA</span>
            <span className="text-white px-2 py-0.5 bg-gray-800 rounded-md border border-gray-700">{current}</span>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-700"></div>
    </div>
);

const MarketOverview: React.FC<Props> = ({ onSelectIndex }) => {
    const [data, setData] = useState<MarketMacroData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPocketModal, setShowPocketModal] = useState(false);

    useEffect(() => {
        const loadInitialData = async () => {
            const macroData = await fetchMarketMacro();
            setData(macroData);
            setLoading(false);
        };
        loadInitialData();
    }, []);

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Syncing Alpha Matrix...</p>
            </div>
        );
    }

    const CustomHealthTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-gray-900 border border-gray-700 p-2 rounded shadow-xl text-[10px] font-bold">
                    <p className="text-gray-400 mb-1">{payload[0].payload.date}</p>
                    <p className="text-blue-400">Score: {payload[0].value}%</p>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4">
            
            {/* 1. MASTER HEADER */}
            <div className="mb-10">
                <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl">
                    <div className="absolute top-0 right-0 p-8 opacity-5"><Globe size={280} /></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <ShieldCheck className="text-blue-500" size={16} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Alpha Health Matrix</span>
                        </div>
                        <h1 className="text-4xl sm:text-6xl font-black text-white mb-4">
                            Market Strength Status: <span className="text-blue-400">{data.healthScore}%</span>
                        </h1>
                        <p className="text-gray-400 max-w-xl mb-12 leading-relaxed text-sm">
                            Real-time aggregation of <span className="text-white font-bold">Equal-Weight Breadth</span>, <span className="text-white font-bold">Yield Spreads</span>, and <span className="text-white font-bold">Volatility Structure</span>.
                        </p>

                        {/* 7-Day Path Graph */}
                        <div className="bg-black/20 border border-gray-800 rounded-2xl p-6 backdrop-blur-sm">
                            <div className="flex justify-between items-center mb-4">
                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">7-Day Macro Path</span>
                                <div className="flex items-center gap-2 text-blue-400 text-[10px] font-black uppercase">
                                    <TrendingUp size={12} /> {data.trendStats.trendDirection === 'Up' ? 'Expanding' : 'Contracting'}
                                </div>
                            </div>
                            <div className="h-24 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={data.healthHistory}>
                                        <defs>
                                            <linearGradient id="matrixGradient" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                                                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <Tooltip content={<CustomHealthTooltip />} cursor={{ stroke: '#3B82F6', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                        <Area type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={3} fill="url(#matrixGradient)" isAnimationActive={true} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 2. TILES GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-5 relative group transition-all hover:bg-gray-800/80 cursor-help">
                    <VitalTooltip title="Tactical Breadth" body="Percent of stocks above 50-day MA. Measures short-term market participation." current={`${data.breadth.percentAboveSMA50}%`} />
                    <div className="flex items-center gap-2 mb-3">
                        <LineChart size={14} className="text-blue-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Tactical Breadth</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black ${data.breadth.percentAboveSMA50 > 50 ? 'text-green-400' : 'text-red-400'}`}>{data.breadth.percentAboveSMA50}%</span>
                        <span className="text-[9px] font-bold text-gray-600 uppercase">Above 50 MA</span>
                    </div>
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-5 relative group transition-all hover:bg-gray-800/80 cursor-help">
                    <VitalTooltip title="Structural Health" body="Percent of stocks above 150-day MA. Measures the long-term primary trend." current={`${data.breadth.percentAboveSMA150}%`} />
                    <div className="flex items-center gap-2 mb-3">
                        <Landmark size={14} className="text-purple-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Structural Health</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black ${data.breadth.percentAboveSMA150 > 50 ? 'text-green-400' : 'text-red-400'}`}>{data.breadth.percentAboveSMA150}%</span>
                        <span className="text-[9px] font-bold text-gray-600 uppercase">Above 150 MA</span>
                    </div>
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-5 relative group transition-all hover:bg-gray-800/80 cursor-help">
                    <VitalTooltip title="Fear Index (VIX)" body="The market's expectation of 30-day volatility. Lower is calmer." current={data.vixStatus.value.toFixed(1)} />
                    <div className="flex items-center gap-2 mb-3">
                        <Activity size={14} className="text-red-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Fear Index (VIX)</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black ${data.vixStatus.value < 20 ? 'text-green-400' : 'text-red-400'}`}>{data.vixStatus.value.toFixed(1)}</span>
                        <span className="text-[9px] font-bold text-gray-600 uppercase">Points</span>
                    </div>
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-5 relative group transition-all hover:bg-gray-800/80 cursor-help">
                    <VitalTooltip title="Relative Volume" body="Market-wide volume vs 20-day average. Measures institutional activity." current={`${data.marketVolume.rvol.toFixed(2)}x`} />
                    <div className="flex items-center gap-2 mb-3">
                        <Database size={14} className="text-yellow-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Rel. Volume</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{data.marketVolume.rvol.toFixed(2)}x</span>
                        <span className="text-[9px] font-bold text-gray-600 uppercase">vs 20D Avg</span>
                    </div>
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-5 relative group transition-all hover:bg-gray-800/80 cursor-help">
                    <VitalTooltip title="Put/Call Ratio" body="Measures bearish sentiment (Puts) vs bullish sentiment (Calls)." current={data.sentimentInternals.putCallRatio} />
                    <div className="flex items-center gap-2 mb-3">
                        <Percent size={14} className="text-orange-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Put/Call Ratio</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{data.sentimentInternals.putCallRatio}</span>
                        <span className="text-[9px] font-bold text-gray-600 uppercase">Equity Only</span>
                    </div>
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-5 relative group transition-all hover:bg-gray-800/80 cursor-help">
                    <VitalTooltip title="Vol Structure (VTS)" body="Compares VIX to VIX9D. Above 1.0 indicates market expects volatility to drop." current={`${data.vixStatus.vts.toFixed(2)}x`} />
                    <div className="flex items-center gap-2 mb-3">
                        <Scale size={14} className="text-emerald-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Vol Structure (VTS)</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black ${data.vixStatus.vts > 1 ? 'text-green-400' : 'text-yellow-400'}`}>{data.vixStatus.vts.toFixed(2)}x</span>
                        <span className="text-[9px] font-bold text-gray-600 uppercase">VIX/VIX9D</span>
                    </div>
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-5 relative group transition-all hover:bg-gray-800/80 cursor-help">
                    <VitalTooltip title="Adv/Dec Volume" body="The ratio of volume in advancing vs declining stocks. Measures buying pressure." current={`${data.marketVolume.advDecRatio.toFixed(2)}:1`} />
                    <div className="flex items-center gap-2 mb-3">
                        <BarChart3 size={14} className="text-teal-400" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Adv/Dec Volume</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black ${data.marketVolume.advDecRatio > 1 ? 'text-green-400' : 'text-red-400'}`}>{data.marketVolume.advDecRatio.toFixed(2)}:1</span>
                        <span className="text-[9px] font-bold text-gray-600 uppercase">Pressure</span>
                    </div>
                </div>

                {/* Pocket Pivots (Clickable) */}
                <div onClick={() => setShowPocketModal(true)} className="bg-gray-900 border border-blue-500/20 rounded-2xl p-5 relative group transition-all hover:bg-gray-800 cursor-pointer active:scale-95 shadow-lg">
                    <VitalTooltip title="Pocket Pivots" body="Institutional buy signals where price breaks out on high volume relative to recent down days." current={data.institutionalPulse.pocketPivotCount} />
                    <div className="flex items-center gap-2 mb-3">
                        <Zap size={14} className="text-blue-500" />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Pocket Pivots</span>
                        <ChevronRight size={12} className="text-gray-600 ml-auto group-hover:text-blue-400" />
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">{data.institutionalPulse.pocketPivotCount}</span>
                        <span className="text-[9px] font-bold text-gray-600 uppercase font-mono">Active Signals</span>
                    </div>
                </div>
            </div>

            {/* 3. STRATEGIC DIVERGENCE MONITOR */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                    <Scale className="text-yellow-500" size={24} /> Strategic Divergence Monitor
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="bg-gray-850/40 border border-gray-800 rounded-2xl p-5 hover:border-blue-500/30 transition-all group relative cursor-help">
                        <VitalTooltip title="Dollar Trend (DXY)" body="Measures USD strength. Strong dollar is a headwind for equities and commodities." current={data.divergence.dollarTrend.status} />
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400"><DollarSign size={18} /></div>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${data.divergence.dollarTrend.impact === 'Tailwind' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {data.divergence.dollarTrend.impact}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Dollar Trend</p>
                        <p className="text-2xl font-black text-white mt-1">{data.divergence.dollarTrend.status}</p>
                    </div>

                    <div className="bg-gray-850/40 border border-gray-800 rounded-2xl p-5 hover:border-purple-500/30 transition-all group relative cursor-help">
                        <VitalTooltip title="Bond Yields (10Y)" body="Interest rate benchmark. High yields re-value growth stocks lower." current={`${data.divergence.yieldPressure.value}%`} />
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg text-purple-400"><Activity size={18} /></div>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${data.divergence.yieldPressure.impact === 'Risk-On' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                {data.divergence.yieldPressure.impact}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Bond Pressure</p>
                        <p className="text-2xl font-black text-white mt-1">{data.divergence.yieldPressure.value}%</p>
                    </div>

                    <div className="bg-gray-850/40 border border-gray-800 rounded-2xl p-5 hover:border-emerald-500/30 transition-all group relative cursor-help">
                        <VitalTooltip title="Smart Money Flow" body="Day-end closing strength vs high/low range. Shows institutional conviction." current={data.divergence.smartMoney.status} />
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400"><Database size={18} /></div>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${data.divergence.smartMoney.status === 'Accumulation' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                                {data.divergence.smartMoney.status}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Smart Money</p>
                        <p className="text-2xl font-black text-white mt-1">Score: {data.divergence.smartMoney.score}</p>
                    </div>

                    <div className="bg-gray-850/40 border border-gray-800 rounded-2xl p-5 hover:border-orange-500/30 transition-all group relative cursor-help">
                        <VitalTooltip title="NH-NL Breadth" body="New 52-Week Highs minus New Lows. Leading trend strength indicator." current={data.divergence.nhnlIndex.value} />
                        <div className="flex justify-between items-start mb-3">
                            <div className="p-2 bg-orange-500/10 rounded-lg text-orange-400"><ArrowUpRight size={18} /></div>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded bg-gray-800 text-gray-400`}>
                                {data.divergence.nhnlIndex.status}
                            </span>
                        </div>
                        <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Breadth Ratio</p>
                        <p className="text-2xl font-black text-white mt-1">{data.divergence.nhnlIndex.value > 0 ? '+' : ''}{data.divergence.nhnlIndex.value}</p>
                    </div>
                </div>
            </div>

            {/* 4. TECHNICAL OUTLOOK */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                    <Compass className="text-blue-500" size={24} /> Systemic Technical Outlook
                </h2>
                <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="p-3 bg-blue-500/20 rounded-xl text-blue-400"><Activity size={24} /></div>
                            <h3 className="text-lg font-bold text-white">Trend Confidence Matrix</h3>
                        </div>
                        <p className="text-gray-400 text-sm leading-relaxed mb-6">
                            The broader market equal-weight index (RSP) is currently exhibiting a <span className="text-white font-bold">{data.trendStats.consecutiveDays}-day {data.trendStats.trendDirection} streak</span>. 
                            The Alpha Matrix calculates a cycle exhaustion probability of <span className="text-blue-400 font-bold">{data.trendStats.reversalProbability}%</span>.
                        </p>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full">
                            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center group relative cursor-help">
                                <VitalTooltip title="Institutional Dark Pool (DIX)" body="Measures non-lit exchange buy flow. High values (>40%) signal institutional shadow accumulation." current={`${data.trendStats.dix}%`} />
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <EyeOff size={14} className="text-purple-400" />
                                    <p className="text-[9px] text-gray-500 uppercase font-black">DIX Index</p>
                                </div>
                                <p className={`text-xl font-black ${data.trendStats.dix > 40 ? 'text-green-400' : 'text-white'}`}>{data.trendStats.dix}%</p>
                            </div>
                            
                            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center group relative cursor-help">
                                <VitalTooltip title="Market Gamma (GEX)" body="The 'stability' of the market based on options exposure. Positive gamma acts as a shock absorber." current={`${data.trendStats.gex.value}B`} />
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <Zap size={14} className="text-yellow-400" />
                                    <p className="text-[9px] text-gray-500 uppercase font-black">Gamma Status</p>
                                </div>
                                <p className={`text-xl font-black ${data.trendStats.gex.status === 'Positive' ? 'text-green-400' : 'text-red-400'}`}>{data.trendStats.gex.value}B</p>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center group relative cursor-help">
                                <VitalTooltip title="Breadth Momentum" body="Acceleration/Deceleration of market participation over the last 3 days." current={`+${data.trendStats.breadthMomentum}%`} />
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <BarChart3 size={14} className="text-blue-400" />
                                    <p className="text-[9px] text-gray-500 uppercase font-black">Breadth Accel</p>
                                </div>
                                <p className={`text-xl font-black ${data.trendStats.breadthMomentum > 0 ? 'text-green-400' : 'text-red-400'}`}>+{data.trendStats.breadthMomentum}%</p>
                            </div>

                            <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center">
                                <div className="flex items-center justify-center gap-2 mb-1">
                                    <ShieldCheck size={14} className="text-emerald-400" />
                                    <p className="text-[9px] text-gray-500 uppercase font-black">Cycle Day</p>
                                </div>
                                <p className="text-xl font-black text-white">{data.trendStats.consecutiveDays}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-xs font-bold text-blue-400 bg-blue-400/10 px-3 py-2 rounded-lg border border-blue-400/20 mt-6">
                            <Info size={14} /> 
                            {data.healthScore >= 70 ? "Conditions are ideal for momentum breakouts in Sector Leaders." : "Macro volatility suggests keeping position sizes defensive."}
                        </div>
                    </div>
                    <div className="w-full md:w-auto shrink-0 space-y-4">
                        <div className="bg-gray-900 border border-gray-800 p-4 rounded-xl text-center min-w-[120px]">
                            <p className="text-[10px] text-gray-500 uppercase font-black mb-1">Risk Bias</p>
                            <p className={`text-sm font-black uppercase ${data.healthScore >= 60 ? 'text-green-400' : 'text-yellow-400'}`}>
                                {data.healthScore >= 60 ? 'Aggressive' : 'Conservative'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* 5. INDEX MATRIX */}
            <div className="mb-12">
                <h2 className="text-xl font-bold text-white flex items-center gap-3 mb-6">
                    <BarChart3 className="text-blue-500" size={24} /> Market Index Matrix
                </h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[data.indices.rsp, data.indices.spy, data.indices.qqq, data.indices.iwm].map(index => (
                        <div key={index.ticker} onClick={() => onSelectIndex(index)} className="bg-gray-850/50 border border-gray-800 rounded-2xl p-6 hover:bg-gray-800 transition-all cursor-pointer group shadow-lg hover:border-blue-500/30">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors font-mono">{index.ticker}</h3>
                                <div className={`text-xl font-mono font-bold ${index.totalScore >= 7 ? 'text-green-400' : 'text-yellow-400'}`}>{index.totalScore}</div>
                            </div>
                            <div className="flex justify-between text-[10px] font-bold font-mono border-t border-gray-800 pt-3">
                                <span className="text-gray-600 uppercase">Trend</span>
                                <span className={index.currentPrice > index.technicalData.sma150 ? 'text-green-400' : 'text-red-400'}>
                                    {index.currentPrice > index.technicalData.sma150 ? 'Bullish' : 'Bearish'}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Pocket Pivots Modal */}
            {showPocketModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowPocketModal(false)} />
                    <div className="relative bg-gray-900 border border-gray-700 w-full max-w-xl rounded-2xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <Zap className="text-blue-500" size={24} />
                                <h3 className="text-xl font-bold text-white">Daily Pocket Pivots</h3>
                            </div>
                            <button onClick={() => setShowPocketModal(false)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400">
                                <X size={24} />
                            </button>
                        </div>
                        <div className="p-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
                            {data.institutionalPulse.triggeredStocks.length === 0 ? (
                                <p className="text-center text-gray-500 py-10">No active signals found today.</p>
                            ) : (
                                <div className="space-y-3">
                                    {data.institutionalPulse.triggeredStocks.map(s => (
                                        <div key={s.ticker} onClick={() => { onSelectIndex(s); setShowPocketModal(false); }} className="flex justify-between items-center bg-gray-850 p-4 rounded-xl border border-gray-700 hover:border-blue-500 transition-all cursor-pointer group">
                                            <div>
                                                <span className="text-lg font-black text-white font-mono">{s.ticker}</span>
                                                <p className="text-xs text-gray-500">{s.companyName}</p>
                                            </div>
                                            <div className="text-right">
                                                <span className={`text-lg font-bold ${s.totalScore >= 7 ? 'text-green-400' : 'text-yellow-400'}`}>{s.totalScore}</span>
                                                <div className="flex items-center gap-2 text-[10px] text-blue-400 font-bold uppercase mt-1">
                                                    View Details <ExternalLink size={10} />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MarketOverview;
