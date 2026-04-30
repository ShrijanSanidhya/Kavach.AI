import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import { store, addLog } from './state/store.js';
import { triageEmergency, analyzeImage } from './agents/triageAgent.js';
import { processDispatch } from './agents/dispatchAgent.js';
import { chaosCalls } from './data/calls.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ── Serve Static Files (for production) ───────────────────────
const clientDistPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientDistPath));

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

// REST snapshot — returns current store state as plain JSON (TrackPage fallback)
app.get('/api/state-snapshot', (_, res) => res.json(store));

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
  const { transcript, imageBase64, mimeType, hasVideo, videoName, location } = req.body;
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
    let imageFailed = false;

    if (imageBase64 && mimeType) {
      addLog('TRIAGE', `👁 Running vision model on attached image…`);
      broadcastState();
      const visionResult = await analyzeImage(imageBase64, mimeType);
      imageAnalysis = visionResult.text;
      if (visionResult.success) {
        visualContext = `\n\nVISUAL EVIDENCE: ${imageAnalysis}`;
        addLog('TRIAGE', `👁 Vision: ${(imageAnalysis).slice(0, 60)}…`);
      } else {
        imageFailed = true;
        addLog('TRIAGE', `⚠ Vision analysis failed`);
      }
    } else if (hasVideo && videoName) {
      visualContext = `\n\nVIDEO ATTACHED: "${videoName}" — treat as confirmed visual evidence`;
      addLog('TRIAGE', `🎥 Video attachment noted: ${videoName}`);
    }

    // 2. Triage with enriched context
    const combinedTranscript = (transcript || 'Visual emergency report') + visualContext;
    const triage = await triageEmergency(combinedTranscript, location);

    // 3. Adjust accuracy based on vision result (AI handles its own user_messages now)
    if (imageBase64 && imageFailed) {
      triage.accuracy = Math.min(0.70, triage.accuracy); // lower accuracy
    } else if (imageBase64 && !imageFailed) {
      triage.accuracy = Math.min(0.97, triage.accuracy + 0.10);
    } else if (hasVideo) {
      triage.accuracy = Math.min(0.97, triage.accuracy + 0.10);
    }

    addLog('TRIAGE', `✓ ${triage.emergencyType} | Sev: ${triage.severity} | Acc: ${Math.round(triage.accuracy * 100)}%`);

    if (triage.accuracy >= 0.85) {
      const dispatch = processDispatch(triage, transcript || 'Visual report', triage.location);
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
  const { transcript, location } = req.body;
  if (!transcript) return res.status(400).json({ error: 'Missing' });

  addLog('TRIAGE', `💬 Follow-up received: "${transcript.slice(0, 40)}…"`);
  const triage = await triageEmergency(transcript, location);
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

// ── TTS Proxy ── serves Google Translate TTS audio server-side (no CORS issues)
app.get('/api/speak', async (req, res) => {
  const text = req.query.text;
  if (!text) return res.status(400).json({ error: 'Missing text' });
  try {
    const url = `https://translate.googleapis.com/translate_tts?client=gtx&ie=UTF-8&tl=en&q=${encodeURIComponent(text.slice(0, 200))}`;
    const r = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; KAVACH/1.0)' }
    });
    if (!r.ok) throw new Error(`TTS upstream ${r.status}`);
    const buf = await r.arrayBuffer();
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.send(Buffer.from(buf));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Network-based location fallback via Google Geolocation API
// Proxied server-side so the API key stays secret
app.post('/api/geolocate', async (req, res) => {
  const key = process.env.GOOGLE_API_KEY;
  if (!key) return res.status(503).json({ error: 'Google API key not configured' });
  try {
    const r = await fetch(
      `https://www.googleapis.com/geolocation/v1/geolocate?key=${key}`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ considerIp: true }) }
    );
    const data = await r.json();
    if (!r.ok) return res.status(r.status).json({ error: data?.error?.message || 'Geolocation failed' });
    return res.json({
      lat: data.location?.lat,
      lng: data.location?.lng,
      accuracy: data.accuracy,
      source: 'network'
    });
  } catch (e) {
    return res.status(500).json({ error: e.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`✅ KAVACH server on http://localhost:${PORT}`));

// Catch-all to serve index.html for React Router (Express 5 compatible)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'));
});
