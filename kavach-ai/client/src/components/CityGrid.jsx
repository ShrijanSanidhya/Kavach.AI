import React, { useRef, useEffect } from 'react';

const LANDMARKS = {
  A1:'North Hospital', A2:'Police HQ', A3:'Fire Station Alpha',
  A4:'Railway Station', A5:'North Bridge',
  B1:'Central Market', B2:'Old Town Square', B3:'City Park',
  B4:'School District', B5:'Harbor Area',
  C1:'Highway Junction', C2:'Shopping Mall', C3:'City Center',
  C4:'Tech District', C5:'Industrial Zone',
  D1:'Residential North', D2:'Community Center', D3:'Stadium',
  D4:'University Campus', D5:'Riverside',
  E1:'Suburb West', E2:'Airport Road', E3:'Medical District',
  E4:'Suburb East', E5:'South Bridge'
};

const ZONES = Object.keys(LANDMARKS);

const getIncidentStyles = (zoneIncidents) => {
  if (zoneIncidents.length === 0) return '';
  const highest = [...zoneIncidents].sort((a,b) => b.severity - a.severity)[0];
  switch(highest.incidentType) {
    case 'FIRE': return 'bg-red-900/30 border-red-500/60';
    case 'MEDICAL': return 'bg-blue-900/30 border-blue-500/60';
    case 'COLLAPSE': return 'bg-orange-900/30 border-orange-500/60';
    case 'ACCIDENT': return 'bg-yellow-900/30 border-yellow-500/60';
    default: return 'bg-slate-700/30 border-slate-500/60';
  }
};

export default function CityGrid({ resources, incidents }) {
  const prevResourcesRef = useRef(resources);

  useEffect(() => {
    prevResourcesRef.current = resources;
  }, [resources]);

  const activeIncidents = incidents.filter(i => i.status !== 'resolved');

  return (
    <div className="flex flex-col h-full bg-navy-900 p-2">
      <div className="flex-1 grid grid-cols-5 grid-rows-5 gap-1 min-h-0">
        {ZONES.map(zone => {
          const zoneIncidents = activeIncidents.filter(i => i.location === zone);
          const zoneResources = resources.filter(r => r.position && r.position.zone === zone);
          const incidentStyle = getIncidentStyles(zoneIncidents);
          const hasIncident = zoneIncidents.length > 0;

          return (
            <div key={zone} className={`relative rounded border ${incidentStyle || 'bg-navy-800 border-slate-700/50'} flex flex-col items-center justify-center overflow-hidden`}>
              <span className="absolute top-1 left-1 text-[10px] text-slate-500 font-mono">{zone}</span>
              {hasIncident && (
                <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
              )}
              <span className="text-[11px] text-slate-400 text-center px-1 leading-tight line-clamp-2 mt-3">
                {LANDMARKS[zone]}
              </span>
              <div className="absolute bottom-1 right-1 flex flex-col-reverse gap-0.5">
                {zoneResources.map(r => (
                  <span key={r.id} className={`text-base leading-none ${r.status === 'en_route' ? 'animate-pulse text-orange-300' : ''}`} title={r.id}>
                    {r.icon}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-2 text-[10px] text-slate-400 flex gap-4 justify-center shrink-0">
        <span>🚑 Ambulance</span>
        <span>🚒 Fire Unit</span>
        <span>🚓 Police</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 bg-red-500 rounded-full inline-block"></span> Active incident</span>
        <span>⚡ Pre-positioned</span>
      </div>
    </div>
  );
}
