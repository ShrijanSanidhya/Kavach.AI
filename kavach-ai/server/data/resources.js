export const initialResources = [
  {
    id: 'AMB-1',
    type: 'AMBULANCE',
    icon: '🚑',
    label: 'Ambulance 1',
    position: { zone: 'C3', x: 2, y: 2 },
    status: 'available',   // available | en_route | on_scene
    assignedTo: null,      // incident id or null
    eta: null,             // minutes remaining or null
  },
  {
    id: 'AMB-2', type: 'AMBULANCE', icon: '🚑', label: 'Ambulance 2',
    position: { zone: 'A1', x: 0, y: 0 },
    status: 'available', assignedTo: null, eta: null,
  },
  {
    id: 'AMB-3', type: 'AMBULANCE', icon: '🚑', label: 'Ambulance 3',
    position: { zone: 'E3', x: 4, y: 2 },
    status: 'available', assignedTo: null, eta: null,
  },
  {
    id: 'FIRE-1', type: 'FIRE_TRUCK', icon: '🚒', label: 'Fire Unit 1',
    position: { zone: 'A3', x: 0, y: 2 },
    status: 'available', assignedTo: null, eta: null,
  },
  {
    id: 'FIRE-2', type: 'FIRE_TRUCK', icon: '🚒', label: 'Fire Unit 2',
    position: { zone: 'D2', x: 3, y: 1 },
    status: 'available', assignedTo: null, eta: null,
  },
  {
    id: 'POL-1', type: 'POLICE', icon: '🚓', label: 'Police Unit 1',
    position: { zone: 'A2', x: 0, y: 1 },
    status: 'available', assignedTo: null, eta: null,
  },
  {
    id: 'POL-2', type: 'POLICE', icon: '🚓', label: 'Police Unit 2',
    position: { zone: 'E5', x: 4, y: 4 },
    status: 'available', assignedTo: null, eta: null,
  }
];

export function getResourcesByType(resources, type) {
  return resources.filter(r => r.type === type && r.status === 'available');
}
