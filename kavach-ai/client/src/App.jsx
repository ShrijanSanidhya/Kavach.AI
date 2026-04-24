import React from 'react';
import { useSSE } from './hooks/useSSE.js';
import Header from './components/Header.jsx';
import AgentThinkingFeed from './components/AgentThinkingFeed.jsx';
import CallFeed from './components/CallFeed.jsx';
import CityGrid from './components/CityGrid.jsx';
import IncidentBoard from './components/IncidentBoard.jsx';
import ResourcePanel from './components/ResourcePanel.jsx';
import HumanCostCounter from './components/HumanCostCounter.jsx';
import VoiceInput from './components/VoiceInput.jsx';

function App() {
  const {
    incidents,
    resources,
    callLog,
    agentLogs,
    stats,
    isConnected,
    isChaosMode,
    isPaused,
    pauseStream,
    resumeStream,
    resetSystem,
    triggerChaos,
    sendCall,
    resolveIncident
  } = useSSE();

  return (
    <div className="min-h-screen bg-navy-900 text-slate-200 flex flex-col"
         style={{ fontFamily: 'Inter, sans-serif' }}>

      {/* CHAOS MODE OVERLAY — full screen red flash */}
      {isChaosMode && (
        <div className="fixed inset-0 pointer-events-none z-50 
                        bg-red-500/20 animate-pulse" />
      )}

      {/* HEADER */}
      <Header 
        isChaosMode={isChaosMode}
        isPaused={isPaused}
        isConnected={isConnected}
        stats={stats}
        onChaos={triggerChaos}
        onPause={isPaused ? resumeStream : pauseStream}
        onReset={resetSystem}
      />

      {/* MAIN 3-COLUMN LAYOUT */}
      <div className="flex flex-1 overflow-hidden" style={{ height: 'calc(100vh - 110px)' }}>
        
        {/* LEFT — Call Feed */}
        <div className="w-[22%] border-r border-slate-700/50 overflow-y-auto">
          <CallFeed calls={callLog} />
        </div>

        {/* CENTER — Map + Incident Board */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="h-[45%] border-b border-slate-700/50">
            <CityGrid 
              resources={resources} 
              incidents={incidents}
            />
          </div>
          <div className="flex-1 overflow-y-auto">
            <IncidentBoard 
              incidents={incidents}
              onResolve={resolveIncident}
            />
          </div>
        </div>

        {/* RIGHT — Agent Feed + Resources + Voice */}
        <div className="w-[28%] border-l border-slate-700/50 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto">
            <AgentThinkingFeed logs={agentLogs} />
          </div>
          <div className="border-t border-slate-700/50 overflow-y-auto" 
               style={{ maxHeight: '40%' }}>
            <ResourcePanel resources={resources} stats={stats} />
          </div>
          <div className="border-t border-slate-700/50 p-3">
            <VoiceInput onCallSubmit={sendCall} />
          </div>
        </div>
      </div>

      {/* BOTTOM BAR */}
      <HumanCostCounter stats={stats} />
    </div>
  );
}

export default App;
