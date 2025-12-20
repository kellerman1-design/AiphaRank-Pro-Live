
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, BarChart2, RefreshCw, AlertCircle, TrendingUp, Info, ShieldAlert, Zap, Server, X, Check, Plus, Globe, User, Cloud, Bell, LogOut, Loader2, Target, Layers, List, Moon, Loader, Briefcase, PlayCircle, StopCircle, BookOpen, PieChart, Filter, Trophy, ArrowRight, Gauge, Activity, Menu, ChevronRight, LayoutGrid, Database } from 'lucide-react';
import { fetchStockData, fetchOfficialSMA, fetchMarketCap } from './services/stockService';
import { analyzeStock } from './services/analysisEngine';
import StockCard from './components/StockCard';
import DetailView from './components/DetailView';
import ActiveAlertsList from './components/ActiveAlertsList';
import GoogleAuthModal from './components/GoogleAuthModal';
import PortfolioView from './components/PortfolioView';
import MarketHeatmap from './components/MarketHeatmap';
import SectorHeatmap from './components/SectorHeatmap';
import MarketOverview from './components/MarketOverview';
import UserGuide from './components/UserGuide';
import { StockResult, UserProfile, StockAlert, StockCandle } from './types';
import { userService } from './services/userService';
import { notificationService } from './services/notificationService';
import { scannerService } from './services/scannerService';
import { POPULAR_STOCKS } from './constants';

