2import { useEffect, useState } from 'react';

export default function AccuracyBar({ triageData }) {
  const [fill, setFill] = useState(0);

  useEffect(() => {
    const target = (triageData.accuracy * 100);
    const interval = setInterval(() => {
      setFill(prev => {
        if (prev >= target) {
          clearInterval(interval);
          return target;
        }
        return prev + 5;
      });
    }, 50);
    return () => clearInterval(interval);
  }, [triageData.accuracy]);

  const color = fill > 80 ? '#22c55e' : fill > 50 ? '#f97316' : '#ef4444';

  return (
    <div style={{ width: '100%', marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#94a3b8', fontSize: '14px' }}>
        <span>AI Understanding your emergency...</span>
        <span>{Math.round(fill)}%</span>
      </div>
      <div style={{ width: '100%', height: '8px', backgroundColor: '#1e293b', borderRadius: '4px', overflow: 'hidden', marginBottom: '16px' }}>
        <div style={{ height: '100%', width: `${fill}%`, backgroundColor: color, transition: 'width 0.1s linear, background-color 0.3s' }} />
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
        <div style={{ opacity: fill > 20 ? 1 : 0, transition: 'opacity 0.3s' }}>✓ Emergency Type: <strong style={{ color: '#e2e8f0' }}>{triageData.emergencyType || "Detecting..."}</strong></div>
        <div style={{ opacity: fill > 40 ? 1 : 0, transition: 'opacity 0.3s' }}>✓ Severity: <strong style={{ color: '#ef4444' }}>{triageData.severity || "Detecting..."}</strong></div>
        <div style={{ opacity: fill > 60 ? 1 : 0, transition: 'opacity 0.3s' }}>✓ Location: <strong style={{ color: '#e2e8f0' }}>{triageData.locationName || "Detecting..."}</strong></div>
      </div>
    </div>
  );
}
