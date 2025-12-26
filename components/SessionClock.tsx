
import React, { useState, useEffect } from 'react';
import { getLagosTime, formatLagosTime, getActiveSessions, isOverlapActive } from '../utils/marketLogic';

interface Props {
  selectedSession: string;
  onSelectSession: (session: string) => void;
}

const SessionClock: React.FC<Props> = ({ selectedSession, onSelectSession }) => {
  const [time, setTime] = useState(getLagosTime());

  useEffect(() => {
    const timer = setInterval(() => setTime(getLagosTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  const sessions = getActiveSessions(time);
  const overlapActive = isOverlapActive(time);

  return (
    <div className="flex flex-col md:flex-row items-center justify-between bg-zinc-900/50 backdrop-blur-md border border-zinc-800 p-5 rounded-2xl gap-8 shadow-2xl">
      <div className="flex flex-col">
        <span className="text-[10px] font-black text-zinc-600 tracking-[0.4em] uppercase mb-1">Institutional Time (Lagos)</span>
        <span className="text-4xl font-mono font-black text-white tabular-nums tracking-tighter">
          {formatLagosTime(time)}
        </span>
      </div>

      <div className="flex flex-wrap gap-3">
        {sessions.map(s => (
          <button 
            key={s.name} 
            onClick={() => onSelectSession(s.name)}
            className={`px-4 py-2.5 rounded-xl border text-[10px] font-black transition-all duration-300 flex items-center gap-2.5 active:scale-95 ${selectedSession === s.name ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-500/10' : ''} ${s.isOpen ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
          >
            <div className={`w-2 h-2 rounded-full ${s.isOpen ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-700'}`}></div>
            {s.name.toUpperCase()}
          </button>
        ))}
        
        <button
          onClick={() => onSelectSession('Overlap')}
          className={`px-4 py-2.5 rounded-xl border text-[10px] font-black transition-all duration-300 flex items-center gap-2.5 active:scale-95 ${selectedSession === 'Overlap' ? 'ring-2 ring-orange-500 border-orange-500 bg-orange-500/10' : ''} ${overlapActive ? 'bg-orange-500/10 border-orange-500/40 text-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.1)]' : 'bg-zinc-900 border-zinc-800 text-zinc-600'}`}
        >
          <i className={`fas fa-bolt ${overlapActive ? 'text-orange-400 animate-bounce' : 'text-zinc-700'}`}></i>
          VOLATILITY OVERLAP
        </button>
      </div>
    </div>
  );
};

export default SessionClock;
