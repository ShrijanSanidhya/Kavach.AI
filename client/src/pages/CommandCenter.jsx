import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

const API = 'http://localhost:3001';

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

// Glowing shield icon
function ShieldIcon({ size = 24 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      style={{ filter: `drop-shadow(0 0 5px rgba(198,40,40,0.4))` }}>
      <path d="M12 1L3 5v6c0 5.55 3.82 10.74 9 12 5.18-1.26 9-6.45 9-12V5L12 1z"
        fill="#c62828" />
      <path d="M12 3.18L5 6.6V11c0 4.52 3.02 8.76 7 9.93 3.98-1.17 7-5.41 7-9.93V6.6L12 3.18z"
        fill="rgba(255,255,255,0.07)" />
    </svg>
  );
}

const sevColor = (s) => s==='HIGH'?C.red:s==='MEDIUM'?C.orange:C.amber;

export default function CommandCenter() {
  const [state,setState]=useState({
    incidents:[],
    resources:{ambulances:{total:3,available:3},fireUnits:{total:2,available:2},police:{total:3,available:3}},
    resourcesList:[],logs:[],
    stats:{totalCalls:0,duplicatesMerged:0,active:0,resolved:0,aiResponseTime:'—',manualResponseTime:'18.7 min'},
  });
  const [selected,setSelected]=useState(null);
  const [clock,setClock]=useState('');
  const [chaos,setChaos]=useState(false);
  const [connected,setConnected]=useState(false);
  const esRef=useRef(null);

  useEffect(()=>{const id=setInterval(()=>setClock(new Date().toLocaleTimeString()),1000);return()=>clearInterval(id);},[]);

  useEffect(()=>{
    const connect=()=>{
      const es=new EventSource(`${API}/api/state`);
      es.onopen=()=>setConnected(true);
      es.onmessage=(e)=>{try{setState(JSON.parse(e.data));}catch{}};
      es.onerror=()=>{setConnected(false);es.close();setTimeout(connect,3000);};
      esRef.current=es;
    };
    connect();
    return()=>esRef.current?.close();
  },[]);

  const triggerChaos=async()=>{setChaos(true);try{await fetch(`${API}/api/chaos`,{method:'POST'});}catch{}setTimeout(()=>setChaos(false),800);};

  const highN=state.incidents.filter(i=>i.severity==='HIGH').length;
  const medN=state.incidents.filter(i=>i.severity==='MEDIUM').length;
  const lowN=state.incidents.filter(i=>i.severity==='LOW').length;

  const panel={backgroundColor:C.bg2,border:`1px solid ${C.border}`,borderRadius:10,boxShadow:'0 4px 20px rgba(0,0,0,0.4)'};

  return (
    <div style={{height:'100vh',display:'flex',flexDirection:'column',backgroundColor:C.bg,color:C.text,overflow:'hidden',
      background:chaos?`radial-gradient(ellipse 80% 50% at 50% 0%,rgba(211,47,47,0.1),${C.bg})`:C.bg}}>

      {/* HEADER */}
      <div style={{height:54,backgroundColor:C.bg1,borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 16px',flexShrink:0}}>

        <Link to="/" style={{display:'flex',alignItems:'center',gap:9,textDecoration:'none'}}>
          <ShieldIcon size={24} />
          <span style={{fontWeight:900,fontSize:15,letterSpacing:'0.13em',color:C.text}}>KAVACH</span>
          <span style={{color:C.muted,fontSize:12,marginLeft:4}}>/ Command Center</span>
        </Link>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{width:8,height:8,borderRadius:'50%',backgroundColor:C.red,boxShadow:`0 0 8px ${C.red}`,display:'inline-block',animation:'pulse 1.2s ease-in-out infinite'}}/>
          <span style={{fontWeight:700,fontSize:12,color:C.red,letterSpacing:'0.08em'}}>ACTIVE DISASTER — KISHORA, HARYANA</span>
          <span style={{color:C.muted,fontSize:12,fontFamily:'JetBrains Mono,monospace',marginLeft:8}}>{clock}</span>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <Pill label="HIGH" n={highN} color={C.red}/>
          <Pill label="MED"  n={medN}  color={C.orange}/>
          <Pill label="LOW"  n={lowN}  color={C.amber}/>
          <span style={{color:C.muted,fontSize:12,fontFamily:'JetBrains Mono,monospace'}}>{clock}</span>
          <div style={{width:1,height:26,background:C.border,margin:'0 4px'}}/>
          <button onClick={triggerChaos} style={{background:chaos?C.red:'transparent',color:chaos?'#fff':C.red,border:`1px solid ${C.red}`,padding:'5px 12px',borderRadius:6,fontWeight:700,fontSize:11,cursor:'pointer',letterSpacing:'0.06em',transition:'all 0.15s'}}>
            CHAOS MODE
          </button>
          <div style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:connected?C.greenBright:C.muted}}>
            <span style={{width:7,height:7,borderRadius:'50%',background:connected?C.greenBright:C.muted,display:'inline-block',boxShadow:connected?`0 0 6px ${C.greenBright}`:'none'}}/>
            {connected?'LIVE':'...'}
          </div>
        </div>
      </div>

      {/* BODY */}
      <div style={{flex:1,display:'grid',gridTemplateColumns:'260px 1fr 280px',gap:10,padding:10,overflow:'hidden',minHeight:0}}>

        {/* LEFT — Feed */}
        <div style={{...panel,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',color:C.red}}>LIVE PRIORITY FEED</span>
            <span style={{background:`rgba(255,45,45,0.15)`,color:C.red,border:`1px solid rgba(255,45,45,0.3)`,borderRadius:20,fontSize:10,fontWeight:700,padding:'1px 8px'}}>{state.incidents.length}</span>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:8}}>
            {state.incidents.length===0&&<div style={{color:C.muted,fontSize:13,padding:'30px 0',textAlign:'center',lineHeight:2}}>No active incidents<br/>Awaiting emergency calls…</div>}
            {state.incidents.map(inc=><IncCard key={inc.id} inc={inc} sel={selected?.id===inc.id} onClick={()=>setSelected(inc)}/>)}
          </div>
        </div>

        {/* CENTER — Map + Detail */}
        <div style={{display:'flex',flexDirection:'column',gap:10,overflow:'hidden',minHeight:0}}>
          <div style={{flex:1,minHeight:0,...panel,overflow:'hidden'}}>
            <MapContainer center={[28.98, 77.05]} zoom={12} style={{height:'100%',width:'100%'}} zoomControl={false}>
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" attribution="CARTO"/>
              {state.incidents.map(inc=>{
                if(!inc.location)return null;
                const col=sevColor(inc.severity); const r=inc.severity==='HIGH'?16:inc.severity==='MEDIUM'?12:8;
                return(<CircleMarker key={inc.id} center={inc.location} radius={r} pathOptions={{color:col,fillColor:col,fillOpacity:0.55,weight:selected?.id===inc.id?4:2}} eventHandlers={{click:()=>setSelected(inc)}}>
                  <Popup><strong style={{color:'#000'}}>{inc.emergencyType}</strong><br/>{inc.locationName}</Popup>
                </CircleMarker>);
              })}
            </MapContainer>
          </div>
          <div style={{flexShrink:0,height:215,...panel,overflowY:'auto',padding:'14px 18px'}}>
            {selected?<IncDetail inc={selected}/>:<div style={{height:'100%',display:'flex',alignItems:'center',justifyContent:'center',color:C.muted,fontSize:13}}>← Select an incident to view AI reasoning</div>}
          </div>
        </div>

        {/* RIGHT — Insights + Resources + Logs */}
        <div style={{display:'flex',flexDirection:'column',gap:10,overflow:'hidden',minHeight:0}}>
          {/* AI Insights */}
          <div style={{...panel,padding:'14px 16px',flexShrink:0}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',color:C.red,marginBottom:14}}>AI INSIGHTS</div>
            <Insight color={C.red}    icon="⚠" title="INCIDENT SPIKE"     body={`${state.stats.totalCalls} calls — AI processed all`}/>
            <Insight color={C.orange} icon="🔁" title="DUPLICATES MERGED"  body={`${state.stats.duplicatesMerged} redundant calls filtered`}/>
            <Insight color={C.amber}  icon="⚡" title="AI vs MANUAL"       body={`AI: ${state.stats.aiResponseTime} · Manual: ${state.stats.manualResponseTime}`}/>
          </div>
          {/* Resources */}
          <div style={{...panel,padding:'14px 16px',flexShrink:0}}>
            <div style={{fontSize:10,fontWeight:700,letterSpacing:'0.14em',color:C.red,marginBottom:14}}>RESOURCE STATUS</div>
            <ResRow emoji="🚑" label="Ambulances" res={state.resources.ambulances} color={C.cyan}/>
            <ResRow emoji="🚒" label="Fire Units"  res={state.resources.fireUnits}  color={C.red}/>
            <ResRow emoji="🚓" label="Police"      res={state.resources.police}     color={C.orange}/>
            {state.resources.ndrfUnits && <ResRow emoji="🚁" label="NDRF Teams"  res={state.resources.ndrfUnits}  color={C.gold}/>}
            {state.resources.swatUnits && <ResRow emoji="🛡️" label="SWAT"        res={state.resources.swatUnits}  color={'#9c27b0'}/>}
            {state.resources.hazmatUnits && <ResRow emoji="☣️" label="HAZMAT"      res={state.resources.hazmatUnits} color={C.greenBright}/>}
          </div>
          {/* Agent Log */}
          <div style={{...panel,flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{padding:'10px 14px',borderBottom:`1px solid ${C.border}`,fontSize:10,fontWeight:700,letterSpacing:'0.14em',color:C.red,flexShrink:0}}>AGENT FEED</div>
            <div style={{flex:1,overflowY:'auto',padding:10,fontFamily:'JetBrains Mono,monospace',fontSize:11}}>
              {state.logs.map(log=><LogLine key={log.id} log={log}/>)}
              {state.logs.length===0&&<div style={{color:C.muted,fontSize:11,paddingTop:8}}>Awaiting activity…</div>}
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <div style={{height:34,backgroundColor:C.bg1,borderTop:`1px solid ${C.border}`,display:'flex',alignItems:'center',justifyContent:'space-around',fontSize:11,color:C.muted,flexShrink:0}}>
        {[['Total Calls',state.stats.totalCalls],['Duplicates',state.stats.duplicatesMerged],['Active',state.stats.active],['Resolved',state.stats.resolved],['AI',state.stats.aiResponseTime],['Manual',state.stats.manualResponseTime]].map(([l,v])=>(
          <span key={l}>{l}: <strong style={{color:C.text}}>{v}</strong></span>
        ))}
      </div>

      <style>{`
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}}
        .leaflet-container{background:#141414!important}
        .leaflet-popup-content-wrapper{background:${C.bg2};color:#f5f5f5;border:1px solid #333333}
        .leaflet-popup-tip{background:${C.bg2}}
      `}</style>
    </div>
  );
}

function Pill({label,n,color}){return(<div style={{display:'flex',alignItems:'center',gap:4,background:`${color}15`,border:`1px solid ${color}33`,borderRadius:5,padding:'3px 8px'}}><span style={{fontSize:10,color,fontWeight:700}}>{label}</span><span style={{fontSize:12,color,fontWeight:800}}>{n}</span></div>);}

function IncCard({inc,sel,onClick}){
  const col=sevColor(inc.severity);
  const ago=Math.floor((Date.now()-new Date(inc.timestamp))/1000);
  const agoStr=ago<60?`${ago}s`:`${Math.floor(ago/60)}m`;
  return(
    <div onClick={onClick} style={{borderLeft:`3px solid ${col}`,borderRadius:'0 8px 8px 0',backgroundColor:sel?C.bg3:C.bg1,borderTop:`1px solid ${sel?col+'44':C.border}`,borderRight:`1px solid ${sel?col+'44':C.border}`,borderBottom:`1px solid ${sel?col+'44':C.border}`,padding:'9px 11px',marginBottom:7,cursor:'pointer',transition:'background 0.15s',animation:'fadeIn 0.3s ease'}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:9,fontWeight:800,color:col,letterSpacing:'0.1em'}}>{inc.severity}</span>
        <span style={{fontSize:9,color:C.muted,fontFamily:'monospace'}}>{agoStr}</span>
      </div>
      <div style={{fontWeight:600,fontSize:12,marginBottom:4}}>
        {inc.emergencyType.toLowerCase().includes('fire')?'🔥':'🚨'} {inc.emergencyType}
        {inc.assignedResource&&<span style={{color:C.muted,fontWeight:400}}> → <span style={{color:C.cyan}}>{inc.assignedResource}</span></span>}
      </div>
      <div style={{fontSize:11,color:C.muted,marginBottom:5,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontStyle:'italic'}}>"{inc.transcript}"</div>
      <div style={{height:2,background:'rgba(180,30,30,0.1)',borderRadius:1,marginBottom:5}}>
        <div style={{height:'100%',width:`${Math.round(inc.accuracy*100)}%`,background:`linear-gradient(90deg,rgba(180,30,30,0.4),${col})`,borderRadius:1}}/>
      </div>
      <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
        {(inc.keywords||[]).slice(0,3).map(kw=><span key={kw} style={{fontSize:9,color:C.muted,background:C.bg3,padding:'1px 5px',borderRadius:3,border:`1px solid ${C.border}`}}>{kw}</span>)}
        {inc.callCount>1&&<span style={{fontSize:9,color:C.gold,background:'rgba(184,124,24,0.1)',padding:'1px 5px',borderRadius:3}}>×{inc.callCount}</span>}
      </div>
    </div>
  );
}

