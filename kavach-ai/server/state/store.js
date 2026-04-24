import { initialResources } from '../data/resources.js';

let state = {
  incidents: [],
  resources: JSON.parse(JSON.stringify(initialResources)),
  callLog: [],
  agentLogs: [],
  isPaused: false,
  chaosMode: false,
  stats: {
    totalCalls: 0,
    duplicatesMerged: 0,
    activeIncidents: 0,
    resolved: 0,
    avgResponseTime: 0,
    responseTimes: [],
    callsPerMinute: 0
  }
};

export function getState() {
  return JSON.parse(JSON.stringify(state));
}

export function addIncident(incident) {
  state.incidents.push(incident);
  state.stats.activeIncidents++;
  return incident;
}

export function updateIncident(id, updates) {
  const index = state.incidents.findIndex(i => i.id === id);
  if (index !== -1) {
    state.incidents[index] = { ...state.incidents[index], ...updates };
    return state.incidents[index];
  }
  return null;
}

export function findDuplicate(location, type) {
  const match = state.incidents.find(incident => 
    incident.location === location && 
    incident.incidentType === type && 
    incident.status !== 'resolved'
  );
  return match || null;
}

export function mergeIntoDuplicate(existingId, newCallData) {
  const existing = state.incidents.find(i => i.id === existingId);
  if (!existing) return null;
  
  existing.reportCount = (existing.reportCount || 1) + 1;
  
  if (newCallData.severity > existing.severity) {
    existing.severity = newCallData.severity;
    existing.escalated = true;
  }
  
  if (newCallData.keyDetails) {
    existing.keyDetails = existing.keyDetails || [];
    newCallData.keyDetails.forEach(detail => {
      if (!existing.keyDetails.includes(detail)) {
        existing.keyDetails.push(detail);
      }
    });
  }
  
  if (newCallData.hasConflict) {
    existing.hasConflict = true;
    existing.conflictNote = "Conflicting caller details";
  } else if (newCallData.keyDetails && existing.keyDetails) {
    const newFloors = newCallData.keyDetails.filter(d => typeof d === 'string' && d.toLowerCase().includes('floor'));
    const oldFloors = existing.keyDetails.filter(d => typeof d === 'string' && d.toLowerCase().includes('floor'));
    if (newFloors.length > 0 && oldFloors.length > 0) {
      if (newFloors.some(f => !oldFloors.includes(f))) {
        existing.hasConflict = true;
        existing.conflictNote = "Conflicting caller details";
      }
    }
  }

  existing.lastUpdated = Date.now();
  return existing;
}

export function addResource(resource) {
  state.resources.push(resource);
}

export function updateResource(id, updates) {
  const index = state.resources.findIndex(r => r.id === id);
  if (index !== -1) {
    state.resources[index] = { ...state.resources[index], ...updates };
    return state.resources[index];
  }
  return null;
}

export function getAvailableResources(type) {
  if (type) {
    return state.resources.filter(r => r.type === type && r.status === 'available');
  }
  return state.resources.filter(r => r.status === 'available');
}

export function addAgentLog(message, type) {
  const log = {
    id: `LOG-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    message,
    type,
    timestamp: Date.now()
  };
  state.agentLogs.push(log);
  if (state.agentLogs.length > 50) {
    state.agentLogs = state.agentLogs.slice(-50);
  }
  return log;
}

export function addCallLog(call) {
  state.callLog.push({ ...call, receivedAt: Date.now() });
  state.stats.totalCalls++;
}

export function recordResponseTime(ms) {
  state.stats.responseTimes.push(ms);
  const sum = state.stats.responseTimes.reduce((acc, curr) => acc + curr, 0);
  state.stats.avgResponseTime = Number((sum / state.stats.responseTimes.length).toFixed(1));
}

export function incrementDuplicates() {
  state.stats.duplicatesMerged++;
}

export function resolveIncident(id) {
  const incident = state.incidents.find(i => i.id === id);
  if (incident && incident.status !== 'resolved') {
    incident.status = 'resolved';
    state.stats.activeIncidents--;
    state.stats.resolved++;
  }
}

export function resetState() {
  state = {
    incidents: [],
    resources: JSON.parse(JSON.stringify(initialResources)),
    callLog: [],
    agentLogs: [],
    isPaused: false,
    chaosMode: false,
    stats: {
      totalCalls: 0,
      duplicatesMerged: 0,
      activeIncidents: 0,
      resolved: 0,
      avgResponseTime: 0,
      responseTimes: [],
      callsPerMinute: 0
    }
  };
}

export function setPaused(bool) {
  state.isPaused = bool;
}

export function setChaosMode(bool) {
  state.chaosMode = bool;
}
