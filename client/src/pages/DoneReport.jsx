import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from '../components/MapView';

const R = '#c62828'; // base red
const bg1 = '#121212', bd = '#2a2a2a', mu = '#888', di = '#444', tx = '#f5f5f5';

export default function DoneReport({ profile, inc, dispatch, triage, onReset }) {
  const navigate = useNavigate();
  const [cd, setCd] = useState(6);
  const [ra, setRa] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setCd(c => {
        if (c <= 1 && inc?.id) {
          clearInterval(id);
          navigate(`/mission/${inc.id}`);
          return 0;
        }
        return Math.max(0, c - 1);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [inc?.id, navigate]);

  useEffect(() => {
    const id = setInterval(() => setRa(p => (p < profile.actions.length - 1 ? p + 1 : p)), 550);
    return () => clearInterval(id);
  }, [profile.actions.length]);

  const a = profile.color;
  const sevC = triage?.severity === 'HIGH' ? R : triage?.severity === 'MEDIUM' ? '#fb8c00' : '#555';
  const acc = triage ? Math.round((triage.accuracy || 0) * 100) : 0;

  return (
    <div style={{ animation: 'fadeInUp 0.6s cubic-bezier(0.16, 1, 0.3, 1)', width: '100%', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 20, alignItems: 'stretch' }}>
        
        {/* LEFT COLUMN: STATUS OVERVIEW */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Main Status Panel */}
          <div style={{ background: bg1, border: `1px solid ${bd}`, borderTop: `4px solid ${a}`, borderRadius: 8, padding: 32, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', position: 'relative' }}>
            
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 10, height: 10, background: a, animation: 'pulse 2s infinite' }} />
                  <div style={{ fontSize: 12, color: '#aaa', letterSpacing: '0.2em', fontWeight: 700 }}>SYSTEM STATUS: ACTIVE</div>
                </div>
                <div style={{ fontSize: 10, color: a, border: `1px solid ${a}`, padding: '4px 8px', borderRadius: 4, fontWeight: 700, letterSpacing: '0.1em' }}>
                  {profile.icon}
                </div>
              </div>

              <h1 style={{ fontSize: 32, fontWeight: 800, color: tx, margin: '0 0 16px 0', letterSpacing: '-0.02em', lineHeight: 1.2 }}>
                DISPATCH<br/>CONFIRMED
              </h1>

              <div style={{ fontSize: 15, color: '#aaa', lineHeight: 1.6, marginBottom: 24 }}>
                Unit <span style={{ color: tx, fontWeight: 600 }}>{profile.unit}</span> has been mobilized to the incident location.
                {dispatch?.status === 'merged' && <div style={{ color: di, fontSize: 13, marginTop: 8 }}>Incident merged with existing regional alert.</div>}
              </div>
            </div>

            <div style={{ background: '#0a0a0a', border: `1px solid ${bd}`, borderRadius: 6, padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 10, color: di, letterSpacing: '0.15em', fontWeight: 700, marginBottom: 6 }}>ESTIMATED ARRIVAL</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: tx, fontFamily: 'monospace' }}>
                  {inc?.etaMinutes ? `${inc.etaMinutes} MIN` : 'CALCULATING'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 10, color: di, letterSpacing: '0.15em', fontWeight: 700, marginBottom: 6 }}>TRACKING FEED IN</div>
                <div style={{ fontSize: 24, fontWeight: 800, color: a, fontFamily: 'monospace' }}>
                  00:{String(cd).padStart(2, '0')}
                </div>
              </div>
            </div>
          </div>

          {/* AI Metrics Panel */}
          <div style={{ background: bg1, border: `1px solid ${bd}`, borderRadius: 8, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 10, color: mu, letterSpacing: '0.15em', fontWeight: 700 }}>AI TRIAGE CONFIDENCE</span>
              <span style={{ fontSize: 16, fontWeight: 800, color: sevC, fontFamily: 'monospace' }}>{acc}%</span>
            </div>
            <div style={{ height: 4, background: '#1a1a1a', borderRadius: 2, overflow: 'hidden', marginBottom: 24 }}>
              <div style={{ height: '100%', width: `${acc}%`, background: sevC, borderRadius: 2, transition: 'width 1s cubic-bezier(0.16, 1, 0.3, 1)' }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px 20px' }}>
              {[['SEVERITY LOG', triage?.severity, sevC], ['INCIDENT TYPE', triage?.emergencyType, tx], ['LOCATION MATCH', triage?.locationName, tx], ['RESOURCE REQ', triage?.resourceNeeded, tx]].map(([k, v, c]) => (
                <div key={k}>
                  <div style={{ fontSize: 9, color: di, letterSpacing: '0.1em', marginBottom: 6, fontWeight: 700 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: c, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v || 'PENDING'}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Mini Map */}
          <div style={{ background: bg1, border: `1px solid ${bd}`, borderRadius: 8, padding: 4, height: 220, position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 1000, fontSize: 10, color: '#aaa', letterSpacing: '0.15em', fontWeight: 700, background: 'rgba(0,0,0,0.6)', padding: '4px 8px', borderRadius: 4, backdropFilter: 'blur(4px)' }}>
              LIVE TRACKING LINK ESTABLISHED
            </div>
            <MapView incidents={inc ? [inc] : []} selectedIncident={inc} />
          </div>

        </div>

        {/* RIGHT COLUMN: PROTOCOLS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          
          {/* Active Responses */}
          <div style={{ background: bg1, border: `1px solid ${bd}`, borderRadius: 8, padding: 28, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
              <div style={{ width: 8, height: 8, background: '#4caf50', borderRadius: '50%' }} />
              <div style={{ fontSize: 11, color: '#aaa', letterSpacing: '0.15em', fontWeight: 700 }}>ACTIVE PROTOCOLS</div>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {profile.actions.map((act, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, opacity: i <= ra ? 1 : 0, transform: i <= ra ? 'translateY(0)' : 'translateY(10px)', transition: 'all 0.4s ease' }}>
                  <div style={{ width: 14, height: 14, border: `2px solid ${i <= ra ? a : di}`, borderRadius: 3, marginTop: 2, flexShrink: 0, position: 'relative' }}>
                    {i <= ra && <div style={{ position: 'absolute', inset: 2, background: a, borderRadius: 1 }} />}
                  </div>
                  <span style={{ fontSize: 13, color: '#e0e0e0', lineHeight: 1.5, fontWeight: 500 }}>{act}</span>
                </div>
              ))}
            </div>

            {triage?.reasoning && (
              <div style={{ marginTop: 32, paddingTop: 20, borderTop: `1px solid ${bd}` }}>
                <div style={{ fontSize: 9, color: di, letterSpacing: '0.15em', fontWeight: 700, marginBottom: 8 }}>AI REASONING TRACE</div>
                <div style={{ fontSize: 12, color: mu, lineHeight: 1.6, fontStyle: 'italic', borderLeft: `2px solid ${bd}`, paddingLeft: 12 }}>"{triage.reasoning}"</div>
              </div>
            )}
          </div>

          {/* Safety Instructions */}
          <div style={{ background: '#0a0a0a', border: `1px solid ${a}44`, borderLeft: `4px solid ${a}`, borderRadius: 8, padding: 24 }}>
            <div style={{ fontSize: 11, color: '#fff', letterSpacing: '0.15em', fontWeight: 700, marginBottom: 8 }}>
              IMMEDIATE SAFETY ADVISORY
            </div>
            <div style={{ fontSize: 11, color: '#aaa', fontStyle: 'italic', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontSize: 14 }}>🔊</span> 
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {profile.tips.map((tip, i) => (
                <div key={i} style={{ fontSize: 13, color: '#ccc', lineHeight: 1.5, display: 'flex', gap: 12 }}>
                  <span style={{ color: a, fontWeight: 800, fontFamily: 'monospace' }}>{String(i + 1).padStart(2, '0')}</span>
                  <span>{tip}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes fadeInUp { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </div>
  );
}
