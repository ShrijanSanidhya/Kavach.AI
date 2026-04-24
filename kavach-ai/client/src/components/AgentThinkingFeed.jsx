import React, { useRef, useEffect, useState } from 'react';

const TypeStyle = {
  TRIAGE: 'bg-blue-900/50 text-blue-300',
  DISPATCH: 'bg-orange-900/50 text-orange-300',
  SYSTEM: 'bg-yellow-900/50 text-yellow-300',
  WARNING: 'bg-red-900/50 text-red-300'
};

const LogEntry = ({ log, isLast }) => {
  const [displayedText, setDisplayedText] = useState('');
  
  useEffect(() => {
    if (!isLast) {
      setDisplayedText(log.message);
      return;
    }
    
    setDisplayedText('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayedText(log.message.slice(0, i + 1));
      i++;
      if (i >= log.message.length) {
        clearInterval(interval);
      }
    }, 10);
    return () => clearInterval(interval);
  }, [log.message, isLast]);

  const timeStr = new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false });
  const typeStr = `[${log.type}]`;
  const style = TypeStyle[log.type] || 'bg-slate-800 text-slate-300';

  return (
    <div className="mb-2 animate-[slideInTop_0.3s_ease-out] opacity-100 transition-opacity duration-300">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-slate-500 text-xs font-mono">{timeStr}</span>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${style}`}>{typeStr}</span>
      </div>
      <div className="text-sm text-slate-300 font-mono leading-tight">
        {displayedText}
      </div>
    </div>
  );
};

export default function AgentThinkingFeed({ logs }) {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  const displayLogs = logs.slice(-15);
  const hiddenCount = Math.max(0, logs.length - 15);

  return (
    <div className="flex flex-col h-full bg-navy-900">
      <div className="p-3 border-b border-slate-700 text-xs font-mono text-slate-400 bg-navy-800 shrink-0">
        🧠 AGENT THINKING
      </div>
      <div className="flex-1 overflow-y-auto p-3" ref={scrollRef}>
        {hiddenCount > 0 && (
          <div className="text-xs text-slate-500 italic mb-4 text-center">
            ... {hiddenCount} earlier messages
          </div>
        )}
        {displayLogs.map((log, index) => (
          <LogEntry key={log.id || index} log={log} isLast={index === displayLogs.length - 1} />
        ))}
      </div>
    </div>
  );
}