function IncDetail({inc}){
  const col=sevColor(inc.severity);
  return(
    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:11}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
        <span style={{color:C.muted}}>ALERT: <span style={{color:C.cyan}}>{inc.id?.slice(0,16)}</span></span>
        <span style={{color:col,fontWeight:700}}>{inc.severity} · {(inc.status||'').toUpperCase()}</span>
      </div>
      <div style={{color:C.cyan,fontWeight:600,marginBottom:10}}>AI: Dispatch {inc.resourceNeeded} → {inc.locationName}{inc.etaMinutes?` (ETA ${inc.etaMinutes}m)`:''}</div>
      <div style={{marginBottom:10}}><span style={{color:C.muted}}>TRANSCRIPT: </span><span style={{color:C.text}}>"{inc.transcript}"</span></div>
      <div style={{marginBottom:10}}><span style={{color:C.muted}}>REASONING: </span><span style={{color:C.text,lineHeight:1.6}}>{inc.reasoning}</span></div>
      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginTop:8}}>
        {(inc.keywords||[]).map(kw=><span key={kw} style={{fontSize:9,color:C.cyan,background:'rgba(58,130,166,0.1)',border:`1px solid rgba(58,130,166,0.25)`,padding:'2px 6px',borderRadius:3}}>{kw}</span>)}
      </div>
    </div>
  );
}

