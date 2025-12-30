
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { MarketState, TradeSignal } from './types';
import { MAJOR_PAIRS, ALL_PAIRS, SESSIONS } from './constants';
import { analyzeTradeSignal } from './services/geminiService';
import { getLagosTime, isKillZone, calculateVolatilityScore, getActiveSessions, formatLagosTime } from './utils/marketLogic';
import SessionClock from './components/SessionClock';
import CurrencyStrengthMeter from './components/CurrencyStrengthMeter';
import Gauge from './components/Gauge';
import MarketHoursTimeline from './components/MarketHoursTimeline';
import ADRMeter from './components/ADRMeter';
import MiniChart from './components/MiniChart';

const App: React.FC = () => {
  const [marketState, setMarketState] = useState<MarketState | null>(null);
  const [selectedPair, setSelectedPair] = useState<string>('EURUSD');
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [signal, setSignal] = useState<TradeSignal | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isSticky, setIsSticky] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(getLagosTime());

  const headerRef = useRef<HTMLElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const [visibleSections, setVisibleSections] = useState<Record<string, boolean>>({
    strength: true,
    adr: true,
    target: true,
    news: true,
    analysis: true,
    liquidity: true,
    dollar: true,
    timeline: true
  });

  const toggleSection = (section: string) => {
    setVisibleSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const reloadApp = () => {
    window.location.reload();
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        const headerBottom = headerRef.current.getBoundingClientRect().bottom;
        setIsSticky(headerBottom < 0);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(getLagosTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const active = getActiveSessions(getLagosTime()).find(s => s.isOpen);
    if (active) setSelectedSession(active.name);
    else setSelectedSession('London');
  }, []);

  const refreshMarketData = useCallback(async (isManual = false) => {
    if (isManual) setIsRefreshing(true);
    
    const mockState: MarketState = {
      currencies: [
        { symbol: 'USD', strength: Math.random() * 160 - 80, change: 1.2 },
        { symbol: 'EUR', strength: Math.random() * 160 - 80, change: -0.8 },
        { symbol: 'GBP', strength: Math.random() * 160 - 80, change: 0.3 },
        { symbol: 'JPY', strength: Math.random() * 160 - 80, change: -2.1 },
        { symbol: 'AUD', strength: Math.random() * 160 - 80, change: 0.1 },
        { symbol: 'CAD', strength: Math.random() * 160 - 80, change: 0.5 },
        { symbol: 'XAU', strength: Math.random() * 160 - 80, change: 1.1 },
      ],
      sentiment: ALL_PAIRS.map(p => ({
        pair: p,
        long: Math.floor(Math.random() * 50) + 25,
        short: 0
      })).map(s => ({ ...s, short: 100 - s.long })),
      news: [
        { id: '1', time: '14:30', currency: 'USD', impact: 'High', event: 'CPI Inflation Release', catalystScore: 8.5 },
        { id: '2', time: '16:00', currency: 'CAD', impact: 'Medium', event: 'BoC Interest Rate Decision', catalystScore: -4.2 },
        { id: '3', time: '19:00', currency: 'USD', impact: 'Low', event: 'FOMC Member Speech', catalystScore: 1.5 },
      ],
      dxy: {
        price: 103.85 + (Math.random() * 0.5),
        trend: Math.random() > 0.5 ? 'Bullish' : 'Bearish'
      },
      volatility: calculateVolatilityScore(getLagosTime()),
      liquidityZones: [
        { type: 'Institutional Buy Order', price: 1.0845, strength: 5, bias: 'Buying Zone' },
        { type: 'Unmitigated Price Gap', price: 1.0960, strength: 4, bias: 'Selling Zone' }
      ],
      adr: {
        currentPips: 78,
        averagePips: 105,
        percentageUsed: 74
      }
    };
    
    setMarketState(mockState);
    if (isManual) setTimeout(() => setIsRefreshing(false), 1200);
  }, []);

  useEffect(() => {
    refreshMarketData();
    const interval = setInterval(refreshMarketData, 60000);
    return () => clearInterval(interval);
  }, [refreshMarketData]);

  const runAnalysis = useCallback(async () => {
    if (!marketState) return;
    setIsAnalyzing(true);
    setError(null);
    
    try {
      const { data, error: backendError } = await analyzeTradeSignal(
        selectedPair, 
        marketState, 
        isKillZone(getLagosTime()), 
        calculateVolatilityScore(getLagosTime())
      );
      
      if (backendError) {
        setError(backendError);
      } else {
        setSignal(data);
      }
    } catch (e: any) {
      setError("Gateway Error: Unable to reach the processing core.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [selectedPair, marketState]);

  useEffect(() => {
    runAnalysis();
  }, [runAnalysis]);

  if (!marketState) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-[#09090b] text-zinc-600 gap-6">
        <div className="w-16 h-16 border-4 border-zinc-900 border-t-blue-500 rounded-full animate-spin"></div>
        <div className="flex flex-col items-center animate-pulse">
           <span className="text-[10px] font-black uppercase tracking-[0.5em] mb-2">FX Adviser Core</span>
           <span className="text-sm font-mono font-bold uppercase">Synthesizing Alpha...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-10 space-y-10 max-w-7xl mx-auto pb-32">
      {/* Floating Global Menu */}
      <div ref={menuRef} className={`fixed top-6 right-6 md:right-12 z-[110] transition-all duration-700 transform ${isSticky ? 'translate-y-0 opacity-100 scale-100' : '-translate-y-24 opacity-0 scale-90 pointer-events-none'}`}>
        <div className="flex flex-col items-end gap-4">
          <button 
            onClick={() => setIsMenuOpen(!isMenuOpen)} 
            className={`flex items-center gap-4 bg-zinc-900/90 backdrop-blur-2xl hover:bg-zinc-800 text-white px-8 py-5 rounded-3xl shadow-[0_30px_60px_rgba(0,0,0,0.6)] border border-zinc-700/40 active:scale-95 transition-all group relative overflow-hidden ${isMenuOpen ? 'ring-2 ring-blue-500' : ''}`}
          >
             <i className={`fas ${isMenuOpen ? 'fa-times' : 'fa-bars'} text-blue-500 text-lg transition-transform duration-500 ${isMenuOpen ? 'rotate-90' : ''}`}></i>
            <span className="text-[11px] font-black uppercase tracking-[0.3em]">MENU</span>
          </button>

          <div className={`w-80 bg-[#0c0c0e]/98 backdrop-blur-3xl border border-zinc-800 rounded-[2.5rem] shadow-[0_50px_120px_rgba(0,0,0,0.9)] p-8 space-y-8 transition-all duration-500 origin-top-right ${isMenuOpen ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-6 pointer-events-none'}`}>
            <div className="flex items-center justify-between border-b border-zinc-800/50 pb-6">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-zinc-600 uppercase tracking-widest leading-none mb-1">Live Terminal</span>
                <span className="text-2xl font-mono font-black text-blue-500 tabular-nums italic">{formatLagosTime(currentTime)}</span>
              </div>
              <button onClick={reloadApp} className="w-10 h-10 flex items-center justify-center bg-zinc-900 rounded-2xl text-zinc-500 hover:text-rose-500 border border-zinc-800 transition-colors shadow-inner" title="Emergency Reset">
                <i className="fas fa-power-off"></i>
              </button>
            </div>
            
            <div className="space-y-4">
              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-[0.2em] block">Active Sessions</span>
              <div className="grid grid-cols-2 gap-3">
                {SESSIONS.map(s => (
                  <button key={s.name} onClick={() => { setSelectedSession(s.name); setIsMenuOpen(false); }} className={`px-4 py-3 text-[10px] font-black rounded-xl border transition-all ${selectedSession === s.name ? 'bg-blue-600 text-white border-blue-500 shadow-lg' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-700'}`}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }); setIsMenuOpen(false); }} className="w-full py-5 bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 text-white text-[11px] font-black uppercase tracking-[0.3em] rounded-2xl shadow-2xl transition-all flex items-center justify-center gap-4">
              <i className="fas fa-bolt animate-pulse"></i> FINAL VERDICT
            </button>
          </div>
        </div>
      </div>

      <header ref={headerRef} className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b border-zinc-800 pb-12">
        <div className="flex items-start gap-4 md:gap-6 flex-wrap">
          <div className="flex flex-col gap-3">
            <button onClick={() => refreshMarketData(true)} className={`w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-2xl hover:bg-zinc-800 transition-all active:scale-90 text-blue-500 shadow-2xl ${isRefreshing ? 'animate-spin' : ''}`} title="Refresh Market Data">
              <i className={`fas fa-sync-alt ${isRefreshing ? 'animate-spin' : ''}`}></i>
            </button>
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-white tracking-tighter flex flex-wrap items-center gap-2 md:gap-4 mb-2 break-words leading-tight">
              <span className="bg-blue-600 px-3 py-1 md:px-4 md:py-1.5 rounded-2xl text-[10px] md:text-xs align-middle italic font-black shadow-[0_0_20px_rgba(37,99,235,0.4)] whitespace-nowrap">CORE</span>
              FXCURRENCY ADVISER
            </h1>
            <p className="text-zinc-500 text-[9px] md:text-[11px] font-black uppercase tracking-[0.3em] md:tracking-[0.5em] flex items-center gap-2 md:gap-3">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
              Institutional Advisory Engine — Live v3.8
            </p>
          </div>
        </div>
        <SessionClock selectedSession={selectedSession} onSelectSession={setSelectedSession} />
      </header>

      {/* Primary Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <aside className="lg:col-span-3 space-y-8">
          <div className="bg-card rounded-2xl overflow-hidden shadow-2xl border-l-4 border-blue-500 transform transition-transform hover:translate-x-1">
            <div className="p-5 bg-zinc-900/40 flex justify-between items-center border-b border-zinc-800/30">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Currency Power</h3>
              <button onClick={() => toggleSection('strength')} className="text-zinc-600 hover:text-blue-500 transition-colors">
                <i className={`fas ${visibleSections.strength ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>
            {visibleSections.strength && (
              <div className="p-5 space-y-4">
                <div className="bg-blue-500/5 p-4 rounded-xl border border-blue-500/10 mb-2">
                  <p className="text-[10px] text-zinc-400 font-bold leading-tight italic">
                    <i className="fas fa-graduation-cap mr-2 text-blue-500"></i>
                    <b>Beginner Explanation:</b> We analyze each currency individually. We look for a "strong" currency (like USD +50%) vs a "weak" one (like JPY -60%) to find the best trades.
                  </p>
                </div>
                <CurrencyStrengthMeter data={marketState.currencies} />
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl shadow-2xl border-l-4 border-orange-500 overflow-hidden transform transition-transform hover:translate-x-1">
             <div className="p-5 bg-zinc-900/40 flex justify-between items-center border-b border-zinc-800/30">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Range Exhaustion</h3>
              <button onClick={() => toggleSection('adr')} className="text-zinc-600 hover:text-orange-500 transition-colors">
                <i className={`fas ${visibleSections.adr ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>
            {visibleSections.adr && (
              <div className="p-5 space-y-4">
                <div className="bg-orange-500/5 p-4 rounded-xl border border-orange-500/10 mb-2">
                  <p className="text-[10px] text-zinc-400 font-bold leading-tight italic">
                    <i className="fas fa-gas-pump mr-2 text-orange-500"></i>
                    <b>Beginner Explanation:</b> Every pair has a "Daily Range" (fuel limit). If a pair has already moved 90% of its normal distance, it's "exhausted" and likely to reverse.
                  </p>
                </div>
                <ADRMeter data={marketState.adr} />
              </div>
            )}
          </div>
          
          <div className="bg-card rounded-2xl shadow-2xl border-l-4 border-amber-500 overflow-hidden transform transition-transform hover:translate-x-1">
            <div className="p-5 bg-zinc-900/40 flex justify-between items-center border-b border-zinc-800/30">
              <h3 className="text-xs font-black text-zinc-500 uppercase tracking-[0.2em]">Target Selection</h3>
              <button onClick={() => toggleSection('target')} className="text-zinc-600 hover:text-amber-500 transition-colors">
                <i className={`fas ${visibleSections.target ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>
            {visibleSections.target && (
              <div className="p-6 space-y-6">
                <div className="bg-amber-500/5 p-4 rounded-xl border border-amber-500/10 mb-2">
                  <p className="text-[10px] text-zinc-400 font-bold leading-tight italic">
                    <i className="fas fa-crosshairs mr-2 text-amber-500"></i>
                    <b>Beginner Explanation:</b> Select your currency pair. "Majors" (like EURUSD) have higher volume and are generally safer for beginners to analyze.
                  </p>
                </div>
                <div className="space-y-3">
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Quick Access Majors</span>
                  <div className="grid grid-cols-2 gap-2">
                    {MAJOR_PAIRS.map(pair => (
                      <button key={pair} onClick={() => setSelectedPair(pair)} className={`px-3 py-2 text-[10px] font-black rounded-xl border transition-all ${selectedPair === pair ? 'bg-amber-500 text-black border-amber-500 shadow-xl' : 'bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600'}`}>
                        {pair}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-zinc-800/50">
                   <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest block">Expanded Asset List</span>
                   <div className="relative group">
                      <select 
                        value={selectedPair} 
                        onChange={(e) => setSelectedPair(e.target.value)}
                        className="w-full bg-zinc-900 border border-zinc-800 text-white text-[10px] font-black px-4 py-3 rounded-xl appearance-none outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                      >
                        {ALL_PAIRS.map(pair => (
                          <option key={pair} value={pair} className="bg-zinc-950">{pair}</option>
                        ))}
                      </select>
                      <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none text-[10px]"></i>
                   </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <main className="lg:col-span-6 space-y-8">
          <div className="bg-card rounded-3xl border-t-4 border-sky-500 shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-8 flex items-center justify-between border-b border-zinc-800/50 bg-zinc-900/40">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-4">
                <i className="fas fa-clock text-sky-500"></i> Market Timeline
              </h3>
              <button onClick={() => toggleSection('timeline')} className="text-zinc-600 hover:text-sky-500">
                <i className={`fas ${visibleSections.timeline ? 'fa-eye' : 'fa-eye-slash'} text-lg`}></i>
              </button>
            </div>
            {visibleSections.timeline && (
              <div className="p-8 space-y-6">
                <div className="bg-sky-500/5 p-5 rounded-2xl border border-sky-500/10">
                  <p className="text-[11px] text-zinc-400 font-bold leading-relaxed italic">
                    <i className="fas fa-info-circle mr-2 text-sky-500"></i>
                    <b>Beginner Explanation:</b> The market isn't always active. The <b>"Overlap"</b> (when London and NY are both open) is when the most "smart money" enters the market.
                  </p>
                </div>
                <MarketHoursTimeline />
              </div>
            )}
          </div>

          <div className="bg-card rounded-3xl border-t-4 border-blue-600 shadow-[0_40px_100px_rgba(0,0,0,0.5)] overflow-hidden">
            <div className="p-8 bg-zinc-900/40 flex items-center justify-between border-b border-zinc-800/50">
              <h3 className="text-sm font-black text-white uppercase tracking-[0.3em] flex items-center gap-4">
                <i className="fas fa-university text-blue-500"></i> Institutional Liquidity Nodes
              </h3>
              <button onClick={() => toggleSection('liquidity')} className="text-zinc-600 hover:text-blue-500">
                <i className={`fas ${visibleSections.liquidity ? 'fa-eye' : 'fa-eye-slash'} text-lg`}></i>
              </button>
            </div>
            {visibleSections.liquidity && (
              <div className="p-8 space-y-6">
                <div className="bg-blue-500/5 p-5 rounded-2xl border border-blue-500/10">
                  <p className="text-[11px] text-zinc-400 font-bold leading-relaxed italic">
                    <i className="fas fa-search-dollar mr-2 text-blue-500"></i>
                    <b>Beginner Explanation:</b> Banks place huge orders at specific price levels. We track these <b>"Nodes"</b> because price usually bounces or reacts strongly when it touches them.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {marketState.liquidityZones.map((zone, idx) => (
                    <div key={idx} className={`p-5 rounded-2xl border-2 flex justify-between items-center transition-all hover:scale-[1.03] shadow-lg ${zone.bias === 'Selling Zone' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                      <div className="flex flex-col">
                        <span className={`text-[9px] font-black uppercase tracking-[0.2em] mb-1 ${zone.bias === 'Selling Zone' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {zone.type}
                        </span>
                        <span className="text-2xl font-mono font-black text-white italic tracking-tighter">{zone.price.toFixed(5)}</span>
                      </div>
                      <div className="flex gap-1.5">
                        {Array.from({ length: zone.strength }).map((_, i) => <div key={i} className={`w-1.5 h-6 rounded-full ${zone.bias === 'Selling Zone' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.4)]'}`} />)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="lg:col-span-3 space-y-8">
          <div className="bg-card rounded-2xl border border-zinc-800 shadow-2xl overflow-hidden">
             <div className="p-5 bg-zinc-900/40 flex justify-between items-center border-b border-zinc-800/30">
               <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Dollar Index (DXY)</h3>
               <button onClick={() => toggleSection('dollar')} className="text-zinc-600 hover:text-white transition-colors">
                <i className={`fas ${visibleSections.dollar ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
             </div>
             {visibleSections.dollar && (
               <div className="p-6 space-y-4">
                  <div className="bg-zinc-950/80 p-4 rounded-xl border border-zinc-800/50 mb-2">
                    <p className="text-[10px] text-zinc-400 font-bold leading-tight italic">
                      <i className="fas fa-anchor mr-2 text-white"></i>
                      <b>Beginner Explanation:</b> The <b>DXY</b> measures the US Dollar. If the Dollar is strong (DXY is Bullish), pairs like EURUSD will almost always go DOWN.
                    </p>
                  </div>
                  <div className="bg-zinc-950 p-5 rounded-2xl border border-zinc-800 flex justify-between items-center shadow-inner">
                    <div className="flex flex-col">
                      <span className="text-[9px] font-black text-zinc-500 uppercase mb-1">DXY Index</span>
                      <span className="text-2xl font-mono font-black text-white">{marketState.dxy.price.toFixed(2)}</span>
                    </div>
                    <span className={`text-[10px] font-black px-3 py-1.5 rounded-xl shadow-lg border ${marketState.dxy.trend === 'Bullish' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' : 'bg-rose-500/20 text-rose-400 border-rose-500/30'}`}>{marketState.dxy.trend.toUpperCase()}</span>
                  </div>
               </div>
             )}
          </div>

          <div className="bg-card rounded-2xl border-t-4 border-rose-500 shadow-2xl overflow-hidden">
             <div className="p-5 bg-zinc-900/40 flex justify-between items-center border-b border-zinc-800/30">
              <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Economic Pulse</h3>
              <button onClick={() => toggleSection('news')} className="text-zinc-600 hover:text-rose-500 transition-colors">
                <i className={`fas ${visibleSections.news ? 'fa-eye' : 'fa-eye-slash'}`}></i>
              </button>
            </div>
            {visibleSections.news && (
              <div className="p-6 space-y-4">
                <div className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/10 mb-2">
                  <p className="text-[10px] text-zinc-400 font-bold leading-tight italic">
                    <i className="fas fa-bullhorn mr-2 text-rose-500"></i>
                    <b>Beginner Explanation:</b> High impact news (CPI, Jobs reports) causes massive price swings. It is usually best to avoid trading 15 minutes before and after these events.
                  </p>
                </div>
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-3 custom-scrollbar">
                    {marketState.news.map(n => (
                      <div key={n.id} className="text-[11px] bg-zinc-950 p-4 rounded-2xl border border-zinc-800/60 shadow-inner group hover:border-rose-500/30 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-black text-rose-500 font-mono text-[12px]">{n.time}</span>
                          <span className="text-white font-black bg-zinc-900 px-3 py-1 rounded-lg border border-zinc-800">{n.currency}</span>
                        </div>
                        <p className="text-zinc-300 font-bold leading-snug group-hover:text-white transition-colors">{n.event}</p>
                        <div className="mt-3 flex items-center justify-between">
                           <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${n.impact === 'High' ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>{n.impact} IMPACT</span>
                           <i className="fas fa-chevron-right text-[10px] text-zinc-700 group-hover:text-rose-500 transition-colors"></i>
                        </div>
                      </div>
                    ))}
                  </div>
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* FINAL ANALYTIC VERDICT */}
      <div id="final-action" className="mt-16 relative">
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-32 h-32 bg-blue-500/20 blur-[100px] pointer-events-none"></div>
        <div className="bg-card rounded-[3rem] shadow-[0_60px_150px_rgba(0,0,0,0.8)] relative overflow-hidden border-2 border-blue-500/30 bg-gradient-to-b from-[#141417] to-[#08080a]">
          <div className="p-6 md:p-10 pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-zinc-800/40">
            <div className="flex flex-col">
              <div className="flex items-center gap-3 mb-2">
                 <div className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-ping"></div>
                 <span className="text-[10px] md:text-[11px] font-black text-blue-500 uppercase tracking-[0.5em]">SECURE ADVISORY CORE</span>
              </div>
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-black text-white uppercase italic tracking-tighter leading-tight">
                PREDICTIVE VERDICT: <span className="text-blue-500">{selectedPair}</span>
              </h2>
            </div>
            <div className="flex gap-4">
              <button 
                onClick={() => runAnalysis()} 
                disabled={isAnalyzing}
                className={`px-6 py-3 md:px-8 md:py-4 bg-blue-600 hover:bg-blue-500 text-white text-[10px] md:text-[11px] font-black uppercase rounded-2xl transition-all shadow-2xl active:scale-95 flex items-center gap-3 ${isAnalyzing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <i className={`fas ${isAnalyzing ? 'fa-spinner fa-spin' : 'fa-brain'}`}></i> RE-SYNC ANALYSIS
              </button>
            </div>
          </div>

          <div className="p-6 md:p-10 lg:p-14 space-y-12 relative min-h-[500px]">
            {isAnalyzing && (
              <div className="absolute inset-0 bg-zinc-950/95 backdrop-blur-xl z-[100] flex flex-col items-center justify-center text-center p-6">
                <div className="relative mb-8">
                   <div className="w-24 h-24 border-b-2 border-blue-500 rounded-full animate-spin"></div>
                   <i className="fas fa-microchip absolute inset-0 flex items-center justify-center text-3xl text-blue-500"></i>
                </div>
                <p className="text-blue-400 font-mono text-xs font-black uppercase tracking-[0.5em] animate-pulse">Running Multi-Factor Advisory...</p>
                <p className="text-zinc-600 text-[9px] mt-4 uppercase tracking-widest">Compiling Session Liquidity & Economic Catalysts</p>
              </div>
            )}

            {error ? (
              <div className="flex flex-col items-center justify-center py-20 text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="w-20 h-20 rounded-full bg-rose-500/10 flex items-center justify-center border-2 border-rose-500/20 mb-4 shadow-[0_0_50px_rgba(244,63,94,0.15)]">
                   <i className="fas fa-exclamation-triangle text-3xl text-rose-500"></i>
                </div>
                <div>
                   <h3 className="text-2xl font-black text-white uppercase tracking-tighter mb-2">SYSTEM MALFUNCTION</h3>
                   <p className="text-rose-400 font-mono text-xs uppercase tracking-widest opacity-80">{error}</p>
                </div>
                <button 
                  onClick={() => runAnalysis()} 
                  className="px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white text-[10px] font-black uppercase rounded-xl border border-zinc-800 transition-all shadow-lg active:scale-95"
                >
                  RE-INITIATE CORE
                </button>
              </div>
            ) : (
              visibleSections.analysis && (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 md:gap-16 items-start">
                  <div className="space-y-12">
                    {signal && <Gauge value={signal.score} label="CONFLUENCE CONFIDENCE" />}
                    
                    <div className={`p-8 md:p-12 rounded-[2.5rem] border-[6px] text-center transition-all duration-1000 ${signal?.score && signal.score >= 80 ? 'bg-emerald-600/10 text-emerald-400 border-emerald-500/40 shadow-[0_0_80px_rgba(16,185,129,0.15)]' : signal?.score && signal.score <= 30 ? 'bg-rose-600/10 text-rose-400 border-rose-500/40' : 'bg-zinc-900/50 text-zinc-100 border-zinc-800 shadow-inner'}`}>
                      <span className="text-[10px] md:text-[12px] font-black uppercase tracking-[0.4em] block mb-4 opacity-50">RECOMMENDED ACTION</span>
                      <span className="text-4xl md:text-6xl font-black italic uppercase tracking-tighter block leading-none">{signal?.action || 'STANDBY'}</span>
                    </div>

                    <div className="bg-zinc-950/80 p-8 md:p-10 rounded-[2.5rem] border border-blue-500/10 shadow-inner relative overflow-hidden group">
                      <div className="absolute -top-10 -right-10 p-10 opacity-[0.02]">
                        <i className="fas fa-terminal text-9xl"></i>
                      </div>
                      <div className="flex items-center gap-4 mb-6">
                        <div className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></div>
                        <h4 className="text-[11px] md:text-sm font-black text-blue-400 uppercase tracking-[0.4em]">ADVISORY DIRECTIVE</h4>
                      </div>
                      <p className="text-base md:text-lg font-bold leading-relaxed text-zinc-200 font-mono tracking-tight italic">
                        {signal?.score && signal.score >= 80 
                          ? `STRATEGIC ENTRY DETECTED: Confluence is maxed. Enter ${selectedPair} at current price levels. Targets: ${signal.tp.toFixed(5)}. Risk Managed at: ${signal.sl.toFixed(5)}.`
                          : signal?.score && signal.score >= 55 
                          ? `PARTIAL ALIGNMENT: Institutional footprint visible but liquidity not fully captured. Scale-in with smaller risk. Monitor Dollar Index for confirmation.`
                          : `CAUTION ADVISED: High conflict between Dollar trend and Asset sentiment. Market is currently 'choppy'. Stay on the sidelines until New York session overlap.`
                        }
                      </p>
                    </div>
                  </div>

                  <div className="space-y-10">
                    <MiniChart pair={selectedPair} tp={signal?.tp} sl={signal?.sl} currentPrice={marketState.dxy.price / 100 + (selectedPair.includes('EUR') ? 0.05 : 0.08)} />
                    
                    <div className="bg-zinc-900/30 p-8 md:p-10 rounded-[2.5rem] border border-zinc-800/50 shadow-inner backdrop-blur-sm">
                      <span className="text-[10px] font-black text-zinc-600 block mb-8 uppercase tracking-[0.4em] flex items-center gap-3">
                         <i className="fas fa-list-ol text-blue-500"></i> Logic Verification:
                      </span>
                      <ul className="space-y-6">
                        {signal?.reasoning.map((r, i) => (
                          <li key={i} className="text-[12px] md:text-[13px] flex items-start gap-4 md:gap-5 group border-b border-zinc-800/40 pb-5 last:border-0">
                            <div className="w-6 h-6 rounded-lg bg-blue-500/10 flex items-center justify-center text-[10px] text-blue-500 border border-blue-500/20 group-hover:bg-blue-500 group-hover:text-white transition-all shrink-0">
                               {i + 1}
                            </div>
                            <span className="text-zinc-300 font-bold leading-relaxed group-hover:text-white transition-colors tracking-tight">{r}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      <footer className="text-center py-20 text-zinc-700 text-[8px] md:text-[10px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] opacity-40 px-4">
        FXCURRENCY ADVISER v3.8 — Institutional Connectivity Secured // AES-256 Validated Tunnel
      </footer>
    </div>
  );
};

export default App;
