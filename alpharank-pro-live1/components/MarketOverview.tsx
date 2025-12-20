
import React, { useEffect, useState } from 'react';
import { MarketMacroData, fetchMarketMacro } from '../services/marketService';
import { TrendingUp, TrendingDown, Activity, Zap, Info, Globe, BarChart3, Compass, ShieldCheck, Database, Target, Percent, Scale, LineChart, InfoIcon, Landmark, Loader2, X, ChevronRight } from 'lucide-react';
import { StockResult } from '../types';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip } from 'recharts';

interface Props {
    onSelectIndex: (stock: StockResult) => void;
}

// Sub-component: Modal for Pocket Pivot Details
const PocketPivotModal: React.FC<{ stocks: StockResult[]; onClose: () => void; onSelect: (s: StockResult) => void }> = ({ stocks, onClose, onSelect }) => (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <div className="relative bg-gray-900 border border-gray-700 w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-800 flex justify-between items-center bg-gray-850">
                <div>
                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                        <Zap className="text-yellow-400" size={20} />
                        Active Pocket Pivot Signals
                    </h3>
                    <p className="text-xs text-gray-500 uppercase font-black tracking-widest mt-1">Institutional Footprints Detected</p>
                </div>
                <button onClick={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
                    <X size={24} />
                </button>
            </div>
            <div className="p-6 overflow-y-auto custom-scrollbar space-y-4">
                {stocks.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 italic">No specific signals identified in the current sample.</div>
                ) : (
                    stocks.map(stock => (
                        <div 
                            key={stock.ticker} 
                            onClick={() => { onSelect(stock); onClose(); }}
                            className="bg-gray-850 border border-gray-800 rounded-xl p-4 flex items-center justify-between hover:border-blue-500/50 hover:bg-gray-800 transition-all cursor-pointer group"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center overflow-hidden border border-gray-700 p-1">
                                    <img 
                                        src={`https://financialmodelingprep.com/image-stock/${stock.ticker}.png`} 
                                        alt="" 
                                        className="w-full h-full object-contain"
                                        onError={(e) => { e.currentTarget.src = `https://ui-avatars.com/api/?name=${stock.ticker}&background=0f172a&color=fff&size=128&bold=true`; }}
                                    />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-white font-mono group-hover:text-blue-400 transition-colors">{stock.ticker}</h4>
                                    <div className="flex items-center gap-2 text-xs text-gray-500">
                                        <span>Score: <span className={stock.totalScore >= 7 ? 'text-green-400' : 'text-yellow-400'}>{stock.totalScore}</span></span>
                                        <span className="w-1 h-1 rounded-full bg-gray-700" />
                                        <span>Price: ${stock.currentPrice.toFixed(2)}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <p className={`text-sm font-bold ${stock.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                        {stock.changePercent > 0 ? '+' : ''}{stock.changePercent.toFixed(2)}%
                                    </p>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">Volume Confirmed</p>
                                </div>
                                <ChevronRight className="text-gray-600 group-hover:text-blue-400 transition-colors" />
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="p-4 bg-gray-950 border-t border-gray-800 text-[10px] text-gray-500 text-center uppercase tracking-widest font-bold">
                * Signals based on volume surpassing highest 10-day down-bar
            </div>
        </div>
    </div>
);

// Reusable Professional Tooltip for standard UI elements
const VitalTooltip: React.FC<{ title: string; body: string; current: string }> = ({ title, body, current }) => (
    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-72 bg-gray-950 border border-gray-700 p-4 rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 scale-95 group-hover:scale-100 origin-bottom">
        <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
            <h4 className="text-blue-400 font-bold text-xs uppercase tracking-widest">{title}</h4>
        </div>
        <p className="text-gray-400 text-[11px] leading-relaxed mb-3 border-b border-gray-800 pb-3">{body}</p>
        <div className="flex justify-between items-center text-[9px] font-black">
            <span className="text-gray-600 uppercase tracking-widest">SIGNAL DATA</span>
            <span className="text-white px-2 py-0.5 bg-gray-800 rounded-md border border-gray-700">{current}</span>
        </div>
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 border-8 border-transparent border-t-gray-700"></div>
    </div>
);

const MarketOverview: React.FC<Props> = ({ onSelectIndex }) => {
    const [data, setData] = useState<MarketMacroData | null>(null);
    const [loading, setLoading] = useState(true);
    const [showPivotModal, setShowPivotModal] = useState(false);

    useEffect(() => {
        fetchMarketMacro().then(d => {
            setData(d);
            setLoading(false);
        });
    }, []);

    if (loading || !data) {
        return (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="animate-spin text-blue-500" size={48} />
                <p className="text-gray-400 font-medium tracking-widest uppercase text-xs">Syncing Market Intelligence...</p>
            </div>
        );
    }

    const isTrendingUp = data.healthHistory[data.healthHistory.length-1].score >= data.healthHistory[0].score;

    return (
        <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 px-4">
            
            {/* 1. MASTER SCORE */}
            <div className="mb-8">
                {/* Alpha Health Matrix Board */}
                <div className={`group rounded-3xl border p-8 flex flex-col justify-between relative overflow-hidden bg-gray-900 shadow-2xl ${data.healthScore >= 70 ? 'border-green-500/30' : 'border-gray-800'}`}>
                    
                    {/* Alpha Health Matrix Explanation Tooltip */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-80 bg-gray-950 border border-blue-500/50 p-5 rounded-2xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none z-50 scale-95 group-hover:scale-100 origin-top backdrop-blur-xl">
                        <h4 className="text-blue-400 font-black text-[10px] uppercase tracking-[0.2em] mb-3 border-b border-gray-800 pb-2">Alpha Health Matrix Calculation</h4>
                        <div className="space-y-4">
                            <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                    <span className="text-white font-bold">Index Performance</span>
                                    <span className="text-blue-400 font-mono">40%</span>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight">RSP (20%) + SPY/QQQ/IWM (20% avg). Measures the strength of the average stock vs mega-cap technology leaders.</p>
                            </div>
                            <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                    <span className="text-white font-bold">Market Breadth</span>
                                    <span className="text-blue-400 font-mono">30%</span>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight">Percentage of stocks above their 50-day moving average. Validates true participation in market rallies.</p>
                            </div>
                            <div>
                                <div className="flex justify-between text-[11px] mb-1">
                                    <span className="text-white font-bold">Risk & Sentiment</span>
                                    <span className="text-blue-400 font-mono">30%</span>
                                </div>
                                <p className="text-[10px] text-gray-500 leading-tight">VTS (Volatility Structure), Put/Call Ratio (Fear Sentiment), and Adv/Dec Volume Flow.</p>
                            </div>
                        </div>
                    </div>

                    <div className="absolute top-0 right-0 p-8 opacity-5"><Globe size={240} /></div>
                    
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-4">
                            <ShieldCheck className="text-blue-500" size={20} />
                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Alpha Health Matrix</span>
                        </div>
                        <h1 className="text-5xl sm:text-7xl font-black text-white mb-4">
                            Market Strength Status: <span className={data.healthScore >= 70 ? 'text-green-400' : 'text-blue-400'}>{data.healthScore}%</span>
                        </h1>
                        <p className="text-gray-400 max-w-lg mb-8 leading-relaxed text-sm">
                            Real-time aggregation of <span className="text-white font-bold">Equal-Weight Breadth</span>, <span className="text-white font-bold">Yield Spreads</span>, and <span className="text-white font-bold">Volatility Structure</span>.
                        </p>
                    </div>

                    <div className="bg-black/40 rounded-2xl p-5 border border-white/5 h-28">
                         <div className="flex justify-between items-center mb-2">
                             <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">7-Day Macro Path</span>
                             <div className={`text-xs font-bold flex items-center ${isTrendingUp ? 'text-green-400' : 'text-red-400'}`}>
                                {isTrendingUp ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
                                {isTrendingUp ? 'EXPANDING' : 'CONTRACTING'}
                             </div>
                         </div>
                         <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={data.healthHistory}>
                                <defs>
                                    <linearGradient id="macroGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={isTrendingUp ? '#10B981' : '#3B82F6'} stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor={isTrendingUp ? '#10B981' : '#3B82F6'} stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <Tooltip 
                                    content={({ active, payload }) => {
                                        if (active && payload && payload.length) {
                                            return (
                                                <div className="bg-gray-950 border border-gray-700 p-2.5 rounded-lg shadow-2xl animate-in fade-in zoom-in duration-150">
                                                    <p className="text-[9px] text-gray-500 font-bold uppercase tracking-widest mb-1">
                                                        {new Date(payload[0].payload.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                    </p>
                                                    <p className="text-white font-mono font-black text-sm">
                                                        Score: <span className={isTrendingUp ? 'text-green-400' : 'text-blue-400'}>{payload[0].value}%</span>
                                                    </p>
                                                </div>
                                            );
                                        }
                                        return null;
                                    }}
                                    cursor={{ stroke: isTrendingUp ? '#10B981' : '#3B82F6', strokeWidth: 1, strokeDasharray: '3 3' }}
                                />
                                <Area type="monotone" dataKey="score" stroke={isTrendingUp ? '#10B981' : '#3B82F6'} strokeWidth={3} fill="url(#macroGrad)" dot={false} />
                            </AreaChart>
                         </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* 2. PRIMARY BREADTH VITALS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                
                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-6 relative group transition-all hover:bg-gray-800/80">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <LineChart size={14} className="text-blue-400" /> Tactical Breadth
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black ${data.breadth.percentAboveSMA50 > 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.breadth.percentAboveSMA50}%
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Above 50 MA</span>
                    </div>
                    <VitalTooltip 
                        title="Short-Term Participation" 
                        body="Percentage of stocks in short-term uptrends. Above 50% indicates healthy rotation. Below 30% suggests extreme selling pressure."
                        current={`${data.breadth.percentAboveSMA50}% Healthy`}
                    />
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-6 relative group transition-all hover:bg-gray-800/80">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Landmark size={14} className="text-purple-400" /> Structural Health
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black ${data.breadth.percentAboveSMA150 > 50 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.breadth.percentAboveSMA150}%
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Above 150 MA</span>
                    </div>
                    <VitalTooltip 
                        title="Long-Term Participation" 
                        body="The foundation of the bull market. If this is rising while the main index is flat, it signals a massive institutional 'Base' forming."
                        current={`${data.breadth.percentAboveSMA150}% Aligned`}
                    />
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-6 relative group transition-all hover:bg-gray-800/80">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Activity size={14} className="text-red-400" /> Fear Index (VIX)
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black ${data.vixStatus.value < 20 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.vixStatus.value.toFixed(1)}
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Points</span>
                    </div>
                    <VitalTooltip 
                        title="VIX Volatility" 
                        body="CBOE Volatility Index. Measures expectations of price swings. High VIX = High Fear (Market Bottoms). Low VIX = Complacency (Market Peaks)."
                        current={`VIX at ${data.vixStatus.value.toFixed(1)}`}
                    />
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-6 relative group transition-all hover:bg-gray-800/80">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Database size={14} className="text-yellow-400" /> Rel. Volume
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-4xl font-black ${data.marketVolume.rvol > 1.2 ? 'text-green-400' : 'text-white'}`}>
                            {data.marketVolume.rvol.toFixed(2)}x
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">vs 20D AVG</span>
                    </div>
                    <VitalTooltip 
                        title="Relative Market Volume" 
                        body="Compares today's total volume to the 20-day average. Above 1.2x indicates Institutional Smart Money is making high-conviction moves."
                        current={data.marketVolume.interpretation}
                    />
                </div>
            </div>

            {/* 3. ADVANCED INTERNALS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                
                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-6 relative group transition-all hover:bg-gray-800/80">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Percent size={14} className="text-orange-400" /> Put/Call Ratio
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black ${data.sentimentInternals.putCallRatio > 1.0 ? 'text-green-400' : 'text-white'}`}>
                            {data.sentimentInternals.putCallRatio}
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Equity Only</span>
                    </div>
                    <VitalTooltip 
                        title="Options Sentiment" 
                        body="Contrarian indicator. Above 1.1 = Extreme Pessimism (Bullish reversal likely). Below 0.7 = Extreme Optimism (Bearish reversal likely)."
                        current={`Ratio: ${data.sentimentInternals.putCallRatio}`}
                    />
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-6 relative group transition-all hover:bg-gray-800/80">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Scale size={14} className="text-pink-400" /> Vol Structure (VTS)
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black ${data.vixStatus.vts > 1 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.vixStatus.vts.toFixed(2)}x
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">VIX/VIX9D</span>
                    </div>
                    <VitalTooltip 
                        title="Volatility Term Structure" 
                        body="Compares 30-day volatility to 9-day. Above 1.0 = Contango (Healthy). Below 1.0 = Backwardation (Systemic Stress/Panic Peak)."
                        current={data.vixStatus.vts > 1 ? "Contango (Healthy)" : "Backwardation (Distressed)"}
                    />
                </div>

                <div className="bg-gray-850 border border-gray-800 rounded-2xl p-6 relative group transition-all hover:bg-gray-800/80">
                    <h3 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <BarChart3 size={14} className="text-emerald-400" /> Adv/Dec Volume
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-black ${data.marketVolume.advDecRatio > 1.0 ? 'text-green-400' : 'text-red-400'}`}>
                            {data.marketVolume.advDecRatio.toFixed(2)}:1
                        </span>
                        <span className="text-[10px] font-bold text-gray-600 uppercase">Pressure</span>
                    </div>
                    <VitalTooltip 
                        title="Market Pressure Ratio" 
                        body="Ratio of volume in advancing vs declining stocks. High ratios (>2:1) confirm strong trend quality. Divergence here signals internal breakdown."
                        current={`Ratio: ${data.marketVolume.advDecRatio}`}
                    />
                </div>

                <div 
                    onClick={() => setShowPivotModal(true)}
                    className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6 relative group transition-all hover:bg-blue-900/20 cursor-pointer hover:border-blue-500/50 shadow-lg"
                >
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"><ChevronRight size={14} className="text-blue-400" /></div>
                    <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Zap size={14} className="text-yellow-400" /> Pocket Pivots
                    </h3>
                    <div className="flex items-baseline gap-2">
                        <span className="text-3xl font-black text-white">
                            {data.institutionalPulse.pocketPivotCount}
                        </span>
                        <span className="text-[10px] font-bold text-blue-500 uppercase">Active Signals</span>
                    </div>
                    <VitalTooltip 
                        title="Institutional Footprints" 
                        body="Detection of volume signals where institutions are entering positions without major price movement. Click to view specific stocks."
                        current={data.institutionalPulse.accumulationTrend}
                    />
                </div>
            </div>

            {/* 4. INDEX MATRIX */}
            <div className="mb-12">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <BarChart3 className="text-blue-500" size={24} /> Market Index Matrix
                    </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[data.indices.rsp, data.indices.spy, data.indices.qqq, data.indices.iwm].map(index => (
                        <div key={index.ticker} onClick={() => onSelectIndex(index)} className="bg-gray-850/50 border border-gray-800 rounded-2xl p-6 hover:bg-gray-800 transition-all cursor-pointer group shadow-lg hover:border-blue-500/30">
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    <h3 className="text-2xl font-black text-white group-hover:text-blue-400 transition-colors font-mono">{index.ticker}</h3>
                                    <p className="text-[10px] text-gray-600 font-black uppercase">{index.ticker === 'RSP' ? 'Equal-Weight' : 'Cap-Weight'}</p>
                                </div>
                                <div className={`text-2xl font-mono font-bold ${index.totalScore >= 7 ? 'text-green-400' : 'text-yellow-400'}`}>{index.totalScore}</div>
                            </div>
                            <div className="space-y-3">
                                <div className="flex justify-between text-xs font-bold font-mono"><span className="text-gray-600 uppercase">Price</span><span className="text-white">${index.currentPrice.toFixed(2)}</span></div>
                                <div className="flex justify-between text-xs font-bold font-mono border-t border-gray-800 pt-2"><span className="text-gray-600 uppercase">Trend</span><span className={index.currentPrice > index.technicalData.sma150 ? 'text-green-400' : 'text-red-400'}>{index.currentPrice > index.technicalData.sma150 ? 'Bullish' : 'Bearish'}</span></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Outlook Footer */}
            <div className="bg-blue-900/10 border border-blue-500/20 rounded-3xl p-8 flex flex-col md:flex-row items-center gap-8 shadow-inner">
                <div className="p-5 bg-blue-500/20 rounded-2xl text-blue-400"><Compass size={40} /></div>
                <div className="flex-1 text-center md:text-left">
                    <h4 className="text-xl font-bold text-white mb-2">Technical Outlook (RSP Analysis)</h4>
                    <p className="text-gray-400 text-sm leading-relaxed">
                        The broader market (RSP) is currently on a <span className="text-white font-bold">{data.trendStats.consecutiveDays}-day {data.trendStats.trendDirection} streak</span>. 
                        Historical probability of a cycle reversal in the current environment is <span className="text-blue-400 font-bold">{data.trendStats.reversalProbability}%</span>. 
                        Seasonality strength for <span className="text-white font-bold">{data.seasonality.month}</span> is {data.seasonality.strength}/10.
                    </p>
                </div>
            </div>

            {showPivotModal && (
                <PocketPivotModal 
                    stocks={data.institutionalPulse.triggeredStocks} 
                    onClose={() => setShowPivotModal(false)} 
                    onSelect={onSelectIndex}
                />
            )}
        </div>
    );
};

export default MarketOverview;
