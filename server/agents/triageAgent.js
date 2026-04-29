import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const genAI = process.env.GOOGLE_API_KEY ? new GoogleGenerativeAI(process.env.GOOGLE_API_KEY) : null;

export const triageEmergency = async (transcript) => {
  if (!groq) {
    console.warn('⚠ No GROQ_API_KEY — using fallback triage');
    return fallback(transcript);
  }

  try {
    const chat = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      response_format: { type: 'json_object' },
      messages: [{
        role: 'system',
        content: `You are an Autonomous Emergency Dispatch AI inside the KAVACH system.

Your job is to:
1. Analyze incoming emergency data (voice transcript, image/video input, metadata).
2. Classify:
   - emergency_type (fire, medical, crime, disaster, unknown)
   - severity (low, medium, high, critical)
3. Generate a CONFIDENCE SCORE (0 to 100) for your classification.

🚨 CRITICAL RULE: HUMAN FALLBACK
If confidence_score < 80:
- IMMEDIATELY trigger HUMAN FALLBACK MODE.
In HUMAN FALLBACK MODE:
1. Do NOT delay response.
2. Dispatch a SAFE DEFAULT response (nearest ambulance/police).
3. Simultaneously escalate to a human dispatcher.
4. Mark case as "REQUIRES HUMAN VALIDATION".

If confidence_score >= 80:
- Proceed with full autonomous dispatch.

📤 OUTPUT FORMAT (STRICT JSON):
{
  "emergency_type": "",
  "severity": "",
  "location": "",
  "confidence_score": 0,
  "dispatch_units": [],
  "fallback_triggered": true/false,
  "action": "",
  "user_message": "",
  "survival_instructions": ""
}

🧾 ACTION RULES:
If fallback_triggered = true:
- action = "Dispatch default unit + Notify human dispatcher"
- user_message = "We are connecting you to an emergency operator while help is being dispatched."

If fallback_triggered = false:
- action = "Autonomous dispatch"
- user_message = "Help is on the way."

🧠 IMPORTANT:
- NEVER return empty fields. Extract location if possible, else "Unknown".
- ALWAYS prioritize user safety over accuracy.
- When unsure -> fallback.
- Be fast, decisive, and safe.`
      }, {
        role: 'user',
        content: `Analyze this emergency input:\n"${transcript}"`
      }]
    });

    const parsed = JSON.parse(chat.choices[0].message.content);
    
    // Map to the internal application format
    let resourceNeeded = "police";
    if (parsed.dispatch_units && parsed.dispatch_units.length > 0) {
      const units = parsed.dispatch_units.map(u => u.toLowerCase());
      if (units.some(u => u.includes('fire'))) resourceNeeded = 'fire';
      else if (units.some(u => u.includes('med') || u.includes('amb'))) resourceNeeded = 'ambulance';
      else if (units.some(u => u.includes('swat'))) resourceNeeded = 'swat';
      else if (units.some(u => u.includes('ndrf'))) resourceNeeded = 'ndrf';
      else if (units.some(u => u.includes('hazmat'))) resourceNeeded = 'hazmat';
    } else {
      if ((parsed.emergency_type || '').toLowerCase().includes('fire')) resourceNeeded = 'fire';
      else if ((parsed.emergency_type || '').toLowerCase().includes('med')) resourceNeeded = 'ambulance';
    }
    
    return {
      emergencyType: parsed.emergency_type || "Emergency",
      severity: (parsed.severity || "MEDIUM").toUpperCase(),
      locationName: parsed.location || "Location pending",
      keywords: parsed.dispatch_units || [],
      accuracy: (parsed.confidence_score || 50) / 100,
      followUpQuestion: parsed.user_message || null,
      reasoning: `${parsed.action || ''} | ${parsed.survival_instructions || ''}`,
      resourceNeeded: resourceNeeded,
      fallback_triggered: parsed.fallback_triggered || false
    };
  } catch (err) {
    console.error('Groq error:', err.message);
    return fallback(transcript);
  }
};

