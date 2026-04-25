import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const API = 'http://localhost:3001';
const STEP = { IDLE:0, LISTENING:1, ANALYZING:2, FOLLOWUP:3, DONE:4 };
const C = {
  bg:'#020813', bg1:'#061022', bg2:'#0a162e', bg3:'#0f2040',
  border:'rgba(200,20,20,0.3)', red:'#cc0000', red2:'#8b0000',
  text:'#e2e8f0', muted:'#64748b', dim:'#475569',
};
const speak = (t) => { if (!window.speechSynthesis) return; window.speechSynthesis.cancel(); const u=new SpeechSynthesisUtterance(t); u.lang='hi-IN'; u.rate=0.92; window.speechSynthesis.speak(u); };
const toB64 = (f) => new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result.split(',')[1]);r.onerror=rej;r.readAsDataURL(f);});

export default function SOSPage() {
  const navigate = useNavigate();
  const [step,setStep]   = useState(STEP.IDLE);
  const [incidentId,setIncidentId] = useState(null);
  const [text,setText]   = useState('');
  const [triage,setTriage] = useState(null);
  const [dispatch,setDispatch] = useState(null);
  const [bar,setBar]     = useState(0);
  const [listening,setListening] = useState(false);
  const [followup,setFollowup]   = useState('');
  const [elapsed,setElapsed]     = useState(0);
  const [media,setMedia] = useState(null);
  const [vision,setVision] = useState('');
  const recRef   = useRef(null);
  const timerRef = useRef(null);
  const fileRef  = useRef(null);

  useEffect(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) return;
    const r = new SR(); r.continuous=true; r.interimResults=true; r.lang='en-IN';
    r.onresult = (e) => { let f=''; for(let i=e.resultIndex;i<e.results.length;i++) if(e.results[i].isFinal) f+=e.results[i][0].transcript+' '; if(f) setText(p=>(p+' '+f).trim()); };
    recRef.current = r;
  }, []);

  useEffect(() => {
    if (!triage) return;
    const target = Math.round(triage.accuracy * 100); let cur = 0;
    const id = setInterval(() => { cur=Math.min(cur+2,target); setBar(cur); if(cur>=target) clearInterval(id); }, 20);
    return () => clearInterval(id);
  }, [triage]);

  const startMic = () => { setListening(true); try { recRef.current?.start(); } catch {} };
  const stopMic  = () => { setListening(false); try { recRef.current?.stop(); } catch {} };

  const onFile = (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    const isImg = f.type.startsWith('image/'), isVid = f.type.startsWith('video/');
    if (!isImg && !isVid) return;
    setMedia({ file:f, url:URL.createObjectURL(f), type:isImg?'image':'video', mime:f.type, name:f.name });
  };
  const removeMedia = () => { if(media?.url) URL.revokeObjectURL(media.url); setMedia(null); setVision(''); if(fileRef.current) fileRef.current.value=''; };

  const submit = useCallback(async (t) => {
    if (!t.trim() && !media) return;
    setStep(STEP.ANALYZING); setElapsed(0); setVision('');
    timerRef.current = setInterval(() => setElapsed(e=>e+1), 1000);
    try {
      let b64=null, mime=null;
      if (media?.type==='image') { b64=await toB64(media.file); mime=media.mime; }
      const r = await fetch(`${API}/api/sos`, { method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ transcript:t, imageBase64:b64, mimeType:mime, hasVideo:media?.type==='video', videoName:media?.name }) });
      clearInterval(timerRef.current);
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      if (d.imageAnalysis) setVision(d.imageAnalysis);
      setTriage(d.triage);
      if (d.dispatch?.incident) {
        setDispatch(d.dispatch);
        setIncidentId(d.dispatch.incident.id);
        setStep(STEP.DONE);
        speak('Aap safe jagah pe rahein. Help pahunch rahi hai.');
        setTimeout(() => navigate(`/track/${d.dispatch.incident.id}`), 2200);
      } else { setStep(STEP.FOLLOWUP); if(d.triage?.followUpQuestion) speak(d.triage.followUpQuestion); }
    } catch(err) { clearInterval(timerRef.current); console.error(err); setStep(STEP.IDLE); }
  }, [media]);

  const submitFU = useCallback(async () => {
    if (!followup.trim()) return;
    setStep(STEP.ANALYZING);
    try {
      const r = await fetch(`${API}/api/followup`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ transcript:text+' '+followup }) });
      const d = await r.json(); setTriage(d.triage); setDispatch(d.dispatch); setStep(STEP.DONE); speak('Help aa rahi hai. Aap safe rahein.');
    } catch(err) { console.error(err); setStep(STEP.FOLLOWUP); }
  }, [text, followup]);

  const reset = () => { setStep(STEP.IDLE); setText(''); setTriage(null); setDispatch(null); setBar(0); setFollowup(''); removeMedia(); window.speechSynthesis?.cancel(); };

  const barCol   = bar>80 ? C.red : bar>55 ? C.red2 : 'C.red2';
  const hasInput = text.trim() || media;

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', color:C.text, position:'relative', overflow:'hidden' }}>

      {/* Ambient colour blobs - REMOVED for professional look */}

      <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:'none' }} onChange={onFile} />

      {/* ── NAV ── */}
      <nav style={{ position:'relative', zIndex:10, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:'1px solid rgba(180,30,30,0.25)', backdropFilter:'blur(12px)', background:'rgba(8,12,20,0.85)', boxShadow:'0 1px 20px rgba(0,0,0,0.4)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <svg width={26} height={26} viewBox="0 0 24 24">
            <defs><linearGradient id="sg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor={C.cyan}/><stop offset="100%" stopColor={C.red}/></linearGradient></defs>
            <path fill="url(#sg)" d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5L12 1z"/>
          </svg>
          <span style={{ fontWeight:800, fontSize:16, letterSpacing:'0.12em', color:C.text }}>KAVACH<span style={{ color:C.red }}>.AI</span></span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:20 }}>
          {step !== STEP.IDLE && <button onClick={reset} style={{ background:'none', border:`1px solid ${C.border}`, color:C.muted, padding:'5px 14px', borderRadius:6, cursor:'pointer', fontSize:12 }}>Reset</button>}
          <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:C.red, letterSpacing:'0.12em', fontWeight:600 }}>
            <span style={{ width:6, height:6, borderRadius:'50%', background:C.red, display:'inline-block', animation:'pulse 1.4s ease-in-out infinite', boxShadow:`0 0 8px ${C.red}` }} />
            LIVE SYSTEM
          </div>
          <Link to="/command" style={{ color:C.muted, fontSize:13, textDecoration:'none', fontWeight:500, padding:'6px 14px', border:`1px solid ${C.border}`, borderRadius:6, transition:'all 0.2s' }}
            onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.red; e.currentTarget.style.color=C.red; }}
            onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.muted; }}>
            Command Center →
          </Link>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <div style={{ position:'relative', zIndex:1, flex:1, display:'flex', alignItems:'center', justifyContent:'center', padding:'32px 20px' }}>
        <div style={{ width:'100%', maxWidth:540, animation:'fadeIn 0.4s ease' }}>

          {/* IDLE / LISTENING */}
          {(step===STEP.IDLE || step===STEP.LISTENING) && (
            <>
              <div style={{ textAlign:'center', marginBottom:40 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'0.22em', marginBottom:16, color:C.red }}>
                  KAVACH EMERGENCY DISPATCH SYSTEM
                </div>
                <h1 style={{ fontSize:54, fontWeight:900, lineHeight:1.05, marginBottom:14, color: C.text }}>
                  Need Help<span style={{ color: C.red }}>?</span>
                </h1>
                <p style={{ color:C.muted, fontSize:15, lineHeight:1.65 }}>Speak your emergency. Our AI triage agent<br/>dispatches help and stays with you.</p>
              </div>

              {/* MIC */}
              <div style={{ display:'flex', justifyContent:'center', marginBottom:32 }}>
                <div style={{ position:'relative' }}>
                  {listening && (<>
                    <span style={{ position:'absolute', inset:-18, borderRadius:'50%', border:`2px solid ${C.red}`, opacity:0.6, animation:'ripple 1.6s ease-out infinite' }} />
                    <span style={{ position:'absolute', inset:-36, borderRadius:'50%', border:`1px solid ${C.red}`, opacity:0.3, animation:'ripple 1.6s ease-out 0.5s infinite' }} />
                    <span style={{ position:'absolute', inset:-54, borderRadius:'50%', border:`1px solid rgba(196,136,42,0.25)`, animation:'ripple 1.6s ease-out 0.9s infinite' }} />
                  </>)}
                  <button onMouseDown={startMic} onMouseUp={stopMic} onTouchStart={startMic} onTouchEnd={stopMic}
                    style={{ width:120, height:120, borderRadius:'50%',
                      background: listening
                        ? `radial-gradient(circle at 40% 40%,rgba(196,24,24,0.5),rgba(80,10,10,0.95))`
                        : `radial-gradient(circle at 40% 40%,${C.bg3},${C.bg1})`,
                      border: `2px solid ${listening ? C.red : 'rgba(150,20,20,0.4)'}`,
                      boxShadow: listening
                        ? `0 0 35px rgba(196,24,24,0.55),0 0 70px rgba(100,10,10,0.3)`
                        : `0 0 18px rgba(100,10,10,0.35)`,
                      cursor:'pointer', transition:'all 0.25s', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={listening ? '#e84040' : '#9a1818'} strokeWidth={1.8}>
                      <rect x={9} y={2} width={6} height={13} rx={3}/><path d="M5 10a7 7 0 0 0 14 0"/><line x1={12} y1={19} x2={12} y2={22}/><line x1={8} y1={22} x2={16} y2={22}/>
                    </svg>
                    <span style={{ fontSize:9, letterSpacing:'0.14em', fontWeight:700, color: listening ? '#e84040' : '#9a1818' }}>{listening ? 'RELEASE' : 'HOLD'}</span>
                  </button>
                </div>
              </div>

              {/* INPUT CARD */}
              <div style={{ background:'linear-gradient(160deg,rgba(14,21,34,0.97),rgba(26,12,12,0.95))', border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden', backdropFilter:'blur(14px)', boxShadow:`0 20px 60px rgba(0,0,0,0.6),inset 0 1px 0 rgba(196,24,24,0.12)` }}>
                <div style={{ padding:'18px 20px 10px' }}>
                  <label style={{ display:'block', fontSize:10, color:C.red, letterSpacing:'0.16em', marginBottom:10, fontWeight:700 }}>DESCRIBE YOUR EMERGENCY</label>
                  <textarea value={text} onChange={e=>setText(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); submit(text); } }}
                    placeholder="e.g. Aag lag gayi, Karol Bagh, 5 log faṃse hain…" rows={3}
                    style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:C.text, fontSize:15, lineHeight:1.65, resize:'none', fontFamily:'inherit' }} />
                </div>

                {media && (
                  <div style={{ margin:'0 20px 14px', position:'relative', borderRadius:8, overflow:'hidden', border:'1px solid rgba(0,200,255,0.2)' }}>
                    {media.type==='image'
                      ? <img src={media.url} alt="attachment" style={{ width:'100%', maxHeight:160, objectFit:'cover', display:'block' }} />
                      : <div style={{ background:C.bg3, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                          <span style={{ fontSize:24 }}>🎥</span>
                          <div><div style={{ fontSize:13, fontWeight:600 }}>{media.name}</div><div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Video · AI vision active</div></div>
                        </div>}
                    <div style={{ position:'absolute', top:6, left:6, background:'linear-gradient(135deg,#00c8ff,#a78bfa)', color:'#000', fontSize:9, fontWeight:800, letterSpacing:'0.1em', padding:'2px 8px', borderRadius:4 }}>AI VISION</div>
                    <button onClick={removeMedia} style={{ position:'absolute', top:6, right:6, width:22, height:22, borderRadius:'50%', background:'rgba(0,0,0,0.75)', border:'none', color:'#fff', cursor:'pointer', fontSize:14, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                  </div>
                )}

                <div style={{ borderTop:`1px solid ${C.border}`, padding:'12px 20px', display:'flex', justifyContent:'space-between', alignItems:'center', gap:10 }}>
                  <button onClick={()=>fileRef.current?.click()}
                    style={{ background:'none', border:`1px solid ${C.border}`, color:C.muted, borderRadius:8, padding:'8px 14px', fontSize:12, cursor:'pointer', transition:'all 0.2s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.borderColor=C.red; e.currentTarget.style.color=C.red; }}
                    onMouseLeave={e=>{ e.currentTarget.style.borderColor=C.border; e.currentTarget.style.color=C.muted; }}>
                    {media ? 'Change' : 'Attach Photo/Video'}
                  </button>
                  <button onClick={()=>submit(text)} disabled={!hasInput}
                    style={{ background: hasInput ? `linear-gradient(135deg,${C.red},${C.red2})` : `rgba(100,10,10,0.15)`, color: hasInput ? '#fff' : C.dim, border:'none', borderRadius:8, padding:'10px 28px', fontWeight:800, fontSize:13, letterSpacing:'0.1em', cursor: hasInput ? 'pointer' : 'not-allowed', boxShadow: hasInput ? `0 4px 22px rgba(196,24,24,0.45)` : 'none', transition:'all 0.2s' }}>
                    SUBMIT →
                  </button>
                </div>
              </div>
              <p style={{ textAlign:'center', fontSize:11, color:C.dim, marginTop:14, letterSpacing:'0.04em' }}>Location active &nbsp;·&nbsp; Encrypted &nbsp;·&nbsp; AI Vision ready</p>
            </>
          )}

          {/* ANALYZING */}
          {step===STEP.ANALYZING && (
            <div style={{ textAlign:'center', animation:'fadeIn 0.3s ease' }}>
              <div style={{ position:'relative', width:72, height:72, margin:'0 auto 24px' }}>
                <div style={{ position:'absolute', inset:0, borderRadius:'50%', border:`3px solid transparent`, borderTopColor:C.red, borderRightColor:C.red, animation:'spin 0.9s linear infinite' }} />
                <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'2px solid transparent', borderBottomColor:'rgba(180,30,30,0.3)', borderLeftColor:'rgba(196,136,42,0.2)', animation:'spin 1.4s linear reverse infinite' }} />
                <div style={{ position:'absolute', top:'50%', left:'50%', transform:'translate(-50%,-50%)', width:10, height:10, borderRadius:'50%', background:C.red, boxShadow:`0 0 10px ${C.red}` }} />
              </div>
              <h2 style={{ fontSize:20, fontWeight:700, marginBottom:8, color:C.text }}>AI Analyzing…</h2>
              {media && <p style={{ color:C.red, fontSize:13, marginBottom:6 }}>{media.type==='image' ? 'Vision model processing image' : 'Analyzing video context'}</p>}
              <p style={{ color:C.muted, fontSize:13 }}>{elapsed}s elapsed</p>
            </div>
          )}

          {/* FOLLOWUP */}
          {step===STEP.FOLLOWUP && (<>
            <TriageCard triage={triage} bar={bar} barCol={barCol} vision={vision} />
            <div style={{ background:'linear-gradient(160deg,rgba(14,21,34,0.97),rgba(26,12,12,0.95))', border:`1px solid ${C.border}`, borderRadius:12, padding:20, marginTop:14, backdropFilter:'blur(14px)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:12, marginBottom:14 }}>
                <div style={{ width:34, height:34, borderRadius:'50%', background:`rgba(100,10,10,0.5)`, border:`1px solid rgba(180,30,30,0.4)`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill={C.red}><path d="M12 1L3 5v6c0 5.5 3.8 10.7 9 12 5.2-1.3 9-6.5 9-12V5L12 1z"/></svg>
                </div>
                <div>
                  <p style={{ fontSize:10, color:C.red, marginBottom:4, letterSpacing:'0.12em', fontWeight:700 }}>KAVACH AI</p>
                  <p style={{ fontSize:15, lineHeight:1.55 }}>{triage?.followUpQuestion}</p>
                </div>
              </div>
              <textarea autoFocus value={followup} onChange={e=>setFollowup(e.target.value)}
                onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); submitFU(); } }}
                placeholder="Your answer…" rows={2}
                style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:C.text, fontSize:14, resize:'none', fontFamily:'inherit', borderTop:`1px solid ${C.border}`, paddingTop:12 }} />
              <div style={{ display:'flex', justifyContent:'flex-end', marginTop:10 }}>
                <button onClick={submitFU} disabled={!followup.trim()}
                  style={{ background: followup.trim() ? `linear-gradient(135deg,${C.red},${C.red2})` : `rgba(100,10,10,0.15)`, color: followup.trim() ? '#fff' : C.dim, border:'none', borderRadius:8, padding:'10px 22px', fontWeight:800, fontSize:13, letterSpacing:'0.08em', cursor: followup.trim() ? 'pointer' : 'not-allowed', boxShadow: followup.trim() ? `0 4px 18px rgba(196,24,24,0.4)` : 'none' }}>
                  SEND →
                </button>
              </div>
            </div>
          </>)}

          {/* DONE */}
          {step===STEP.DONE && (<>
            <TriageCard triage={triage} bar={bar} barCol={barCol} vision={vision} />
            <div style={{ background:'linear-gradient(135deg,rgba(0,30,15,0.8),rgba(0,50,25,0.6))', border:'1px solid rgba(0,255,136,0.3)', borderRadius:14, padding:28, marginTop:14, textAlign:'center', boxShadow:'0 0 40px rgba(0,255,136,0.1)' }}>
              <div style={{ fontSize:44, marginBottom:10 }}>✅</div>
              <h2 style={{ fontSize:24, fontWeight:800, color:C.red, marginBottom:8 }}>HELP IS ON THE WAY</h2>
              {dispatch?.incident?.assignedResource && <p style={{ fontSize:15, marginBottom:6 }}><strong style={{ color:C.cyan }}>{dispatch.incident.assignedResource}</strong> dispatched{dispatch.incident.etaMinutes ? ` · ETA ${dispatch.incident.etaMinutes} min` : ''}</p>}
              {dispatch?.status==='merged' && <p style={{ fontSize:12, color:C.muted, marginBottom:6 }}>Merged with an existing active incident</p>}
              <p style={{ color:C.muted, fontSize:13, lineHeight:1.65 }}>Stay on the line · KAVACH is with you<br/>Aap safe jagah pe rahein</p>
            </div>
            <button onClick={reset} style={{ marginTop:12, width:'100%', padding:11, background:'none', border:`1px solid ${C.border}`, color:C.muted, borderRadius:10, fontSize:13, cursor:'pointer' }}>
              Report Another Emergency
            </button>
          </>)}

        </div>
      </div>

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes ripple { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.4);opacity:0} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        textarea::placeholder { color: #2a4a6a; }
      `}</style>
    </div>
  );
}

function TriageCard({ triage, bar, barCol, vision }) {
  if (!triage) return null;
  const C2 = { HIGH:'#ff2d2d', MEDIUM:'#ff6b2d', LOW:'#ffcc00' };
  return (
    <div style={{ background:'linear-gradient(135deg,rgba(10,22,40,0.95),rgba(22,10,50,0.9))', border:'1px solid rgba(0,200,255,0.15)', borderRadius:14, padding:20, animation:'fadeIn 0.3s ease', boxShadow:'0 20px 40px rgba(0,0,0,0.4)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:10, color:'#00c8ff', letterSpacing:'0.14em', fontWeight:700 }}>AI CONFIDENCE</span>
        <span style={{ fontSize:18, fontWeight:800, color:barCol }}>{bar}%</span>
      </div>
      <div style={{ height:5, background:'rgba(0,200,255,0.08)', borderRadius:3, overflow:'hidden', marginBottom:18 }}>
        <div style={{ height:'100%', width:`${bar}%`, background:`linear-gradient(90deg,#a78bfa,${barCol})`, borderRadius:3, transition:'width 0.05s linear', boxShadow:`0 0 8px ${barCol}55` }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 24px' }}>
        {[['Type',triage.emergencyType,null],['Severity',triage.severity,C2[triage.severity]],['Location',triage.locationName,null],['Resource',triage.resourceNeeded,'#00c8ff']].map(([k,v,c]) => (
          <div key={k}>
            <div style={{ fontSize:9, color:'#3a4a7a', letterSpacing:'0.1em', marginBottom:3 }}>{k.toUpperCase()}</div>
            <div style={{ fontSize:14, fontWeight:600, color:c||'#e2f0ff' }}>{v||'—'}</div>
          </div>
        ))}
      </div>
      {vision && (
        <div style={{ marginTop:14, borderTop:'1px solid rgba(167,139,250,0.15)', paddingTop:14 }}>
          <div style={{ fontSize:9, color:'#a78bfa', letterSpacing:'0.12em', fontWeight:700, marginBottom:6 }}>AI VISION ANALYSIS</div>
          <p style={{ fontSize:12, color:'#b0c8e0', lineHeight:1.65, margin:0 }}>{vision}</p>
        </div>
      )}
    </div>
  );
}
