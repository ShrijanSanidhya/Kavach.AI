import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  getState, addIncident, updateIncident, findDuplicate, mergeIntoDuplicate,
  addResource, updateResource, getAvailableResources, addAgentLog,
  addCallLog, recordResponseTime, incrementDuplicates, resolveIncident,
  resetState, setPaused, setChaosMode
} from './state/store.js';
import { triageCall } from './agents/triageAgent.js';
import { dispatchIncident } from './agents/dispatchAgent.js';
import { mockCalls, chaosCalls } from './data/calls.js';

dotenv.config();

const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

const clients = new Set();

function sendToAll(eventName, data) {
  const msg = `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
  clients.forEach(res => res.write(msg));
}

async function processCall(rawCall) {
  addCallLog(rawCall);
  sendToAll('new_call', { call: rawCall, stats: getState().stats });
  
  addAgentLog(`Analyzing call ${rawCall.id}...`, 'TRIAGE');
  sendToAll('agent_log', getState().agentLogs.slice(-1)[0]);

  const startTime = Date.now();
  const triageResult = await triageCall(rawCall.transcript);
  const responseTime = Date.now() - startTime;
  recordResponseTime(responseTime);

  addAgentLog(`Location extracted: Zone ${triageResult.location}`, 'TRIAGE');
  sendToAll('agent_log', getState().agentLogs.slice(-1)[0]);
  addAgentLog(`Severity: ${triageResult.severity}/5 | Confidence: ${Math.round(triageResult.confidence * 100)}%`, 'TRIAGE');
  sendToAll('agent_log', getState().agentLogs.slice(-1)[0]);
  addAgentLog(`Cross-referencing known incidents...`, 'TRIAGE');
  sendToAll('agent_log', getState().agentLogs.slice(-1)[0]);

  const dispatchResult = await dispatchIncident(triageResult, getState().resources);

  if (dispatchResult.isDuplicate) {
    incrementDuplicates();
    addAgentLog(`DUPLICATE DETECTED — merging into ${dispatchResult.mergedInto}`, 'WARNING');
    sendToAll('agent_log', getState().agentLogs.slice(-1)[0]);
    sendToAll('duplicate_detected', {
      callId: rawCall.id,
      mergedInto: dispatchResult.mergedInto,
      incident: getState().incidents.find(i => i.id === dispatchResult.mergedInto)
    });
  } else {
    addAgentLog(`New incident created: ${dispatchResult.incident.id}`, 'TRIAGE');
    sendToAll('agent_log', getState().agentLogs.slice(-1)[0]);
    
    if (dispatchResult.vehicle) {
      addAgentLog(`${dispatchResult.vehicle.id} dispatched — ETA ${dispatchResult.eta} min`, 'DISPATCH');
      sendToAll('agent_log', getState().agentLogs.slice(-1)[0]);
      sendToAll('dispatch_complete', {
        incident: dispatchResult.incident,
        vehicle: dispatchResult.vehicle,
        eta: dispatchResult.eta
      });
    }
    
    sendToAll('triage_complete', { incident: dispatchResult.incident });
  }

  sendToAll('resource_update', { resources: getState().resources });
  sendToAll('stats_update', { stats: getState().stats });
}

let callIndex = 0;
let streamInterval = null;

function startStream() {
  streamInterval = setInterval(async () => {
    if (getState().isPaused) return;
    const call = { 
      ...mockCalls[callIndex % mockCalls.length],
      id: `CALL-${String(Date.now()).slice(-6)}`,
      timestamp: new Date().toISOString()
    };
    callIndex++;
    try { 
      await processCall(call); 
    } catch(e) { 
      console.error(e); 
    }
  }, 5000);
}

startStream();

app.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  clients.add(res);
  
  res.write(`event: init\ndata: ${JSON.stringify(getState())}\n\n`);
  
  req.on('close', () => {
    clients.delete(res);
  });
});

app.get('/api/state', (req, res) => {
  res.json(getState());
});

app.post('/api/call', async (req, res) => {
  try {
    const { transcript } = req.body;
    const call = {
      id: `CALL-${String(Date.now()).slice(-6)}`,
      transcript,
      timestamp: new Date().toISOString()
    };
    await processCall(call);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

const delay = ms => new Promise(r => setTimeout(r, ms));

app.post('/api/chaos', async (req, res) => {
  setChaosMode(true);
  sendToAll('chaos_start', { message: 'MASS CASUALTY EVENT DETECTED' });
  
  for (let i = 0; i < chaosCalls.length; i++) {
    await delay(i * 800);
    const call = { ...chaosCalls[i], timestamp: new Date().toISOString() };
    processCall(call); // don't await — fire concurrently
  }
  
  setTimeout(() => {
    setChaosMode(false);
    sendToAll('chaos_end', {});
  }, 5000);
  
  res.json({ success: true });
});

app.post('/api/pause', (req, res) => {
  setPaused(true);
  res.json({ paused: true });
});

app.post('/api/resume', (req, res) => {
  setPaused(false);
  res.json({ paused: false });
});

app.post('/api/reset', (req, res) => {
  resetState();
  callIndex = 0;
  sendToAll('reset', getState());
  res.json({ success: true });
});

app.post('/api/resolve/:id', (req, res) => {
  resolveIncident(req.params.id);
  sendToAll('incident_resolved', { id: req.params.id });
  sendToAll('stats_update', { stats: getState().stats });
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`KAVACH.AI Server running on port ${PORT}`);
  console.log(`Anthropic key: ${process.env.ANTHROPIC_API_KEY ? 'SET' : 'MISSING'}`);
});
