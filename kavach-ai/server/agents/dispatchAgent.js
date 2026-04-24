import Anthropic from '@anthropic-ai/sdk';
import { 
  getState, findDuplicate, mergeIntoDuplicate, addIncident, 
  updateIncident, updateResource, getAvailableResources, addAgentLog 
} from '../state/store.js';
import { getManhattanDistance, getNearestAvailableVehicle, getZoneCoords } from '../data/cityGraph.js';
import dotenv from 'dotenv';
dotenv.config();

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const DISPATCH_SYSTEM_PROMPT = `You are KAVACH DISPATCH — an AI dispatch coordinator managing 
emergency vehicles during a mass casualty disaster event.

Your job: given an incident and available vehicles, select the 
optimal vehicle to dispatch. Consider pre-positioning a secondary 
unit if severity is high.

Return ONLY valid JSON. No markdown. No explanation.

{
  "selectedVehicleId": "AMB-1",
  "reasoning": "one clear sentence explaining the choice",
  "estimatedArrival": <integer, minutes>,
  "alternativeVehicleId": "AMB-2 or null",
  "prePositionVehicleId": "FIRE-2 or null",
  "prePositionZone": "C2 or null"
}

Rules:
1. Match vehicle type: MEDICAL→AMBULANCE, FIRE→FIRE_TRUCK, 
   ACCIDENT→any, COLLAPSE→MULTIPLE
2. Closer vehicle = faster response (Manhattan distance)
3. Severity 5: dispatch closest matching unit IMMEDIATELY
4. Severity 4+: consider pre-positioning a secondary unit
5. If no matching vehicle available: use closest available any type
6. estimatedArrival = Manhattan distance * 2 (minutes per block)`;

export async function dispatchIncident(triageResult, resources) {
  const existing = findDuplicate(triageResult.location, triageResult.incidentType);
  
  if (existing) {
    mergeIntoDuplicate(existing.id, triageResult);
    return {
      isDuplicate: true,
      mergedInto: existing.id,
      incident: getState().incidents.find(i => i.id === existing.id)
    };
  }

  const incidentId = `INC-${String(getState().incidents.length + 1).padStart(3, '0')}`;
  
  const incident = {
    id: incidentId,
    location: triageResult.location,
    locationDescription: triageResult.locationDescription,
    severity: triageResult.severity,
    incidentType: triageResult.incidentType,
    resourceNeeded: triageResult.resourceNeeded,
    summary: triageResult.summary,
    keyDetails: triageResult.keyDetails,
    confidence: triageResult.confidence,
    status: 'triaging',
    reportCount: 1,
    escalated: false,
    hasConflict: false,
    conflictNote: null,
    assignedVehicle: null,
    eta: null,
    createdAt: Date.now(),
    lastUpdated: Date.now(),
  };
  
  addIncident(incident);

  const activeIncidents = getState().incidents.filter(i => i.status !== 'resolved');
  const adjacentActive = activeIncidents.filter(i => {
    if (i.id === incidentId) return false;
    const dist = getManhattanDistance(i.location, triageResult.location);
    return dist <= 2;
  });
  
  if (adjacentActive.length >= 1) {
    const availableBackup = getState().resources.find(r => r.status === 'available');
    if (availableBackup) {
      addAgentLog(
        `Cluster detected near Zone ${triageResult.location} — considering pre-positioning`,
        'SYSTEM'
      );
    }
  }

  const availableVehicles = getAvailableResources();
  const vehiclesWithDistance = availableVehicles.map(v => ({
    ...v,
    distance: getManhattanDistance(v.position.zone, triageResult.location),
    estimatedMinutes: getManhattanDistance(v.position.zone, triageResult.location) * 2
  }));

  const prompt = `
INCIDENT:
- ID: ${incidentId}
- Type: ${triageResult.incidentType}
- Severity: ${triageResult.severity}/5
- Location: Zone ${triageResult.location} (${triageResult.locationDescription})
- Resource Needed: ${triageResult.resourceNeeded}
- Summary: ${triageResult.summary}

AVAILABLE VEHICLES:
${vehiclesWithDistance.map(v => 
  `- ${v.id} (${v.type}): Zone ${v.position.zone}, Distance: ${v.distance} blocks, ETA: ${v.estimatedMinutes} min`
).join('\n')}

Select the best vehicle. Pre-position a secondary if severity >= 4.`;

  let decision;
  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 300,
      system: DISPATCH_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: prompt }]
    });
    
    const text = response.content[0].text.replace(/```json|```/g, '').trim();
    decision = JSON.parse(text);
  } catch (err) {
    console.error('Dispatch agent failed:', err);
    let typeToMatch = 'POLICE';
    if (triageResult.resourceNeeded && triageResult.resourceNeeded.includes('AMBULANCE')) typeToMatch = 'AMBULANCE';
    if (triageResult.resourceNeeded && triageResult.resourceNeeded.includes('FIRE')) typeToMatch = 'FIRE_TRUCK';

    const nearest = getNearestAvailableVehicle(availableVehicles, triageResult.location, typeToMatch) || availableVehicles[0];
    
    if (nearest) {
      const dist = getManhattanDistance(nearest.position.zone, triageResult.location);
      decision = {
        selectedVehicleId: nearest.id,
        reasoning: "Fallback automatic dispatch due to AI agent timeout/error.",
        estimatedArrival: dist * 2,
        alternativeVehicleId: null,
        prePositionVehicleId: null,
        prePositionZone: null
      };
    } else {
      decision = {
        selectedVehicleId: null,
        reasoning: "No vehicles available for fallback dispatch.",
        estimatedArrival: null,
        alternativeVehicleId: null,
        prePositionVehicleId: null,
        prePositionZone: null
      };
    }
  }

  if (decision.selectedVehicleId) {
    updateIncident(incidentId, {
      status: 'dispatched',
      assignedVehicle: decision.selectedVehicleId,
      eta: decision.estimatedArrival,
      lastUpdated: Date.now()
    });
    
    updateResource(decision.selectedVehicleId, {
      status: 'en_route',
      assignedTo: incidentId,
      eta: decision.estimatedArrival,
      destination: triageResult.location
    });
  }

  if (decision.prePositionVehicleId && decision.prePositionZone) {
    const coords = getZoneCoords(decision.prePositionZone);
    updateResource(decision.prePositionVehicleId, {
      position: { zone: decision.prePositionZone, ...coords },
      status: 'available'
    });
    addAgentLog(
      `Pre-positioning ${decision.prePositionVehicleId} to Zone ${decision.prePositionZone} — anticipating demand`,
      'SYSTEM'
    );
  }

  return {
    isDuplicate: false,
    incident: getState().incidents.find(i => i.id === incidentId),
    vehicle: decision.selectedVehicleId ? getState().resources.find(r => r.id === decision.selectedVehicleId) : null,
    eta: decision.estimatedArrival,
    reasoning: decision.reasoning,
    prePosition: decision.prePositionVehicleId ? {
      vehicleId: decision.prePositionVehicleId,
      zone: decision.prePositionZone
    } : null
  };
}