function Insight({color,icon,title,body}){return(<div style={{borderLeft:`2px solid ${color}`,paddingLeft:10,marginBottom:11}}><div style={{fontSize:10,color,fontWeight:700,marginBottom:2}}>{icon} {title}</div><div style={{fontSize:11,color:C.text}}>{body}</div></div>);}

function ResRow({emoji,label,res,color}){
  const t=res?.total||0,a=res?.available??t;
  return(<div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
    <div style={{fontSize:12}}>{emoji} <span style={{color:C.text}}>{label}: <span style={{color}}>{a}/{t}</span></span></div>
    <div style={{display:'flex',gap:3}}>{Array.from({length:t}).map((_,i)=><div key={i} style={{width:9,height:9,borderRadius:2,background:i<a?color:'rgba(255,255,255,0.06)',boxShadow:i<a?`0 0 5px ${color}66`:undefined}}/>)}</div>
  </div>);
}

function LogLine({log}){
  const col=log.type==='TRIAGE'?C.cyan:log.type==='DISPATCH'?C.greenBright:log.type==='WARNING'?C.orange:C.red;
  return(<div style={{marginBottom:5,lineHeight:1.5}}><span style={{color:col}}>[{(log.type||'').padEnd(8)}]</span>{' '}<span style={{color:'#8ab0c8'}}>{log.message}</span></div>);
}
