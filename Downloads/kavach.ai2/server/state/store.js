// In-memory state for the entire system
export const store = {
  incidents: [],
  resources: {
    ambulances:  { total: 3, available: 3 },
    fireUnits:   { total: 2, available: 2 },
    police:      { total: 3, available: 3 },
  },
  resourcesList: [
    { id: 'AMB-1', type: 'ambulance', status: 'available', zone: 'Central',  eta: null, location: [28.630, 77.209] },
    { id: 'AMB-2', type: 'ambulance', status: 'available', zone: 'North',    eta: null, location: [28.665, 77.225] },
    { id: 'AMB-3', type: 'ambulance', status: 'available', zone: 'South',    eta: null, location: [28.510, 77.208] },
    { id: 'FIRE-1',type: 'fire',      status: 'available', zone: 'East',     eta: null, location: [28.620, 77.285] },
    { id: 'FIRE-2',type: 'fire',      status: 'available', zone: 'West',     eta: null, location: [28.640, 77.120] },
    { id: 'POL-1', type: 'police',    status: 'available', zone: 'Central',  eta: null, location: [28.633, 77.210] },
    { id: 'POL-2', type: 'police',    status: 'available', zone: 'South',    eta: null, location: [28.550, 77.250] },
    { id: 'POL-3', type: 'police',    status: 'available', zone: 'North',    eta: null, location: [28.660, 77.200] },
  ],
  logs: [],
  stats: {
    totalCalls: 0,
    duplicatesMerged: 0,
    active: 0,
    resolved: 0,
    aiResponseTime: '—',
    manualResponseTime: '18.7 min',
  },
};

let logSeq = 0;

export const addLog = (type, message) => {
  store.logs.unshift({
    id: `LOG-${Date.now()}-${logSeq++}`,
    type,         // TRIAGE | DISPATCH | WARNING | SYSTEM
    message,
    timestamp: new Date().toLocaleTimeString(),
  });
  if (store.logs.length > 60) store.logs.length = 60;
};
