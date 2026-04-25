import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API = 'http://localhost:3001';

const C = {
  bg:'#080c14', bg1:'#0e1522', bg2:'#131d30', bg3:'#1a253c',
  border:'rgba(180,30,30,0.2)', red:'#c41818', red2:'#8b0f0f',
  amber:'#c4882a', text:'#e8e0d0', muted:'#7a6860', dim:'#4a3830',
  green:'#2a7a40', greenBright:'#3ab054',
};

const FIRE_DECISIONS = [
  { id:'d1', label:'Dispatch Fire Brigade', icon:'🚒', detail:'Nearest unit: FIRE-1 · ETA ~4 min', color:C.red },
  { id:'d2', label:'Alert Medical Standby', icon:'🚑', detail:'Ambulance on standby at incident perimeter', color:'#b86010' },
  { id:'d3', label:'Evacuate 300m Radius', icon:'⚠', detail:'Automated PA system alert triggered', color:C.amber },
  { id:'d4', label:'Notify Gas Authority', icon:'🏭', detail:'Industrial zone detected — GAIL alerted', color:'#6a4a20' },
];

const MEDICAL_DECISIONS = [
  { id:'m1', label:'Dispatch Ambulance', icon:'🚑', detail:'Nearest AMB-2 · ETA ~3 min', color:C.red },
  { id:'m2', label:'Alert ER at AIIMS', icon:'🏥', detail:'Trauma bay reserved — code red', color:'#b86010' },
  { id:'m3', label:'CPR Guidance Active', icon:'💊', detail:'AI voice guide active for caller', color:C.amber },
];

const POLICE_DECISIONS = [
  { id:'p1', label:'Dispatch Police Unit', icon:'🚓', detail:'POL-2 & POL-3 en route · ETA ~5 min', color:C.red },
  { id:'p2', label:'Roadblock Activated', icon:'🚧', detail:'Nearest junction sealed off', color:'#b86010' },
  { id:'p3', label:'Notify Control Room', icon:'📡', detail:'District HQ alerted via ERSS', color:C.amber },
];

const getDecisions = (type) => {
  const t = (type || '').toLowerCase();
  if (t.includes('fire') || t.includes('explosion')) return FIRE_DECISIONS;
  if (t.includes('medical') || t.includes('accident')) return MEDICAL_DECISIONS;
  return POLICE_DECISIONS;
};

const sevColor = (s) => s === 'HIGH' ? C.red : s === 'MEDIUM' ? '#c45010' : C.amber;

