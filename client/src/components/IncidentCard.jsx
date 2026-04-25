import { ShieldAlert, MapPin } from 'lucide-react';

export default function IncidentCard({ incident, isSelected, onClick }) {
  const isHigh = incident.severity === 'HIGH';
  const isMedium = incident.severity === 'MEDIUM';
  const borderColor = isHigh ? '#ef4444' : isMedium ? '#f97316' : '#eab308';
  
  const timeAgo = Math.floor((Date.now() - new Date(incident.timestamp).getTime()) / 1000) + 's ago';

  return (
    <div 
      onClick={() => onClick(incident)}
      style={{ 
        backgroundColor: isSelected ? '#1e293b' : '#0d1526', 
        borderLeft: `4px solid ${borderColor}`,
        borderTop: '1px solid rgba(100,116,139,0.2)',
        borderRight: '1px solid rgba(100,116,139,0.2)',
        borderBottom: '1px solid rgba(100,116,139,0.2)',
        padding: '12px',
        marginBottom: '10px',
        borderRadius: '0 8px 8px 0',
        cursor: 'pointer',
        transition: 'background-color 0.2s'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '12px' }}>
        <span style={{ color: borderColor, fontWeight: 'bold' }}>{incident.severity}</span>
        <span style={{ color: '#94a3b8' }}>{timeAgo}</span>
      </div>
      <div style={{ fontWeight: 'bold', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {incident.emergencyType.toLowerCase().includes('fire') ? '🔥' : '🚨'} 
        {incident.emergencyType} → {incident.assignedResource || "Pending"}
      </div>
      <div style={{ color: '#94a3b8', fontSize: '14px', fontStyle: 'italic', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        "{incident.transcript}"
      </div>
      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
        {incident.keywords?.map(kw => (
          <span key={kw} style={{ backgroundColor: 'rgba(100,116,139,0.3)', padding: '2px 6px', borderRadius: '4px', fontSize: '10px', color: '#e2e8f0' }}>
            {kw}
          </span>
        ))}
      </div>
    </div>
  );
}
