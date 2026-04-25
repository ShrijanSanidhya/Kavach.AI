import { useEffect, useRef } from 'react';

export default function AgentFeed({ logs }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#94a3b8' }}>AGENT THINKING FEED</h3>
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: '#000', padding: '10px', borderRadius: '8px', fontFamily: 'monospace', fontSize: '12px', border: '1px solid rgba(100,116,139,0.3)' }}>
        {logs.map((log) => {
          let color = '#94a3b8';
          if (log.category === 'WARNING') color = '#f97316';
          if (log.category === 'SYSTEM') color = '#ef4444';
          if (log.category === 'DISPATCH') color = '#22c55e';
          if (log.category === 'TRIAGE') color = '#3b82f6';
          
          return (
            <div key={log.id} style={{ marginBottom: '6px' }}>
              <span style={{ color }}>[{log.category.padEnd(8)}]</span> <span style={{ color: '#e2e8f0' }}>{log.message}</span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
