import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DoneReport from './DoneReport';
import { getProfile } from './emergencyProfiles';
import { useHybridLocation } from '../hooks/useHybridLocation';

// ── Bulletproof Browser TTS ─────────────────────────────────────────────
// Uses built-in voice. Fixes Safari/Mac silent failures and garbage collection bugs.
const tts = (() => {
  let voices = [];
  let ready = false;
  let queue = [];
  let speaking = false;
  let currentUtterance = null; // Store reference to prevent garbage collection!
  let unlocked = false;

  const loadVoices = () => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const v = window.speechSynthesis.getVoices();
    if (v.length > 0) { voices = v; ready = true; }
  };

  const pickVoice = () => {
    return voices.find(v => /en.IN/i.test(v.lang) && /female|woman|zira|heera|veena/i.test(v.name))
      || voices.find(v => /en.IN/i.test(v.lang))
      || voices.find(v => /Rishi/i.test(v.name)) // Mac Indian Voice
      || voices.find(v => /Samantha/i.test(v.name)) // Mac Default
      || voices.find(v => /en/i.test(v.lang))
      || voices[0]
      || null;
  };

  const flush = () => {
    if (speaking || !queue.length || typeof window === 'undefined' || !window.speechSynthesis) return;
    
    const { text, onDone } = queue.shift();
    speaking = true;

    // Small delay after cancel to prevent Safari/Chrome silent failure bug
    window.speechSynthesis.cancel();
    
    setTimeout(() => {
      const u = new SpeechSynthesisUtterance(text);
      currentUtterance = u; // Keep reference to prevent GC!
      
      u.lang = 'en-IN';
      u.rate = 0.95;
      u.pitch = 1.0;
      
      const voice = pickVoice();
      if (voice) u.voice = voice;
      
      u.onend = () => { 
        speaking = false; 
        currentUtterance = null;
        if (onDone) onDone(); 
        flush(); 
      };
      
      u.onerror = (e) => { 
        console.warn('TTS Error:', e); 
        speaking = false; 
        currentUtterance = null;
        if (onDone) onDone(); 
        flush(); 
      };
      
      window.speechSynthesis.speak(u);
      
      // Chrome bug: long utterances get cut at ~15s — resume trick
      const resume = setInterval(() => {
        if (!speaking) { clearInterval(resume); return; }
        if (window.speechSynthesis.paused) window.speechSynthesis.resume();
      }, 5000);
      
    }, 50); // 50ms delay after cancel is crucial for Mac/Safari
  };

  if (typeof window !== 'undefined' && window.speechSynthesis) {
    setTimeout(loadVoices, 100);
    window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
  }

  return {
    unlock() {
      if (unlocked || typeof window === 'undefined' || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0; // silent
      window.speechSynthesis.speak(u);
      unlocked = true;
    },
    speak(text, onDone) {
      if (!text || typeof window === 'undefined' || !window.speechSynthesis) { 
        if (onDone) onDone(); 
        return; 
      }
      
      this.cancel(); // Clears queue and cancels
      
      // Clean up text for TTS (remove emojis so it doesn't try to read them out loud)
      const cleanText = text.replace(/[\u1000-\uFFFF]+/g, '');
      
      queue = [{ text: cleanText, onDone }];
      if (!ready) loadVoices();
      flush();
    },
    cancel() {
      queue = [];
      speaking = false;
      currentUtterance = null;
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    }
  };
})();

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const STEP = { IDLE:0, LISTENING:1, ANALYZING:2, FOLLOWUP:3, DONE:4 };
const C = {
  bg:'#141414', bg1:'#1c1c1c', bg2:'#242424', bg3:'#2e2e2e',
  border:'#333333',
  red:'#c62828',   // aesthetic deep crimson
  red2:'#b71c1c',
  redGlow:'rgba(198,40,40,0.35)',
  text:'#f5f5f5', muted:'#9e9e9e', dim:'#616161',
};

