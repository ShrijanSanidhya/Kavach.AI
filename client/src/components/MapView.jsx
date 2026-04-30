import { useEffect } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// Component to handle map center changes
function MapUpdater({ center }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [center, map]);
  return null;
}

export default function MapView({ incidents, selectedIncident }) {
  const defaultCenter = [28.98, 77.05]; 
  const center = selectedIncident?.location || defaultCenter;

  return (
    <div style={{ height: '100%', width: '100%', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(100,116,139,0.3)' }}>
      <MapContainer center={center} zoom={12} style={{ height: '100%', width: '100%' }} zoomControl={false}>
        {/* CartoDB Dark Matter free tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <MapUpdater center={center} />
        
        {incidents.map((inc) => {
          if (!inc.location) return null;
          const isHigh = inc.severity === 'HIGH';
          const radius = isHigh ? 16 : inc.severity === 'MEDIUM' ? 12 : 8;
          const color = isHigh ? '#ef4444' : inc.severity === 'MEDIUM' ? '#f97316' : '#eab308';
          
          return (
            <CircleMarker
              key={inc.id}
              center={inc.location}
              radius={radius}
              pathOptions={{
                color: color,
                fillColor: color,
                fillOpacity: 0.6,
                weight: inc.id === selectedIncident?.id ? 4 : 2
              }}
            >
              <Popup>
                <strong style={{ color: '#000' }}>{inc.emergencyType}</strong><br/>
                <span style={{ color: '#333' }}>{inc.locationName}</span>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
