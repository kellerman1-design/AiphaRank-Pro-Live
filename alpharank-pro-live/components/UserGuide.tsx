
import React, { useState } from 'react';
import { X, BookOpen, Activity, Target, Zap, TrendingUp, BarChart2, ShieldAlert, Layers, Percent, ArrowUp, Microscope, Globe, Gauge, Compass, Landmark, LayoutGrid, Scale, ListChecks, Info, ChevronRight, DollarSign, Database, LineChart, CheckCircle } from 'lucide-react';

interface Props {
  onClose: () => void;
}

const UserGuide: React.FC<Props> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'basics' | 'macro' | 'prime' | 'indicators' | 'risk'>('basics');

  const tabs = [
    { id: 'basics', label: 'System Basics', icon: BookOpen },
    { id: 'macro', label: 'Market Macro', icon: Globe },
    { id: 'indicators', label: 'Scoring Engine', icon: ListChecks },
    { id: 'prime', label: 'Entry Logic', icon: Target },
    { id: 'risk', label: 'Risk Mgmt', icon: ShieldAlert },
  ];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
      
      <div className="relative bg-gray-900 border border-gray-700 w-full max-w-5xl h-[85vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-gray-800 flex justify-between items-center bg-gray-850">
          <div className="flex items-center gap-3">
            <div className="bg-blue-600/20 p-2 rounded-lg">
                <BookOpen className="text-blue-500" size={24} />
            </div>
            <div>
                <h2 className="text-lg sm:text-2xl font-bold text-white leading-tight">AlphaRank Pro Intelligence</h2>
                <p className="text-xs text-gray-500 font-medium">Model Version 2.7.0 • Technical Protocol</p>
            </div>
          </div>
          <button onClose={onClose} className="p-2 hover:bg-gray-800 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            
            <div className="w-64 bg-gray-850/50 border-r border-gray-800 hidden md:flex flex-col shrink-0">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`p-4 flex items-center gap-3 text-sm font-medium transition-colors border-l-4 ${
                            activeTab === tab.id 
                            ? 'bg-blue-900/20 text-white border-blue-500' 
                            : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border-transparent'
                        }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar bg-gray-900 text-gray-300 leading-relaxed">
                
                {activeTab === 'basics' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">The AlphaRank Philosophy</h3>
                        <p>
                            AlphaRank Pro is a multi-factor quantitative engine designed to identify <span className="text-white font-bold">Institutional Accumulation</span>. Instead of guessing, we use a weighted scoring model (0-10) to determine if a stock has the technical support of "Big Money."
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
                            <div className="bg-emerald-900/10 border border-emerald-500/30 p-5 rounded-xl">
                                <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                    <TrendingUp size={18}/> High Score (7.0 - 10.0)
                                </h4>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Indicates institutional buying pressure. High Relative Strength, positive momentum, and a healthy primary trend. The path of least resistance is upward.
                                </p>
                            </div>
                            <div className="bg-red-900/10 border border-red-500/30 p-5 rounded-xl">
                                <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                                    <ShieldAlert size={18}/> Low Score (0.0 - 4.5)
                                </h4>
                                <p className="text-sm text-gray-400 leading-relaxed">
                                    Indicates technical decay or distribution. High risk of further drawdown. Capital should be preserved until a technical floor is established.
                                </p>
                            </div>
                        </div>

                        <div className="bg-gray-850 p-6 rounded-2xl border border-gray-800 mt-8">
                            <h4 className="font-bold text-white mb-3">Core Ranking Rules</h4>
                            <ul className="space-y-3 text-sm">
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    <span><strong className="text-blue-400">Momentum Overlap:</strong> We look for stocks where short-term velocity (RSI/MACD) aligns with long-term structure (SMA 150).</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    <span><strong className="text-blue-400">Institutional Volume:</strong> Price movement without Relative Volume (RVOL) is often a retail trap. We prioritize volume confirmation.</span>
                                </li>
                                <li className="flex items-start gap-3">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5" />
                                    <span><strong className="text-blue-400">Alpha Focus:</strong> The goal is to beat the S&P 500 (SPY). We calculate Relative Strength vs. the index over a 6-month period.</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                )}

                {activeTab === 'macro' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-3 mb-2">
                                <Globe size={28} className="text-blue-400" />
                                Market Macro Intelligence
                            </h3>
                            <p className="text-sm text-gray-400">Understanding the systemic environment before taking individual stock exposure.</p>
                        </div>

                        {/* HOW IT IS CALCULATED */}
                        <div className="bg-blue-900/10 border border-blue-500/20 rounded-2xl p-6">
                            <h4 className="font-bold text-white mb-4 flex items-center gap-2 text-sm uppercase tracking-wider">
                                <Gauge size={18} className="text-blue-400" /> Health Score Calculation
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-black/30 rounded-xl border border-white/5">
                                    <span className="text-2xl font-black text-blue-400">40%</span>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase">Market Breadth</p>
                                </div>
                                <div className="text-center p-3 bg-black/30 rounded-xl border border-white/5">
                                    <span className="text-2xl font-black text-purple-400">30%</span>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase">Volatility (VIX)</p>
                                </div>
                                <div className="text-center p-3 bg-black/30 rounded-xl border border-white/5">
                                    <span className="text-2xl font-black text-emerald-400">30%</span>
                                    <p className="text-[10px] text-gray-500 mt-1 uppercase">Smart Money Close</p>
                                </div>
                            </div>
                            <p className="mt-4 text-xs text-gray-500 italic text-center">Final Score &ge; 70% indicates a "Risk-On" high conviction environment.</p>
                        </div>

                        {/* PARAMETER GUIDE */}
                        <div className="space-y-4">
                            <h4 className="font-bold text-white text-sm uppercase tracking-wider">Parameter Definitions</h4>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="bg-gray-850 p-4 rounded-xl border border-gray-700">
                                    <p className="text-blue-400 font-bold text-xs flex items-center gap-2 mb-2"><LineChart size={14}/> Tactical/Structural Breadth</p>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">Tracks the % of S&P 500 stocks above their 50-day (Tactical) and 150-day (Structural) moving averages. High breadth confirms market strength.</p>
                                </div>
                                <div className="bg-gray-850 p-4 rounded-xl border border-gray-700">
                                    <p className="text-red-400 font-bold text-xs flex items-center gap-2 mb-2"><Activity size={14}/> Fear Index (VIX)</p>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">Measures the cost of portfolio insurance. VIX &lt; 20 is bullish; VIX &gt; 30 indicates institutional panic and possible bottoming.</p>
                                </div>
                                <div className="bg-gray-850 p-4 rounded-xl border border-gray-700">
                                    <p className="text-emerald-400 font-bold text-xs flex items-center gap-2 mb-2"><Scale size={14}/> Vol Structure (VTS)</p>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">Ratio of VIX to VIX9D. If VIX is lower than VIX9D, the market is in "Contango," suggesting expectations of future calm.</p>
                                </div>
                                <div className="bg-gray-850 p-4 rounded-xl border border-gray-700">
                                    <p className="text-yellow-400 font-bold text-xs flex items-center gap-2 mb-2"><Database size={14}/> Smart Money Close</p>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">Compares daily closing prices to high/low ranges across the index. Closing at the high suggests institutional accumulation into the bell.</p>
                                </div>
                                <div className="bg-gray-850 p-4 rounded-xl border border-gray-700">
                                    <p className="text-blue-300 font-bold text-xs flex items-center gap-2 mb-2"><DollarSign size={14}/> Dollar Trend (DXY)</p>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">The USD Index. A falling dollar is a massive tailwind for global liquidity and US multinationals.</p>
                                </div>
                                <div className="bg-gray-850 p-4 rounded-xl border border-gray-700">
                                    <p className="text-purple-300 font-bold text-xs flex items-center gap-2 mb-2"><Compass size={14}/> Bond Yields (10Y)</p>
                                    <p className="text-[11px] text-gray-400 leading-relaxed">Interest rate benchmark. Spiking yields (above 4.5%) act as a valuation headwind for high-growth tech stocks.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'indicators' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 mb-2">
                                <ListChecks size={24} className="text-blue-500" />
                                Scoring Engine Breakdown
                            </h3>
                            <p className="text-sm text-gray-400">
                                Every stock receives a score from 0.0 to 10.0 based on 12 weighted indicators.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-blue-900/10 border border-blue-500/30 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-blue-600/20 border-b border-blue-500/30 font-black text-[10px] text-blue-400 uppercase tracking-widest">
                                    Tier 1: Strategic Drivers (15% Weight Each)
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center shrink-0 font-bold text-blue-400">15%</div>
                                        <div className="text-sm">
                                            <p className="font-bold text-white">Relative Strength (RS vs SPY)</p>
                                            <p className="text-gray-400 text-xs">Measures performance vs S&P 500 over 126 trading days. Stocks leading the market are prioritised.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-purple-500/20 rounded flex items-center justify-center shrink-0 font-bold text-purple-400">15%</div>
                                        <div className="text-sm">
                                            <p className="font-bold text-white">Pattern & Structure</p>
                                            <p className="text-gray-400 text-xs">AI detection of Cup & Handle, Elliott Waves, and Volatility Contraction (VCP).</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-850 border border-gray-700 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                                    Tier 2: Core Trend (10% Weight Each)
                                </div>
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-x-12 gap-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="text-[10px] font-black text-gray-500 mt-1">10%</div>
                                        <div>
                                            <p className="text-sm font-bold text-white mb-1">SMA 150 Trend</p>
                                            <p className="text-[11px] text-gray-500 leading-relaxed">The "Institutional Line." Price must be above for a bullish bias.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="text-[10px] font-black text-gray-500 mt-1">10%</div>
                                        <div>
                                            <p className="text-sm font-bold text-white mb-1">Weekly MTA Trend</p>
                                            <p className="text-[11px] text-gray-500 leading-relaxed">Alignment between Daily and Weekly timeframes.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="text-[10px] font-black text-gray-500 mt-1">10%</div>
                                        <div>
                                            <p className="text-sm font-bold text-white mb-1">Volume RVOL</p>
                                            <p className="text-[11px] text-gray-500 leading-relaxed">Detecting relative volume spikes (&gt;1.5x) indicating accumulation.</p>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="text-[10px] font-black text-gray-500 mt-1">10%</div>
                                        <div>
                                            <p className="text-sm font-bold text-white mb-1">Bollinger Bands</p>
                                            <p className="text-[11px] text-gray-500 leading-relaxed">Scoring based on volatility expansion and mean deviation.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-850 border border-gray-700 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 font-black text-[10px] text-gray-400 uppercase tracking-widest">
                                    Tier 3: Momentum & Signals (5% Weight Each)
                                </div>
                                <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase mb-1">RSI Momentum (5%)</p>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">Strength of current price velocity.</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase mb-1">MACD Signal (5%)</p>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">Exponential convergence/divergence pivots.</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase mb-1">RSI Divergence (5%)</p>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">Leading signal comparing Price vs Momentum pivots.</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase mb-1">Inst. Support (5%)</p>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">Position relative to VWAP or VWMA (20).</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase mb-1">ADX Trend (5%)</p>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">Quantifying the actual "strength" of a trend.</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-white uppercase mb-1">Parabolic SAR (5%)</p>
                                        <p className="text-[11px] text-gray-500 leading-relaxed">Dynamic trailing stop/pivot mechanism.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'prime' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="flex items-center gap-3">
                             <div className="p-3 bg-yellow-500/20 rounded-2xl">
                                <Target size={32} className="text-yellow-400" />
                             </div>
                             <h3 className="text-xl sm:text-2xl font-bold text-white">The "Elite Prime" Setup</h3>
                         </div>

                         <div className="bg-gray-850 p-6 rounded-2xl border border-yellow-500/30">
                            <h4 className="text-yellow-400 font-bold mb-4 uppercase text-xs tracking-widest">Entry Condition Requirements</h4>
                            <div className="space-y-4">
                                <div className="flex items-center gap-4">
                                    <CheckCircle size={20} className="text-yellow-400 shrink-0" />
                                    <p className="text-sm">Technical Score must be &ge; <span className="text-white font-bold">8.0</span></p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <CheckCircle size={20} className="text-yellow-400 shrink-0" />
                                    <p className="text-sm">Price within <span className="text-white font-bold">2.0%</span> of SMA 20 (Mean Reversion Pivot)</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <CheckCircle size={20} className="text-yellow-400 shrink-0" />
                                    <p className="text-sm">Weekly timeframe must be <span className="text-green-400 font-bold">BULLISH</span></p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <CheckCircle size={20} className="text-yellow-400 shrink-0" />
                                    <p className="text-sm">Relative Volume (RVOL) must be &ge; 1.2x</p>
                                </div>
                            </div>
                         </div>

                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="p-5 bg-blue-900/10 border border-blue-500/20 rounded-xl">
                                <h5 className="font-bold text-blue-400 mb-2">Scenario A: Breakout</h5>
                                <p className="text-xs text-gray-400 leading-relaxed">Score is high but price is extended from the pivot. Wait for a "base" to form or enter with 1/2 size.</p>
                            </div>
                            <div className="p-5 bg-emerald-900/10 border border-emerald-500/20 rounded-xl">
                                <h5 className="font-bold text-emerald-400 mb-2">Scenario B: Mean Reversion</h5>
                                <p className="text-xs text-gray-400 leading-relaxed">Score is high and price is resting at SMA 20. This is the <span className="text-white font-bold font-mono">ELITE PRIME</span> zone. Maximum risk/reward efficiency.</p>
                            </div>
                         </div>
                    </div>
                )}

                {activeTab === 'risk' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3">
                             <div className="p-3 bg-red-500/20 rounded-2xl">
                                <ShieldAlert size={32} className="text-red-500" />
                             </div>
                             <h3 className="text-xl sm:text-2xl font-bold text-white">Risk Mgmt & Portfolio Advisor</h3>
                         </div>
                        
                        <p>The AI Portfolio Advisor monitors your active "Holdings" and provides real-time instructions based on score-price divergence.</p>

                        <div className="space-y-3">
                            <div className="flex items-center gap-4 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-xl">
                                <div className="bg-emerald-500 text-black font-black text-[10px] px-2 py-1 rounded">BUY MORE</div>
                                <p className="text-xs text-gray-300 font-medium">Score rises to &ge; 8.5 while in profit. High conviction for trend continuation.</p>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                                <div className="bg-blue-500 text-white font-black text-[10px] px-2 py-1 rounded">TAKE PROFIT</div>
                                <p className="text-xs text-gray-300 font-medium">RSI exceeds 75 OR stock reaches AI Target (5x ATR) while score starts decaying.</p>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-orange-900/20 border border-orange-500/30 rounded-xl">
                                <div className="bg-orange-500 text-white font-black text-[10px] px-2 py-1 rounded">TRIM / HOLD</div>
                                <p className="text-xs text-gray-300 font-medium">Score drops below 6.0. Technical momentum is slowing; reduce exposure by 50%.</p>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-red-900/20 border border-red-500/30 rounded-xl">
                                <div className="bg-red-500 text-white font-black text-[10px] px-2 py-1 rounded">CUT LOSS</div>
                                <p className="text-xs text-gray-300 font-medium">Structural breakdown. Score &lt; 3.5 OR price hits Stop Loss level (2.5x ATR).</p>
                            </div>
                        </div>

                        <div className="bg-gray-850 p-6 rounded-2xl border border-gray-800 mt-4">
                            <h4 className="font-bold text-white mb-2 text-sm flex items-center gap-2"><Activity size={16}/> Expectancy Formula</h4>
                            <p className="text-[11px] text-gray-400 italic font-mono">Expectancy = (Win Rate x Avg Win) - (Loss Rate x Avg Loss)</p>
                            <p className="text-xs text-gray-500 mt-2">AlphaRank is designed to maximise "Avg Win" by holding leaders as long as the technical score remains above 7.0.</p>
                        </div>
                    </div>
                )}

            </div>
        </div>
      </div>
    </div>
  );
};

export default UserGuide;
