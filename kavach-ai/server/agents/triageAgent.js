import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are KAVACH — an emergency triage AI for a disaster response 
center processing 911 calls during a mass casualty event.

Your job: analyze the call transcript and extract structured data.

Return ONLY valid JSON. No markdown. No explanation. No extra text.
Just the raw JSON object.

{
  "location": "grid zone e.g. B2 or C3",
  "locationDescription": "human readable landmark name",
  "severity": <integer 1-5>,
  "incidentType": "FIRE | MEDICAL | ACCIDENT | COLLAPSE | OTHER",
  "resourceNeeded": "AMBULANCE | FIRE_TRUCK | POLICE | MULTIPLE",
  "summary": "max 12 words describing the incident",
  "keyDetails": ["detail1", "detail2", "detail3"],
  "confidence": <float 0.0 to 1.0>,
  "possibleDuplicate": <boolean>
}

Severity scale:
5 = Multiple casualties, immediate life threat, minutes matter
4 = Serious injury, time-critical, single or few casualties
3 = Moderate emergency, stable but needs urgent response
2 = Minor emergency, not life-threatening
1 = Non-urgent, informational

Confidence = how certain you are about the LOCATION specifically:
1.0 = caller gave exact address or clear landmark
0.7 = caller gave approximate area
0.5 = inferred from context
< 0.5 = caller was unclear, panicked, gave no clear location

possibleDuplicate = true if caller mentions others have called,
or if the incident matches a pattern you'd expect to be reported 
by multiple people (large collapse, major fire in public area).

City grid reference:
A1=North Hospital, A2=Police HQ, A3=Fire Station Alpha,
A4=Railway Station, A5=North Bridge,
B1=Central Market, B2=Old Town Square, B3=City Park,
B4=School District, B5=Harbor Area,
C1=Highway Junction, C2=Shopping Mall, C3=City Center,
C4=Tech District, C5=Industrial Zone,
D1=Residential North, D2=Community Center, D3=Stadium,
D4=University Campus, D5=Riverside,
E1=Suburb West, E2=Airport Road, E3=Medical District,
E4=Suburb East, E5=South Bridge`;

const delay = ms => new Promise(r => setTimeout(r, ms));

export async function triageCall(transcript) {
  const MAX_RETRIES = 2;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 500,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `911 CALL TRANSCRIPT:\n${transcript}` }]
      });
      
      const text = response.content[0].text.trim();
      const clean = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(clean);
      
      return {
        location: parsed.location || 'C3',
        locationDescription: parsed.locationDescription || 'Unknown Location',
        severity: parsed.severity || 3,
        incidentType: parsed.incidentType || 'OTHER',
        resourceNeeded: parsed.resourceNeeded || 'POLICE',
        summary: parsed.summary || 'Emergency reported',
        keyDetails: parsed.keyDetails || [],
        confidence: parsed.confidence ?? 0.7,
        possibleDuplicate: parsed.possibleDuplicate ?? false,
      };
    } catch (err) {
      if (attempt === MAX_RETRIES) {
        console.error('Triage agent failed:', err);
        return {
          location: 'C3', locationDescription: 'City Center',
          severity: 3, incidentType: 'OTHER',
          resourceNeeded: 'POLICE',
          summary: 'Emergency — details unclear',
          keyDetails: [], confidence: 0.3,
          possibleDuplicate: false,
        };
      }
      await delay(1000 * (attempt + 1));
    }
  }
}
