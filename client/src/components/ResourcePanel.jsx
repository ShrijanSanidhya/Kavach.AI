export default function ResourcePanel({ resources }) {
  const { ambulances, fireUnits, police } = resources;

  const renderBar = (total, available, color) => {
    const used = total - available;
    return (
      <div style={{ display: 'flex', gap: '2px' }}>
        {[...Array(total)].map((_, i) => (
          <div key={i} style={{ width: '12px', height: '12px', backgroundColor: i < available ? color : '#334155' }} />
        ))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
      <h3 style={{ margin: 0, fontSize: '14px', color: '#94a3b8' }}>RESOURCE STATUS</h3>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🚑</span>
          <span style={{ fontSize: '14px' }}>Ambulances: {ambulances.available}/{ambulances.total} available</span>
        </div>
        {renderBar(ambulances.total, ambulances.available, '#e2e8f0')}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🚒</span>
          <span style={{ fontSize: '14px' }}>Fire Units: {fireUnits.available}/{fireUnits.total} available</span>
        </div>
        {renderBar(fireUnits.total, fireUnits.available, '#ef4444')}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '18px' }}>🚓</span>
          <span style={{ fontSize: '14px' }}>Police: {police.available}/{police.total} available</span>
        </div>
        {renderBar(police.total, police.available, '#3b82f6')}
      </div>
    </div>
  );
}
