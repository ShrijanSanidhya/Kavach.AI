// In-memory state for the entire system
export const store = {
  incidents: [],
  resources: {
    ambulances:  { total: 4, available: 4 },
    fireUnits:   { total: 3, available: 3 },
    police:      { total: 4, available: 4 },
    ndrfUnits:   { total: 2, available: 2 },
    swatUnits:   { total: 1, available: 1 },
    hazmatUnits: { total: 1, available: 1 },
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
    { id: 'NDRF-1', type: 'ndrf',    status: 'available', zone: 'North',    eta: null, location: [28.670, 77.210] },
    { id: 'NDRF-2', type: 'ndrf',    status: 'available', zone: 'South',    eta: null, location: [28.520, 77.220] },
    { id: 'SWAT-1', type: 'swat',    status: 'available', zone: 'Central',  eta: null, location: [28.625, 77.215] },
    { id: 'HAZ-1',  type: 'hazmat',  status: 'available', zone: 'West',     eta: null, location: [28.650, 77.100] },
    { id: 'AMB-HR', type: 'ambulance', status: 'available', zone: 'Haryana', eta: null, location: [28.975, 77.045] },
    { id: 'FIRE-HR',type: 'fire',      status: 'available', zone: 'Haryana', eta: null, location: [28.982, 77.051] },
    { id: 'POL-HR', type: 'police',    status: 'available', zone: 'Haryana', eta: null, location: [28.985, 77.048] },
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
