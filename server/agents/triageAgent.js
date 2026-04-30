import Groq from 'groq-sdk';
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();

const groq = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;
const genAI = new GoogleGenerativeAI('AIzaSyB0rrL0X8QpIz9iF5FANJG4Mh7vrTYwQ1s');

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
        content: 'You are an emergency triage AI. Reply ONLY with valid JSON.'
      }, {
        role: 'user',
        content: `Analyze this 911 call transcript and return JSON:
"${transcript}"

Required fields:
- emergencyType: string  (e.g. "Fire", "Medical", "Police", "Flood", "Collapse")
- severity: "HIGH" | "MEDIUM" | "LOW"
- locationName: string  (extracted place or "Unknown")
- keywords: string[]    (3-5 relevant tags like ["FIRE","PANIC","TRAPPED"])
- accuracy: number      (0.0–1.0, how much clear info was provided)
- followUpQuestion: string | null  (ask in Hindi or English if accuracy < 0.85, else null)
- reasoning: string     (1-2 sentence explanation of your decision)
- resourceNeeded: "ambulance" | "fire" | "police" | "ndrf" | "swat" | "hazmat" | "multiple"`
      }]
    });

    return JSON.parse(chat.choices[0].message.content);
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
  };
};

// ── Vision Analysis ───────────────────────────────────────────
// Uses Gemini to describe the emergency scene from an image.
// Falls back gracefully if there's an error.
export const analyzeImage = async (imageBase64, mimeType) => {
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