export default function TrackPage() {
  const { incidentId } = useParams();
  const [incident, setIncident]   = useState(null);
  const [decisions, setDecisions] = useState([]);
  const [revealIdx, setRevealIdx] = useState(0);
  const [etaTick, setEtaTick]    = useState(0);
  const [aiMsg, setAiMsg]        = useState('');
  const [phase, setPhase]        = useState('received'); // received → triaging → dispatched
  const esRef = useRef(null);

  // Pull from SSE state stream and find our incident
  useEffect(() => {
    const connect = () => {
      const es = new EventSource(`${API}/api/state`);
      es.onmessage = (e) => {
        try {
          const s = JSON.parse(e.data);
          const found = s.incidents.find(i => i.id === incidentId || i.seqId == incidentId);
          if (found) {
            setIncident(found);
            setDecisions(getDecisions(found.emergencyType));
            setPhase(found.status === 'dispatched' ? 'dispatched' : 'triaging');
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
      {/* bg blobs */}
      <div style={{ position:'fixed', top:'-15%', left:'-10%', width:'50%', height:'60%', borderRadius:'50%', background:'radial-gradient(circle,rgba(30,50,120,0.18),transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', top:'10%', right:'-5%', width:'35%', height:'45%', borderRadius:'50%', background:'radial-gradient(circle,rgba(180,20,20,0.14),transparent 70%)', pointerEvents:'none', zIndex:0 }} />
      <div style={{ position:'fixed', bottom:'0%', right:'5%', width:'30%', height:'40%', borderRadius:'50%', background:'radial-gradient(circle,rgba(140,20,20,0.1),transparent 70%)', pointerEvents:'none', zIndex:0 }} />

      {/* NAV */}
      <nav style={{ position:'relative', zIndex:10, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 28px', borderBottom:`1px solid ${C.border}`, background:'rgba(8,12,20,0.88)', backdropFilter:'blur(12px)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <Link to="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none' }}>
            <svg width={22} height={22} viewBox="0 0 24 24"><defs><linearGradient id="ng" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={C.amber}/><stop offset="100%" stopColor={C.red}/></linearGradient></defs><path fill="url(#ng)" d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5L12 1z"/></svg>
            <span style={{ fontWeight:800, fontSize:14, letterSpacing:'0.1em', color:C.text }}>KAVACH<span style={{ color:C.red }}>.AI</span></span>
          </Link>
          <span style={{ color:C.muted, fontSize:12 }}>/ INCIDENT TRACKER</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:16 }}>
          <span style={{ fontSize:11, color:C.amber, fontWeight:700, letterSpacing:'0.12em' }}>⬤ LIVE TRACKING</span>
          <Link to="/command" style={{ fontSize:12, color:C.muted, textDecoration:'none', border:`1px solid ${C.border}`, padding:'5px 12px', borderRadius:6 }}>Command Center →</Link>
        </div>
      </nav>

      {/* BODY */}
      <div style={{ position:'relative', zIndex:1, flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, padding:16, maxWidth:1100, margin:'0 auto', width:'100%' }}>

        {/* LEFT COL */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Incident Header */}
          <div style={{ background:'linear-gradient(160deg,rgba(14,21,34,0.97),rgba(26,12,12,0.95))', border:`1px solid ${C.border}`, borderRadius:12, padding:'18px 20px', boxShadow:`0 0 40px rgba(196,24,24,0.08)` }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
              <div>
                <div style={{ fontSize:9, color:C.amber, letterSpacing:'0.16em', fontWeight:700, marginBottom:4 }}>ALERT ID</div>
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
                <div style={{ width:20, height:20, borderRadius:'50%', flexShrink:0, border:`2px solid ${s.done ? C.greenBright : s.active ? C.red : C.dim}`, background: s.done ? C.greenBright : s.active ? `${C.red}33` : 'transparent', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, transition:'all 0.4s' }}>
                  {s.done ? '✓' : s.active ? <span style={{ width:6, height:6, borderRadius:'50%', background:C.red, display:'block', animation:'pulse 1s infinite' }} /> : ''}
                </div>
                <span style={{ fontSize:13, color: s.done ? C.text : s.active ? C.red : C.dim, fontWeight: s.active ? 700 : 400 }}>{s.label}</span>
                {s.active && <span style={{ fontSize:10, color:C.red, animation:'blink 1s infinite' }}>processing…</span>}
              </div>
            ))}
          </div>

          {/* AI Confidence */}
          <div style={{ background:'linear-gradient(160deg,rgba(14,21,34,0.97),rgba(26,12,12,0.95))', border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 20px' }}>
            <div style={{ fontSize:9, color:C.amber, letterSpacing:'0.16em', fontWeight:700, marginBottom:12 }}>AI TRIAGE CONFIDENCE</div>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
              <span style={{ fontSize:13, color:C.muted }}>Accuracy Score</span>
              <span style={{ fontSize:22, fontWeight:800, color: acc > 80 ? C.greenBright : acc > 55 ? C.amber : C.red }}>{acc}%</span>
            </div>
            <div style={{ height:6, background:'rgba(180,30,30,0.1)', borderRadius:3, overflow:'hidden', marginBottom:14 }}>
              <div style={{ height:'100%', width:`${acc}%`, background:`linear-gradient(90deg,${C.red},${acc > 80 ? C.greenBright : C.amber})`, borderRadius:3, transition:'width 1s ease', boxShadow:`0 0 8px rgba(196,24,24,0.4)` }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px' }}>
              {[['Type', incident?.emergencyType], ['Resource', incident?.resourceNeeded], ['ETA', eta ? `${eta} min` : '—'], ['Calls', incident?.callCount || 1]].map(([k,v]) => (
                <div key={k}><div style={{ fontSize:9, color:C.dim, letterSpacing:'0.1em', marginBottom:2 }}>{k.toUpperCase()}</div><div style={{ fontSize:13, fontWeight:600, color:C.text }}>{v || '—'}</div></div>
              ))}
            </div>
          </div>

          {/* Live AI ticker */}
          <div style={{ background:'linear-gradient(160deg,rgba(26,12,12,0.9),rgba(14,21,34,0.95))', border:`1px solid ${C.border}`, borderRadius:12, padding:'14px 18px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:8, height:8, borderRadius:'50%', background:C.red, boxShadow:`0 0 8px ${C.red}`, animation:'pulse 1.2s infinite', flexShrink:0 }} />
            <div>
              <div style={{ fontSize:9, color:C.amber, letterSpacing:'0.12em', fontWeight:700, marginBottom:3 }}>LIVE AI ANALYSIS</div>
              <div style={{ fontSize:12, color:C.text, fontFamily:'monospace' }}>{aiMsg || 'Awaiting incident data…'}</div>
            </div>
          </div>
        </div>

        {/* RIGHT COL */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* AI Decision Engine */}
          <div style={{ background:'linear-gradient(160deg,rgba(14,21,34,0.97),rgba(26,12,12,0.95))', border:`1px solid ${C.border}`, borderRadius:12, padding:'16px 20px' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:C.red, animation:'pulse 1.2s infinite', boxShadow:`0 0 6px ${C.red}` }} />
              <span style={{ fontSize:9, color:C.amber, letterSpacing:'0.16em', fontWeight:700 }}>AI DECISION ENGINE</span>
            </div>
            {decisions.length === 0 && <div style={{ color:C.dim, fontSize:13 }}>Waiting for triage…</div>}
            {decisions.map((d, i) => (
              <div key={d.id} style={{ marginBottom:10, opacity: i <= revealIdx ? 1 : 0, transform: i <= revealIdx ? 'translateX(0)' : 'translateX(-12px)', transition:'all 0.4s ease', display:'flex', alignItems:'center', gap:12, background:`${d.color}10`, border:`1px solid ${d.color}33`, borderRadius:8, padding:'10px 14px' }}>
                <span style={{ fontSize:20 }}>{d.icon}</span>
                <div>
                  <div style={{ fontSize:13, fontWeight:700, color:d.color, marginBottom:2 }}>{d.label}</div>
                  <div style={{ fontSize:11, color:C.muted }}>{d.detail}</div>
                </div>
                {i <= revealIdx && <div style={{ marginLeft:'auto', fontSize:10, color:C.greenBright, fontWeight:700, border:`1px solid ${C.greenBright}44`, borderRadius:4, padding:'2px 6px' }}>✓ ACTIVE</div>}
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
            <div style={{ background:`linear-gradient(135deg,${C.red2},rgba(14,21,34,0.97))`, border:`1px solid rgba(196,24,24,0.4)`, borderRadius:12, padding:'16px 20px', textAlign:'center', boxShadow:`0 0 30px rgba(196,24,24,0.15)` }}>
              <div style={{ fontSize:9, color:C.amber, letterSpacing:'0.16em', fontWeight:700, marginBottom:6 }}>UNIT DISPATCHED</div>
              <div style={{ fontSize:28, fontWeight:900, color:C.text, marginBottom:4 }}>{incident.assignedResource}</div>
              <div style={{ fontSize:13, color:C.muted, marginBottom:10 }}>Estimated Arrival</div>
              <div style={{ fontSize:42, fontWeight:900, color:eta <= 2 ? C.greenBright : C.red, fontFamily:'monospace', marginBottom:4 }}>{eta ?? '—'}<span style={{ fontSize:16, fontWeight:400, marginLeft:4 }}>min</span></div>
              <div style={{ height:3, background:'rgba(255,255,255,0.06)', borderRadius:2 }}>
                <div style={{ height:'100%', width:`${Math.min(100, (etaTick / ((incident.etaMinutes || 5) * 60)) * 100)}%`, background:C.red, borderRadius:2, transition:'width 1s linear' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)} to{opacity:1;transform:none} }
        .leaflet-container { background:#080c14 !important; }
        .leaflet-control-zoom { display:none; }
      `}</style>
    </div>
  );
}
