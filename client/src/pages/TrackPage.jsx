import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API = 'https://kavach-ai-v1qn.onrender.com';

const C = {
  bg:'#141414', bg1:'#1c1c1c', bg2:'#242424', bg3:'#2e2e2e',
  border:'#333333',
  red:'#c62828',   // aesthetic deep crimson
  red2:'#b71c1c',
  redGlow:'rgba(198,40,40,0.35)',
  text:'#f5f5f5', muted:'#9e9e9e', dim:'#616161',
  amber:'#f57c00', orange:'#e64a19', gold:'#fbc02d', green:'#388e3c', greenBright:'#4caf50',
  cyan:'#1976d2'
};

// Shield icon component with aesthetic red + glow
function ShieldIcon({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ filter: `drop-shadow(0 0 4px ${C.redGlow})` }}>
      <path d="M12 1L3 5v6c0 5.55 3.82 10.74 9 12 5.18-1.26 9-6.45 9-12V5L12 1z"
        fill={C.red} />
      <path d="M12 3.18L5 6.6V11c0 4.52 3.02 8.76 7 9.93 3.98-1.17 7-5.41 7-9.93V6.6L12 3.18z"
        fill="rgba(255,255,255,0.07)" />
    </svg>
  );
}

const FIRE_DECISIONS = [
  { id:'d1', label:'Dispatch Fire Brigade', icon:'🚒', detail:'Nearest unit: FIRE-1 · ETA ~4 min', color:C.red },
  { id:'d2', label:'Alert Medical Standby', icon:'🚑', detail:'Ambulance on standby at incident perimeter', color:'C.red2' },
  { id:'d3', label:'Evacuate 300m Radius', icon:'⚠', detail:'Automated PA system alert triggered', color:C.red },
  { id:'d4', label:'Notify Gas Authority', icon:'🏭', detail:'Industrial zone detected — GAIL alerted', color:'C.red2' },
];

const MEDICAL_DECISIONS = [
  { id:'m1', label:'Dispatch Ambulance', icon:'🚑', detail:'Nearest AMB-2 · ETA ~3 min', color:C.red },
  { id:'m2', label:'Alert ER at AIIMS', icon:'🏥', detail:'Trauma bay reserved — code red', color:'C.red2' },
  { id:'m3', label:'CPR Guidance Active', icon:'💊', detail:'AI voice guide active for caller', color:C.red },
];

const POLICE_DECISIONS = [
  { id:'p1', label:'Dispatch Police Unit', icon:'🚓', detail:'POL-2 & POL-3 en route · ETA ~5 min', color:C.red },
  { id:'p2', label:'Roadblock Activated', icon:'🚧', detail:'Nearest junction sealed off', color:'C.red2' },
  { id:'p3', label:'Notify Control Room', icon:'📡', detail:'District HQ alerted via ERSS', color:C.red },
];

const getDecisions = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('fire') || t.includes('explosion')) return FIRE_DECISIONS;
  if (t.includes('medical') || t.includes('accident')) return MEDICAL_DECISIONS;
  return POLICE_DECISIONS;
};

const sevColor = (s) => s === 'HIGH' ? C.red : s === 'MEDIUM' ? C.red2 : 'C.red2';

