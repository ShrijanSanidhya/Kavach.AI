import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useHybridLocation } from '../hooks/useHybridLocation';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const C = {
  bg:'#141414', bg1:'#1c1c1c', bg2:'#242424', bg3:'#2e2e2e',
  border:'#333333',
  text:'#f5f5f5', muted:'#9e9e9e', dim:'#616161',
};

// ── Domain config ────────────────────────────────────────────────────────
const DOMAIN_CONFIG = {
  fire:     { emoji:'🔥', color:'#ef4444', bg:'rgba(239,68,68,0.12)',    label:'FIRE EMERGENCY',     unit:'Fire Brigade',  unitEmoji:'🚒' },
  medical:  { emoji:'🚑', color:'#22c55e', bg:'rgba(34,197,94,0.12)',    label:'MEDICAL EMERGENCY',  unit:'Ambulance',     unitEmoji:'🏥' },
  accident: { emoji:'🚑', color:'#22c55e', bg:'rgba(34,197,94,0.12)',    label:'ACCIDENT',           unit:'Ambulance',     unitEmoji:'🏥' },
  hazmat:   { emoji:'☣️', color:'#eab308', bg:'rgba(234,179,8,0.12)',    label:'HAZMAT INCIDENT',    unit:'HAZMAT Team',   unitEmoji:'🧪' },
  flood:    { emoji:'🌊', color:'#3b82f6', bg:'rgba(59,130,246,0.12)',   label:'FLOOD DISASTER',     unit:'NDRF',          unitEmoji:'🚁' },
  disaster: { emoji:'🏚', color:'#f97316', bg:'rgba(249,115,22,0.12)',   label:'DISASTER RESPONSE',  unit:'NDRF Team',     unitEmoji:'🚁' },
  swat:     { emoji:'🛡️', color:'#a855f7', bg:'rgba(168,85,247,0.12)',   label:'SECURITY THREAT',    unit:'SWAT Unit',     unitEmoji:'🚔' },
  crime:    { emoji:'🚔', color:'#6366f1', bg:'rgba(99,102,241,0.12)',   label:'CRIME IN PROGRESS',  unit:'Police',        unitEmoji:'🚓' },
  default:  { emoji:'🚨', color:'#c62828', bg:'rgba(198,40,40,0.12)',    label:'EMERGENCY',          unit:'Response Unit', unitEmoji:'🚨' },
};

const DECISIONS = {
  fire: [
    { label:'Fire Brigade Dispatched', icon:'🚒', detail:'Nearest unit en route with full suppression kit' },
    { label:'Ambulance on Standby', icon:'🚑', detail:'Medical team staged at 300m perimeter' },
    { label:'Evacuation Zone Active', icon:'⚠️', detail:'300m radius alert broadcast to all nearby phones' },
    { label:'Gas Authority Notified', icon:'🏭', detail:'GAIL emergency line alerted for utility shutoff' },
  ],
  medical: [
    { label:'Ambulance Dispatched', icon:'🚑', detail:'Paramedic team with AED and trauma kit en route' },
    { label:'ER Pre-Alerted', icon:'🏥', detail:'Nearest hospital trauma bay reserved — code red' },
    { label:'CPR Guidance Active', icon:'💊', detail:'AI voice guide instructing caller in real-time' },
  ],
  hazmat: [
    { label:'HAZMAT Team Dispatched', icon:'☣️', detail:'Full chemical response team with Level-A suits' },
    { label:'Evacuation 500m', icon:'⚠️', detail:'Upwind evacuation corridor established' },
    { label:'Fire Brigade Support', icon:'🚒', detail:'Decontamination unit staged at perimeter' },
    { label:'Environment Agency Alert', icon:'🌿', detail:'Spill containment authority notified' },
  ],
  disaster: [
    { label:'NDRF Team Mobilized', icon:'🚁', detail:'National Disaster Response Force dispatched' },
    { label:'Search & Rescue Active', icon:'🔦', detail:'K9 units and thermal cameras deployed' },
    { label:'Medical Field Camp', icon:'🏕️', detail:'Forward aid station established 500m out' },
    { label:'Structural Engineers', icon:'🏗️', detail:'Building assessment team en route' },
  ],
  police: [
    { label:'Police Unit Dispatched', icon:'🚓', detail:'2 patrol units + backup en route' },
    { label:'Perimeter Established', icon:'🚧', detail:'Nearest junction sealed for civilian safety' },
    { label:'Control Room Notified', icon:'📡', detail:'District HQ alerted via ERSS system' },
  ],
};

