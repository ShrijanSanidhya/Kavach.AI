import { useState, useEffect, useCallback } from 'react';

export function useSSE() {
  const [incidents, setIncidents] = useState([]);
  const [resources, setResources] = useState([]);
  const [callLog, setCallLog] = useState([]);
  const [agentLogs, setAgentLogs] = useState([]);
  const [stats, setStats] = useState({
    totalCalls: 0, duplicatesMerged: 0, activeIncidents: 0,
    resolved: 0, avgResponseTime: 0
  });
  const [isConnected, setIsConnected] = useState(false);
  const [isChaosMode, setIsChaosMode] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [latestCall, setLatestCall] = useState(null);
  const [latestDispatch, setLatestDispatch] = useState(null);

  useEffect(() => {
    let eventSource = null;
    let retryTimeout = null;

    const connect = () => {
      eventSource = new EventSource('/events');

      eventSource.onopen = () => {
        setIsConnected(true);
      };

      eventSource.addEventListener('init', (e) => {
        const data = JSON.parse(e.data);
        setIncidents(data.incidents || []);
        setResources(data.resources || []);
        setCallLog(data.callLog ? data.callLog.reverse().slice(0, 20) : []);
        setAgentLogs(data.agentLogs || []);
        setStats(data.stats || stats);
        setIsChaosMode(data.chaosMode || false);
        setIsPaused(data.isPaused || false);
      });

      eventSource.addEventListener('new_call', (e) => {
        const data = JSON.parse(e.data);
        const processingCall = { ...data.call, status: 'processing' };
        setCallLog(prev => [processingCall, ...prev].slice(0, 20));
        setStats(data.stats);
        setLatestCall(processingCall);
      });

      eventSource.addEventListener('agent_log', (e) => {
        const data = JSON.parse(e.data);
        setAgentLogs(prev => [...prev, data].slice(-50));
      });

      eventSource.addEventListener('triage_complete', (e) => {
        const data = JSON.parse(e.data);
        setIncidents(prev => {
          const exists = prev.find(i => i.id === data.incident.id);
          if (exists) {
            return prev.map(i => i.id === data.incident.id ? data.incident : i);
          }
          return [...prev, data.incident];
        });
      });

      eventSource.addEventListener('dispatch_complete', (e) => {
        const data = JSON.parse(e.data);
        setIncidents(prev => prev.map(i => i.id === data.incident.id ? { ...data.incident, status: 'dispatched' } : i));
        setResources(prev => prev.map(r => r.id === data.vehicle.id ? data.vehicle : r));
        setLatestDispatch({ incident: data.incident, vehicle: data.vehicle, eta: data.eta });
      });

      eventSource.addEventListener('duplicate_detected', (e) => {
        const data = JSON.parse(e.data);
        setCallLog(prev => prev.map(c => c.id === data.callId ? { ...c, status: 'duplicate', mergedInto: data.mergedInto } : c));
        if (data.incident) {
          setIncidents(prev => prev.map(i => i.id === data.incident.id ? data.incident : i));
        }
      });

      eventSource.addEventListener('resource_update', (e) => {
        const data = JSON.parse(e.data);
        setResources(data.resources);
      });

      eventSource.addEventListener('stats_update', (e) => {
        const data = JSON.parse(e.data);
        setStats(prev => ({ ...prev, ...data.stats }));
      });

      eventSource.addEventListener('chaos_start', () => {
        setIsChaosMode(true);
      });

      eventSource.addEventListener('chaos_end', () => {
        setTimeout(() => setIsChaosMode(false), 3000);
      });

      eventSource.addEventListener('incident_resolved', (e) => {
        const data = JSON.parse(e.data);
        setIncidents(prev => prev.map(i => i.id === data.id ? { ...i, status: 'resolved' } : i));
      });

      eventSource.addEventListener('reset', (e) => {
        const data = JSON.parse(e.data);
        setIncidents(data.incidents || []);
        setResources(data.resources || []);
        setCallLog([]);
        setAgentLogs([]);
        setStats(data.stats || stats);
        setIsChaosMode(false);
        setIsPaused(false);
        setLatestCall(null);
        setLatestDispatch(null);
      });

      eventSource.onerror = () => {
        setIsConnected(false);
        eventSource.close();
        retryTimeout = setTimeout(connect, 3000);
      };
    };

    connect();

    return () => {
      if (eventSource) eventSource.close();
      if (retryTimeout) clearTimeout(retryTimeout);
    };
  }, []);

  const pauseStream = useCallback(() => {
    fetch('/api/pause', { method: 'POST' }).then(() => setIsPaused(true));
  }, []);

  const resumeStream = useCallback(() => {
    fetch('/api/resume', { method: 'POST' }).then(() => setIsPaused(false));
  }, []);

  const resetSystem = useCallback(() => {
    fetch('/api/reset', { method: 'POST' });
  }, []);

  const triggerChaos = useCallback(() => {
    fetch('/api/chaos', { method: 'POST' });
  }, []);

  const sendCall = useCallback((transcript) => {
    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript })
    });
  }, []);

  const resolveIncident = useCallback((id) => {
    fetch(`/api/resolve/${id}`, { method: 'POST' });
  }, []);

  return {
    incidents,
    resources,
    callLog,
    agentLogs,
    stats,
    isConnected,
    isChaosMode,
    isPaused,
    latestCall,
    latestDispatch,
    pauseStream,
    resumeStream,
    resetSystem,
    triggerChaos,
    sendCall,
    resolveIncident
  };
}
