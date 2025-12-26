
import React, { useState, useEffect, useMemo } from 'react';
import { SESSIONS, TIMEZONES } from '../constants';

const MarketHoursTimeline: React.FC = () => {
  const [selectedTz, setSelectedTz] = useState(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch (e) {
      return "UTC";
    }
  });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const tzDate = useMemo(() => {
    return new Date(currentTime.toLocaleString("en-US", { timeZone: selectedTz }));
  }, [currentTime, selectedTz]);

  const tzOffset = useMemo(() => {
    const utcStr = currentTime.toLocaleString("en-US", { timeZone: "UTC" });
    const tzStr = currentTime.toLocaleString("en-US", { timeZone: selectedTz });
    const utcDate = new Date(utcStr);
    const targetDate = new Date(tzStr);
    return Math.round((targetDate.getTime() - utcDate.getTime()) / 3600000);
  }, [currentTime, selectedTz]);

  const currentHour = tzDate.getHours();
  const currentMinute = tzDate.getMinutes();
  const totalMinutes = currentHour * 60 + currentMinute;
  const percentage = (totalMinutes / 1440) * 100;

  const hours = Array.from({ length: 24 }, (_, i) => i);

  const renderSessionBar = (session: typeof SESSIONS[0]) => {
    let startHour = (session.start + tzOffset) % 24;
    if (startHour < 0) startHour += 24;
    
    let endHour = (session.end + tzOffset) % 24;
    if (endHour < 0) endHour += 24;

    const startMin = startHour * 60;
    const endMin = endHour * 60;

    if (startMin > endMin) {
      return (
        <>
          <div 
            className="absolute h-5 rounded-sm opacity-70 border-t border-white/5"
            style={{ 
              left: `${(startMin / 1440) * 100}%`, 
              width: `${((1440 - startMin) / 1440) * 100}%`,
              backgroundColor: session.color 
            }}
          />
          <div 
            className="absolute h-5 rounded-sm opacity-70 border-t border-white/5"
            style={{ 
              left: '0%', 
              width: `${(endMin / 1440) * 100}%`,
              backgroundColor: session.color 
            }}
          />
        </>
      );
    }

    return (
      <div 
        className="absolute h-5 rounded-sm opacity-70 border-t border-white/5"
        style={{ 
          left: `${(startMin / 1440) * 100}%`, 
          width: `${((endMin - startMin) / 1440) * 100}%`,
          backgroundColor: session.color 
        }}
      />
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-2">
        <div className="flex items-center gap-3">
          <div className="bg-zinc-900/80 border border-zinc-800 p-2.5 rounded-xl flex items-center gap-2 shadow-inner">
            <i className="fas fa-globe-americas text-blue-500 text-xs"></i>
            <select 
              value={selectedTz}
              onChange={(e) => setSelectedTz(e.target.value)}
              className="bg-transparent text-[10px] font-black text-white uppercase outline-none cursor-pointer"
            >
              {TIMEZONES.map(tz => (
                <option key={tz.value} value={tz.value} className="bg-zinc-950">
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
          <div className="text-[10px] font-mono font-black text-zinc-500 bg-zinc-900/50 px-3 py-2 rounded-xl border border-zinc-800 shadow-sm">
            OFFSET: {tzOffset >= 0 ? '+' : ''}{tzOffset}H
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
           {SESSIONS.map(s => (
            <div key={s.name} className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: s.color }}></div>
              <span className="text-[9px] font-black text-zinc-400 uppercase tracking-widest">{s.name}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="relative h-64 bg-zinc-900/20 rounded-2xl border border-zinc-800/30 p-6 select-none overflow-hidden">
        {/* Time Grid */}
        <div className="absolute inset-0 flex justify-between px-6 opacity-40">
          {hours.map(h => (
            <div key={h} className="h-full border-l border-zinc-800/40 relative">
              <span className="absolute top-2 left-1 text-[8px] text-zinc-600 font-mono font-bold">
                {h.toString().padStart(2, '0')}
              </span>
            </div>
          ))}
          <div className="h-full border-l border-zinc-800/40"></div>
        </div>

        {/* Session Tracks */}
        <div className="relative h-full pt-10 space-y-5">
          {SESSIONS.map((session) => (
            <div key={session.name} className="relative h-5 group">
              <span className="absolute -left-1 -top-4 text-[8px] font-black text-zinc-600 uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity z-10">
                {session.name} Market
              </span>
              {renderSessionBar(session)}
            </div>
          ))}
        </div>

        {/* Current Time Indicator */}
        <div 
          className="absolute top-0 bottom-0 w-[2px] bg-rose-500 z-20 shadow-[0_0_20px_rgba(244,63,94,0.5)] transition-all duration-1000"
          style={{ left: `calc(${percentage}% + 0px)` }}
        >
          <div className="absolute -top-1 -left-1.5 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-zinc-950"></div>
          <div className="absolute bottom-6 -left-8 bg-rose-500 text-white text-[8px] font-black px-2 py-1 rounded shadow-xl uppercase tracking-widest">
            {tzDate.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false })}
          </div>
        </div>
      </div>
      
      <p className="text-center text-[9px] text-zinc-600 font-black uppercase tracking-[0.4em] opacity-60">
        Live Market Sync — Regional Session Overlaps Detected
      </p>
    </div>
  );
};

export default MarketHoursTimeline;
