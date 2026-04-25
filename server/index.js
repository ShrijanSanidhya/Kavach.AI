import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { store, addLog } from './state/store.js';
import { triageEmergency, analyzeImage } from './agents/triageAgent.js';
import { processDispatch } from './agents/dispatchAgent.js';
import { chaosCalls } from './data/calls.js';

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json());

// ── SSE clients ──────────────────────────────────────────────
let sseClients = [];

const broadcastState = () => {
  const payload = `data: ${JSON.stringify(store)}\n\n`;
  sseClients = sseClients.filter(c => {
    try { c.res.write(payload); return true; }
    catch { return false; }
  });
};

setInterval(broadcastState, 1500);

// ── Routes ───────────────────────────────────────────────────

app.get('/health', (_, res) => res.json({ ok: true }));

// SSE stream
app.get('/api/state', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.flushHeaders();

  const client = { res };
  sseClients.push(client);
  res.write(`data: ${JSON.stringify(store)}\n\n`);

  req.on('close', () => {
    sseClients = sseClients.filter(c => c !== client);
  });
});

// SOS — single call triage + dispatch
app.post('/api/sos', async (req, res) => {
  const { transcript, imageBase64, mimeType, hasVideo, videoName } = req.body;
  if (!transcript?.trim() && !imageBase64 && !hasVideo) {
    return res.status(400).json({ error: 'No input provided' });
  }

  const t0 = Date.now();
  addLog('TRIAGE', `📞 New call received — analyzing…`);
  broadcastState();

  try {
    // 1. Run vision analysis if image attached
    let imageAnalysis = null;
    let visualContext = '';
    if (imageBase64 && mimeType) {
      addLog('TRIAGE', `👁 Running vision model on attached image…`);
      broadcastState();
      imageAnalysis = await analyzeImage(imageBase64, mimeType);
      visualContext = imageAnalysis ? `\n\nVISUAL EVIDENCE: ${imageAnalysis}` : '';
      addLog('TRIAGE', `👁 Vision: ${(imageAnalysis || 'no result').slice(0, 60)}…`);
    } else if (hasVideo && videoName) {
      visualContext = `\n\nVIDEO ATTACHED: "${videoName}" — treat as confirmed visual evidence`;
      addLog('TRIAGE', `🎥 Video attachment noted: ${videoName}`);
    }

    // 2. Triage with enriched context
    const combinedTranscript = (transcript || 'Visual emergency report') + visualContext;
    const triage = await triageEmergency(combinedTranscript);

    // 3. Boost accuracy if we have visual evidence
    if (imageBase64 || hasVideo) {
      triage.accuracy = Math.min(0.97, triage.accuracy + 0.10);
    }

    addLog('TRIAGE', `✓ ${triage.emergencyType} | Sev: ${triage.severity} | Acc: ${Math.round(triage.accuracy * 100)}%`);

    if (triage.accuracy >= 0.85) {
      const dispatch = processDispatch(triage, transcript || 'Visual report');
      const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
      store.stats.aiResponseTime = `${elapsed}s`;
      addLog('DISPATCH', `🚨 ${dispatch.status === 'merged' ? 'Duplicate merged' : `Dispatched ${dispatch.incident?.assignedResource || 'unit'}`}`);
      broadcastState();
      return res.json({ success: true, triage, dispatch, imageAnalysis });
    } else {
      addLog('TRIAGE', `⚠ Low confidence — follow-up required`);
      broadcastState();
      return res.json({ success: true, triage, dispatch: null, imageAnalysis });
    }
  } catch (err) {
    console.error('SOS error:', err);
    return res.status(500).json({ error: 'Processing failed', detail: err.message });
  }
});

// Follow-up answer
app.post('/api/followup', async (req, res) => {
  const { transcript } = req.body;
  if (!transcript) return res.status(400).json({ error: 'Missing' });

  addLog('TRIAGE', `💬 Follow-up received: "${transcript.slice(0, 40)}…"`);
  const triage = await triageEmergency(transcript);
  triage.accuracy = Math.min(1, triage.accuracy + 0.2); // boost from clarification

  const dispatch = processDispatch(triage, transcript);
  const elapsed = ((Date.now()) / 1000).toFixed(1);
  store.stats.aiResponseTime = `${elapsed}s`;
  broadcastState();
  return res.json({ success: true, triage, dispatch });
});

// Chaos mode
app.post('/api/chaos', async (req, res) => {
  addLog('SYSTEM', '🔴 MASS CASUALTY EVENT — chaos mode activated');
  broadcastState();
  res.json({ success: true });

  chaosCalls.forEach((call, i) => {
    setTimeout(async () => {
      addLog('TRIAGE', `⚡ Chaos call #${i + 1}: "${call.transcript.slice(0, 35)}…"`);
      broadcastState();
      try {
        const triage = await triageEmergency(call.transcript);
        triage.accuracy = 0.96;
        processDispatch(triage, call.transcript, [call.location.lat, call.location.lng]);
        broadcastState();
      } catch (e) {
        addLog('SYSTEM', `Error in chaos call ${i + 1}: ${e.message}`);
      }
    }, i * 1400);
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ KAVACH.AI server on http://localhost:${PORT}`));
