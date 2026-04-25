import { ShieldAlert } from 'lucide-react';

export default function AIChat({ message }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', width: '100%', marginBottom: '20px' }}>
      <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#3b82f6', display: 'flex', justifyContent: 'center', alignItems: 'center', flexShrink: 0 }}>
        <ShieldAlert size={20} color="white" />
      </div>
      <div style={{ backgroundColor: '#1e293b', padding: '16px', borderRadius: '16px', borderTopLeftRadius: '4px', position: 'relative' }}>
        <div style={{ fontSize: '16px', lineHeight: '1.4' }}>{message}</div>
      </div>
    </div>
  );
}
