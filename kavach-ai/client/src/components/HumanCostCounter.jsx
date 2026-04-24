import React, { useRef, useEffect, useState } from 'react';

const StatItem = ({ label, sub, value, colorClass }) => {
  const [scale, setScale] = useState(false);
  const prevValue = useRef(value);

  useEffect(() => {
    if (prevValue.current !== value) {
      setScale(true);
      const timer = setTimeout(() => setScale(false), 200);
      prevValue.current = value;
      return () => clearTimeout(timer);
    }
  }, [value]);

  return (
    <div className="flex flex-col text-center px-4 flex-1">
      <div 
        className={`text-lg font-bold font-mono transition-transform duration-200 ${colorClass} ${scale ? 'scale-125' : 'scale-100'}`}
      >
        {value}
      </div>
      <div className="text-xs text-slate-300 font-bold mt-1">{label}</div>
      <div className="text-[10px] text-slate-500">{sub}</div>
    </div>
  );
};

export default function HumanCostCounter({ stats }) {
  // 1. AI Response
  const avgTime = stats.avgResponseTime || 0;
  let timeColor = 'text-green-500';
  if (avgTime >= 6000) timeColor = 'text-red-500';
  else if (avgTime >= 3000) timeColor = 'text-yellow-500';
  const timeValue = avgTime > 0 ? `${avgTime} ms` : '—';

  // 5. Active Incidents
  const active = stats.activeIncidents || 0;
  let activeColor = 'text-green-500';
  if (active > 3) activeColor = 'text-red-500';
  else if (active > 1) activeColor = 'text-yellow-500';

  return (
    <div className="w-full h-[50px] bg-navy-800 border-t border-slate-700 flex flex-row items-center justify-around px-6 shrink-0">
      <StatItem 
        label="⚡ AI Response" 
        sub="avg per call" 
        value={timeValue} 
        colorClass={timeColor} 
      />
      <div className="h-8 border-r border-slate-700/30" />
      
      <StatItem 
        label="🐌 Manual Dispatch" 
        sub="without AI" 
        value="18.7 min" 
        colorClass="text-red-500" 
      />
      <div className="h-8 border-r border-slate-700/30" />

      <StatItem 
        label="📞 Calls Processed" 
        sub="total received" 
        value={stats.totalCalls || 0} 
        colorClass="text-blue-500" 
      />
      <div className="h-8 border-r border-slate-700/30" />

      <div className="flex flex-col text-center px-4 flex-1 relative">
        <StatItem 
          label="🔁 Duplicates Merged" 
          sub="noise filtered" 
          value={stats.duplicatesMerged || 0} 
          colorClass="text-orange-500" 
        />
        {(stats.duplicatesMerged || 0) > 0 && (
          <span className="absolute -top-3 left-1/2 transform -translate-x-1/2 text-[8px] font-bold text-green-500 bg-green-900/30 px-1 rounded whitespace-nowrap">
            SYSTEM ADVANTAGE
          </span>
        )}
      </div>
      <div className="h-8 border-r border-slate-700/30" />

      <StatItem 
        label="🚨 Active Incidents" 
        sub="being handled" 
        value={active} 
        colorClass={activeColor} 
      />
      <div className="h-8 border-r border-slate-700/30" />

      <StatItem 
        label="✅ Resolved" 
        sub="completed" 
        value={stats.resolved || 0} 
        colorClass="text-green-500" 
      />
    </div>
  );
}
