
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, Trash2, Save, RefreshCw, Briefcase, TrendingUp, TrendingDown, Target, ShieldAlert, ArrowRight, BookOpen, DollarSign, PiggyBank, Scale, X, Percent } from 'lucide-react';
import { userService } from '../services/userService';
import { fetchStockData, fetchOfficialSMA, fetchMarketCap } from '../services/stockService';
import { analyzeStock, generateTradeAdvice } from '../services/analysisEngine';
import { Position, StockResult, TradeAdvice, RealizedTrade } from '../types';

const PORTFOLIO_CACHE_KEY = 'alpharank_portfolio_data';

interface Props {
  onSelectStock: (stock: StockResult) => void;
}

const PortfolioView: React.FC<Props> = ({ onSelectStock }) => {
  // Lazy initialize positions from storage
  const [positions, setPositions] = useState<Position[]>(() => {
      const user = userService.getCurrentUser();
      return user?.positions || [];
  });

  // Portfolio Stats State
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [equityInvested, setEquityInvested] = useState<number>(0);
  const [realizedTrades, setRealizedTrades] = useState<RealizedTrade[]>([]);
  
  // Initialize market data from localStorage if available
  const [marketData, setMarketData] = useState<Record<string, { result: StockResult, advice: TradeAdvice }>>(() => {
      try {
          const cached = localStorage.getItem(PORTFOLIO_CACHE_KEY);
          if (cached) {
              return JSON.parse(cached);
          }
      } catch (e) {
          console.warn("Failed to load portfolio cache", e);
      }
      return {};
  });

  const [loading, setLoading] = useState(false);
  const [newTicker, setNewTicker] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [expandedJournal, setExpandedJournal] = useState<string | null>(null);

  // Sell Modal State
  const [sellModalOpen, setSellModalOpen] = useState(false);
  const [sellingPosition, setSellingPosition] = useState<Position | null>(null);
  const [sellPrice, setSellPrice] = useState<string>('');
  const [sellQuantity, setSellQuantity] = useState<string>('');

  // Initialize stats on mount
  useEffect(() => {
      const user = userService.getCurrentUser();
      if (user?.portfolioStats) {
          setCashBalance(user.portfolioStats.cashBalance || 0);
          setEquityInvested(user.portfolioStats.equityInvested || 0);
      }
      if (user?.realizedTrades) {
          setRealizedTrades(user.realizedTrades);
      }
  }, []);

  // Handle Portfolio Stats Update
  const handleStatsUpdate = (field: 'cash' | 'equity', value: string) => {
      const numValue = parseFloat(value) || 0;
      if (field === 'cash') setCashBalance(numValue);
      else setEquityInvested(numValue);
      
      const newStats = {
          cashBalance: field === 'cash' ? numValue : cashBalance,
          equityInvested: field === 'equity' ? numValue : equityInvested
      };
      userService.updatePortfolioStats(newStats);
  };

  // Persist marketData to localStorage whenever it changes
  useEffect(() => {
      try {
          localStorage.setItem(PORTFOLIO_CACHE_KEY, JSON.stringify(marketData));
      } catch (e) {
          console.warn("Failed to save portfolio cache", e);
      }
  }, [marketData]);

  // Fetch market data logic
  const fetchPortfolioData = useCallback(async (forceRefresh = false) => {
    if (positions.length === 0) return;
    
    setLoading(true);
    const newData: Record<string, { result: StockResult, advice: TradeAdvice }> = {};
    let hasUpdates = false;

    const todayStr = new Date().toDateString();

    for (const pos of positions) {
      try {
        const existingData = marketData[pos.ticker];
        
        let isDataFromToday = false;
        if (existingData && existingData.result.analysisTimestamp) {
            const dataDate = new Date(existingData.result.analysisTimestamp).toDateString();
            if (dataDate === todayStr) {
                isDataFromToday = true;
            }
        }

        if (isDataFromToday && !forceRefresh) {
           const newAdvice = generateTradeAdvice(existingData.result, pos);
           if (JSON.stringify(newAdvice) !== JSON.stringify(existingData.advice)) {
               newData[pos.ticker] = { result: existingData.result, advice: newAdvice };
               hasUpdates = true;
           } else {
               newData[pos.ticker] = existingData;
           }
           continue; 
        }

        const history = await fetchStockData(pos.ticker);
        const sma = await fetchOfficialSMA(pos.ticker);
        const mCap = await fetchMarketCap(pos.ticker);
        const result = analyzeStock(pos.ticker, history, sma, mCap);
        const advice = generateTradeAdvice(result, pos);
        
        newData[pos.ticker] = { result, advice };
        hasUpdates = true;
        
        if (positions.length > 5) await new Promise(r => setTimeout(r, 50)); 

      } catch (e) {
        console.error(`Failed to load data for ${pos.ticker}`, e);
        if (marketData[pos.ticker]) {
            newData[pos.ticker] = marketData[pos.ticker];
        }
      }
    }
    
    if (hasUpdates || forceRefresh) {
        setMarketData(prev => ({ ...prev, ...newData }));
    }
    setLoading(false);
  }, [positions, marketData]); 

  // Force Refresh on Mount
  useEffect(() => {
     fetchPortfolioData(true);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
      const updatedData = { ...marketData };
      let changed = false;
      positions.forEach(pos => {
          if (updatedData[pos.ticker]) {
              const newAdvice = generateTradeAdvice(updatedData[pos.ticker].result, pos);
              if (JSON.stringify(newAdvice) !== JSON.stringify(updatedData[pos.ticker].advice)) {
                  updatedData[pos.ticker] = { ...updatedData[pos.ticker], advice: newAdvice };
                  changed = true;
              }
          }
      });
      if (changed) setMarketData(updatedData);
  }, [positions]); 

  // --- ACTIONS ---

  const openSellModal = (pos: Position) => {
      const currentPrice = marketData[pos.ticker]?.result.currentPrice || pos.avgEntryPrice;
      setSellingPosition(pos);
      setSellPrice(currentPrice.toString());
      setSellQuantity(pos.quantity.toString());
      setSellModalOpen(true);
  };

  const handleSellConfirm = () => {
      if (!sellingPosition) return;
      const price = parseFloat(sellPrice);
      const qty = parseFloat(sellQuantity);
      
      if (isNaN(price) || isNaN(qty) || qty <= 0 || price <= 0) {
          alert("Invalid price or quantity.");
          return;
      }
      
      if (qty > sellingPosition.quantity) {
          alert("Cannot sell more than you own.");
          return;
      }

      // 1. Calculate P&L
      const pnl = (price - sellingPosition.avgEntryPrice) * qty;
      
      // 2. Record Realized Trade
      const newTrade: RealizedTrade = {
          id: Math.random().toString(36).substr(2, 9),
          ticker: sellingPosition.ticker,
          sellDate: new Date().toISOString(),
          sellPrice: price,
          buyPrice: sellingPosition.avgEntryPrice,
          quantity: qty,
          pnl: pnl
      };
      
      setRealizedTrades(prev => [...prev, newTrade]);
      userService.recordRealizedTrade(newTrade);

      // 3. Update Cash Balance (Add Revenue)
      const revenue = price * qty;
      const newCash = cashBalance + revenue;
      setCashBalance(newCash);
      userService.updatePortfolioStats({ cashBalance: newCash, equityInvested });

      // 4. Update Position (Reduce Qty or Remove)
      const remainingQty = sellingPosition.quantity - qty;
      if (remainingQty <= 0.0001) {
          // Remove position
          handleRemovePosition(sellingPosition.ticker);
      } else {
          // Update position
          const updatedPos = { ...sellingPosition, quantity: remainingQty };
          const updatedPositions = positions.map(p => p.ticker === sellingPosition.ticker ? updatedPos : p);
          setPositions(updatedPositions);
          userService.updatePosition(updatedPos);
      }

      setSellModalOpen(false);
      setSellingPosition(null);
  };

  const handleAddPosition = async () => {
    if (!newTicker) return;
    const tickerUpper = newTicker.toUpperCase();
    
    if (positions.find(p => p.ticker === tickerUpper)) {
        setNewTicker('');
        setIsAdding(false);
        return;
    }

    const newPos: Position = {
        ticker: tickerUpper,
        avgEntryPrice: 0,
        quantity: 0,
        entryDate: new Date().toISOString(),
        notes: ''
    };

    const updated = [newPos, ...positions];
    setPositions(updated);
    userService.updatePosition(newPos);
    
    setLoading(true);
    try {
        const history = await fetchStockData(tickerUpper);
        const sma = await fetchOfficialSMA(tickerUpper);
        const mCap = await fetchMarketCap(tickerUpper);
        const result = analyzeStock(tickerUpper, history, sma, mCap);
        const advice = generateTradeAdvice(result, newPos);
        setMarketData(prev => ({ ...prev, [tickerUpper]: { result, advice } }));
    } catch(e) {
        console.error("Error fetching new ticker");
    } finally {
        setLoading(false);
        setNewTicker('');
        setIsAdding(false);
    }
  };

  const handleUpdatePosition = (ticker: string, field: keyof Position, value: string | number) => {
    const updatedPositions = positions.map(p => {
        if (p.ticker === ticker) {
            return { ...p, [field]: value };
        }
        return p;
    });
    setPositions(updatedPositions);
    
    const updatedPos = updatedPositions.find(p => p.ticker === ticker);
    if (updatedPos) userService.updatePosition(updatedPos);
  };

  const handleRemovePosition = (ticker: string) => {
    userService.removePosition(ticker);
    setPositions(positions.filter(p => p.ticker !== ticker));
    
    setMarketData(prev => {
        const next = { ...prev };
        delete next[ticker];
        return next;
    });
  };

  // --- CALCULATIONS ---
  const stocksValue = positions.reduce((sum, p) => {
      const currentPrice = marketData[p.ticker]?.result.currentPrice || p.avgEntryPrice;
      return sum + (currentPrice * p.quantity);
  }, 0);

  const costBasis = positions.reduce((sum, p) => sum + (p.avgEntryPrice * p.quantity), 0);
  const totalAccountValue = stocksValue + cashBalance;
  const totalNetReturn = totalAccountValue - equityInvested;
  const totalNetReturnPercent = equityInvested > 0 ? (totalNetReturn / equityInvested) * 100 : 0;

  // Tax Calculations
  const taxStats = useMemo(() => {
      let totalRealizedGain = 0;
      let totalRealizedLoss = 0;

      realizedTrades.forEach(t => {
          if (t.pnl > 0) totalRealizedGain += t.pnl;
          else totalRealizedLoss += Math.abs(t.pnl);
      });

      const totalPnl = totalRealizedGain - totalRealizedLoss;
      
      // If Net Gain > 0: Pay 25% tax on net gain
      // If Net Loss < 0: Tax Shield is 25% of net loss
      const taxRate = 0.25;
      let taxLiability = 0;
      let taxShieldAvailable = 0;

      if (totalPnl > 0) {
          taxLiability = totalPnl * taxRate;
      } else {
          taxShieldAvailable = Math.abs(totalPnl) * taxRate;
      }

      return { totalRealizedGain, totalRealizedLoss, totalPnl, taxLiability, taxShieldAvailable };
  }, [realizedTrades]);

  return (
    <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
      
      {/* Portfolio Summary Card */}
      <div className="bg-gray-850 rounded-2xl border border-gray-700 p-6 mb-8 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-gray-800 pb-4">
              <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-500/20 rounded-xl">
                      <Briefcase className="text-blue-400" size={28} />
                  </div>
                  <div>
                      <h2 className="text-2xl font-bold text-white leading-none">Portfolio Summary</h2>
                      <p className="text-xs text-gray-400 mt-1">Real-time Performance & Tax Tracker</p>
                  </div>
              </div>
              
              <div className="flex items-center gap-2">
                 {loading && <span className="text-xs text-blue-400 animate-pulse flex items-center gap-1"><RefreshCw size={12} className="animate-spin"/> Syncing Live Data...</span>}
                 <button 
                   onClick={() => fetchPortfolioData(true)}
                   className="p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-gray-400 hover:text-white transition-colors border border-gray-700"
                   title="Force Refresh Data"
                 >
                   <RefreshCw size={18} />
                 </button>
              </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Col 1: Account Value */}
              <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl p-5 border border-gray-700 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10"><Scale size={100} /></div>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mb-1 flex items-center gap-2">
                      <PiggyBank size={14} className="text-emerald-400" /> Total Account Value
                  </p>
                  <p className="text-4xl font-mono font-black text-white tracking-tight">
                      ${totalAccountValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                  </p>
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                      <span>Stock: ${stocksValue.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                      <span>•</span>
                      <span>Cash: ${cashBalance.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
                  </div>
              </div>

              {/* Col 2: Net Return & Invested */}
              <div className="space-y-3">
                  <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-800">
                      <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-1">Total Net Return</p>
                      <div className="flex items-baseline gap-2">
                          <p className={`text-2xl font-mono font-bold ${totalNetReturn >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {totalNetReturn >= 0 ? '+' : ''}{totalNetReturn.toLocaleString(undefined, {maximumFractionDigits: 0})}
                          </p>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${totalNetReturnPercent >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                              {totalNetReturnPercent >= 0 ? '+' : ''}{totalNetReturnPercent.toFixed(2)}%
                          </span>
                      </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                      <div className="bg-gray-900/30 rounded-lg p-3 border border-gray-700">
                          <label className="text-[9px] uppercase text-gray-500 font-bold block mb-1">Cash Balance</label>
                          <input type="number" value={cashBalance || ''} onChange={(e) => handleStatsUpdate('cash', e.target.value)} className="w-full bg-transparent text-white font-mono text-sm font-bold focus:outline-none" placeholder="0" />
                      </div>
                      <div className="bg-gray-900/30 rounded-lg p-3 border border-gray-700">
                          <label className="text-[9px] uppercase text-gray-500 font-bold block mb-1">Equity Invested</label>
                          <input type="number" value={equityInvested || ''} onChange={(e) => handleStatsUpdate('equity', e.target.value)} className="w-full bg-transparent text-purple-300 font-mono text-sm font-bold focus:outline-none" placeholder="0" />
                      </div>
                  </div>
              </div>

              {/* Col 3: Tax Summary */}
              <div className="bg-gray-900/30 rounded-xl border border-gray-700 p-4 flex flex-col justify-center relative overflow-hidden">
                  <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                          <Percent size={16} className="text-gray-400" />
                          <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">Tax Status</span>
                      </div>
                      {taxStats.taxLiability > 0 ? (
                          <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded">Tax Due</span>
                      ) : taxStats.taxShieldAvailable > 0 ? (
                          <span className="bg-green-500/20 text-green-400 text-[10px] font-bold px-2 py-0.5 rounded">Tax Credit</span>
                      ) : <span className="bg-gray-700 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded">Neutral</span>}
                  </div>

                  <div className="flex items-baseline gap-2 mb-1">
                      {taxStats.taxLiability > 0 ? (
                          <p className="text-2xl font-mono font-bold text-red-400">-${taxStats.taxLiability.toLocaleString()}</p>
                      ) : (
                          <p className="text-2xl font-mono font-bold text-green-400">+${taxStats.taxShieldAvailable.toLocaleString()}</p>
                      )}
                  </div>
                  <p className="text-[10px] text-gray-500 mb-3">{taxStats.taxLiability > 0 ? "Estimated 25% Tax on Realized Gains" : "Available Tax Shield from Losses"}</p>
                  
                  <div className="w-full h-px bg-gray-700 mb-3" />
                  
                  <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-gray-400">Total Realized P&L:</span>
                      <span className={taxStats.totalPnl >= 0 ? "text-green-400" : "text-red-400"}>
                          {taxStats.totalPnl > 0 ? '+' : ''}{taxStats.totalPnl.toLocaleString()}
                      </span>
                  </div>
              </div>

          </div>
      </div>

      {/* Action Bar */}
      <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-white">Holdings</h3>
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg transition-colors font-semibold"
          >
              <Plus size={18} /> Add Symbol
          </button>
      </div>

      {/* Add Row */}
      {isAdding && (
          <div className="bg-gray-800/50 border border-blue-500/30 rounded-xl p-4 mb-6 flex items-center gap-4 animate-in fade-in zoom-in-95">
              <input 
                  autoFocus
                  type="text"
                  placeholder="Ticker (e.g. TSLA)"
                  value={newTicker}
                  onChange={(e) => setNewTicker(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPosition()}
                  className="bg-gray-900 border border-gray-700 text-white px-4 py-2 rounded-lg uppercase font-mono w-40 focus:border-blue-500 outline-none"
              />
              <div className="flex gap-2">
                <button onClick={handleAddPosition} className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-bold">Save</button>
                <button onClick={() => setIsAdding(false)} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm">Cancel</button>
              </div>
          </div>
      )}

      {/* List */}
      <div className="space-y-4">
          {positions.length === 0 && !isAdding && (
              <div className="text-center py-16 bg-gray-850/50 border-2 border-dashed border-gray-800 rounded-2xl text-gray-500">
                  <Briefcase size={48} className="mx-auto mb-3 opacity-20" />
                  <p>Your portfolio is empty.</p>
                  <p className="text-sm">Click "Add Symbol" to start tracking your holdings.</p>
              </div>
          )}

          {positions.map(pos => {
              const data = marketData[pos.ticker];
              const result = data?.result;
              const advice = data?.advice;
              const currentPrice = result?.currentPrice || 0;
              const currentValue = currentPrice * pos.quantity;
              const pnl = currentValue - (pos.avgEntryPrice * pos.quantity);
              const pnlPercent = pos.avgEntryPrice > 0 ? (pnl / (pos.avgEntryPrice * pos.quantity)) * 100 : 0;
              const isJournalOpen = expandedJournal === pos.ticker;

              return (
                  <div key={pos.ticker} className="bg-gray-850 border border-gray-700 rounded-xl overflow-hidden hover:border-gray-600 transition-colors">
                      {/* Main Row Content */}
                      <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                          
                          {/* 1. Ticker & Live Price (Cols 1-2) */}
                          <div className="lg:col-span-2">
                              <div className="flex items-center justify-between lg:block">
                                  <div>
                                      <h4 
                                        onClick={() => result && onSelectStock(result)}
                                        className={`text-xl font-black text-white font-mono ${result ? 'cursor-pointer hover:text-blue-400 hover:underline decoration-blue-500/50 underline-offset-4' : ''} transition-all`}
                                        title={result ? "View Analysis" : "Loading..."}
                                      >
                                        {pos.ticker}
                                      </h4>
                                      <div className="flex items-center gap-2 mt-1">
                                          {currentPrice > 0 ? (
                                              <>
                                                 <span className="text-gray-300 font-mono">${currentPrice.toFixed(2)}</span>
                                                 {result && (
                                                     <span className={`text-xs font-bold ${result.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                                         {result.changePercent > 0 ? '+' : ''}{result.changePercent.toFixed(2)}%
                                                     </span>
                                                 )}
                                              </>
                                          ) : (
                                              <span className="text-xs text-blue-400 animate-pulse flex items-center gap-1"><RefreshCw size={10} className="animate-spin"/> Fetching...</span>
                                          )}
                                      </div>
                                  </div>
                                  {/* Mobile Trash Button */}
                                  <button onClick={() => handleRemovePosition(pos.ticker)} className="lg:hidden p-2 text-gray-600 hover:text-red-400">
                                      <Trash2 size={18} />
                                  </button>
                              </div>
                          </div>

                          {/* 2. Inputs (Cols 3-5) */}
                          <div className="lg:col-span-3 grid grid-cols-2 gap-3">
                              <div>
                                  <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Avg Price</label>
                                  <div className="relative">
                                      <span className="absolute left-2 top-1.5 text-gray-500 text-xs">$</span>
                                      <input 
                                          type="number" 
                                          value={pos.avgEntryPrice || ''}
                                          onChange={(e) => handleUpdatePosition(pos.ticker, 'avgEntryPrice', parseFloat(e.target.value))}
                                          className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 pl-5 text-sm text-white focus:border-blue-500 outline-none font-mono"
                                          placeholder="0.00"
                                      />
                                  </div>
                              </div>
                              <div>
                                  <label className="text-[10px] uppercase text-gray-500 font-bold mb-1 block">Quantity</label>
                                  <input 
                                      type="number" 
                                      value={pos.quantity || ''}
                                      onChange={(e) => handleUpdatePosition(pos.ticker, 'quantity', parseFloat(e.target.value))}
                                      className="w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm text-white focus:border-blue-500 outline-none font-mono"
                                      placeholder="0"
                                  />
                              </div>
                          </div>

                          {/* 3. Performance (Cols 6-8) */}
                          <div className="lg:col-span-3 flex justify-between lg:block bg-gray-800/30 lg:bg-transparent p-3 lg:p-0 rounded-lg">
                               <div className="mb-0 lg:mb-2">
                                  <p className="text-[10px] uppercase text-gray-500 font-bold">Current Value</p>
                                  <p className="text-white font-mono font-bold">${currentValue.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                               </div>
                               <div>
                                  <p className="text-[10px] uppercase text-gray-500 font-bold">Profit / Loss</p>
                                  <div className="flex items-center gap-2">
                                      <span className={`font-mono font-bold ${pnl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                          {pnl >= 0 ? '+' : ''}{pnl.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                                      </span>
                                      <span className={`text-xs px-1.5 py-0.5 rounded ${pnlPercent >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                          {pnlPercent.toFixed(2)}%
                                      </span>
                                  </div>
                               </div>
                          </div>

                          {/* 4. AI Advisor (Cols 9-11) */}
                          <div className="lg:col-span-3">
                              {advice ? (
                                  <div className={`border rounded-lg p-2.5 relative overflow-hidden ${
                                      advice.action === 'BUY MORE' ? 'bg-green-900/10 border-green-500/30' :
                                      advice.action === 'TAKE PROFIT' ? 'bg-emerald-900/10 border-emerald-500/30' :
                                      advice.action.includes('SELL') ? 'bg-red-900/10 border-red-500/30' :
                                      'bg-blue-900/10 border-blue-500/30'
                                  }`}>
                                      <div className="flex justify-between items-center mb-1.5">
                                          <span className="text-[10px] text-gray-400 uppercase font-bold tracking-wider flex items-center gap-1">
                                             <Briefcase size={10} /> AI Advisor
                                          </span>
                                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase ${
                                              advice.action === 'BUY MORE' ? 'bg-green-500 text-black' :
                                              advice.action === 'TAKE PROFIT' ? 'bg-emerald-500 text-black' :
                                              advice.action.includes('SELL') ? 'bg-red-500 text-white' :
                                              'bg-blue-500 text-white'
                                          }`}>
                                              {advice.action}
                                          </span>
                                      </div>
                                      
                                      <div className="flex items-center gap-4 text-xs">
                                          <div>
                                             <span className="text-gray-500 block text-[9px] uppercase">S. Stop</span>
                                             <span className="text-red-300 font-mono">${advice.suggestedStop}</span>
                                          </div>
                                          <div>
                                             <span className="text-gray-500 block text-[9px] uppercase">Target</span>
                                             <span className="text-green-300 font-mono">${advice.suggestedTarget}</span>
                                          </div>
                                          <div className="flex-1 text-right">
                                               <span className="text-gray-500 block text-[9px] uppercase">Tech Score</span>
                                               <span className={`font-bold ${result!.totalScore >= 7 ? 'text-green-400' : result!.totalScore >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                                                   {result!.totalScore}
                                               </span>
                                          </div>
                                      </div>
                                  </div>
                              ) : (
                                  <div className="h-full flex items-center justify-center text-xs text-gray-600 bg-gray-900/30 rounded-lg border border-gray-800 border-dashed">
                                      AI Analyzing...
                                  </div>
                              )}
                          </div>

                          {/* 5. Actions (Col 12) */}
                          <div className="hidden lg:col-span-1 lg:flex flex-col gap-2 items-end">
                              <button 
                                onClick={() => openSellModal(pos)}
                                className="p-2 bg-blue-600/20 text-blue-400 hover:bg-blue-600 hover:text-white rounded-lg transition-colors font-bold text-xs w-full"
                                title="Realize Profit/Loss"
                              >
                                  SELL
                              </button>
                              <div className="flex gap-2">
                                <button 
                                    onClick={() => setExpandedJournal(isJournalOpen ? null : pos.ticker)}
                                    className={`p-2 rounded-lg transition-colors ${isJournalOpen ? 'bg-blue-900/30 text-blue-400' : 'text-gray-600 hover:bg-gray-800 hover:text-white'}`}
                                    title="Trading Journal"
                                >
                                    <BookOpen size={18} />
                                </button>
                                <button 
                                    onClick={() => handleRemovePosition(pos.ticker)}
                                    className="p-2 text-gray-600 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors"
                                    title="Remove Position"
                                >
                                    <Trash2 size={18} />
                                </button>
                              </div>
                          </div>
                      </div>

                      {/* Trading Journal Section (Expandable) */}
                      {isJournalOpen && (
                          <div className="border-t border-gray-700 bg-gray-900/50 p-4 animate-in slide-in-from-top-2">
                              <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Trading Journal & Notes</label>
                              <textarea
                                value={pos.notes || ''}
                                onChange={(e) => handleUpdatePosition(pos.ticker, 'notes', e.target.value)}
                                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm text-white focus:border-blue-500 outline-none min-h-[100px]"
                                placeholder="Why did you enter this trade? What is your plan?..."
                              />
                          </div>
                      )}
                  </div>
              );
          })}
      </div>

      {/* SELL MODAL */}
      {sellModalOpen && sellingPosition && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSellModalOpen(false)} />
              <div className="relative bg-gray-900 border border-gray-700 w-full max-w-sm rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
                  <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          <TrendingUp className="text-blue-500" /> Sell {sellingPosition.ticker}
                      </h3>
                      <button onClick={() => setSellModalOpen(false)} className="text-gray-500 hover:text-white"><X size={20}/></button>
                  </div>

                  <div className="space-y-4">
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Sell Price</label>
                          <div className="relative">
                              <span className="absolute left-3 top-2.5 text-gray-500">$</span>
                              <input 
                                  type="number" 
                                  value={sellPrice} 
                                  onChange={(e) => setSellPrice(e.target.value)}
                                  className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 pl-7 pr-3 text-white font-mono font-bold focus:border-blue-500 outline-none"
                              />
                          </div>
                      </div>
                      <div>
                          <label className="text-xs font-bold text-gray-500 uppercase mb-1 block">Quantity Sold</label>
                          <input 
                              type="number" 
                              value={sellQuantity} 
                              onChange={(e) => setSellQuantity(e.target.value)}
                              className="w-full bg-gray-800 border border-gray-600 rounded-xl py-2 px-3 text-white font-mono font-bold focus:border-blue-500 outline-none"
                          />
                          <p className="text-[10px] text-gray-500 mt-1 text-right">Max: {sellingPosition.quantity}</p>
                      </div>

                      <div className="bg-gray-850 rounded-xl p-3 border border-gray-700 mt-2">
                          <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-400">Total Value:</span>
                              <span className="text-white font-mono">${((parseFloat(sellPrice)||0) * (parseFloat(sellQuantity)||0)).toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                              <span className="text-gray-400">Realized P&L:</span>
                              <span className={`font-mono font-bold ${((parseFloat(sellPrice)||0) - sellingPosition.avgEntryPrice) * (parseFloat(sellQuantity)||0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                  {((parseFloat(sellPrice)||0) - sellingPosition.avgEntryPrice) * (parseFloat(sellQuantity)||0) >= 0 ? '+' : ''}
                                  ${(((parseFloat(sellPrice)||0) - sellingPosition.avgEntryPrice) * (parseFloat(sellQuantity)||0)).toLocaleString(undefined, {maximumFractionDigits: 2})}
                              </span>
                          </div>
                      </div>

                      <button 
                          onClick={handleSellConfirm}
                          className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 rounded-xl shadow-lg mt-4"
                      >
                          Confirm Sale
                      </button>
                  </div>
              </div>
          </div>
      )}

    </div>
  );
};

export default PortfolioView;
