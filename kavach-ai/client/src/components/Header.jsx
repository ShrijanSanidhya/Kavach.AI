import React, { useState, useEffect } from 'react';

export default function Header({ isChaosMode, isPaused, isConnected, stats, onChaos, onPause, onReset }) {
  const [time, setTime] = useState('');

  useEffect(() => {
    const timer = setInterval(() => {
      setTime(new Date().toLocaleTimeString('en-US', { hour12: false }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="w-full h-[60px] bg-navy-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0">
      <div className="flex flex-col">
        <h1 className="text-white font-bold font-mono text-xl">⚡ KAVACH.AI</h1>
        <span className="text-slate-400 text-xs">When 911 breaks, we don't.</span>
      </div>

      <div className="flex flex-col items-center">
        {isChaosMode ? (
          <div className="animate-pulse bg-red-600 text-white px-4 py-1 rounded text-sm font-bold">
            ⚠ MASS CASUALTY EVENT DETECTED
          </div>
        ) : (
          <div className="flex items-center text-red-400 text-sm font-bold">
            <span className="animate-pulse mr-2">●</span> ACTIVE DISASTER — NEW DELHI
          </div>
        )}
        <div className="text-xs text-slate-400 font-mono mt-1">{time}</div>
      </div>

      <div className="flex items-center gap-2">
        <button className="border border-slate-600 px-3 py-1 rounded text-slate-300 hover:bg-slate-700 text-sm">
          🎤 Voice
        </button>
        <button 
          onClick={onChaos}
          disabled={isChaosMode}
          className={`px-3 py-1 rounded text-white text-sm font-bold transition-all ${isChaosMode ? 'bg-red-900 cursor-not-allowed opacity-50' : 'bg-red-600 hover:bg-red-500'}`}
        >
          {isChaosMode ? '⚡ CHAOS ACTIVE' : '⚡ CHAOS MODE'}
        </button>
        <button onClick={onPause} className="border border-slate-600 px-3 py-1 rounded text-slate-300 hover:bg-slate-700 text-sm">
          {isPaused ? '▶ Resume' : '⏸ Pause'}
        </button>
        <button onClick={() => {
          if (window.confirm('Reset system?')) onReset();
        }} className="border border-slate-600 px-3 py-1 rounded text-slate-300 hover:bg-slate-700 text-sm">
          ↺ Reset
        </button>

        <div className="ml-4 flex items-center gap-2 border-l border-slate-700 pl-4">
          <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
          <span className="text-xs font-bold text-slate-400">{isConnected ? 'LIVE' : 'OFFLINE'}</span>
        </div>
      </div>
    </header>
  );
}
