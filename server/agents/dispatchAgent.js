import { store, addLog } from '../state/store.js';

// Simple mock-graph travel time: haversine km / 60 km·h⁻¹ → minutes
const haversineKm = ([lat1, lng1], [lat2, lng2]) => {
  const R = 6371, dLat = rad(lat2 - lat1), dLng = rad(lng2 - lng1);
  const a = Math.sin(dLat/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLng/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
};
const rad = d => d * Math.PI / 180;

// Detect duplicate: same type + within 500m of an existing active incident
const isDuplicate = (triage, loc) => {
  for (const inc of store.incidents) {
    if (inc.status === 'resolved') continue;
    if (inc.emergencyType !== triage.emergencyType) continue;
    if (!inc.location || !loc) continue;
    const dist = haversineKm(inc.location, loc);
    if (dist < 0.5) return inc;  // within 500 m
  }
  return null;
};

let incSeq = 0;

export const processDispatch = (triage, rawTranscript, explicitLocation = null) => {
  store.stats.totalCalls++;

  const loc = explicitLocation || randomNearKishora();
  const dup = isDuplicate(triage, loc);

  if (dup) {
    store.stats.duplicatesMerged++;
    dup.callCount = (dup.callCount || 1) + 1;
    addLog('WARNING', `Duplicate merged → INC-${dup.seqId} (now ${dup.callCount} reports)`);
    return { status: 'merged', parentId: dup.id };
  }

  // Pick nearest available resource of correct type
  const resType = (triage.resourceNeeded === 'fire')     ? 'fire'
                : (triage.resourceNeeded === 'police')   ? 'police'
                : (triage.resourceNeeded === 'ndrf')     ? 'ndrf'
                : (triage.resourceNeeded === 'swat')     ? 'swat'
                : (triage.resourceNeeded === 'hazmat')   ? 'hazmat'
                : 'ambulance';

  const availableRes = store.resourcesList.filter(r =>
    r.type === resType && r.status === 'available'
  );

  let assignedResource = null;
  let etaMinutes = null;

  if (availableRes.length > 0) {
    // Pick nearest to incident
    let nearest = availableRes[0], nearestDist = Infinity;
    for (const r of availableRes) {
      const d = haversineKm(r.location, loc);
      if (d < nearestDist) { nearestDist = d; nearest = r; }
    }
    etaMinutes = Math.max(1, Math.round((nearestDist / 60) * 60));
    assignedResource = nearest.id;
    nearest.status = 'dispatched';
    nearest.eta = etaMinutes;

    // Update summary counters
    const key = resType === 'fire' ? 'fireUnits' 
              : resType === 'police' ? 'police' 
              : resType === 'ndrf' ? 'ndrfUnits'
              : resType === 'swat' ? 'swatUnits'
              : resType === 'hazmat' ? 'hazmatUnits'
              : 'ambulances';
    store.resources[key].available = Math.max(0, store.resources[key].available - 1);
  } else {
    addLog('WARNING', `No ${resType} available — incident queued`);
  }

  const incident = {
    id: `inc-${Date.now().toString(16)}`,
    seqId: ++incSeq,
    timestamp: new Date().toISOString(),
    transcript: rawTranscript,
    emergencyType: triage.emergencyType,
    severity: triage.severity,
    locationName: triage.locationName,
    keywords: triage.keywords || [],
    accuracy: triage.accuracy,
    reasoning: triage.reasoning,
    resourceNeeded: triage.resourceNeeded,
    location: loc,
    status: assignedResource ? 'dispatched' : 'pending',
    assignedResource,
    etaMinutes,
    callCount: 1,
  };

  store.incidents.unshift(incident);
  if (store.incidents.length > 30) store.incidents.length = 30;
  store.stats.active = store.incidents.filter(i => i.status !== 'resolved').length;

  return { status: 'created', incident };
};

const randomNearKishora = () => [
  28.98 + (Math.random() - 0.5) * 0.10,
  77.05 + (Math.random() - 0.5) * 0.10,
];
