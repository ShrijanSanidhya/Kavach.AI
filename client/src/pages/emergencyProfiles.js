export const PROFILES = {
  fire:      { icon:'F-RES',  color:'#e53935', badge:'FIRE & RESCUE',    unit:'FIRE BRIGADE',  actions:['Fire brigade en route — full suppression kit','Ambulance on standby — burn trauma team alerted','Aerial drone feed active — command monitoring'], tips:['Exit immediately · use stairs not lifts','Stay low — smoke rises above 1.5 m','Cover mouth/nose with wet cloth','Do NOT use water on electrical fires','Wait at safe distance for brigade'] },
  ndrf:      { icon:'NDRF',   color:'#fb8c00', badge:'NDRF DEPLOYED',    unit:'NDRF TEAM',     actions:['NDRF mobilised — heavy rescue kit deployed','Field medical unit & trauma team on standby','Satellite terrain mapping sent to command'], tips:['Move to higher ground if near water','Stay away from damaged structures','Switch off gas & electricity mains','Follow NDRF team instructions strictly','Conserve drinking water & food'] },
  hazmat:    { icon:'HZMT',   color:'#7cb342', badge:'HAZMAT ACTIVE',    unit:'HAZMAT UNIT',   actions:['HAZMAT team deployed — full PPE & containment','Fire suppression unit on ignition-prevention standby','GAIL/IGL alerted — isolation valve sequence started'], tips:['Move upwind away from the leak','No flames · do not switch any electrics','Open windows & evacuate immediately','Cover face — breathe as little as possible','Avoid using mobile near leak zone'] },
  ambulance: { icon:'MED',    color:'#1e88e5', badge:'MEDICAL RESPONSE', unit:'AMBULANCE',     actions:['ALS ambulance dispatched — paramedics en route','ER trauma bay reserved — code red','AI voice first-aid guide now active'], tips:['Apply firm pressure to bleeding wounds','30 chest compressions + 2 breaths if no pulse','Do NOT move patient if spine injury suspected','For diabetic emergency give sugar if conscious','Stay on line — paramedic will guide you'] },
  swat:      { icon:'TACT',   color:'#9c27b0', badge:'TACTICAL UNIT',    unit:'SWAT / NSG',    actions:['SWAT tactical unit mobilised — counter-threat gear','Aerial drone + helicopter recon en route','IB & district police intelligence coordination live'], tips:['Evacuate area calmly — do not run or shout','Switch phone to silent if threatened','Cooperate fully — do not resist confrontation','Signal responders from safe hidden position','Do NOT touch suspicious packages'] },
  police:    { icon:'POL',    color:'#c62828', badge:'POLICE DISPATCHED',unit:'POLICE UNIT',   actions:['Multiple police units converging on location','District control room alerted via ERSS','Nearest junctions being sealed — perimeter active'], tips:['Stay at a safe location','Keep phone on silent if in danger','Move away from the threat if possible','Stay on line — police tracking your location','Remain visible to responders when safe'] },
};

export const getProfile = (type = '', res = '') => {
  const t = type.toLowerCase(), r = res.toLowerCase();
  if (t.includes('fire')||t.includes('explo')||t.includes('blast')||r==='fire') return PROFILES.fire;
  if (t.includes('land')||t.includes('flood')||t.includes('quake')||t.includes('cycl')||t.includes('tsun')||t.includes('disas')||t.includes('collap')||r==='ndrf') return PROFILES.ndrf;
  if (t.includes('gas')||t.includes('chem')||t.includes('leak')||t.includes('toxic')||r==='hazmat') return PROFILES.hazmat;
  if (t.includes('medic')||t.includes('card')||t.includes('stroke')||t.includes('accid')||t.includes('injur')||r==='ambulance') return PROFILES.ambulance;
  if (t.includes('swat')||t.includes('host')||t.includes('terror')||t.includes('bomb')||r==='swat') return PROFILES.swat;
  return PROFILES.police;
};