function getConfig(type = '', resource = '') {
  const t = (type + ' ' + resource).toLowerCase();
  if (/fire|explo|blast/.test(t)) return { ...DOMAIN_CONFIG.fire, decisions: DECISIONS.fire };
  if (/medic|ambul|hospital|cpr|cardiac|accident/.test(t)) return { ...DOMAIN_CONFIG.medical, decisions: DECISIONS.medical };
  if (/hazmat|chemical|gas|toxic|spill/.test(t)) return { ...DOMAIN_CONFIG.hazmat, decisions: DECISIONS.hazmat };
  if (/flood|ndrf|disaster|earthquake|landslide|collapse|quake/.test(t)) return { ...DOMAIN_CONFIG.disaster, decisions: DECISIONS.disaster };
  if (/swat|terror|bomb|hostage|shooter/.test(t)) return { ...DOMAIN_CONFIG.swat, decisions: DECISIONS.police };
  if (/police|crime/.test(t)) return { ...DOMAIN_CONFIG.crime, decisions: DECISIONS.police };
  return { ...DOMAIN_CONFIG.default, decisions: DECISIONS.police };
}

const AI_MSGS = {
  fire:    ['Smoke density: HIGH · Wind NW 12kmh', 'Structural risk: ELEVATED', 'Flash-over probability: 34%', 'Nearest hydrant: 80m'],
  medical: ['Vitals risk: CRITICAL', 'Nearest hospital: 2.1km', 'Trauma team notified', 'Blood type: unknown — universal ready'],
  hazmat:  ['Wind direction: NE 8kmh', 'Contamination radius: 200m', 'Chemical identifier: unknown', 'MSDS lookup: in progress'],
  default: ['Area threat level: MEDIUM', 'Backup units: standby', 'CCTV feed: active', 'Cordon radius: 200m'],
};

function getAiMsgs(type = '') {
  const t = type.toLowerCase();
  if (/fire/.test(t)) return AI_MSGS.fire;
  if (/medic|accident/.test(t)) return AI_MSGS.medical;
  if (/hazmat|chemical/.test(t)) return AI_MSGS.hazmat;
  return AI_MSGS.default;
}

function ShieldIcon({ size = 22, color = '#c62828' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ filter: `drop-shadow(0 0 4px ${color}66)` }}>
      <path d="M12 1L3 5v6c0 5.55 3.82 10.74 9 12 5.18-1.26 9-6.45 9-12V5L12 1z" fill={color} />
      <path d="M12 3.18L5 6.6V11c0 4.52 3.02 8.76 7 9.93 3.98-1.17 7-5.41 7-9.93V6.6L12 3.18z"
        fill="rgba(255,255,255,0.07)" />
    </svg>
  );
}

function MapRecenter({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.setView(center, 16, { animate: true }); }, [center]);
  return null;
}

function buildMarker(color, emoji) {
  const html = `<div style="
    width:36px;height:36px;border-radius:50%;
    background:${color}22;border:2px solid ${color};
    display:flex;align-items:center;justify-content:center;
    font-size:18px;box-shadow:0 0 16px ${color}88;
    animation:trackPulse 2s ease-in-out infinite;
  ">${emoji}</div>`;
  return L.divIcon({ html, className: '', iconSize: [36, 36], iconAnchor: [18, 18] });
}

// ── Toggle Switch ─────────────────────────────────────────────────────────
function ViewToggle({ value, onChange, color }) {
  return (
    <div style={{ display: 'flex', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 10, padding: 3, gap: 3 }}>
      {[['map', '🗺 Map'], ['info', '📋 Instructions']].map(([v, label]) => (
        <button key={v} onClick={() => onChange(v)} style={{
          padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700,
          background: value === v ? color : 'transparent',
          color: value === v ? '#fff' : C.muted,
          transition: 'all 0.2s',
        }}>{label}</button>
      ))}
    </div>
  );
}

