
import React from 'react';

interface MiniChartProps {
  pair: string;
  tp?: number;
  sl?: number;
  currentPrice?: number;
}

const MiniChart: React.FC<MiniChartProps> = ({ pair, tp, sl, currentPrice = 1.0885 }) => {
  if (!tp || !sl || tp === 0 || sl === 0) {
    return (
      <div className="bg-zinc-950 rounded-2xl border border-zinc-800 p-6 h-[240px] flex flex-col items-center justify-center gap-4 border-dashed">
        <div className="w-12 h-12 rounded-full border-2 border-zinc-800 border-t-blue-500 animate-spin"></div>
        <span className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.3em]">Mapping Price Targets...</span>
      </div>
    );
  }

  const range = Math.abs(tp - sl);
  const diff = currentPrice - Math.min(tp, sl);
  const position = (diff / range) * 100;
  const clampedPosition = Math.max(10, Math.min(90, position));

  const potentialGain = Math.abs(Math.round((tp - currentPrice) * 10000));
  const potentialRisk = Math.abs(Math.round((currentPrice - sl) * 10000));

  return (
    <div className="relative bg-zinc-950 rounded-2xl border border-zinc-800 p-6 overflow-hidden shadow-2xl">
      <div className="flex justify-between items-start mb-10">
        <div>
          <span className="text-[9px] font-black text-zinc-600 uppercase tracking-widest block mb-1">Target Asset</span>
          <h4 className="text-2xl font-mono font-black text-white italic tracking-tighter">{pair}</h4>
        </div>
        <div className="text-right">
          <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest block mb-1">Live Feed</span>
          <span className="text-2xl font-mono font-black text-blue-400 tabular-nums">{currentPrice.toFixed(5)}</span>
        </div>
      </div>

      <div className="relative h-28 mb-12 px-6">
        <div className="absolute top-1/2 left-0 w-full h-2 bg-zinc-900 -translate-y-1/2 rounded-full shadow-inner border border-zinc-800"></div>
        
        {/* Stop Loss Marker */}
        <div className="absolute left-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)] border-4 border-zinc-950 mb-3"></div>
          <span className="text-[8px] font-black text-rose-500 uppercase mb-1">Safety Exit</span>
          <span className="text-[11px] font-mono font-black text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{sl.toFixed(5)}</span>
        </div>

        {/* Take Profit Marker */}
        <div className="absolute right-0 top-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-6 h-6 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] border-4 border-zinc-950 mb-3"></div>
          <span className="text-[8px] font-black text-emerald-500 uppercase mb-1">Profit Target</span>
          <span className="text-[11px] font-mono font-black text-white bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">{tp.toFixed(5)}</span>
        </div>

        {/* Price Tracker */}
        <div 
          className="absolute top-1/2 -translate-y-1/2 transition-all duration-1000 ease-in-out z-10"
          style={{ left: `${clampedPosition}%` }}
        >
          <div className="w-1.5 h-12 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,1)] rounded-full mb-2"></div>
          <div className="bg-blue-600 text-white text-[9px] font-black px-2 py-1 rounded-md whitespace-nowrap -translate-x-1/2 uppercase tracking-tighter shadow-2xl ring-2 ring-blue-500/20">
            PRICE NODE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-emerald-500/5 p-4 rounded-xl border border-emerald-500/20 group hover:bg-emerald-500/10 transition-colors">
           <span className="text-[9px] font-black text-emerald-500 uppercase block mb-1">Expected Reward</span>
           <span className="text-xl font-mono font-black text-emerald-400">+{potentialGain} Pips</span>
        </div>
        <div className="bg-rose-500/5 p-4 rounded-xl border border-rose-500/20 group hover:bg-rose-500/10 transition-colors">
           <span className="text-[9px] font-black text-rose-500 uppercase block mb-1">Limited Risk</span>
           <span className="text-xl font-mono font-black text-rose-400">-{potentialRisk} Pips</span>
        </div>
      </div>
    </div>
  );
};

export default MiniChart;
