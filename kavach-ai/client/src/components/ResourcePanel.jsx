import React from 'react';

const TYPES = [
  { id: 'AMBULANCE', icon: '🚑', label: 'Ambulances' },
  { id: 'FIRE_TRUCK', icon: '🚒', label: 'Fire Units' },
  { id: 'POLICE', icon: '🚓', label: 'Police' }
];

export default function ResourcePanel({ resources, stats }) {
  const summary = TYPES.map(t => {
    const total = resources.filter(r => r.type === t.id);
    const avail = total.filter(r => r.status === 'available');
    return { ...t, total: total.length, avail: avail.length };
  });

  return (
    <div className="flex flex-col h-full bg-navy-900">
      <div className="p-3 border-b border-slate-700 text-xs font-bold text-slate-300 bg-navy-800 shrink-0">
        🚗 RESOURCES
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <div className="mb-4 flex flex-col gap-2">
          {summary.map(s => {
            const bars = '█'.repeat(s.avail) + '░'.repeat(s.total - s.avail);
            return (
              <div key={s.id} className="flex justify-between text-xs font-mono items-center">
                <span className="text-slate-300">{s.icon} {s.label}</span>
                <span className="text-slate-400">
                  <span className="text-green-500">[{bars}]</span> {s.avail}/{s.total}
                </span>
              </div>
            );
          })}
        </div>

        {summary.some(s => s.avail === 0 && s.total > 0) && (
          <div className="mb-4 p-2 bg-red-900/30 border border-red-500/30 animate-pulse rounded text-center text-[10px] font-bold text-red-400">
            ⚠ NO RESOURCES AVAILABLE
          </div>
        )}

        <div className="flex flex-col gap-1">
          {resources.map(r => {
            let statusEl;
            if (r.status === 'available') {
              statusEl = <span className="text-green-500 font-bold text-[10px]">● AVAILABLE</span>;
            } else if (r.status === 'en_route') {
              statusEl = (
                <div className="flex flex-col">
                  <span className="text-orange-500 font-bold text-[10px] animate-pulse">▶ EN ROUTE</span>
                  <span className="text-[10px] text-slate-400">ETA: {r.eta} min</span>
                </div>
              );
            } else {
              statusEl = <span className="text-red-500 font-bold text-[10px]">■ ON SCENE</span>;
            }

            return (
              <div key={r.id} className="p-2 rounded bg-navy-800 border border-slate-700 flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-base leading-none">{r.icon}</span>
                  <span className="font-mono text-xs text-slate-300 font-bold">{r.id}</span>
                </div>
                <div className="flex flex-col items-center">
                  {statusEl}
                  {r.status !== 'available' && <span className="text-[10px] text-slate-500">→ {r.assignedTo}</span>}
                </div>
                <div className="bg-navy-950 px-2 py-0.5 rounded font-mono text-[10px] text-slate-400 border border-slate-700/50">
                  {r.position?.zone || '?'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
