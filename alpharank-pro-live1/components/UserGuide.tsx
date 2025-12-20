
import React, { useState } from 'react';
import { X, BookOpen, Activity, Target, Zap, TrendingUp, BarChart2, ShieldAlert, Layers, Percent, ArrowUp, Microscope, Globe, Gauge, Compass, Landmark, LayoutGrid, Scale, ListChecks, Info, ChevronRight } from 'lucide-react';

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
                <p className="text-xs text-gray-500 font-medium">Model Version 2.5.7 • Official Documentation</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-700 rounded-full transition-colors text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col md:flex-row flex-1 overflow-hidden">
            
            {/* Desktop Sidebar Tabs */}
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

            {/* Mobile Tabs */}
            <div className="md:hidden grid grid-cols-5 border-b border-gray-800 bg-gray-850 shrink-0 gap-px bg-gray-700">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`p-3 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors bg-gray-850 ${
                            activeTab === tab.id 
                            ? 'text-white bg-blue-900/10' 
                            : 'text-gray-400'
                        }`}
                    >
                        <tab.icon size={16} />
                        <span className="truncate w-full text-center">{tab.label.split(' ')[0]}</span>
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-8 custom-scrollbar bg-gray-900 text-gray-300 leading-relaxed">
                
                {activeTab === 'basics' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">The AlphaRank Philosophy</h3>
                        <p>
                            AlphaRank Pro is a multi-factor technical analysis engine designed to quantify "Institutional Footprints" and market momentum. By removing emotional bias, the system provides a clear mathematical score for every stock.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6">
                            <div className="bg-emerald-900/10 border border-emerald-500/30 p-5 rounded-xl">
                                <h4 className="font-bold text-emerald-400 mb-2 flex items-center gap-2">
                                    <TrendingUp size={18}/> Institutional Accumulation
                                </h4>
                                <p className="text-sm text-gray-400">
                                    High scores (7-10) signal that large players are buying. The "Path of Least Resistance" is upward.
                                </p>
                            </div>
                            <div className="bg-red-900/10 border border-red-500/30 p-5 rounded-xl">
                                <h4 className="font-bold text-red-400 mb-2 flex items-center gap-2">
                                    <ShieldAlert size={18}/> Distribution / Breakdown
                                </h4>
                                <p className="text-sm text-gray-400">
                                    Low scores (0-3) identify technical decay. High risk of further drawdown regardless of "valuation."
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'macro' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex items-center gap-3 mb-2">
                            <Globe size={32} className="text-blue-400" />
                            <h3 className="text-xl sm:text-2xl font-bold text-white">Market Macro (The Global Pulse)</h3>
                        </div>
                        <p className="text-gray-400">We analyze the <strong>Equal-Weight S&P 500 (RSP)</strong> to determine the true health of the "average" stock, filtering out noise from mega-cap tech.</p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                            <div className="bg-gray-850 p-5 rounded-xl border border-gray-700">
                                <h4 className="font-bold text-white flex items-center gap-2 mb-3">
                                    <Layers size={18} className="text-purple-400" /> Volatility Term Structure (VTS)
                                </h4>
                                <p className="text-xs text-gray-400 mb-3">Compares Short-Term Panic (VIX9D) vs Standard Volatility (VIX30D).</p>
                                <ul className="space-y-2 text-xs">
                                    <li className="flex items-start gap-2"><span className="text-green-400 font-bold">Contango:</span> Normal state. Panic is contained. Buy setups are high probability.</li>
                                    <li className="flex items-start gap-2"><span className="text-red-400 font-bold">Backwardation:</span> Systemic stress. Short-term fear is spiking. Raise cash/hedge.</li>
                                </ul>
                            </div>

                            <div className="bg-gray-850 p-5 rounded-xl border border-gray-700">
                                <h4 className="font-bold text-white flex items-center gap-2 mb-3">
                                    <LayoutGrid size={18} className="text-blue-400" /> Market Breadth
                                </h4>
                                <p className="text-xs text-gray-400">Participation is the heartbeat of a bull market.</p>
                                <ul className="space-y-2 text-xs">
                                    <li><strong>Structural:</strong> % of stocks above SMA 150 (Long-term health).</li>
                                    <li><strong>Tactical:</strong> % of stocks above SMA 50 (Immediate strength).</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'indicators' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2 mb-2">
                                <Scale size={24} className="text-blue-500" />
                                Scoring Engine Breakdown
                            </h3>
                            <p className="text-sm text-gray-400">
                                Every stock receives a score from 0.0 to 10.0 based on 12 weighted indicators.
                            </p>
                        </div>

                        {/* WEIGHT CATEGORIES */}
                        <div className="space-y-6">
                            {/* TIER 1: HIGH IMPACT */}
                            <div className="bg-blue-900/10 border border-blue-500/30 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-blue-600/20 border-b border-blue-500/30 font-black text-[10px] text-blue-400 uppercase tracking-widest">
                                    Tier 1: Strategic Drivers (15% Weight Each)
                                </div>
                                <div className="p-4 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-blue-500/20 rounded flex items-center justify-center shrink-0 font-bold text-blue-400">15%</div>
                                        <div className="text-sm">
                                            <p className="font-bold text-white">Relative Strength (RS vs SPY)</p>
                                            <p className="text-gray-400 text-xs">Calculated over 126 trading days. Identifies leaders that perform even when the market is flat.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="w-10 h-10 bg-purple-500/20 rounded flex items-center justify-center shrink-0 font-bold text-purple-400">15%</div>
                                        <div className="text-sm">
                                            <p className="font-bold text-white">Structure & Pattern Recognition</p>
                                            <p className="text-gray-400 text-xs">AI detection of Cup & Handle, Elliott Impulse Waves, and Double Bottom reversals.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TIER 2: FOUNDATION */}
                            <div className="bg-gray-800/40 border border-gray-700 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-gray-800 border-b border-gray-700 font-black text-[10px] text-gray-500 uppercase tracking-widest">
                                    Tier 2: Core Trend (10% Weight Each)
                                </div>
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-y-4 gap-x-8">
                                    <div className="flex gap-3">
                                        <span className="text-gray-400 font-mono text-xs font-bold">10%</span>
                                        <div className="text-xs">
                                            <p className="text-white font-bold mb-1">SMA 150 Trend</p>
                                            <p className="text-gray-500">The "Institutional Line." Price must be above for a bullish bias.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="text-gray-400 font-mono text-xs font-bold">10%</span>
                                        <div className="text-xs">
                                            <p className="text-white font-bold mb-1">Weekly MTA Trend</p>
                                            <p className="text-gray-500">Alignment between Daily and Weekly timeframes.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="text-gray-400 font-mono text-xs font-bold">10%</span>
                                        <div className="text-xs">
                                            <p className="text-white font-bold mb-1">Volume RVOL</p>
                                            <p className="text-gray-500">Detecting relative volume spikes (>1.5x) indicating accumulation.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <span className="text-gray-400 font-mono text-xs font-bold">10%</span>
                                        <div className="text-xs">
                                            <p className="text-white font-bold mb-1">Bollinger Bands</p>
                                            <p className="text-gray-500">Scoring based on volatility expansion and mean deviation.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* TIER 3: SIGNALS */}
                            <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                                <div className="px-4 py-2 bg-gray-850 border-b border-gray-800 font-black text-[10px] text-gray-600 uppercase tracking-widest">
                                    Tier 3: Momentum & Signals (5% Weight Each)
                                </div>
                                <div className="p-4 grid grid-cols-1 sm:grid-cols-3 gap-6 text-[10px]">
                                    <div className="space-y-1"><span className="text-white font-bold block uppercase tracking-tighter">RSI Momentum (5%)</span> Strength of current price velocity.</div>
                                    <div className="space-y-1"><span className="text-white font-bold block uppercase tracking-tighter">MACD Signal (5%)</span> Exponential convergence/divergence pivots.</div>
                                    <div className="space-y-1"><span className="text-white font-bold block uppercase tracking-tighter">RSI Divergence (5%)</span> Leading signal comparing Price vs Momentum pivots.</div>
                                    <div className="space-y-1"><span className="text-white font-bold block uppercase tracking-tighter">Inst. Support (5%)</span> Position relative to VWAP or VWMA (20).</div>
                                    <div className="space-y-1"><span className="text-white font-bold block uppercase tracking-tighter">ADX Trend (5%)</span> Quantifying the actual "strength" of a trend.</div>
                                    <div className="space-y-1"><span className="text-white font-bold block uppercase tracking-tighter">Parabolic SAR (5%)</span> Dynamic trailing stop/pivot mechanism.</div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'prime' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                         <div className="flex items-center gap-3 mb-4">
                             <Target size={32} className="text-yellow-400" />
                             <h3 className="text-xl sm:text-2xl font-bold text-white">Recommended Entry Logic</h3>
                         </div>
                         
                         <p className="text-base text-white">
                             Finding the right stock is 50% of the battle. The other 50% is <strong>Execution</strong>. The system calculates three entry scenarios:
                         </p>

                         <div className="space-y-4">
                            <div className="bg-gray-850 p-5 rounded-xl border border-blue-500/30">
                                <div className="space-y-4">
                                    <div className="flex gap-4">
                                        <div className="bg-blue-600/20 px-2 py-1 rounded h-fit text-[10px] font-bold text-blue-400 shrink-0">SCENARIO A</div>
                                        <div className="text-sm">
                                            <p className="font-bold text-gray-200 underline decoration-blue-500/30">The Breakout Retest (Score 8.5+)</p>
                                            <p className="text-gray-400 text-xs mt-1">If price is above the Upper Bollinger Band, the system waits for a pullback to the band to verify support.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="bg-emerald-600/20 px-2 py-1 rounded h-fit text-[10px] font-bold text-emerald-400 shrink-0">SCENARIO B</div>
                                        <div className="text-sm">
                                            <p className="font-bold text-gray-200 underline decoration-emerald-500/30">The Mean Reversion (Score 7.0-8.5)</p>
                                            <p className="text-gray-400 text-xs mt-1">Targets the SMA 20 (Bollinger Middle). It assumes strong stocks will pull back to their average before the next leg up.</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="bg-purple-600/20 px-2 py-1 rounded h-fit text-[10px] font-bold text-purple-400 shrink-0">SCENARIO C</div>
                                        <div className="text-sm">
                                            <p className="font-bold text-gray-200 underline decoration-purple-500/30">Deep Support (Score 4.5-6.5)</p>
                                            <p className="text-gray-400 text-xs mt-1">Targets the Lower Bollinger Band or major swing lows for high margin-of-safety entries.</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-900/10 border border-yellow-500/30 p-5 rounded-xl">
                                <h4 className="font-bold text-yellow-500 mb-2 flex items-center gap-2">The "Prime" Badge</h4>
                                <p className="text-xs text-gray-400 font-medium italic">Requirement: Score ≥ 8.0 AND Current Price within 2% of the AI Recommended Price.</p>
                            </div>
                         </div>
                    </div>
                )}

                {activeTab === 'risk' && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-xl sm:text-2xl font-bold text-white flex items-center gap-2"><ShieldAlert className="text-red-500"/> Trade Automation & Risk</h3>
                        
                        <div className="bg-blue-900/10 border border-blue-500/30 p-5 rounded-xl">
                            <h4 className="font-bold text-blue-400 mb-2">Portfolio Advisor</h4>
                            <p className="text-sm">In your <strong>Holdings</strong>, the AI provides live instructions:</p>
                            <ul className="mt-3 space-y-2 text-xs text-gray-400">
                                <li className="flex gap-2"><span className="text-green-400 font-bold">BUY MORE:</span> Score is rising, price near SMA support, P&L positive.</li>
                                <li className="flex gap-2"><span className="text-emerald-400 font-bold">TAKE PROFIT:</span> Price extended, RSI > 75, High unrealized gain.</li>
                                <li className="flex gap-2"><span className="text-red-400 font-bold">CUT LOSS:</span> Score broke below 4.0 while P&L is negative.</li>
                            </ul>
                        </div>

                        <div className="bg-gray-850 p-5 rounded-xl border border-gray-700">
                            <h4 className="font-bold text-white mb-2 flex items-center gap-2"><Info size={16}/> Dynamic Stop Loss</h4>
                            <p className="text-sm text-gray-400 leading-relaxed">
                                Our stops use <strong>2x ATR (Average True Range)</strong>. This accounts for ticker-specific volatility, placing your protection outside of normal noise levels while capping total downside risk to manageable levels.
                            </p>
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
