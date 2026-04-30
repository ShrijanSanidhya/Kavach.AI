import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

const C = {
  bg: '#0a0a0a', bg1: '#141414', bg2: '#1a1a1a', border: '#222',
  red: '#ff2d2d', green: '#00ff88', cyan: '#00d2ff',
  text: '#f5f5f5', muted: '#888'
};

export default function LiveMission() {
  const { incidentId } = useParams();
  const [progress, setProgress] = useState(0);
  const [incident, setIncident] = useState(null);
  const [seconds, setSeconds] = useState(480); // 8 minutes in seconds

  useEffect(() => {
    const fetchState = async () => {
      try {
        const r = await fetch(`${API}/api/state-snapshot`);
        const data = await r.json();
        const found = data.incidents.find(i => i.id === incidentId);
        if (found) {
          setIncident(found);
          if (found.etaMinutes) setSeconds(found.etaMinutes * 60);
        }
      } catch (e) { console.error(e); }
    };
    fetchState();
  }, [incidentId]);

  useEffect(() => {
    const id = setInterval(() => {
      setSeconds(s => Math.max(0, s - 1));
      setProgress(p => Math.min(100, p + (100 / 480))); // Smooth progress based on total time
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const getVehicle = () => {
    const type = incident?.emergencyType?.toLowerCase() || '';
    const res = incident?.assignedResource?.toLowerCase() || '';
    
    if (type.includes('fire') || res.includes('fire')) return "🚒";
    if (type.includes('police') || res.includes('crime') || res.includes('threat') || res.includes('swat') || res.includes('tactical')) return "🚓";
    if (type.includes('disaster') || type.includes('flood') || res.includes('ndrf')) return "🚁";
    if (type.includes('gas') || type.includes('chem') || res.includes('hazmat')) return "🚛";
    
    return "🚑"; // Default to Ambulance for medical/unknown
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', background: C.bg, color: C.text, display: 'flex', flexDirection: 'column', alignItems: 'center', fontFamily: 'Inter, sans-serif', padding: '40px 20px' }}>
      
      {/* HEADER */}
      <nav style={{ width: '100%', maxWidth: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 60 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 8, height: 8, background: C.red, borderRadius: '50%', animation: 'pulse 1.5s infinite' }} />
          <span style={{ fontWeight: 800, letterSpacing: '0.1em', fontSize: 13 }}>KAVACH LIVE</span>
        </div>
        <Link to="/command" style={{ color: C.muted, fontSize: 12, textDecoration: 'none', border: `1px solid ${C.border}`, padding: '6px 16px', borderRadius: 20 }}>Command Center →</Link>
      </nav>

      {/* ANIMATION BOX */}
      <div style={{ width: '100%', maxWidth: 800, background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 24, padding: '40px 30px', marginBottom: 30, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 15, left: 20, fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: '0.2em' }}>LIVE TRACKING FEED</div>
        
        <div style={{ textAlign: 'center', marginBottom: 40, marginTop: 10 }}>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: '#fff', margin: 0, letterSpacing: '-0.02em' }}>HELP IS ARRIVING</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 8 }}>Estimated reach: <span style={{ color: C.red, fontWeight: 700 }}>{incident?.locationName || 'Your Location'}</span></p>
          
          <div style={{ marginTop: 20, display: 'inline-block', background: 'rgba(255,45,45,0.1)', border: `1px solid ${C.red}33`, padding: '8px 24px', borderRadius: 12 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: C.muted, letterSpacing: '0.15em', marginRight: 10 }}>T-MINUS</span>
            <span style={{ fontSize: 28, fontWeight: 900, color: C.red, fontFamily: 'monospace', textShadow: `0 0 10px ${C.red}44` }}>
              {formatTime(seconds)}
            </span>
          </div>
        </div>
        
        <div style={{ position: 'relative', height: 100, display: 'flex', alignItems: 'center', padding: '0 40px' }}>
          {/* TRACK */}
          <div style={{ position: 'absolute', width: 'calc(100% - 80px)', height: 4, background: '#1a1a1a', borderRadius: 2, top: '50%', transform: 'translateY(-50%)' }} />
          <div style={{ position: 'absolute', width: `${(progress / 100) * (100 - 15)}%`, height: 4, background: `linear-gradient(90deg, transparent, ${C.red})`, top: '50%', transform: 'translateY(-50%)', transition: 'width 0.5s linear', borderRadius: 2 }} />
          
          {/* VEHICLE */}
          <div style={{ position: 'absolute', left: `${progress}%`, transform: 'translateX(-50%)', transition: 'left 0.5s linear', zIndex: 10 }}>
            <div style={{ fontSize: 54, filter: 'drop-shadow(0 0 15px rgba(255,45,45,0.5))', transform: 'scaleX(-1)' }}>{getVehicle()}</div>
            <div style={{ background: C.red, color: '#fff', fontSize: 8, fontWeight: 900, padding: '2px 6px', borderRadius: 4, marginTop: 5, letterSpacing: '0.1em' }}>LIVE</div>
          </div>

          {/* DESTINATION */}
          <div style={{ position: 'absolute', right: 40, transform: 'translateY(-50%)', top: '50%' }}>
            <div style={{ fontSize: 40, animation: 'bounce 2s infinite' }}>📍</div>
          </div>
        </div>
      </div>

      {/* DETAILED INFO CARDS */}
      <div style={{ width: '100%', maxWidth: 800, display: 'flex', flexDirection: 'column', gap: 20 }}>
        
        {/* BIG CARD: WHAT'S DISPATCHED */}
        <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 24, padding: 32, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 15 }}>MISSION DISPATCH DETAILS</div>
            <h2 style={{ fontSize: 24, fontWeight: 800, margin: '0 0 8px 0' }}>{incident?.assignedResource || 'EMERGENCY UNIT'}</h2>
            <p style={{ fontSize: 15, color: '#aaa', margin: 0, lineHeight: 1.6 }}>
              Primary unit <span style={{ color: '#fff', fontWeight: 600 }}>{incident?.assignedResource}</span> is en route. 
              {incident?.emergencyType?.toLowerCase().includes('fire') && " Support ambulance is on standby."}
            </p>
          </div>
          <div style={{ fontSize: 60, opacity: 0.2 }}>{getVehicle()}</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 20 }}>
          {/* WHAT'S GOING ON CARD */}
          <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 24, padding: 32 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 20 }}>WHAT'S GOING ON</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 6, height: 6, background: C.green, borderRadius: '50%' }} />
                <div style={{ fontSize: 14, color: '#eee' }}>Traffic signals cleared for priority passage</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 6, height: 6, background: C.green, borderRadius: '50%' }} />
                <div style={{ fontSize: 14, color: '#eee' }}>Nearest medical facilities on high alert</div>
              </div>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                <div style={{ width: 6, height: 6, background: C.cyan, borderRadius: '50%' }} />
                <div style={{ fontSize: 14, color: '#eee' }}>Real-time GPS tracking link established</div>
              </div>
            </div>
          </div>

          {/* RESPONDER VITALS CARD */}
          <div style={{ background: C.bg1, border: `1px solid ${C.border}`, borderRadius: 24, padding: 32 }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 20 }}>RESPONDER TELEMETRY</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
              <div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 5 }}>UNIT SPEED</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{Math.floor(65 + Math.random() * 15)} KM/H</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 5 }}>FUEL LEVEL</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: C.green }}>82%</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 5 }}>CREW SIZE</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>4 MEMBERS</div>
              </div>
              <div>
                <div style={{ fontSize: 10, color: C.muted, marginBottom: 5 }}>EQUIPMENT</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>READY</div>
              </div>
            </div>
          </div>
        </div>

        {/* BOTTOM ROW: SAFETY AND TIMER */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20 }}>
           {/* SAFETY PROTOCOLS */}
           <div style={{ background: 'rgba(255,45,45,0.03)', border: `1px solid ${C.red}22`, borderRadius: 24, padding: 32 }}>
              <div style={{ fontSize: 11, color: C.red, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 15 }}>IMMEDIATE SAFETY ADVISORY</div>
              <div style={{ fontSize: 14, color: '#aaa', lineHeight: 1.6 }}>
                • Maintain clear access for the {incident?.assignedResource}.<br/>
                • Do not attempt to move the injured party (if applicable).<br/>
                • Ensure your mobile is audible for AI Dispatcher calls.
              </div>
           </div>

           {/* ARRIVAL STATS (BOTTOM RIGHT) */}
           <div style={{ background: 'linear-gradient(145deg, #1e1e1e, #0a0a0a)', border: `1px solid ${C.red}44`, borderRadius: 24, padding: 32, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ fontSize: 11, color: C.muted, fontWeight: 800, letterSpacing: '0.2em', marginBottom: 10 }}>ESTIMATED ARRIVAL</div>
            <div style={{ fontSize: 56, fontWeight: 900, color: C.red, letterSpacing: '-0.05em', fontFamily: 'monospace' }}>
              {formatTime(seconds)}
            </div>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.muted, marginTop: 5 }}>LIVE COUNTDOWN</div>
            <div style={{ marginTop: 20, height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${progress}%`, height: '100%', background: C.red, transition: 'width 1s linear' }} />
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes pulse { 0% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.2); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes bounce { 0%, 100% { transform: translateY(-50%); } 50% { transform: translateY(-70%); } }
      `}</style>
    </div>
  );
}
