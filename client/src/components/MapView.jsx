import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, CircleMarker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => { map.setView(center, map.getZoom(), { animate: true }); }, [center, map]);
  return null;
}

// Domain config: emoji label, ring color, fill color per emergency type
const DOMAIN = {
  fire:       { emoji: '🔥', color: '#ef4444', bg: 'rgba(239,68,68,0.15)',  label: 'FIRE'     },
  medical:    { emoji: '🚑', color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   label: 'MEDICAL'  },
  accident:   { emoji: '🚑', color: '#22c55e', bg: 'rgba(34,197,94,0.15)',   label: 'ACCIDENT' },
  hazmat:     { emoji: '☣️', color: '#eab308', bg: 'rgba(234,179,8,0.15)',   label: 'HAZMAT'   },
  chemical:   { emoji: '☣️', color: '#eab308', bg: 'rgba(234,179,8,0.15)',   label: 'HAZMAT'   },
  flood:      { emoji: '🌊', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)', label: 'FLOOD'    },
  disaster:   { emoji: '🏚', color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'DISASTER' },
  earthquake: { emoji: '🏚', color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'QUAKE'    },
  collapse:   { emoji: '🏚', color: '#f97316', bg: 'rgba(249,115,22,0.15)', label: 'COLLAPSE' },
  terrorism:  { emoji: '🛡️', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', label: 'THREAT'   },
  swat:       { emoji: '🛡️', color: '#a855f7', bg: 'rgba(168,85,247,0.15)', label: 'SWAT'     },
  crime:      { emoji: '🚔', color: '#6366f1', bg: 'rgba(99,102,241,0.15)', label: 'CRIME'    },
  default:    { emoji: '🚨', color: '#c62828', bg: 'rgba(198,40,40,0.15)',   label: 'EMERGENCY'},
};

function getDomain(emergencyType = '', resourceNeeded = '') {
  const t = (emergencyType + ' ' + resourceNeeded).toLowerCase();
  if (/fire|explosion|blast/.test(t)) return DOMAIN.fire;
  if (/medic|ambulance|hospital|cpr|cardiac|accident/.test(t)) return DOMAIN.medical;
  if (/hazmat|chemical|gas|toxic|spill|poison/.test(t)) return DOMAIN.hazmat;
  if (/flood|water|tsunami/.test(t)) return DOMAIN.flood;
  if (/disaster|earthquake|landslide|collapse|rubble|ndrf/.test(t)) return DOMAIN.disaster;
  if (/terror|swat|hostage|bomb|shooter|riot/.test(t)) return DOMAIN.swat;
  if (/police|crime|theft|assault|murder/.test(t)) return DOMAIN.crime;
  return DOMAIN.default;
}

// Build a custom DivIcon with emoji + pulsing ring
function buildIcon(domain, selected) {
  const size = selected ? 40 : 34;
  const html = `
    <div style="position:relative;width:${size}px;height:${size}px;">
      <div style="
        position:absolute;inset:0;border-radius:50%;
        background:${domain.bg};border:2px solid ${domain.color};
        display:flex;align-items:center;justify-content:center;
        font-size:${selected ? 20 : 16}px;
        box-shadow: 0 0 ${selected ? 16 : 8}px ${domain.color}88;
        animation: markerPulse 2s ease-in-out infinite;
      ">${domain.emoji}</div>
      <div style="
        position:absolute;inset:-8px;border-radius:50%;
        border:1.5px solid ${domain.color};opacity:0.35;
        animation: ringExpand 2s ease-out infinite;
      "></div>
    </div>`;
  return L.divIcon({ html, className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2], popupAnchor: [0, -size / 2] });
}

export default function MapView({ incidents, selectedIncident }) {
  const defaultCenter = [28.98, 77.05];
  const center = selectedIncident?.location || defaultCenter;

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(100,116,139,0.3)', position: 'relative' }}>
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapUpdater center={center} />

        {incidents.map((inc) => {
          if (!inc.location) return null;
          const domain = getDomain(inc.emergencyType, inc.resourceNeeded);
          const isSelected = inc.id === selectedIncident?.id;
          const icon = buildIcon(domain, isSelected);

          return (
            <Marker key={inc.id} position={inc.location} icon={icon}>
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <div style={{ fontWeight: 800, fontSize: 13, color: domain.color, marginBottom: 4 }}>
                    {domain.emoji} {inc.emergencyType}
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 2 }}>📍 {inc.locationName}</div>
                  <div style={{ fontSize: 11, color: '#888' }}>Severity: <strong>{inc.severity}</strong></div>
                  {inc.assignedResource && (
                    <div style={{ fontSize: 11, color: '#888' }}>Unit: <strong style={{ color: domain.color }}>{inc.assignedResource}</strong></div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>

      <style>{`
        @keyframes markerPulse { 0%,100%{box-shadow:0 0 8px currentColor} 50%{box-shadow:0 0 20px currentColor} }
        @keyframes ringExpand  { 0%{transform:scale(1);opacity:0.35} 100%{transform:scale(2.2);opacity:0} }
        .leaflet-container { background: #141414 !important; }
      `}</style>
    </div>
  );
}