// Glowing shield icon
function ShieldIcon({ size = 26 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ filter: `drop-shadow(0 0 5px ${C.redGlow})` }}>
      <path d="M12 1L3 5v6c0 5.55 3.82 10.74 9 12 5.18-1.26 9-6.45 9-12V5L12 1z"
        fill={C.red} />
      <path d="M12 3.18L5 6.6V11c0 4.52 3.02 8.76 7 9.93 3.98-1.17 7-5.41 7-9.93V6.6L12 3.18z"
        fill="rgba(255,255,255,0.07)" />
    </svg>
  );
}

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
  const loc = useHybridLocation();
  const realLocation = loc ? { lat: loc.lat, lng: loc.lng, accuracy: loc.accuracy } : null;
  const locAccuracy  = loc?.accuracy ?? null;
  const locMode      = loc?.mode ?? null;
  const recRef   = useRef(null);
  const timerRef = useRef(null);
  const fileRef  = useRef(null);
  const stepRef = useRef(STEP.IDLE);
  useEffect(() => { stepRef.current = step; }, [step]);

  // Unlock TTS on first user interaction
  useEffect(() => {
    const handleUnlock = () => tts.unlock();
    document.addEventListener('click', handleUnlock, { once: true });
    document.addEventListener('touchstart', handleUnlock, { once: true });
    document.addEventListener('keydown', handleUnlock, { once: true }); // Catch Enter key presses
    return () => {
      document.removeEventListener('click', handleUnlock);
      document.removeEventListener('touchstart', handleUnlock);
      document.removeEventListener('keydown', handleUnlock);
    };
  }, []);

  useEffect(() => {
    const SR = window.webkitSpeechRecognition || window.SpeechRecognition;
    if (!SR) return;
    const r = new SR(); r.continuous=true; r.interimResults=true; r.lang='en-IN';
    r.onresult = (e) => { 
      let f=''; 
      for(let i=e.resultIndex;i<e.results.length;i++) if(e.results[i].isFinal) f+=e.results[i][0].transcript+' '; 
      if(f) {
        if (stepRef.current === STEP.FOLLOWUP) setFollowup(p=>(p+' '+f).trim());
        else setText(p=>(p+' '+f).trim());
      }
    };
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
  
  const toggleMic = () => {
    if (listening) stopMic();
    else startMic();
  };

  const speak = useCallback((t) => {
    if (!t) return;
    stopMic(); // Pause mic so it doesn't record the AI's own voice
    const resumeMic = () => {
      if (stepRef.current === STEP.IDLE || stepRef.current === STEP.FOLLOWUP) {
        startMic();
      }
    };
    tts.speak(t, resumeMic);
  }, []);

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
        body: JSON.stringify({ transcript:t, imageBase64:b64, mimeType:mime, hasVideo:media?.type==='video', videoName:media?.name, location:realLocation }) });
      clearInterval(timerRef.current);
      const d = await r.json(); if (!r.ok) throw new Error(d.error);
      if (d.imageAnalysis) setVision(d.imageAnalysis);
      setTriage(d.triage);
      if (d.dispatch?.incident) {
        setDispatch(d.dispatch);
        setIncidentId(d.dispatch.incident.id);
        setStep(STEP.DONE);
        const tips = getProfile(d.triage?.emergencyType, d.triage?.resourceNeeded)?.tips?.join('. ') || '';
        
        // DO NOT navigate until TTS has fully finished speaking the instructions!
        speak(
          d.triage?.followUpQuestion || `Help is on the way. Please listen carefully: ${tips}`,
          () => {
            navigate(`/track/${d.dispatch.incident.id}`);
          }
        );
      } else { 
        setStep(STEP.FOLLOWUP); 
        if(d.triage?.followUpQuestion) speak(d.triage.followUpQuestion); 
      }
    } catch(err) { clearInterval(timerRef.current); console.error(err); setStep(STEP.IDLE); }
  }, [media]);

  const submitFU = useCallback(async () => {
    if (!followup.trim()) return;
    setStep(STEP.ANALYZING);
    try {
      const r = await fetch(`${API}/api/followup`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ transcript:text+' '+followup, location:realLocation }) });
      const d = await r.json();
      setTriage(d.triage);
      setDispatch(d.dispatch);
      if (d.dispatch?.incident) {
        const newId = d.dispatch.incident.id;
        setIncidentId(newId);
        setStep(STEP.DONE);
        const tips = getProfile(d.triage?.emergencyType, d.triage?.resourceNeeded)?.tips?.join('. ') || '';
        
        // Wait for TTS to finish before navigating!
        speak(
          d.triage?.followUpQuestion || `Help is on the way. ${tips ? 'Please listen: ' + tips : ''}`,
          () => {
            navigate(`/track/${newId}`);
          }
        );
      } else {
        // Still not confident enough — stay on FOLLOWUP with new question
        setStep(STEP.FOLLOWUP);
        speak(d.triage?.followUpQuestion || 'Please provide your exact location or a nearby landmark.');
      }
    } catch(err) { console.error(err); setStep(STEP.FOLLOWUP); }
  }, [text, followup, realLocation]);

  const reset = () => { setStep(STEP.IDLE); setText(''); setTriage(null); setDispatch(null); setBar(0); setFollowup(''); removeMedia(); tts.cancel(); };

  const barCol   = bar>80 ? C.red : bar>55 ? C.red2 : 'C.red2';
  const hasInput = text.trim() || media;

  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', color:C.text, position:'relative', overflow:'hidden' }}>

      {/* Ambient colour blobs - REMOVED for professional look */}

      <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display:'none' }} onChange={onFile} />

      {/* ── NAV ── */}
      <nav style={{ position:'relative', zIndex:10, display:'flex', justifyContent:'space-between', alignItems:'center', padding:'16px 32px', borderBottom:`1px solid ${C.border}`, background:C.bg1 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <ShieldIcon size={26} />
          <span style={{ fontWeight:900, fontSize:16, letterSpacing:'0.13em', color:C.text }}>KAVACH</span>
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
      <div style={{ position:'relative', zIndex:1, flex:1, display:'flex', alignItems: step===STEP.DONE ? 'flex-start' : 'center', justifyContent:'center', padding: step===STEP.DONE ? '24px 20px 40px' : '32px 20px', overflowY: step===STEP.DONE ? 'auto' : 'visible', width: '100%' }}>
        <div style={{ width:'100%', maxWidth: step===STEP.DONE ? 1100 : 540, transition: 'max-width 0.5s cubic-bezier(0.16, 1, 0.3, 1)', animation:'fadeIn 0.4s ease' }}>

          {/* IDLE / LISTENING */}
          {(step===STEP.IDLE || step===STEP.LISTENING) && (
            <>
              <div style={{ textAlign:'center', marginBottom:40 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, fontSize:12, fontWeight:600, color:C.muted, marginBottom:16 }}>
                  Kavach <ShieldIcon size={12} /> Emergency Dispatch System
                </div>
                <h1 style={{ fontSize:54, fontWeight:900, lineHeight:1.05, marginBottom:14, color: C.text }}>
                  Need Help<span style={{ color: C.red }}>?</span>
                </h1>
                <p style={{ color:C.muted, fontSize:15, lineHeight:1.65 }}>Speak your emergency. Our AI triage agent<br/>dispatches help and stays with you.</p>
                <div style={{ display:'flex', justifyContent:'center', gap:8, marginTop:14 }}>
                  {(() => {
                    const conf = loc?.confidence;
                    const modeLabel = loc?.mode === 'realtime_gps' ? 'GPS' : loc?.mode === 'network_fallback' ? 'NETWORK' : loc?.mode === 'hybrid' ? 'HYBRID' : null;
                    const dotColor = conf === 'high' ? '#4caf50' : conf === 'medium' ? '#f57c00' : C.dim;
                    const borderCol = conf === 'high' ? '#388e3c44' : conf === 'medium' ? '#f57c0044' : C.border;
                    return (
                      <span style={{ fontSize:11, background:C.bg2, border:`1px solid ${borderCol}`, color: loc ? dotColor : C.dim, borderRadius:20, padding:'4px 12px', fontWeight:600, letterSpacing:'0.06em', display:'flex', alignItems:'center', gap:5 }}>
                        <span style={{ width:6, height:6, borderRadius:'50%', background: loc ? dotColor : C.dim, animation: loc ? 'pulse 2s infinite' : 'none' }} />
                        {loc ? `${modeLabel} ${conf?.toUpperCase()} ±${Math.round(locAccuracy||0)}m` : 'Acquiring location…'}
                      </span>
                    );
                  })()}
                  <span style={{ fontSize:11, background:C.bg2, border:`1px solid ${C.border}`, color:C.dim, borderRadius:20, padding:'4px 12px' }}>Encrypted · AI Vision ready</span>
                </div>
              </div>

              <div style={{ display:'flex', justifyContent:'center', marginBottom:32 }}>
                <div style={{ position:'relative' }}>
                  {listening && (<>
                    <span style={{ position:'absolute', inset:-18, borderRadius:'50%', border:`2px solid ${C.red}`, opacity:0.6, animation:'ripple 1.6s ease-out infinite' }} />
                    <span style={{ position:'absolute', inset:-36, borderRadius:'50%', border:`1px solid ${C.red}`, opacity:0.3, animation:'ripple 1.6s ease-out 0.5s infinite' }} />
                  </>)}
                  <button onClick={toggleMic}
                    style={{ width:120, height:120, borderRadius:'50%',
                      background: listening ? '#1a1a1a' : '#111111',
                      border: `1px solid ${C.border}`,
                      boxShadow: listening ? `0 0 30px rgba(211,47,47,0.4)` : `0 0 40px rgba(211,47,47,0.15)`,
                      cursor:'pointer', transition:'all 0.2s', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:6 }}>
                    <svg width={34} height={34} viewBox="0 0 24 24" fill="none" stroke={listening ? '#ffffff' : C.red} strokeWidth={1.8}>
                      <rect x={9} y={2} width={6} height={13} rx={3}/><path d="M5 10a7 7 0 0 0 14 0"/><line x1={12} y1={19} x2={12} y2={22}/><line x1={8} y1={22} x2={16} y2={22}/>
                    </svg>
                    <span style={{ fontSize:9, letterSpacing:'0.14em', fontWeight:700, color: listening ? '#ffffff' : C.red }}>{listening ? 'STOP' : 'TAP TO SPEAK'}</span>
                  </button>
                </div>
              </div>

              {/* INPUT CARD */}
              <div style={{ background:C.bg1, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
                <div style={{ padding:'18px 20px 10px' }}>
                  <label style={{ display:'block', fontSize:10, color:C.muted, letterSpacing:'0.16em', marginBottom:10, fontWeight:700 }}>DESCRIBE YOUR EMERGENCY</label>
                  <textarea value={text} onChange={e=>setText(e.target.value)}
                    onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); submit(text); } }}
                    placeholder="e.g. Aag lag gayi, Karol Bagh, 5 log faṃse hain…" rows={3}
                    style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:C.text, fontSize:15, lineHeight:1.65, resize:'none', fontFamily:'inherit' }} />
                </div>

                {media && (
                  <div style={{ margin:'0 20px 14px', position:'relative', borderRadius:8, overflow:'hidden', border:`1px solid ${C.border}` }}>
                    {media.type==='image'
                      ? <img src={media.url} alt="attachment" style={{ width:'100%', maxHeight:160, objectFit:'cover', display:'block' }} />
                      : <div style={{ background:C.bg3, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
                          <span style={{ fontSize:24 }}>🎥</span>
                          <div><div style={{ fontSize:13, fontWeight:600 }}>{media.name}</div><div style={{ fontSize:11, color:C.muted, marginTop:2 }}>Video · AI vision active</div></div>
                        </div>}
                    <div style={{ position:'absolute', top:6, left:6, background:C.bg2, border:`1px solid ${C.red}`, color:C.text, fontSize:9, fontWeight:800, letterSpacing:'0.1em', padding:'2px 8px', borderRadius:4 }}>AI VISION</div>
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
                    style={{ background: hasInput ? C.red : C.bg3, color: hasInput ? '#fff' : C.dim, border:'none', borderRadius:8, padding:'10px 28px', fontWeight:800, fontSize:13, letterSpacing:'0.1em', cursor: hasInput ? 'pointer' : 'not-allowed', transition:'all 0.2s' }}>
                    SUBMIT
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
                <div style={{ position:'absolute', inset:8, borderRadius:'50%', border:'2px solid transparent', borderBottomColor:C.red2, borderLeftColor:C.red, animation:'spin 1.4s linear reverse infinite' }} />
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
            <div style={{ background:C.bg1, border:`1px solid ${C.red}`, borderRadius:12, padding:24, marginTop:14, boxShadow:`0 0 20px ${C.redGlow}`, animation:'fadeIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
              <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:18 }}>
                <div style={{ width:40, height:40, borderRadius:'50%', background:C.bg2, border:`1px solid ${C.red}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, animation:'pulse 2s infinite', boxShadow:`0 0 10px ${C.redGlow}` }}>
                  <ShieldIcon size={20} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize:11, color:C.red, marginBottom:6, letterSpacing:'0.14em', fontWeight:800, display:'flex', alignItems:'center', gap:6 }}>
                    KAVACH AI <span style={{ width:6, height:6, borderRadius:'50%', background:C.red, animation:'pulse 1s infinite' }} />
                  </p>
                  <p style={{ fontSize:16, lineHeight:1.6, color:'#fff', fontWeight:500, letterSpacing:'0.01em' }}>{triage?.followUpQuestion}</p>
                </div>
              </div>
              <div style={{ background:C.bg2, borderRadius:8, border:`1px solid ${C.border}`, padding:'12px 16px', position:'relative' }}>
                <textarea autoFocus value={followup} onChange={e=>setFollowup(e.target.value)}
                  onKeyDown={e=>{ if(e.key==='Enter'&&!e.shiftKey){ e.preventDefault(); submitFU(); } }}
                  placeholder="Type your response here..." rows={2}
                  style={{ width:'100%', background:'transparent', border:'none', outline:'none', color:C.text, fontSize:15, resize:'none', fontFamily:'inherit' }} />
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:16 }}>
                <button onMouseDown={startMic} onMouseUp={stopMic} onTouchStart={startMic} onTouchEnd={stopMic}
                  style={{ background: listening ? 'rgba(211,47,47,0.1)' : 'transparent', border:`1px solid ${listening ? C.red : C.border}`, color: listening ? C.red : C.muted, borderRadius:8, padding:'10px 18px', fontSize:12, cursor:'pointer', display:'flex', alignItems:'center', gap:8, transition:'all 0.2s', fontWeight:600, letterSpacing:'0.05em' }}>
                  <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <rect x={9} y={2} width={6} height={13} rx={3}/><path d="M5 10a7 7 0 0 0 14 0"/><line x1={12} y1={19} x2={12} y2={22}/><line x1={8} y1={22} x2={16} y2={22}/>
                  </svg>
                  {listening ? 'LISTENING (RELEASE TO STOP)' : 'HOLD TO SPEAK'}
                </button>
                <button onClick={submitFU} disabled={!followup.trim()}
                  style={{ background: followup.trim() ? C.red : C.bg3, color: followup.trim() ? '#fff' : C.dim, border:'none', borderRadius:8, padding:'12px 28px', fontWeight:800, fontSize:13, letterSpacing:'0.1em', cursor: followup.trim() ? 'pointer' : 'not-allowed', transition:'all 0.2s', boxShadow: followup.trim() ? `0 4px 15px ${C.redGlow}` : 'none' }}>
                  SEND
                </button>
              </div>
            </div>
          </>)}

          {/* DONE */}
          {step===STEP.DONE && (
            <DoneReport 
              profile={getProfile(triage?.emergencyType, triage?.resourceNeeded)} 
              inc={dispatch?.incident} 
              dispatch={dispatch} 
              triage={triage} 
              onReset={() => { setStep(STEP.IDLE); setText(''); setMedia(null); setVision(''); setDispatch(null); setTriage(null); }} 
            />
          )}

        </div>
      </div>

      <style>{`
        @keyframes pulse  { 0%,100%{opacity:1} 50%{opacity:0.3} }
        @keyframes ripple { 0%{transform:scale(1);opacity:0.7} 100%{transform:scale(2.4);opacity:0} }
        @keyframes spin   { to{transform:rotate(360deg)} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        textarea::placeholder { color: ${C.dim}; }
      `}</style>
    </div>
  );
}

// (End of file)

function TriageCard({ triage, bar, barCol, vision }) {
  if (!triage) return null;
  const C2 = { HIGH:C.red, MEDIUM:C.red2, LOW:C.dim };
  return (
    <div style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:14, padding:20, animation:'fadeIn 0.3s ease', boxShadow:'0 10px 30px rgba(0,0,0,0.5)' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
        <span style={{ fontSize:10, color:C.muted, letterSpacing:'0.14em', fontWeight:700 }}>AI CONFIDENCE</span>
        <span style={{ fontSize:18, fontWeight:800, color:barCol }}>{bar}%</span>
      </div>
      <div style={{ height:5, background:C.bg3, borderRadius:3, overflow:'hidden', marginBottom:18 }}>
        <div style={{ height:'100%', width:`${bar}%`, background:barCol, borderRadius:3, transition:'width 0.05s linear' }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'12px 24px' }}>
        {[['Type',triage.emergencyType,null],['Severity',triage.severity,C2[triage.severity]],['Location',triage.locationName,null],['Resource',triage.resourceNeeded,C.text]].map(([k,v,c]) => (
          <div key={k}>
            <div style={{ fontSize:9, color:C.dim, letterSpacing:'0.1em', marginBottom:3 }}>{k.toUpperCase()}</div>
            <div style={{ fontSize:14, fontWeight:600, color:c||C.text }}>{v||'—'}</div>
          </div>
        ))}
      </div>
      {vision && (
        <div style={{ marginTop:14, borderTop:`1px solid ${C.border}`, paddingTop:14 }}>
          <div style={{ fontSize:9, color:C.muted, letterSpacing:'0.12em', fontWeight:700, marginBottom:6 }}>AI VISION ANALYSIS</div>
          <p style={{ fontSize:12, color:C.text, lineHeight:1.65, margin:0 }}>{vision}</p>
        </div>
      )}
    </div>
  );
}
