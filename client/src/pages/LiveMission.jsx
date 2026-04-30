import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, CircleMarker, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useHybridLocation } from '../hooks/useHybridLocation';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ── Domain config ─────────────────────────────────────────────────────────
const DOMAINS = {
  fire:     { emoji:'🔥', color:'#ef4444', label:'FIRE EMERGENCY',    unit:'🚒', tip:'Stay low, cover mouth, move away from building.' },
  medical:  { emoji:'🚑', color:'#22c55e', label:'MEDICAL EMERGENCY', unit:'🏥', tip:'Keep patient still, clear airway, stay on the line.' },
  accident: { emoji:'🚑', color:'#22c55e', label:'ACCIDENT',          unit:'🏥', tip:'Do not move injured persons, keep them warm and still.' },
  hazmat:   { emoji:'☣️', color:'#eab308', label:'HAZMAT INCIDENT',   unit:'🧪', tip:'Move upwind, do not touch chemicals, cover nose.' },
  flood:    { emoji:'🌊', color:'#3b82f6', label:'FLOOD DISASTER',    unit:'🚁', tip:'Move to high ground immediately, avoid flowing water.' },
  disaster: { emoji:'🏚', color:'#f97316', label:'DISASTER RESPONSE', unit:'🚁', tip:'Stay away from unstable structures. Signal rescuers.' },
  swat:     { emoji:'🛡️', color:'#a855f7', label:'SECURITY THREAT',   unit:'🚔', tip:'Stay inside, away from windows. Follow police orders.' },
  crime:    { emoji:'🚔', color:'#6366f1', label:'CRIME RESPONSE',    unit:'🚓', tip:'Move to safety, do not confront. Stay on the line.' },
  default:  { emoji:'🚨', color:'#c62828', label:'EMERGENCY',         unit:'🚨', tip:'Follow dispatcher instructions. Help is on the way.' },
};

function getDomain(type = '', resource = '') {
  const t = (type + ' ' + resource).toLowerCase();
  if (/fire|explo/.test(t)) return DOMAINS.fire;
  if (/medic|ambul|cpr|cardiac|accident/.test(t)) return DOMAINS.medical;
  if (/hazmat|chemical|gas|toxic/.test(t)) return DOMAINS.hazmat;
  if (/flood|ndrf|disaster|quake|collapse/.test(t)) return DOMAINS.disaster;
  if (/swat|terror|bomb|hostage/.test(t)) return DOMAINS.swat;
  if (/crime|police/.test(t)) return DOMAINS.crime;
  return DOMAINS.default;
}

// ── Map helpers ───────────────────────────────────────────────────────────
function MapFly({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, 16, { duration: 1.5 }); }, [center]);
  return null;
}

function makePin(color, emoji) {
  return L.divIcon({
    html: `<div style="
      width:40px;height:40px;border-radius:50%;
      background:${color}22;border:2.5px solid ${color};
      display:flex;align-items:center;justify-content:center;font-size:20px;
      box-shadow:0 0 20px ${color}99;animation:livePulse 2s ease-in-out infinite;
    ">${emoji}</div>`,
    className: '', iconSize: [40, 40], iconAnchor: [20, 20],
  });
}

// ── Format helpers ────────────────────────────────────────────────────────
const fmt = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