const MAX_SELECTION = 5;

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'markets' | 'watchlist' | 'scanner' | 'sectors' | 'holdings'>('markets');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedTickers, setSelectedTickers] = useState<string[]>(['NVDA', 'MSFT', 'AAPL', 'TSLA', 'AMD']);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(true);
  const [results, setResults] = useState<StockResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedStock, setSelectedStock] = useState<StockResult | null>(null);
  const [spyHistory, setSpyHistory] = useState<StockCandle[] | null>(null);
  const [showGuide, setShowGuide] = useState(false);
  const [scannerResults, setScannerResults] = useState<StockResult[]>([]);
  const [currentScanningTicker, setCurrentScanningTicker] = useState<string>("");
  const [scanProgress, setScanProgress] = useState(0);
  const [isScanning, setIsScanning] = useState(false);
  const [isFastScanMode, setIsFastScanMode] = useState(false);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const stopScanRef = useRef(false);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showGoogleAuth, setShowGoogleAuth] = useState(false);
  const [showAlertsList, setShowAlertsList] = useState(false);
  const [marketStatus, setMarketStatus] = useState<{label: string, color: string, dot: string}>({ label: 'Checking...', color: 'text-gray-500', dot: 'bg-gray-500' });

  useEffect(() => {
    isMountedRef.current = true;
    const currentUser = userService.getCurrentUser();
    if (currentUser) {
      setUser(currentUser);
      setSelectedTickers(currentUser.watchlist);
    }
    setScannerResults(scannerService.getResults());
    fetchStockData('SPY').then(data => {
        if(isMountedRef.current) setSpyHistory(data);
    }).catch(console.error);
    return () => { isMountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (user && selectedTickers.length > 0) {
      userService.updateWatchlist(selectedTickers);
    }
  }, [selectedTickers, user]);

  useEffect(() => {
    const updateMarketStatus = () => {
      const now = new Date();
      const nyTimeStr = now.toLocaleString("en-US", {timeZone: "America/New_York"});
      const nyTime = new Date(nyTimeStr);
      const day = nyTime.getDay();
      const hour = nyTime.getHours();
      const minute = nyTime.getMinutes();
      const totalMinutes = hour * 60 + minute;
      let label = 'Closed';
      let color = 'text-gray-500';
      let dot = 'bg-gray-500';
      if (day >= 1 && day <= 5) {
        if (totalMinutes >= 240 && totalMinutes < 570) { label = 'Pre Market'; color = 'text-yellow-400'; dot = 'bg-yellow-400'; }
        else if (totalMinutes >= 570 && totalMinutes < 960) { label = 'Open'; color = 'text-green-400'; dot = 'bg-green-400'; }
        else if (totalMinutes >= 960 && totalMinutes < 1200) { label = 'After Hours'; color = 'text-blue-400'; dot = 'bg-blue-400'; }
      }
      setMarketStatus({ label, color, dot });
    };
    updateMarketStatus();
    const timer = setInterval(updateMarketStatus, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleStartScan = async () => {
      if (isScanning) return;
      setIsScanning(true);
      stopScanRef.current = false;
      setScanProgress(0);
      setCurrentScanningTicker("Waking up Engine...");
      const lastFullScanStr = localStorage.getItem('last_full_scan_date');
      const todayStr = new Date().toLocaleDateString("en-CA", {timeZone: "America/New_York"});
      const fastMode = lastFullScanStr === todayStr;
      setIsFastScanMode(fastMode);
      let currentSpy = spyHistory;
      if (!currentSpy) {
          try { currentSpy = await fetchStockData('SPY'); setSpyHistory(currentSpy); } catch(e) {}
      }
      for (let i = 0; i < POPULAR_STOCKS.length; i++) {
          if (stopScanRef.current) break;
          const stock = POPULAR_STOCKS[i];
          setCurrentScanningTicker(stock.symbol);
          setScanProgress(Math.round(((i + 1) / POPULAR_STOCKS.length) * 100));
          try {
              const history = await fetchStockData(stock.symbol);
              const result = analyzeStock(stock.symbol, history, null, null, currentSpy); 
              if (isMountedRef.current && !stopScanRef.current) {
                  const lightweightResult: StockResult = { ...result, companyName: stock.name, sector: stock.sector, history: [] };
                  scannerService.addResult(lightweightResult);
                  setScannerResults(prev => {
                      const exists = prev.find(p => p.ticker === result.ticker);
                      if (exists) return prev.map(p => p.ticker === result.ticker ? lightweightResult : p);
                      return [...prev, lightweightResult];
                  });
              }
          } catch (e) {}
      }
      if (!stopScanRef.current) { setCurrentScanningTicker("Complete"); localStorage.setItem('last_full_scan_date', todayStr); }
      setIsScanning(false);
  };

  const handleStopScan = () => { stopScanRef.current = true; setIsScanning(false); setCurrentScanningTicker("Stopped by user"); };

  const toggleFilter = (filterKey: string) => {
      setActiveFilters(prev => prev.includes(filterKey) ? prev.filter(k => k !== filterKey) : [...prev, filterKey]);
  };

  const filteredScannerResults = useMemo(() => {
      if (activeFilters.length === 0) return scannerResults;
      return scannerResults.filter(stock => {
          return activeFilters.every(filter => {
              if (filter === 'prime') {
                  const entry = stock.riskAnalysis.entryPrice;
                  const current = stock.currentPrice;
                  const diff = Math.abs(current - entry);
                  const percentDiff = entry > 0 ? diff / entry : 0;
                  return stock.totalScore >= 8 && percentDiff <= 0.02;
              }
              if (filter === 'alpha') {
                  return stock.backtest && stock.backtest.totalReturn > stock.backtest.actualReturn;
              }
              if (filter === 'leaders') return stock.technicalData.relativeStrength > 1.05; 
              if (filter === 'squeeze') return stock.technicalData.squeezeOn;
              if (filter === 'div') return stock.technicalData.rsiDivergence !== null;
              if (filter === 'nearHigh') return stock.currentPrice >= stock.technicalData.resistanceLevel * 0.95;
              if (filter === 'highVol') return (stock.technicalData.lastVolume / stock.technicalData.volumeAvg20) >= 1.5;
              if (filter === 'rising') {
                  if (!stock.scoreHistory || stock.scoreHistory.length === 0) return false;
                  const avgScore = stock.scoreHistory.reduce((sum, item) => sum + item.score, 0) / stock.scoreHistory.length;
                  return stock.totalScore > avgScore;
              }
              return true;
          });
      });
  }, [scannerResults, activeFilters]);

  // --- ADD TICKER HELPER ---
  const addTicker = (ticker: string) => {
    const upperTicker = ticker.toUpperCase().trim();
    if (!selectedTickers.includes(upperTicker) && selectedTickers.length < MAX_SELECTION) {
      setSelectedTickers(prev => [...prev, upperTicker]);
      setSearchQuery('');
      setIsDropdownOpen(false);
    }
  };

  // --- REMOVE TICKER HELPER ---
  const removeTicker = (ticker: string) => {
    setSelectedTickers(prev => prev.filter(t => t !== ticker));
  };

  // --- GOOGLE AUTH SUCCESS ---
  const handleGoogleSuccess = (userData: any) => {
    const userProfile = userService.login(userData.email, userData.name, userData.picture);
    setUser(userProfile);
    setShowLoginModal(false);
  };

  const handleAnalyze = async () => {
    if (loading) return;
    setLoading(true); setError(null); setResults([]); 
    if (selectedTickers.length === 0) { setError("Please select at least one stock."); setLoading(false); return; }
    let currentSpy = spyHistory;
    if (!currentSpy) { try { currentSpy = await fetchStockData('SPY'); setSpyHistory(currentSpy); } catch (e) {} }
    try {
      for (let i = 0; i < selectedTickers.length; i++) {
        if (!isMountedRef.current) break;
        const ticker = selectedTickers[i];
        try {
          const history = await fetchStockData(ticker);
          const sma = await fetchOfficialSMA(ticker);
          const mCap = await fetchMarketCap(ticker);
          const result = analyzeStock(ticker, history, sma, mCap, currentSpy);
          if (result && isMountedRef.current) {
            const staticInfo = POPULAR_STOCKS.find(s => s.symbol === ticker);
            if (staticInfo) { result.companyName = staticInfo.name; result.sector = staticInfo.sector; }
            setResults(prev => [...prev, result].sort((a, b) => b.totalScore - a.totalScore));
          }
        } catch (err: any) {}
      }
    } catch (e: any) { setError(e.message || "An unexpected error occurred during analysis."); }
    finally { if (isMountedRef.current) setLoading(false); }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      if (selectedTickers.length >= MAX_SELECTION || (searchQuery.trim().length === 0 && selectedTickers.length > 0)) { handleAnalyze(); return; }
      const upperQuery = searchQuery.toUpperCase().trim();
      const exactMatch = filteredStocks.find(s => s.symbol === upperQuery);
      if (exactMatch) addTicker(exactMatch.symbol);
      else if (searchQuery.trim().length > 0) addTicker(searchQuery);
    }
  };

  const handleLogout = () => { userService.logout(); setUser(null); setSelectedTickers(['NVDA', 'MSFT', 'AAPL', 'TSLA', 'AMD']); };
  const handleCloseDetailView = () => { setSelectedStock(null); };

  const handleNavClick = (tab: typeof activeTab) => { setActiveTab(tab); setIsSidebarOpen(false); };
  const filteredStocks = POPULAR_STOCKS.filter(stock => !selectedTickers.includes(stock.symbol) && (stock.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || stock.name.toLowerCase().includes(searchQuery.toLowerCase())));
  const isCustomTicker = searchQuery.length > 0 && !filteredStocks.find(s => s.symbol === searchQuery.toUpperCase()) && !selectedTickers.includes(searchQuery.toUpperCase());

  return (
    <div className="min-h-screen bg-[#0B0F19] text-gray-100 font-sans selection:bg-blue-500/30">
      <nav className="border-b border-gray-800 bg-gray-900/50 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="flex items-center gap-2 hover:bg-gray-800 p-2 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50" aria-label="Toggle Menu">
                <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-2 rounded-lg relative">
                    <TrendingUp size={20} className="text-white" />
                    <div className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full border border-gray-900"><Menu size={10} className="text-white" /></div>
                </div>
                <div className="flex flex-col items-start">
                    <span className="text-lg sm:text-xl font-bold tracking-tight text-white leading-none">AlphaRank<span className="text-blue-500">Pro</span></span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mt-0.5">Click for Menu</span>
                </div>
            </button>
          </div>
          <div className="flex items-center gap-2 md:gap-4">
             <div className="hidden md:flex items-center space-x-4 text-sm font-medium text-gray-400">
                <span>Market Status: <span className={`font-bold uppercase ${marketStatus.color}`}>{marketStatus.label}</span></span>
             </div>
             <div className="md:hidden flex items-center gap-2 px-2 py-1 bg-gray-800/50 rounded-full border border-gray-700">
                <div className={`w-2 h-2 rounded-full ${marketStatus.dot}`}></div>
             </div>
             <button onClick={() => setShowGuide(true)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors relative" title="User Guide"><BookOpen size={20} /></button>
             <button onClick={() => setShowAlertsList(true)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors relative" title="My Alerts"><Bell size={20} /></button>
          </div>
        </div>
      </nav>

      {isSidebarOpen && <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300" onClick={() => setIsSidebarOpen(false)} />}
      <aside className={`fixed top-0 left-0 bottom-0 w-72 bg-gray-900 border-r border-gray-800 shadow-2xl z-50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <div className="p-6 border-b border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                  <div className="bg-gradient-to-tr from-blue-600 to-purple-600 p-2 rounded-lg"><TrendingUp size={20} className="text-white" /></div>
                  <span className="text-xl font-bold tracking-tight text-white">AlphaRank<span className="text-blue-500">Pro</span></span>
              </div>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 text-gray-500 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"><X size={20} /></button>
          </div>
          <div className="p-4 space-y-2">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-3">Main Navigation</div>
              <button onClick={() => handleNavClick('markets')} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeTab === 'markets' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><div className="flex items-center gap-3"><LayoutGrid size={20} /><span className="font-medium">Markets</span></div>{activeTab === 'markets' && <ChevronRight size={16} />}</button>
              <button onClick={() => handleNavClick('sectors')} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeTab === 'sectors' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><div className="flex items-center gap-3"><PieChart size={20} /><span className="font-medium">Sectors</span></div>{activeTab === 'sectors' && <ChevronRight size={16} />}</button>
              <button onClick={() => handleNavClick('scanner')} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeTab === 'scanner' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><div className="flex items-center gap-3"><Target size={20} /><span className="font-medium">Scanner</span></div>{activeTab === 'scanner' && <ChevronRight size={16} />}</button>
              <button onClick={() => handleNavClick('watchlist')} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeTab === 'watchlist' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><div className="flex items-center gap-3"><List size={20} /><span className="font-medium">Watchlist</span></div>{activeTab === 'watchlist' && <ChevronRight size={16} />}</button>
              <button onClick={() => handleNavClick('holdings')} className={`w-full flex items-center justify-between p-3 rounded-xl transition-all group ${activeTab === 'holdings' ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><div className="flex items-center gap-3"><Briefcase size={20} /><span className="font-medium">Holdings</span></div>{activeTab === 'holdings' && <ChevronRight size={16} />}</button>
          </div>
          <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800 bg-gray-900/50 backdrop-blur">
             {user ? (
                 <div className="flex items-center justify-between gap-3">
                     <div className="flex items-center gap-3 overflow-hidden">
                        {user.photoURL ? <img src={user.photoURL} alt={user.name} className="w-10 h-10 rounded-full border border-gray-600" /> : <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">{user.name[0]}</div>}
                        <div className="flex flex-col min-w-0"><span className="text-sm font-bold text-white truncate">{user.name}</span><span className="text-xs text-green-400 font-bold">Pro Plan</span></div>
                     </div>
                     <button onClick={handleLogout} className="p-2 bg-gray-800 hover:bg-red-900/30 text-gray-400 hover:text-red-400 rounded-lg transition-colors" title="Logout"><LogOut size={18} /></button>
                 </div>
             ) : (
                 <button onClick={() => { setShowLoginModal(true); setIsSidebarOpen(false); }} className="w-full flex items-center justify-center gap-3 p-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all shadow-lg shadow-blue-900/20 group"><div className="p-1 bg-white/20 rounded-full"><User size={16} className="text-white" /></div><div className="flex flex-col items-start"><span className="text-sm font-bold">Login / Sync</span><span className="text-[10px] text-blue-200 opacity-80 group-hover:opacity-100">Save your data</span></div></button>
             )}
          </div>
      </aside>

      <main className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 py-4 sm:py-8">
        {activeTab === 'markets' ? (
            <MarketOverview onSelectIndex={setSelectedStock} />
        ) : activeTab === 'watchlist' ? (
            <>
                <section className="mb-10">
                <div className="max-w-3xl mx-auto">
                    <div className="flex flex-col md:flex-row gap-3">
                    <div ref={dropdownRef} className="relative z-20 flex-1">
                        <div className={`bg-gray-900 border rounded-xl p-2.5 shadow-xl flex flex-wrap items-center gap-2 transition-all group focus-within:ring-2 focus-within:ring-blue-500/50 focus-within:border-blue-500 ${isDropdownOpen ? 'border-blue-500' : 'border-gray-700'}`} onClick={() => setIsDropdownOpen(true)}>
                        <div className="flex items-center gap-1.5 pl-1.5"><Search className="text-gray-500 group-focus-within:text-blue-400 transition-colors" size={20} />{selectedTickers.length > 0 && <button onClick={(e) => { e.stopPropagation(); setSelectedTickers([]); }} className="p-1 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-full transition-colors" title="Clear all"><X size={14} /></button>}</div>
                        {selectedTickers.map(ticker => (<div key={ticker} className="flex items-center gap-1 bg-blue-900/30 border border-blue-500/30 text-blue-300 px-2.5 py-1 rounded-full text-sm font-bold font-mono animate-in fade-in zoom-in duration-200"><span>{ticker}</span><button onClick={(e) => { e.stopPropagation(); removeTicker(ticker); }} className="hover:text-white hover:bg-blue-500/50 rounded-full p-0.5 transition-colors"><X size={12} /></button></div>))}
                        <input type="text" value={searchQuery} onChange={(e) => { setSearchQuery(e.target.value); setIsDropdownOpen(true); }} onKeyDown={handleKeyDown} onFocus={() => setIsDropdownOpen(true)} placeholder={selectedTickers.length >= MAX_SELECTION ? "" : "Search ticker..."} className="flex-1 bg-transparent border-none focus:ring-0 text-white placeholder-gray-500 font-mono text-sm min-w-[120px] py-1 outline-none" />
                        <div className="flex items-center gap-1 pr-1 border-l border-gray-700 pl-3"><span className={`text-xs font-mono font-bold ${selectedTickers.length >= MAX_SELECTION ? 'text-red-400' : 'text-gray-500'}`}>{selectedTickers.length}/{MAX_SELECTION}</span></div>
                        </div>
                        {isDropdownOpen && selectedTickers.length < MAX_SELECTION && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar z-30 ring-1 ring-black/50">
                            {filteredStocks.map((stock) => (<div key={stock.symbol} onClick={() => addTicker(stock.symbol)} className="flex items-center justify-between px-4 py-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800/50 last:border-none group"><div className="flex flex-col"><span className="text-white font-bold font-mono group-hover:text-blue-400 transition-colors">{stock.symbol}</span><span className="text-xs text-gray-500">{stock.name}</span></div><Plus size={16} className="text-gray-600 group-hover:text-blue-400" /></div>))}
                            {isCustomTicker && (<div onClick={() => addTicker(searchQuery)} className="flex items-center justify-between px-4 py-3 bg-blue-900/20 hover:bg-blue-900/40 cursor-pointer border-t border-gray-700"><div className="flex flex-col"><span className="text-blue-300 font-bold font-mono flex items-center gap-2">{searchQuery.toUpperCase()} <Globe size={12}/></span><span className="text-xs text-blue-400/70">Search and analyze custom ticker</span></div><Plus size={16} className="text-blue-400" /></div>)}
                        </div>)}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); handleAnalyze(); }} disabled={loading || selectedTickers.length === 0} className={`h-12 md:h-auto px-6 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg w-full md:w-auto ${loading || selectedTickers.length === 0 ? 'bg-gray-800 text-gray-500 cursor-not-allowed border border-gray-700' : 'bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white shadow-blue-900/40 hover:shadow-blue-900/60 border border-blue-500/50'}`}>{loading ? <RefreshCw className="animate-spin" size={18}/> : <BarChart2 size={18}/>}{loading ? 'Running...' : 'Analyze'}</button>
                    </div>
                </div>
                </section>
                {results.length > 0 && (<section className="animate-in fade-in slide-in-from-bottom-4 duration-700"><div className="flex items-center justify-between mb-6"><h2 className="text-2xl font-bold text-white flex items-center gap-2">Top Ranked Opportunities <span className="bg-gray-800 text-gray-400 text-xs px-2 py-1 rounded-full">{results.length} Stocks</span></h2>{loading && (<span className="text-xs text-blue-400 animate-pulse flex items-center gap-1"><RefreshCw size={12} className="animate-spin" /> Analyzing next ticker...</span>)}</div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">{results.map((stock, idx) => (<StockCard key={stock.ticker} data={stock} rank={idx + 1} onClick={() => setSelectedStock(stock)} />))}</div></section>)}
            </>
        ) : activeTab === 'scanner' ? (
            <div className="max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-bold text-white mb-2 flex items-center justify-center gap-3"><Target className="text-green-500" size={32} /> Prime Setup Scanner</h2>
                    <div className="flex flex-col items-center gap-3 mb-6">
                         {!isScanning ? (
                             <button onClick={handleStartScan} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-8 rounded-full shadow-lg shadow-blue-900/30 transition-all hover:scale-105 active:scale-95"><PlayCircle size={24} /> Start Market Scan</button>
                         ) : (
                             <button onClick={handleStopScan} className="flex items-center gap-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/50 text-red-400 font-bold py-2 px-6 rounded-full transition-all"><StopCircle size={20} /> Stop Scan</button>
                         )}
                         {isScanning && (
                             <div className={`text-[10px] uppercase font-black px-2 py-0.5 rounded flex items-center gap-1 transition-all ${isFastScanMode ? 'bg-purple-500/20 text-purple-400 animate-pulse' : 'bg-blue-500/20 text-blue-400'}`}>
                                {isFastScanMode ? <Zap size={10} className="fill-current"/> : <Database size={10}/>}
                                {isFastScanMode ? 'Optimized Fast Scan Active' : 'Full Historical Sync (First run of day)'}
                             </div>
                         )}
                    </div>
                    {isScanning && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                             <div className="flex items-center justify-center gap-2 text-gray-400 text-sm mb-4"><div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div><span className="font-mono">Scanning: {currentScanningTicker || 'Starting...'}</span></div>
                            <div className="w-full max-w-md mx-auto bg-gray-800 rounded-full h-1.5 mb-2 overflow-hidden"><div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{width: `${scanProgress}%`}}></div></div>
                            <p className="text-xs text-gray-500 mb-6">{scanProgress}% Processed</p>
                        </div>
                    )}
                    {!isScanning && currentScanningTicker === "Complete" && ( <div className="text-sm text-green-400 mb-6 font-mono bg-green-900/10 border border-green-900/30 inline-block px-4 py-2 rounded-lg"><Check size={14} className="inline mr-1"/> Scan Complete</div> )}
                    {scannerResults.length > 0 && (
                        <div className="flex justify-center mb-8 w-full">
                            <div className="flex flex-col items-center gap-2 w-full max-w-5xl">
                                <div className="w-full bg-gray-900/50 p-2 sm:p-0 rounded-2xl">
                                    <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center sm:gap-2">
                                        <button onClick={() => toggleFilter('prime')} className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${activeFilters.includes('prime') ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50 shadow-yellow-900/20' : 'bg-gray-850 text-gray-400 hover:text-yellow-400 hover:bg-gray-800 border border-gray-700'}`}><Target size={14}/> Prime</button>
                                        <button onClick={() => toggleFilter('alpha')} className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${activeFilters.includes('alpha') ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50 shadow-purple-900/20' : 'bg-gray-850 text-gray-400 hover:text-purple-400 hover:bg-gray-800 border border-gray-700'}`}><Trophy size={14}/> Alpha+</button>
                                        <button onClick={() => toggleFilter('leaders')} className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${activeFilters.includes('leaders') ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50 shadow-blue-900/20' : 'bg-gray-850 text-gray-400 hover:text-yellow-400 hover:bg-gray-800 border border-gray-700'}`}><TrendingUp size={14}/> Leaders</button>
                                        <button onClick={() => toggleFilter('squeeze')} className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${activeFilters.includes('squeeze') ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50 shadow-orange-900/20' : 'bg-gray-850 text-gray-400 hover:text-orange-400 hover:bg-gray-800 border border-gray-700'}`}><Zap size={14}/> Squeezes</button>
                                        <button onClick={() => toggleFilter('div')} className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${activeFilters.includes('div') ? 'bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-blue-900/20' : 'bg-gray-850 text-gray-400 hover:text-blue-400 hover:bg-gray-800 border border-gray-700'}`}><Activity size={14}/> DIV</button>
                                        <button onClick={() => toggleFilter('nearHigh')} className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${activeFilters.includes('nearHigh') ? 'bg-green-500/20 text-green-400 border-green-500/50 shadow-green-900/20' : 'bg-gray-850 text-gray-400 hover:text-green-400 hover:bg-gray-800 border border-gray-700'}`}><ArrowRight size={14}/> Highs</button>
                                        <button onClick={() => toggleFilter('highVol')} className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${activeFilters.includes('highVol') ? 'bg-red-500/20 text-red-400 border-red-500/50 shadow-red-900/20' : 'bg-gray-850 text-gray-400 hover:text-red-400 hover:bg-gray-800 border border-gray-700'}`}><Database size={14}/> Vol</button>
                                        <button onClick={() => toggleFilter('rising')} className={`w-full sm:w-auto px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md ${activeFilters.includes('rising') ? 'bg-purple-500/20 text-purple-400 border-purple-500/50 shadow-purple-900/20' : 'bg-gray-850 text-gray-400 hover:text-purple-400 hover:bg-gray-800 border border-gray-700'}`}><TrendingUp size={14}/> Rising</button>
                                    </div>
                                </div>
                                <div className="text-[10px] text-gray-500 flex items-center gap-2 mt-1"><span>Select multiple filters to narrow results</span>{activeFilters.length > 0 && <span className="bg-blue-900/30 text-blue-400 px-2 rounded-full font-bold">{filteredScannerResults.length} Found</span>}</div>
                            </div>
                        </div>
                    )}
                    <p className="text-gray-400 max-w-2xl mx-auto text-sm">High-speed background scanning for Prime Setups. <span className="block mt-1 text-blue-400/80 text-xs">First scan of day pulls full history; subsequent scans only fetch intraday changes.</span></p>
                </div>
                {filteredScannerResults.length > 0 ? ( <MarketHeatmap data={filteredScannerResults} onSelect={(s) => setSelectedStock(s)} /> ) : ( <div className="text-center py-16 border-2 border-dashed border-gray-800 rounded-2xl"><Layers className="mx-auto text-gray-700 mb-4" size={48} /><p className="text-gray-500">{isScanning ? "Scanning in progress..." : (scannerResults.length > 0 ? "No stocks match this filter." : "Ready to scan.")}</p><p className="text-xs text-gray-600 mt-1">Found opportunities will appear here automatically.</p><div className="mt-4 flex justify-center">{isScanning && <Loader className="animate-spin text-blue-600" size={24} />}</div></div> )}
            </div>
        ) : activeTab === 'sectors' ? (
            <SectorHeatmap data={scannerResults} onSelectStock={setSelectedStock} onStartScan={handleStartScan} onStopScan={handleStopScan} isScanning={isScanning} scanProgress={scanProgress} currentScanningTicker={currentScanningTicker} isFastScanMode={isFastScanMode} />
        ) : (<PortfolioView onSelectStock={setSelectedStock} />)}
      </main>
      {selectedStock && <DetailView stock={selectedStock} onClose={handleCloseDetailView} />}
      {showLoginModal && <GoogleAuthModal onSuccess={handleGoogleSuccess} onClose={() => setShowLoginModal(false)} />}
      {showAlertsList && <ActiveAlertsList onClose={() => setShowAlertsList(false)} />}
      {showGuide && <UserGuide onClose={() => setShowGuide(false)} />}
    </div>
  );
};

export default App;
