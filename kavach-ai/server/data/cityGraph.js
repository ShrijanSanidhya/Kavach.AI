export const LANDMARKS = {
  A1:'North Hospital', A2:'Police HQ', A3:'Fire Station Alpha',
  A4:'Railway Station', A5:'North Bridge',
  B1:'Central Market', B2:'Old Town Square', B3:'City Park',
  B4:'School District', B5:'Harbor Area',
  C1:'Highway Junction', C2:'Shopping Mall', C3:'City Center',
  C4:'Tech District', C5:'Industrial Zone',
  D1:'Residential North', D2:'Community Center', D3:'Stadium',
  D4:'University Campus', D5:'Riverside',
  E1:'Suburb West', E2:'Airport Road', E3:'Medical District',
  E4:'Suburb East', E5:'South Bridge'
};

export function getZoneCoords(zone) {
  if (!zone || zone.length < 2) return { x: 0, y: 0 };
  const colChar = zone.charAt(0).toUpperCase();
  const rowChar = zone.charAt(1);
  
  const x = colChar.charCodeAt(0) - 65; // A=0, B=1, C=2, D=3, E=4
  const y = parseInt(rowChar) - 1;      // 1=0, 2=1, 3=2, 4=3, 5=4
  
  return { x: Math.max(0, Math.min(4, x)), y: Math.max(0, Math.min(4, y)) };
}

export function getManhattanDistance(zone1, zone2) {
  const coords1 = getZoneCoords(zone1);
  const coords2 = getZoneCoords(zone2);
  return Math.abs(coords1.x - coords2.x) + Math.abs(coords1.y - coords2.y);
}

export function getLandmark(zone) {
  return LANDMARKS[zone] || zone;
}

export function getNearestAvailableVehicle(vehicles, targetZone, type) {
  const availableVehicles = vehicles.filter(v => v.type === type && v.status === 'available');
  if (availableVehicles.length === 0) return null;
  
  let nearest = null;
  let minDistance = Infinity;
  
  for (const vehicle of availableVehicles) {
    const dist = getManhattanDistance(vehicle.position.zone, targetZone);
    if (dist < minDistance) {
      minDistance = dist;
      nearest = vehicle;
    }
  }
  
  return nearest;
}