const fallback = (text) => {
  const t = text.toLowerCase();
  const isFire      = /fire|aag|burn|blast|explosion/.test(t);
  const isMedical   = /medic|hospital|unconscious|blood|heart|breathe|attack/.test(t);
  const isAccident  = /accident|crash|collision|car|truck/.test(t);
  const isLandslide = /landslide|earthquake|flood|collapse|building|rubble|stuck|trapped/.test(t);
  const isSwat      = /shooter|terrorist|gun|hostage|riot|bomb|weapon/.test(t);
  const isHazmat    = /chemical|gas leak|toxic|poison|spill|acid/.test(t);

  const hasLocation = /karol bagh|okhla|delhi|connaught|rohini|noida|gurugram|dwarka|janakpuri/.test(t);
  const hasScale    = /\d+\s*(people|log|floor|person)|many|several|multiple|trapped|everyone/.test(t);

  let accuracy = 0.55;
  if (text.length > 15) accuracy += 0.15;
  if (text.length > 35) accuracy += 0.10;
  if (isFire || isMedical || isAccident || isLandslide || isSwat || isHazmat) accuracy += 0.10;
  if (hasLocation) accuracy += 0.08;
  if (hasScale)    accuracy += 0.06;
  accuracy = Math.min(0.97, accuracy);

  const type = isSwat ? 'Terrorism/Riot' 
             : isHazmat ? 'Chemical Spill' 
             : isLandslide ? 'Disaster/Collapse' 
             : isFire ? 'Fire' 
             : isMedical ? 'Medical' 
             : isAccident ? 'Accident' 
             : 'Emergency';

  const sev  = (isFire || isLandslide || isSwat || isHazmat) ? 'HIGH' : (isMedical || isAccident) ? 'MEDIUM' : 'LOW';
  
  const res  = isSwat ? 'swat' 
             : isHazmat ? 'hazmat' 
             : isLandslide ? 'ndrf' 
             : isFire ? 'fire' 
             : isMedical ? 'ambulance' 
             : 'police';
  const loc  = /karol bagh/i.test(t) ? 'Karol Bagh'
              : /okhla/i.test(t) ? 'Okhla'
              : /connaught/i.test(t) ? 'Connaught Place'
              : /rohini/i.test(t) ? 'Rohini'
              : /noida/i.test(t) ? 'Noida'
              : /dwarka/i.test(t) ? 'Dwarka'
              : 'X3MR+42 Kishora, Haryana';

  const followupQ = (isFire || isLandslide) ? 'Exact address kya hai? Aur kitne log phanse hai?' : 'Exact address kya hai?';

  return {
    emergencyType: type,
    severity: sev,
    locationName: loc,
    keywords: [sev, type.toUpperCase(), hasScale ? 'MASS-CASUALTY' : 'DISTRESS'],
    accuracy: Number(accuracy.toFixed(2)),
    followUpQuestion: accuracy < 0.85 ? followupQ : null,
    reasoning: `${type} emergency detected via keyword analysis. Confidence boosted by ${hasLocation ? 'location' : 'context'} signals. Simulated response (no API key).`,
    resourceNeeded: res,
    fallback_triggered: false
  };
};

// ── Vision Analysis ───────────────────────────────────────────
// Uses Gemini to describe the emergency scene from an image.
// Falls back gracefully if there's an error.
export const analyzeImage = async (imageBase64, mimeType) => {
  if (!genAI) {
    console.warn('⚠ No GOOGLE_API_KEY — using fallback vision analysis');
    return { success: false, text: "Visual analysis is unavailable (missing API key)." };
  }
  
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const prompt = 'You are an emergency dispatcher AI. Analyze this image from an emergency caller. In 2-3 concise sentences, describe: (1) what emergency is visible, (2) apparent severity and scale, (3) any identifying details like location clues, number of people, hazards. Be factual and direct.';
    
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType
      }
    };
    
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    return { success: true, text: response.text().trim() };
  } catch (err) {
    console.error('Gemini vision error:', err.message);
    return { success: false, text: "Visual analysis encountered an error." };
  }
};

