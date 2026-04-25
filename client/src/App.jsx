import { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import SOSPage from './pages/SOSPage';
import CommandCenter from './pages/CommandCenter';
import TrackPage from './pages/TrackPage';

function App() {
  return (
    <Routes>
      <Route path="/" element={<SOSPage />} />
      <Route path="/command" element={<CommandCenter />} />
      <Route path="/track/:incidentId" element={<TrackPage />} />
    </Routes>
  );
}

export default App;