export default function TrackPage() {
  const { incidentId } = useParams();
  const [incident, setIncident]   = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [revealIdx, setRevealIdx] = useState(0);
  const [etaTick, setEtaTick]    = useState(0);
  const [aiMsg, setAiMsg]        = useState('');
  const [phase, setPhase]        = useState('received'); // received → triaging → dispatched
  const [loadError, setLoadError] = useState(false);
  const esRef = useRef(null);
  const foundRef = useRef(false);

  const applyIncident = (found) => {
    if (!found) return;
    foundRef.current = true;
    setLoadError(false);
    setIncident(found);
    setDecisions(getDecisions(found.emergencyType));
    setPhase(found.status === 'dispatched' ? 'dispatched' : 'triaging');
  };

  // REST fallback — immediately fetch current state on mount
  useEffect(() => {
    const fetchOnce = async () => {
      try {
        const r = await fetch(`${API}/api/state-snapshot`);
        if (r.ok) {
          const s = await r.json();
          const found = s.incidents?.find(i => i.id === incidentId || i.seqId == incidentId);
          applyIncident(found);
        }
      } catch {}
    };
    // Give SSE 1.5s head-start, then fallback to REST
    const t = setTimeout(fetchOnce, 1500);
    return () => clearTimeout(t);
  }, [incidentId]);

  // SSE stream — primary real-time feed
  useEffect(() => {
    const connect = () => {
      const es = new EventSource(`${API}/api/state`);
      es.onmessage = (e) => {
        try {
          const s = JSON.parse(e.data);
          const found = s.incidents.find(i => i.id === incidentId || i.seqId == incidentId);
          if (found) applyIncident(found);
          else if (!foundRef.current && s.incidents !== undefined) {
            // SSE stream live but incident not found — show error
            setLoadError(true);
          }
        } catch {}
      };
      es.onerror = () => { es.close(); setTimeout(connect, 2000); };
      esRef.current = es;
    };
    connect();
    return () => esRef.current?.close();
  }, [incidentId]);

  // Reveal AI decisions one-by-one
  useEffect(() => {
    if (!decisions.length) return;
    setRevealIdx(0);
    const id = setInterval(() => setRevealIdx(p => { if (p >= decisions.length - 1) { clearInterval(id); return p; } return p + 1; }), 900);
    return () => clearInterval(id);
  }, [decisions.length]);

  // ETA countdown
  useEffect(() => {
    const id = setInterval(() => setEtaTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  // AI typing message
  useEffect(() => {
    if (!incident) return;
    const msgs = incident.emergencyType?.toLowerCase().includes('fire')
      ? ['Smoke density: HIGH · Wind NW 12kmh', 'Structural risk: ELEVATED', 'Flash-over probability: 34%', 'Nearest hydrant: 80m']
      : incident.emergencyType?.toLowerCase().includes('medical')
      ? ['Vitals risk: CRITICAL', 'Blood type match: unknown', 'Nearest hospital: 2.1km', 'Trauma team notified']
      : ['Area threat level: MEDIUM', 'Backup units: standby', 'CCTV feed: active', 'Cordon radius: 200m'];
    let i = 0;
    setAiMsg(msgs[0]);
    const id = setInterval(() => { i = (i + 1) % msgs.length; setAiMsg(msgs[i]); }, 2800);
    return () => clearInterval(id);
  }, [incident?.emergencyType]);

  const eta = incident?.etaMinutes ? Math.max(1, incident.etaMinutes - Math.floor(etaTick / 60)) : null;
  const acc = incident ? Math.round(incident.accuracy * 100) : 0;
  const sevCol = sevColor(incident?.severity);

  return (
    <div style={{ minHeight:'100vh', background:C.bg, color:C.text, display:'flex', flexDirection:'column', position:'relative', overflow:'hidden' }}>

      {/* NAV */}
      <nav style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 28px', borderBottom:`1px solid ${C.border}`, background:C.bg1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
            <ShieldIcon size={22} />
            <span style={{ fontWeight:900, fontSize:15, letterSpacing:'0.12em', color:C.text }}>KAVACH</span>
          </Link>
          <span style={{ color:C.muted, fontSize:12 }}>/ INCIDENT TRACKER</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:11, color:C.red, fontWeight:700, letterSpacing:'0.12em' }}>⬤ LIVE TRACKING</span>
          <Link to="/command" style={{ fontSize:12, color:C.muted, textDecoration:'none', border:`1px solid ${C.border}`, padding:'5px 12px', borderRadius:6 }}>Command Center →</Link>
        </div>
      </nav>

      {/* BODY */}
      {loadError && !incident && (
        <div style={{ padding:'40px 28px', textAlign:'center', color:C.muted, fontSize:14, animation:'fadeIn 0.4s ease' }}>
          <div style={{ fontSize:36, marginBottom:12 }}>📡</div>
          <div style={{ color:C.text, fontWeight:700, marginBottom:6 }}>Connecting to incident stream…</div>
          <div style={{ fontSize:12 }}>If this persists, the server may be waking up. Please wait a moment.</div>
        </div>
      )}
      {!incident && !loadError && (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:18, padding:40 }}>
          <div style={{ position:'relative', width:60, height:60 }}>
            <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`3px solid transparent`, borderTopColor:C.red, borderRightColor:C.red, animation:'spin 0.9s linear infinite' }} />
            <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'2px solid transparent', borderBottomColor:C.red2, animation:'spin 1.4s linear reverse infinite' }} />
          </div>
          <div style={{ color:C.muted, fontSize:13 }}>Connecting to incident <code style={{ color:C.red, fontFamily:'monospace' }}>{incidentId}</code>…</div>
        </div>
      )}
      {incident && <div style={{ position:'relative', zIndex:1, flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, padding:16, maxWidth:1100, margin:'0 auto', width:'100%' }}>

        {/* LEFT COL */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Incident Header */}
          <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', boxShadow:`0 0 20px rgba(0,0,0,0.3)` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:9, color:C.red, letterSpacing:'0.16em', fontWeight:700, marginBottom:4 }}>ALERT ID</div>
                <div style={{ fontSize:13, fontFamily:'monospace', color:C.text }}>{incident?.id || incidentId || '—'}</div>
              </div>
              {incident?.severity && (
                <div style={{ background:`${sevCol}22`, border:`1px solid ${sevCol}44`, borderRadius:6, padding:'4px 12px', fontSize:11, color:sevCol, fontWeight:800, letterSpacing:'0.1em' }}>
                  {incident.severity}
                </div>
              )}
            </div>
            <div style={{ fontSize:18, fontWeight:800, marginBottom:6, color:C.text }}>
              {incident?.emergencyType?.toUpperCase() || 'ANALYZING…'}
            </div>
            <div style={{ fontSize:13, color:C.muted, marginBottom:14 }}>{incident?.locationName || 'Locating…'}</div>

            {/* Progress steps */}
            {[
              { label:'SOS Received', done:true, active:false },
              { label:'AI Triage', done:phase !== 'received', active:phase === 'triaging' },
              { label:'Help Dispatched', done:phase === 'dispatched', active:false },
            ].map((s, i) => (
              <div key={i} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, border:`2px solid ${s.done ? C.red : s.active ? C.red : C.dim}`, background: s.done ? C.red : s.active ? `${C.red}33` : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, transition:'all 0.4s' }}>
                  {s.done ? '✓' : s.active ? <span style={{ width:6, height:6, borderRadius:'50%', background:C.red, display:'block', animation:'pulse 1s infinite' }} /> : ''}
                </div>
                <span style={{ fontSize:13, color: s.done ? C.text : s.active ? C.red : C.dim, fontWeight: s.active ? 700 : 400 }}>{s.label}</span>
                {s.active && <span style={{ fontSize:10, color:C.red, animation:'blink 1s infinite' }}>processing…</span>}
              </div>
            ))}
          </div>

          {/* AI Confidence */}
          <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 20px' }}>
            <div style={{ fontSize:9, color:C.red, letterSpacing:'0.16em', fontWeight:700, marginBottom:12 }}>AI TRIAGE CONFIDENCE</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:13, color:C.muted }}>Accuracy Score</span>
              <span style={{ fontSize:22, fontWeight:800, color: acc > 80 ? C.red : acc > 55 ? C.red2 : 'C.red2' }}>{acc}%</span>
            </div>
            <div style={{ height:6, background:'rgba(180,30,30,0.1)', borderRadius:3, overflow:'hidden', marginBottom:14 }}>
              <div style={{ height:'100%', width:`${acc}%`, background:`linear-gradient(90deg,${C.red2},${acc > 80 ? C.red : 'C.red2'})`, borderRadius:3, transition:'width 1s ease', boxShadow:`0 0 8px rgba(196,24,24,0.4)` }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px' }}>
              {[['Type', incident?.emergencyType], ['Resource', incident?.resourceNeeded], ['ETA', eta ? `${eta} min` : '—'], ['Calls', incident?.callCount || 1]].map(([k,v]) => (
                <div key={k}><div style={{ fontSize:9, color:C.dim, letterSpacing:'0.1em', marginBottom:2 }}>{k.toUpperCase()}</div><div style={{ fontSize:13, fontWeight:600, color:C.text }}>{v || '—'}</div></div>
              ))}
            </div>
          </div>

          {/* Live AI ticker */}
          <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:C.red, boxShadow:`0 0 8px ${C.red}`, animation:'pulse 1.2s infinite', flexShrink:0 }} />
            <div>
              <div style={{ fontSize:9, color:C.red, letterSpacing:'0.12em', fontWeight:700, marginBottom:3 }}>LIVE AI ANALYSIS</div>
              <div style={{ fontSize:12, color:C.text, fontFamily:'monospace' }}>{aiMsg || 'Awaiting incident data…'}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COL */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* AI Decision Engine */}
          <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:C.red, animation:'pulse 1.2s infinite', boxShadow:`0 0 6px ${C.red}` }} />
              <span style={{ fontSize:9, color:C.red, letterSpacing:'0.16em', fontWeight:700 }}>AI DECISION ENGINE</span>
            </div>
            {decisions.length === 0 && <div style={{ color:C.dim, fontSize:13 }}>Waiting for triage…</div>}
            {decisions.map((d, i) => (
              <div key={d.id} style={{ marginBottom:10, opacity: i <= revealIdx ? 1 : 0, transform: i <= revealIdx ? 'translateX(0)' : 'translateX(-12px)', transition:'all 0.4s ease', display:'flex', alignItems:'center', gap:12, background:`${d.color}10`, border:`1px solid ${d.color}33`, borderRadius:8, padding:'10px 14px' }}>
                <span style={{ fontSize:20 }}>{d.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:d.color, marginBottom:2 }}>{d.label}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{d.detail}</div>
                </div>
                {i <= revealIdx && <div style={{ marginLeft:'auto', fontSize:10, color:C.red, fontWeight:700, border:`1px solid ${C.red}44`, borderRadius:4, padding:'2px 6px' }}>✓ ACTIVE</div>}
              </div>
            ))}
          </div>

          {/* Map */}
          <div style={{ flex:1, minHeight:220, borderRadius:12, overflow:'hidden', border:`1px solid ${C.border}` }}>
            {incident?.location ? (
              <MapContainer center={incident.location} zoom={14} style={{ height:'100%', minHeight:220, width:'100%' }} zoomControl={false}>
                <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="CARTO" />
                <CircleMarker center={incident.location} radius={14} pathOptions={{ color:sevCol, fillColor:sevCol, fillOpacity:0.5, weight:2 }} />
                <CircleMarker center={incident.location} radius={28} pathOptions={{ color:sevCol, fillColor:'transparent', weight:1, opacity:0.3 }} />
              </MapContainer>
            ) : (
              <div style={{ height:220, background:C.bg2, display:'flex', alignItems:'center', justifyContent:'center', color:C.dim, fontSize:13 }}>Acquiring GPS coordinates…</div>
            )}
          </div>

          {/* ETA Panel */}
          {incident?.assignedResource && (
            <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 20px', textAlign:'center', boxShadow:`0 0 20px rgba(0,0,0,0.3)` }}>
              <div style={{ fontSize:9, color:C.red, letterSpacing:'0.16em', fontWeight:700, marginBottom:6 }}>UNIT DISPATCHED</div>
              <div style={{ fontSize:28, fontWeight:900, color:C.text, marginBottom:4 }}>{incident.assignedResource}</div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:10 }}>Estimated Arrival</div>
              <div style={{ fontSize:42, fontWeight:900, color:eta <= 2 ? C.red : C.red, fontFamily:'monospace', marginBottom:4 }}>{eta ?? '—'}<span style={{ fontSize:16, fontWeight:400, marginLeft:4 }}>min</span></div>
              <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                <div style={{ height:'100%', width:`${Math.min(100, (etaTick / ((incident.etaMinutes || 5) * 60)) * 100)}%`, background:C.red, borderRadius:2, transition:'width 1s linear' }} />
              </div>
            </div>
          )}
        </div>
      </div>}

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        .leaflet-container { background:#141414 !important; }
        .leaflet-control-zoom { display:none; }
      `}</style>
    </div>
  );
}