export default function LiveMission() {
  const { incidentId } = useParams();
  const [incident, setIncident] = useState(null);
  const [secs, setSecs] = useState(480);
  const [progress, setProgress] = useState(0);
  const [tab, setTab] = useState('status'); // 'status' | 'map'
  const esRef = useRef(null);
  const loc = useHybridLocation();
  const userLoc = loc ? [loc.lat, loc.lng] : null;

  // SSE + REST fallback
  useEffect(() => {
    const apply = (data) => {
      const found = data.incidents?.find(i => i.id === incidentId || i.seqId == incidentId);
      if (found) {
        setIncident(found);
        setSecs(prev => prev === 480 && found.etaMinutes ? found.etaMinutes * 60 : prev);
      }
    };
    fetch(`${API}/api/state-snapshot`).then(r => r.json()).then(apply).catch(() => {});
    const es = new EventSource(`${API}/api/state`);
    es.onmessage = e => { try { apply(JSON.parse(e.data)); } catch {} };
    es.onerror = () => es.close();
    esRef.current = es;
    return () => es.close();
  }, [incidentId]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecs(s => Math.max(0, s - 1));
      setProgress(p => Math.min(98, p + 100 / 480));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const d = getDomain(incident?.emergencyType, incident?.resourceNeeded);
  const incLoc = incident?.location;
  const mapCenter = incLoc || userLoc || [28.98, 77.05];
  const totalSecs = (incident?.etaMinutes || 8) * 60;
  const arrival = fmt(secs);
  const C = { bg: '#0d0d0d', bg1: '#161616', bg2: '#1e1e1e', border: '#272727', text: '#f1f1f1', muted: '#6b7280' };

  return (
    <div style={{ height: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', fontFamily: "'Inter', sans-serif", overflow: 'hidden' }}>

      {/* ── TOPBAR ── */}
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 20px', borderBottom: `1px solid ${C.border}`, background: C.bg1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, boxShadow: `0 0 10px ${d.color}`, animation: 'liveDot 1.2s infinite' }} />
          <span style={{ fontWeight: 900, fontSize: 13, letterSpacing: '0.14em' }}>KAVACH</span>
          <span style={{ color: C.muted, fontSize: 11 }}>/ LIVE MISSION</span>
          <span style={{ background: `${d.color}18`, border: `1px solid ${d.color}44`, borderRadius: 20, padding: '2px 12px', fontSize: 11, fontWeight: 700, color: d.color }}>
            {d.emoji} {d.label}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* Mobile toggle */}
          <div style={{ display: 'flex', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 8, padding: 2 }}>
            {[['status', '📋 Status'], ['map', '🗺 Map']].map(([v, lbl]) => (
              <button key={v} onClick={() => setTab(v)} style={{
                padding: '5px 12px', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700,
                background: tab === v ? d.color : 'transparent', color: tab === v ? '#fff' : C.muted, transition: 'all 0.2s',
              }}>{lbl}</button>
            ))}
          </div>
          <Link to="/command" style={{ color: C.muted, fontSize: 11, textDecoration: 'none', border: `1px solid ${C.border}`, padding: '5px 12px', borderRadius: 6 }}>Command →</Link>
        </div>
      </div>

      {/* ── HERO STRIP ── */}
      <div style={{ flexShrink: 0, padding: '10px 20px', background: `linear-gradient(90deg, ${d.color}0a, transparent)`, borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', gap: 24 }}>
        {/* Vehicle track */}
        <div style={{ flex: 1, position: 'relative', height: 48, display: 'flex', alignItems: 'center' }}>
          <div style={{ position: 'absolute', width: '100%', height: 3, background: C.bg2, borderRadius: 2 }} />
          <div style={{ position: 'absolute', width: `${Math.min(95, progress)}%`, height: 3, background: `linear-gradient(90deg, transparent, ${d.color})`, borderRadius: 2, transition: 'width 1s linear' }} />
          <div style={{ position: 'absolute', left: `${Math.min(93, progress)}%`, transition: 'left 1s linear', transform: 'translateX(-50%)' }}>
            <span style={{ fontSize: 30, filter: `drop-shadow(0 0 10px ${d.color})`, display: 'block', transform: 'scaleX(-1)' }}>{d.unit}</span>
          </div>
          <div style={{ position: 'absolute', right: 0, fontSize: 24, animation: 'bounce 2s ease-in-out infinite' }}>📍</div>
        </div>

        {/* ETA + unit */}
        <div style={{ flexShrink: 0, textAlign: 'right' }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: '0.16em', fontWeight: 700 }}>T-MINUS</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: d.color, fontFamily: 'monospace', lineHeight: 1, textShadow: `0 0 20px ${d.color}66` }}>{arrival}</div>
          <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{incident?.assignedResource || 'Dispatching…'}</div>
        </div>
      </div>

      {/* ── MAIN BODY ── */}
      <div style={{
        flex: 1,
        display: 'grid',
        // Map tab → map is 3x bigger than status; Status tab → status is 2x bigger than map
        gridTemplateColumns: tab === 'map' ? '3fr 1fr' : '1fr 2fr',
        transition: 'grid-template-columns 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
        minHeight: 0,
        overflow: 'hidden',
      }}>

        {/* LEFT — MAP panel */}
        <div style={{ position: 'relative', overflow: 'hidden' }}>
          <MapContainer center={mapCenter} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={false}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="CARTO" />
            {incLoc && <MapFly center={incLoc} />}
            {incLoc && (
              <>
                <Marker position={incLoc} icon={makePin(d.color, d.emoji)} />
                <CircleMarker center={incLoc} radius={50} pathOptions={{ color: d.color, fillColor: d.color, fillOpacity: 0.04, weight: 1, dashArray: '6 6' }} />
              </>
            )}
            {userLoc && (
              <>
                <Marker position={userLoc} icon={makePin('#3b82f6', '🔵')} />
                <CircleMarker center={userLoc} radius={Math.min(40, (loc?.accuracy || 50) / 2)} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.06, weight: 1 }} />
              </>
            )}
          </MapContainer>

          {/* Map badges */}
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {incLoc && <Badge color={d.color}>{d.emoji} INCIDENT</Badge>}
            {userLoc && <Badge color="#3b82f6">🔵 YOU · ±{Math.round(loc?.accuracy || 0)}m</Badge>}
          </div>

          {/* Progress bar overlay */}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: C.bg2, zIndex: 1000 }}>
            <div style={{ height: '100%', width: `${progress}%`, background: d.color, transition: 'width 1s linear' }} />
          </div>
        </div>

        {/* RIGHT — STATUS PANEL */}
        <div style={{ background: C.bg1, borderLeft: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* Incident identity */}
          <div style={{ padding: '16px 20px', borderBottom: `1px solid ${C.border}`, background: `${d.color}08` }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: '0.14em', fontWeight: 700, marginBottom: 4 }}>INCIDENT ID</div>
            <div style={{ fontSize: 10, fontFamily: 'monospace', color: C.muted, marginBottom: 10 }}>{incident?.id || incidentId}</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 3 }}>{d.emoji} {incident?.emergencyType?.toUpperCase() || '—'}</div>
            <div style={{ fontSize: 12, color: C.muted }}>📍 {incident?.locationName || 'Locating…'}</div>
          </div>

          {/* Scrollable info */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Status timeline */}
            <Section title="MISSION STATUS" color={d.color}>
              {[
                { label: 'SOS Received & Verified', done: true, icon: '✓' },
                { label: 'AI Triage Complete', done: !!incident, icon: '✓' },
                { label: `${d.unit} ${incident?.assignedResource || 'Unit'} Dispatched`, done: !!incident?.assignedResource, icon: '✓' },
                { label: 'Help Arriving', done: secs <= 60, icon: secs <= 60 ? '✓' : '…', live: true },
              ].map((s, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                    border: `2px solid ${s.done ? d.color : C.border}`,
                    background: s.done ? d.color : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#fff',
                  }}>{s.icon}</div>
                  <span style={{ fontSize: 13, color: s.done ? C.text : C.muted, flex: 1 }}>{s.label}</span>
                  {s.live && s.done && <span style={{ fontSize: 9, color: d.color, fontWeight: 700, animation: 'liveDot 1s infinite' }}>LIVE</span>}
                </div>
              ))}
            </Section>

            {/* Dispatch card */}
            <div style={{ background: `${d.color}10`, border: `1px solid ${d.color}33`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 9, color: d.color, letterSpacing: '0.14em', fontWeight: 700, marginBottom: 8 }}>UNIT DISPATCHED</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 36 }}>{d.unit}</span>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{incident?.assignedResource || 'Emergency Unit'}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>ETA: <strong style={{ color: d.color }}>{fmt(secs)}</strong></div>
                  <div style={{ fontSize: 11, color: C.muted }}>Severity: <strong style={{ color: d.color }}>{incident?.severity || '—'}</strong></div>
                </div>
              </div>
              {/* Progress bar */}
              <div style={{ marginTop: 12, height: 4, background: C.bg2, borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(100, (1 - secs / totalSecs) * 100)}%`, background: d.color, transition: 'width 1s linear', borderRadius: 2 }} />
              </div>
            </div>

            {/* AI telemetry */}
            <Section title="LIVE TELEMETRY" color={d.color}>
              {[
                ['Speed', `${65 + Math.floor(progress / 10)} km/h`],
                ['Crew', '4 personnel'],
                ['Equipment', 'Ready'],
                ['Signal', 'Strong'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: C.muted }}>{k}</span>
                  <span style={{ fontWeight: 700 }}>{v}</span>
                </div>
              ))}
            </Section>

            {/* Safety advisory */}
            <div style={{ background: 'rgba(255,80,80,0.06)', border: '1px solid rgba(255,80,80,0.2)', borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 9, color: '#ef4444', letterSpacing: '0.14em', fontWeight: 700, marginBottom: 8 }}>⚠ SAFETY ADVISORY</div>
              <div style={{ fontSize: 13, color: '#ccc', lineHeight: 1.7 }}>
                • {d.tip}<br />
                • Keep your phone audible for dispatcher calls.<br />
                • Clear a path for the response unit.
              </div>
            </div>

            {/* Location info */}
            {(incLoc || userLoc) && (
              <Section title="LOCATION" color={d.color}>
                {incLoc && <InfoRow label="Incident" value={`${incLoc[0].toFixed(5)}, ${incLoc[1].toFixed(5)}`} />}
                {userLoc && <InfoRow label="You (GPS)" value={`±${Math.round(loc?.accuracy || 0)}m accuracy`} />}
              </Section>
            )}
          </div>

          {/* Bottom action */}
          <div style={{ padding: '12px 20px', borderTop: `1px solid ${C.border}`, display: 'flex', gap: 10, flexShrink: 0 }}>
            <Link to="/" style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 8, background: C.bg2, border: `1px solid ${C.border}`, color: C.muted, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>← Home</Link>
            <Link to="/command" style={{ flex: 1, textAlign: 'center', padding: '10px', borderRadius: 8, background: d.color, border: 'none', color: '#fff', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Command →</Link>
          </div>
          </div>
        </div>{/* /right panel */}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
        @keyframes liveDot  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes livePulse{ 0%,100%{box-shadow:0 0 10px currentColor} 50%{box-shadow:0 0 24px currentColor} }
        @keyframes bounce   { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
        .leaflet-container { background:#0d0d0d !important; }
        .leaflet-control-zoom { display:none; }
        .leaflet-popup-content-wrapper { background:#1a1a1a;color:#f1f1f1;border:1px solid #333 }
        .leaflet-popup-tip { background:#1a1a1a }
        ::-webkit-scrollbar { width:4px } ::-webkit-scrollbar-track { background:transparent } ::-webkit-scrollbar-thumb { background:#333;border-radius:2px }
        @media (max-width:700px) { .desktop-map { display:none!important } }
      `}</style>
    </div>
  );
}

// ── Tiny helper components ─────────────────────────────────────────────────
function Badge({ color, children }) {
  return (
    <div style={{ background: 'rgba(13,13,13,0.88)', border: `1px solid ${color}44`, borderRadius: 6, padding: '4px 12px', fontSize: 10, color, fontWeight: 700, backdropFilter: 'blur(8px)', display: 'inline-block' }}>
      {children}
    </div>
  );
}

function Section({ title, color, children }) {
  return (
    <div style={{ background: '#1a1a1a', border: '1px solid #272727', borderRadius: 12, padding: '14px 16px' }}>
      <div style={{ fontSize: 9, color, letterSpacing: '0.14em', fontWeight: 700, marginBottom: 10 }}>{title}</div>
      {children}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6, color: '#9ca3af' }}>
      <span>{label}</span><span style={{ color: '#f1f1f1', fontWeight: 600 }}>{value}</span>
    </div>
  );
}
