/**
 * useHybridLocation — Uber-style hybrid GPS + network location tracking
 *
 * Strategy:
 *  1. Start GPS watchPosition immediately (high accuracy)
 *  2. If GPS accuracy > 80m or signal lost → call /api/geolocate (network fallback)
 *  3. Smooth interpolation (lerp) prevents jitter between updates
 *  4. Avoid rapid source switching (300ms debounce on fallback trigger)
 */
import { useState, useEffect, useRef, useCallback } from 'react';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const LERP = 0.4;             // Smoothing factor (0=no move, 1=instant)
const POOR_ACCURACY = 80;     // Meters — below this, GPS is trusted
const FALLBACK_COOLDOWN = 30000; // ms — minimum time between network calls

function lerp(a, b) { return a + (b - a) * LERP; }

function classifyConfidence(accuracy) {
  if (accuracy == null) return 'low';
  if (accuracy <= 30) return 'high';
  if (accuracy <= 80) return 'medium';
  return 'low';
}

export function useHybridLocation() {
  const [location, setLocation] = useState(null); // { lat, lng, accuracy, source, mode, confidence, isLive }
  const watchIdRef      = useRef(null);
  const lastLatRef      = useRef(null);
  const lastLngRef      = useRef(null);
  const lastFallbackRef = useRef(0);
  const fallbackTimerRef = useRef(null);

  const updateSmooth = useCallback((lat, lng, accuracy, source) => {
    const mode =
      source === 'network' ? 'network_fallback' :
      accuracy <= 30       ? 'realtime_gps'     : 'hybrid';

    if (lastLatRef.current === null) {
      lastLatRef.current = lat;
      lastLngRef.current = lng;
    } else {
      lastLatRef.current = lerp(lastLatRef.current, lat);
      lastLngRef.current = lerp(lastLngRef.current, lng);
    }

    setLocation({
      lat: lastLatRef.current,
      lng: lastLngRef.current,
      accuracy,
      source,
      mode,
      confidence: classifyConfidence(accuracy),
      isLive: true,
      uiMessage:
        mode === 'realtime_gps'    ? 'Live GPS tracking enabled' :
        mode === 'network_fallback' ? 'Switching to network-based location for better accuracy' :
        'Hybrid tracking active',
    });
  }, []);

  const fetchNetworkLocation = useCallback(async () => {
    const now = Date.now();
    if (now - lastFallbackRef.current < FALLBACK_COOLDOWN) return; // debounce
    lastFallbackRef.current = now;
    try {
      const r = await fetch(`${API}/api/geolocate`, { method: 'POST' });
      if (!r.ok) return;
      const d = await r.json();
      if (d.lat && d.lng) updateSmooth(d.lat, d.lng, d.accuracy ?? 500, 'network');
    } catch { /* silent fail — GPS may have recovered */ }
  }, [updateSmooth]);

  useEffect(() => {
    if (!navigator.geolocation) {
      // No GPS at all — go straight to network
      fetchNetworkLocation();
      return;
    }

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy } = pos.coords;
        if (accuracy > POOR_ACCURACY) {
          // GPS is weak — update with what we have but also try network in background
          updateSmooth(lat, lng, accuracy, 'gps');
          clearTimeout(fallbackTimerRef.current);
          fallbackTimerRef.current = setTimeout(fetchNetworkLocation, 300);
        } else {
          // GPS is good — use it directly
          updateSmooth(lat, lng, accuracy, 'gps');
        }
      },
      (err) => {
        console.warn('GPS error:', err.message);
        fetchNetworkLocation();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );

    return () => {
      if (watchIdRef.current != null) navigator.geolocation.clearWatch(watchIdRef.current);
      clearTimeout(fallbackTimerRef.current);
    };
  }, [fetchNetworkLocation, updateSmooth]);

  return location;
}