export default function TrackPage() {
  const { incidentId } = useParams();
  const [incident, setIncident] = useState(null);
  const [revealIdx, setRevealIdx]   = useState(0);
  const [etaTick, setEtaTick]       = useState(0);
  const [aiMsg, setAiMsg]           = useState('');
  const [phase, setPhase]           = useState('received');
  const [loadError, setLoadError]   = useState(false);
  const [view, setView]             = useState('map'); // 'map' | 'info'
  const esRef   = useRef(null);
  const foundRef = useRef(false);

  const loc = useHybridLocation();
  const userLoc     = loc ? { lat: loc.lat, lng: loc.lng } : null;
  const locAccuracy = loc?.accuracy ?? null;

  const cfg = incident ? getConfig(incident.emergencyType, incident.resourceNeeded) : getConfig();

  const applyIncident = (found) => {
    if (!found) return;
    foundRef.current = true;
    setLoadError(false);
    setIncident(found);
    setPhase(found.status === 'dispatched' ? 'dispatched' : 'triaging');
  };

  useEffect(() => {
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`${API}/api/state-snapshot`);
        if (r.ok) {
          const s = await r.json();
          applyIncident(s.incidents?.find(i => i.id === incidentId || i.seqId == incidentId));
        }
      } catch {}
    }, 1500);
    return () => clearTimeout(t);
  }, [incidentId]);

  useEffect(() => {
    const connect = () => {
      const es = new EventSource(`${API}/api/state`);
      es.onmessage = (e) => {
        try {
          const s = JSON.parse(e.data);
          const found = s.incidents.find(i => i.id === incidentId || i.seqId == incidentId);
          if (found) applyIncident(found);
          else if (!foundRef.current) setLoadError(true);
        } catch {}
      };
      es.onerror = () => { es.close(); setTimeout(connect, 2000); };
      esRef.current = es;
    };
    connect();
    return () => esRef.current?.close();
  }, [incidentId]);

  useEffect(() => {
    if (!cfg.decisions?.length) return;
    setRevealIdx(0);
    const id = setInterval(() => setRevealIdx(p => {
      if (p >= cfg.decisions.length - 1) { clearInterval(id); return p; } return p + 1;
    }), 900);
    return () => clearInterval(id);
  }, [cfg.decisions?.length]);

  useEffect(() => {
    const id = setInterval(() => setEtaTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!incident) return;
    const msgs = getAiMsgs(incident.emergencyType || '');
    let i = 0;
    setAiMsg(msgs[0]);
    const id = setInterval(() => { i = (i + 1) % msgs.length; setAiMsg(msgs[i]); }, 2800);
    return () => clearInterval(id);
  }, [incident?.emergencyType]);

  const eta    = incident?.etaMinutes ? Math.max(1, incident.etaMinutes - Math.floor(etaTick / 60)) : null;
  const acc    = incident ? Math.round(incident.accuracy * 100) : 0;
  const color  = cfg.color;

  const incidentCenter = incident?.location;
  const mapCenter = incidentCenter || (userLoc ? [userLoc.lat, userLoc.lng] : [28.98, 77.05]);

  return (
    <div style={{ height: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* NAV */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 20px', borderBottom:`1px solid ${C.border}`, background: C.bg1, flexShrink: 0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
            <ShieldIcon size={22} color={color} />
            <span style={{ fontWeight:900, fontSize:14, letterSpacing:'0.12em', color: C.text }}>KAVACH</span>
          </Link>
          <span style={{ color: C.muted, fontSize:11 }}>/ LIVE TRACKER</span>
          <span style={{ background:`${color}22`, border:`1px solid ${color}44`, borderRadius:6, padding:'2px 10px', fontSize:10, color, fontWeight:800 }}>
            {cfg.emoji} {cfg.label}
          </span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <ViewToggle value={view} onChange={setView} color={color} />
          <span style={{ fontSize:11, color, fontWeight:700, letterSpacing:'0.10em' }}>⬤ LIVE</span>
          <Link to="/command" style={{ fontSize:11, color:C.muted, textDecoration:'none', border:`1px solid ${C.border}`, padding:'5px 10px', borderRadius:6 }}>Command →</Link>
        </div>
      </nav>

      {/* LOADING */}
      {!incident && !loadError && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:16 }}>
          <div style={{ position:'relative', width:56, height:56 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:'3px solid transparent', borderTopColor:color, borderRightColor:color, animation:'spin 0.9s linear infinite' }} />
          </div>
          <div style={{ color:C.muted, fontSize:13 }}>Connecting to incident <code style={{ color, fontFamily:'monospace' }}>{incidentId}</code>…</div>
        </div>
      )}

      {incident && (
        <div style={{ flex:1, display:'grid', gridTemplateColumns:'300px 1fr', gap:0, overflow:'hidden', minHeight:0 }}>

          {/* LEFT SIDEBAR */}
          <div style={{ background:C.bg1, borderRight:`1px solid ${C.border}`, display:'flex', flexDirection:'column', overflow:'hidden' }}>

            {/* Incident header */}
            <div style={{ padding:'16px 18px', borderBottom:`1px solid ${C.border}`, background:`${color}08` }}>
              <div style={{ fontSize:9, color, letterSpacing:'0.16em', fontWeight:700, marginBottom:6 }}>ALERT ID</div>
              <div style={{ fontSize:11, fontFamily:'monospace', color:C.muted, marginBottom:10 }}>{incident?.id || incidentId}</div>
              <div style={{ fontSize:20, fontWeight:900, marginBottom:4 }}>{cfg.emoji} {incident.emergencyType?.toUpperCase()}</div>
              <div style={{ fontSize:12, color:C.muted, marginBottom:12 }}>📍 {incident.locationName || 'Locating…'}</div>

              {/* Steps */}
              {[
                { label:'SOS Received', done:true },
                { label:'AI Triage Complete', done:phase !== 'received' },
                { label:`${cfg.unitEmoji} Help Dispatched`, done:phase === 'dispatched' },
              ].map((s, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:7 }}>
                  <div style={{ width:18, height:18, borderRadius:'50%', flexShrink:0, border:`2px solid ${s.done ? color : C.dim}`, background:s.done ? color : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, color:'#fff' }}>
                    {s.done ? '✓' : ''}
                  </div>
                  <span style={{ fontSize:12, color:s.done ? C.text : C.dim }}>{s.label}</span>
                </div>
              ))}
            </div>

            {/* AI Confidence */}
            <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6 }}>
                <span style={{ fontSize:9, color, letterSpacing:'0.14em', fontWeight:700 }}>AI CONFIDENCE</span>
                <span style={{ fontSize:20, fontWeight:900, color }}>{acc}%</span>
              </div>
              <div style={{ height:5, background:'rgba(255,255,255,0.06)', borderRadius:3, overflow:'hidden', marginBottom:10 }}>
                <div style={{ height:'100%', width:`${acc}%`, background:`linear-gradient(90deg,${color}88,${color})`, borderRadius:3, transition:'width 1s ease', boxShadow:`0 0 8px ${color}66` }} />
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 14px' }}>
                {[['Resource', incident.resourceNeeded], ['ETA', eta ? `${eta} min` : '—'], ['Unit', incident.assignedResource], ['Reports', incident.callCount || 1]].map(([k,v]) => (
                  <div key={k}>
                    <div style={{ fontSize:9, color:C.dim, letterSpacing:'0.1em', marginBottom:1 }}>{k}</div>
                    <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{v || '—'}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* ETA Panel */}
            {incident.assignedResource && (
              <div style={{ padding:'14px 18px', borderBottom:`1px solid ${C.border}`, textAlign:'center' }}>
                <div style={{ fontSize:9, color, letterSpacing:'0.14em', fontWeight:700, marginBottom:4 }}>UNIT ARRIVING</div>
                <div style={{ fontSize:24, fontWeight:900, color, marginBottom:2 }}>{cfg.unitEmoji} {incident.assignedResource}</div>
                <div style={{ fontSize:38, fontWeight:900, fontFamily:'monospace', color, marginBottom:4 }}>
                  {eta ?? '—'}<span style={{ fontSize:14, fontWeight:400, marginLeft:4 }}>min</span>
                </div>
                <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                  <div style={{ height:'100%', width:`${Math.min(100, (etaTick / ((incident.etaMinutes || 5)*60))*100)}%`, background:color, borderRadius:2, transition:'width 1s linear' }} />
                </div>
              </div>
            )}

            {/* Live AI ticker */}
            <div style={{ padding:'12px 18px', display:'flex', alignItems:'center', gap:10 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:color, boxShadow:`0 0 8px ${color}`, animation:'pulse 1.2s infinite', flexShrink:0 }} />
              <div>
                <div style={{ fontSize:9, color, letterSpacing:'0.12em', fontWeight:700, marginBottom:2 }}>LIVE AI ANALYSIS</div>
                <div style={{ fontSize:11, color:C.text, fontFamily:'monospace' }}>{aiMsg || '…'}</div>
              </div>
            </div>
          </div>

          {/* RIGHT PANEL — MAP or INSTRUCTIONS */}
          <div style={{ display:'flex', flexDirection:'column', overflow:'hidden', minHeight:0 }}>

            {view === 'map' && (
              <div style={{ flex:1, position:'relative', minHeight:0 }}>
                <MapContainer center={mapCenter} zoom={15} style={{ height:'100%', width:'100%' }} zoomControl={false}>
                  <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="CARTO" />
                  {incidentCenter && <MapRecenter center={incidentCenter} />}

                  {/* Incident marker */}
                  {incidentCenter && (
                    <>
                      <Marker position={incidentCenter} icon={buildMarker(color, cfg.emoji)}>
                        <Popup><strong>{incident.emergencyType}</strong><br/>{incident.locationName}</Popup>
                      </Marker>
                      <CircleMarker center={incidentCenter} radius={40} pathOptions={{ color, fillColor:'transparent', weight:1, opacity:0.2, dashArray:'6 6' }} />
                    </>
                  )}

                  {/* User live location */}
                  {userLoc && (
                    <>
                      <Marker position={[userLoc.lat, userLoc.lng]} icon={buildMarker('#3b82f6', '🔵')}>
                        <Popup>Your location · ±{Math.round(locAccuracy||0)}m</Popup>
                      </Marker>
                      <CircleMarker center={[userLoc.lat, userLoc.lng]} radius={Math.min(40, (locAccuracy||50)/2)} pathOptions={{ color:'#3b82f6', fillColor:'#3b82f6', fillOpacity:0.08, weight:1 }} />
                    </>
                  )}
                </MapContainer>

                {/* Map legend overlay */}
                <div style={{ position:'absolute', bottom:14, left:14, zIndex:1000, display:'flex', flexDirection:'column', gap:5 }}>
                  {incidentCenter && <span style={{ background:'rgba(15,15,15,0.85)', border:`1px solid ${color}44`, borderRadius:6, padding:'3px 10px', fontSize:10, color, fontWeight:700, backdropFilter:'blur(6px)' }}>{cfg.emoji} {cfg.label}</span>}
                  {userLoc && <span style={{ background:'rgba(15,15,15,0.85)', border:'1px solid #3b82f644', borderRadius:6, padding:'3px 10px', fontSize:10, color:'#60a5fa', fontWeight:700, backdropFilter:'blur(6px)' }}>🔵 YOU · ±{Math.round(locAccuracy||0)}m</span>}
                </div>
              </div>
            )}

            {view === 'info' && (
              <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
                {/* AI Decisions */}
                <div style={{ marginBottom:24 }}>
                  <div style={{ fontSize:10, color, letterSpacing:'0.16em', fontWeight:700, marginBottom:14 }}>AI DECISION ENGINE</div>
                  {cfg.decisions?.map((d, i) => (
                    <div key={i} style={{
                      marginBottom:10, opacity:i <= revealIdx ? 1 : 0,
                      transform:i <= revealIdx ? 'translateX(0)' : 'translateX(-12px)',
                      transition:'all 0.4s ease',
                      background:`${color}0d`, border:`1px solid ${color}33`,
                      borderRadius:10, padding:'12px 16px',
                      display:'flex', alignItems:'center', gap:14,
                    }}>
                      <span style={{ fontSize:22 }}>{d.icon}</span>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color, marginBottom:3 }}>{d.label}</div>
                        <div style={{ fontSize:11, color:C.muted }}>{d.detail}</div>
                      </div>
                      {i <= revealIdx && <div style={{ marginLeft:'auto', fontSize:10, color, fontWeight:700, border:`1px solid ${color}44`, borderRadius:4, padding:'2px 7px' }}>✓ ACTIVE</div>}
                    </div>
                  ))}
                </div>

                {/* Survival Tips */}
                {incident.reasoning && (
                  <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 18px' }}>
                    <div style={{ fontSize:10, color, letterSpacing:'0.14em', fontWeight:700, marginBottom:10 }}>AI SURVIVAL INSTRUCTIONS</div>
                    <div style={{ fontSize:13, color:C.text, lineHeight:1.7 }}>{incident.reasoning?.replace('|', '—')}</div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes trackPulse { 0%,100%{box-shadow:0 0 8px currentColor} 50%{box-shadow:0 0 20px currentColor} }
        .leaflet-container { background:#141414 !important; }
        .leaflet-control-zoom { display:none; }
        .leaflet-popup-content-wrapper { background:#1c1c1c;color:#f5f5f5;border:1px solid #333 }
        .leaflet-popup-tip { background:#1c1c1c }
      `}</style>
    </div>
  );
}
