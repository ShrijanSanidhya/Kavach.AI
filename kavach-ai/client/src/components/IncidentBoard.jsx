import React, { useState, useEffect } from 'react';

const SEVERITY_COLORS = {
  5: 'border-red-500',
  4: 'border-orange-500',
  3: 'border-yellow-500',
  2: 'border-blue-500',
  1: 'border-slate-500',
};

const SEV_BG = {
  5: 'bg-red-500 text-white',
  4: 'bg-orange-500 text-white',
  3: 'bg-yellow-500 text-black',
  2: 'bg-blue-500 text-white',
  1: 'bg-slate-500 text-white',
};

const EtaDisplay = ({ initialEta, isResolved }) => {
  const [eta, setEta] = useState(initialEta);
  useEffect(() => {
    if (isResolved || eta <= 0) return;
    const interval = setInterval(() => {
      setEta(prev => Math.max(0, prev - 1));
    }, 60000);
    return () => clearInterval(interval);
  }, [initialEta, isResolved, eta]);

  return <span>ETA {eta} min</span>;
};

export default function IncidentBoard({ incidents, onResolve }) {
  const sortedIncidents = [...incidents].sort((a, b) => {
    if (b.severity !== a.severity) return b.severity - a.severity;
    return a.createdAt - b.createdAt;
  });

  return (
    <div className="flex flex-col h-full bg-navy-900">
      <div className="p-3 border-b border-slate-700 text-xs font-bold text-slate-300 bg-navy-800 flex justify-between shrink-0">
        <span>🚨 INCIDENT BOARD</span>
        <span className="bg-slate-700 px-2 rounded-full">{incidents.filter(i => i.status !== 'resolved').length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {sortedIncidents.map(incident => {
          if (incident.status === 'duplicate') {
            return (
              <div key={incident.id} className="mb-2 rounded-lg p-3 bg-navy-800 border border-slate-700 opacity-60">
                <div className="text-center text-slate-400 font-bold text-xs">⊘ MERGED INTO {incident.mergedInto}</div>
              </div>
            );
          }

          const isResolved = incident.status === 'resolved';
          const borderColor = SEVERITY_COLORS[incident.severity] || 'border-slate-700';
          const sevBg = SEV_BG[incident.severity] || 'bg-slate-700 text-white';
          const confPercent = Math.round((incident.confidence || 0) * 100);
          const confBars = Math.floor(confPercent / 10);
          const confStr = '█'.repeat(confBars) + '░'.repeat(10 - confBars);
          const confColor = confPercent > 70 ? 'text-green-500' : (confPercent > 40 ? 'text-yellow-500' : 'text-red-500');

          return (
            <div key={incident.id} className={`mb-2 rounded-lg p-3 bg-navy-800 border border-slate-700 border-l-4 ${borderColor} ${isResolved ? 'opacity-40' : ''}`}>
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${sevBg}`}>SEV {incident.severity}</span>
                  <span className="font-mono text-xs text-slate-300">{incident.id}</span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">{incident.incidentType}</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{incident.status}</span>
              </div>
              
              <div className="mb-3">
                <div className="text-sm font-bold text-slate-200">📍 Zone {incident.location} — {incident.locationDescription}</div>
                <div className="text-sm text-slate-300 mt-1">{incident.summary}</div>
              </div>

              <div className="flex flex-col gap-1 mb-3 bg-navy-950 p-2 rounded">
                <div className="text-xs font-mono">
                  <span className="text-slate-400">Confidence: </span>
                  <span className={confColor}>[{confStr}] {confPercent}%</span>
                </div>
                {confPercent < 50 && (
                  <div className="text-[10px] text-yellow-500 font-bold">⚠ LOW CONFIDENCE — OPERATOR REVIEW RECOMMENDED</div>
                )}
                <div className="text-xs font-mono text-slate-400">
                  Severity: <span className="text-slate-300">[{[1,2,3,4,5].map(l => l <= incident.severity ? '●' : '○').join('')}] {incident.severity}/5</span>
                </div>
                {incident.reportCount > 1 && (
                  <div className="text-[10px] text-green-400 font-bold">👥 {incident.reportCount} callers reported this incident</div>
                )}
                {incident.escalated && (
                  <div className="text-[10px] text-orange-400 font-bold">⬆ SEVERITY ESCALATED (merged reports)</div>
                )}
                {incident.hasConflict && (
                  <div className="text-[10px] text-yellow-400 font-bold">⚠ {incident.conflictNote || "Conflicting caller details"}</div>
                )}
              </div>

              <div className="flex justify-between items-center mt-2">
                <div>
                  {incident.assignedVehicle && (
                    <div className="text-xs font-bold bg-blue-900/50 text-blue-300 px-2 py-1 rounded">
                      🚑 {incident.assignedVehicle} dispatched — <EtaDisplay initialEta={incident.eta || 0} isResolved={isResolved} />
                    </div>
                  )}
                </div>
                {!isResolved && (
                  <button onClick={() => onResolve(incident.id)} className="text-xs font-bold border border-green-500 text-green-500 hover:bg-green-900/30 px-3 py-1 rounded">
                    ✓ Resolve
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
