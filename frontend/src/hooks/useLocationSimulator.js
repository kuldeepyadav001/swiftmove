// src/hooks/useLocationSimulator.js
// Simulates GPS movement along a route for testing
// In production, replace with: navigator.geolocation.watchPosition()

import { useEffect, useRef, useCallback } from "react";

// Simulates movement between two points
function interpolate(start, end, fraction) {
  return {
    lat: start.lat + (end.lat - start.lat) * fraction,
    lng: start.lng + (end.lng - start.lng) * fraction,
  };
}

// City coordinates for simulation
const CITY_COORDS = {
  "kanpur":    { lat: 26.4499, lng: 80.3319 },
  "delhi":     { lat: 28.6139, lng: 77.2090 },
  "lucknow":   { lat: 26.8467, lng: 80.9462 },
  "agra":      { lat: 27.1767, lng: 78.0081 },
  "varanasi":  { lat: 25.3176, lng: 82.9739 },
  "mumbai":    { lat: 19.0760, lng: 72.8777 },
  "default":   { lat: 26.4499, lng: 80.3319 },
};

function getCityCoords(cityName) {
  if (!cityName) return CITY_COORDS.default;
  const key = cityName.toLowerCase().split(",")[0].trim();
  return CITY_COORDS[key] || CITY_COORDS.default;
}

export function useLocationSimulator(booking, isActive, onLocationUpdate) {
  const progressRef = useRef(0);
  const intervalRef = useRef(null);

  const start = useCallback(() => {
    if (!booking || !isActive) return;

    const from = getCityCoords(booking.pickup);
    const to   = getCityCoords(booking.drop);
    progressRef.current = 0;

    intervalRef.current = setInterval(() => {
      progressRef.current += 0.005; // advance 0.5% every tick
      if (progressRef.current > 1) {
        progressRef.current = 1;
        clearInterval(intervalRef.current);
      }

      const pos = interpolate(from, to, progressRef.current);
      // Add small random jitter for realism
      const jitter = 0.001;
      onLocationUpdate({
        latitude:  pos.lat + (Math.random() - 0.5) * jitter,
        longitude: pos.lng + (Math.random() - 0.5) * jitter,
        speed: 45 + Math.random() * 30,  // 45-75 km/h
      });
    }, 2000); // update every 2 seconds
  }, [booking, isActive, onLocationUpdate]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isActive) start();
    else stop();
    return stop;
  }, [isActive, start, stop]);

  return { stop };
}

// Real GPS version — use this in production
export function useRealGPS(isActive, onLocationUpdate) {
  const watchIdRef = useRef(null);

  useEffect(() => {
    if (!isActive || !navigator.geolocation) return;

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        onLocationUpdate({
          latitude:  pos.coords.latitude,
          longitude: pos.coords.longitude,
          speed: (pos.coords.speed || 0) * 3.6, // m/s to km/h
        });
      },
      (err) => console.error("GPS error:", err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, [isActive, onLocationUpdate]);
}
