import React from 'react';

const StatusBadge = ({ status }) => {
  switch (status) {
    case 'processing': return <div className="text-center my-1 text-yellow-400 animate-pulse text-xs font-bold bg-yellow-900/30 rounded py-0.5">⟳ PROCESSING</div>;
    case 'triaged': return <div className="text-center my-1 text-green-400 text-xs font-bold bg-green-900/30 rounded py-0.5">✓ TRIAGED</div>;
    case 'dispatched': return <div className="text-center my-1 text-blue-400 text-xs font-bold bg-blue-900/30 rounded py-0.5">✓ DISPATCHED</div>;
    case 'duplicate': return <div className="text-center my-1 text-slate-400 text-xs font-bold bg-slate-800 rounded py-0.5">⊘ MERGED</div>;
    case 'low_confidence': return <div className="text-center my-1 text-yellow-500 text-xs font-bold border border-yellow-500/50 rounded py-0.5">⚠ REVIEW NEEDED</div>;
    default: return null;
  }
};

const getBorderColor = (call) => {
  if (call.status === 'processing') return 'border-blue-500/50 animate-pulse';
  if (call.status === 'duplicate') return 'border-slate-600/30 opacity-60';
  if (call.severity === 5) return 'border-red-500/50';
  if (call.severity === 4) return 'border-orange-500/50';
  if (call.severity === 3) return 'border-yellow-500/50';
  return 'border-slate-700';
};

export default function CallFeed({ calls }) {
  const displayCalls = [...calls].slice(0, 10);

  return (
    <div className="flex flex-col h-full bg-navy-900">
      <div className="p-3 border-b border-slate-700 text-xs font-bold text-slate-300 bg-navy-800 flex justify-between shrink-0">
        <span>📞 INCOMING CALLS</span>
        <span className="bg-slate-700 px-2 rounded-full">{calls.length}</span>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {displayCalls.map((call) => {
          let truncText = call.transcript || '';
          if (truncText.length > 100) truncText = truncText.substring(0, 100) + '...';

          return (
            <div key={call.id} className={`bg-navy-800 border rounded-lg p-3 mb-2 animate-slide-in-top ${getBorderColor(call)}`}>
              <div className="flex justify-between items-center mb-1">
                <span className="font-mono text-xs text-slate-400">{call.id}</span>
                <span className="text-xs text-slate-500">
                  {call.timestamp ? new Date(call.timestamp).toLocaleTimeString('en-US', { hour12: false }) : ''}
                </span>
              </div>
              <StatusBadge status={call.status} />
              <div className="text-sm text-slate-300 italic my-2 leading-snug">
                "{truncText}"
              </div>
              {(call.status === 'triaged' || call.status === 'dispatched') && (
                <div className="flex justify-between items-center mt-2 border-t border-slate-700/50 pt-2">
                  <span className="text-xs font-bold text-slate-400">{call.incidentType || 'UNKNOWN'}</span>
                  <div className="flex gap-1">
                    {[1,2,3,4,5].map(level => (
                      <span key={level} className={`text-[10px] ${level <= (call.severity || 0) ? 'text-red-500' : 'text-slate-600'}`}>●</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
