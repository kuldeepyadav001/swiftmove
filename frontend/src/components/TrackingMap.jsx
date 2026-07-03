// src/components/TrackingMap.jsx
// Leaflet.js map with real-time driver location from WebSocket

import { useEffect, useRef } from "react";

export default function TrackingMap({ booking, driverLocation }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const driverMarkerRef = useRef(null);
  const routeLineRef = useRef(null);
  const trailRef = useRef([]);

  useEffect(() => {
    // Load Leaflet CSS dynamically
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    // Load Leaflet JS dynamically
    const loadLeaflet = () => {
      return new Promise((resolve) => {
        if (window.L) { resolve(window.L); return; }
        const script = document.createElement("script");
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.onload = () => resolve(window.L);
        document.head.appendChild(script);
      });
    };

    loadLeaflet().then((L) => {
      if (mapInstanceRef.current || !mapRef.current) return;

      // Default center: Kanpur
      const defaultLat = booking?.pickupLat || 26.4499;
      const defaultLng = booking?.pickupLng || 80.3319;

      const map = L.map(mapRef.current, { zoomControl: true }).setView([defaultLat, defaultLng], 12);

      // OpenStreetMap tiles — free, no API key
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      // Pickup marker (blue)
      const pickupIcon = L.divIcon({
        html: `<div style="background:#1d4ed8;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7], className: "",
      });

      // Drop marker (green)
      const dropIcon = L.divIcon({
        html: `<div style="background:#16a34a;width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.3)"></div>`,
        iconSize: [14, 14], iconAnchor: [7, 7], className: "",
      });

      // Truck marker
      const truckIcon = L.divIcon({
        html: `<div style="background:#1d4ed8;padding:6px 8px;border-radius:8px;color:white;font-size:18px;box-shadow:0 2px 8px rgba(0,0,0,0.3);transform:translate(-50%,-50%)">🚛</div>`,
        iconSize: [40, 40], iconAnchor: [20, 20], className: "",
      });

      if (booking?.pickupLat) {
        L.marker([booking.pickupLat, booking.pickupLng], { icon: pickupIcon })
          .addTo(map)
          .bindPopup(`<b>Pickup</b><br>${booking.pickup}`);
      }
      if (booking?.dropLat) {
        L.marker([booking.dropLat, booking.dropLng], { icon: dropIcon })
          .addTo(map)
          .bindPopup(`<b>Drop</b><br>${booking.drop}`);
      }

      // Initial driver marker
      const initLat = driverLocation?.latitude || defaultLat;
      const initLng = driverLocation?.longitude || defaultLng;
      driverMarkerRef.current = L.marker([initLat, initLng], { icon: truckIcon })
        .addTo(map)
        .bindPopup(`<b>${driverLocation?.driverName || "Driver"}</b>`);

      mapInstanceRef.current = map;
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        driverMarkerRef.current = null;
      }
    };
  }, []);

  // Update driver marker when new location arrives
  useEffect(() => {
    if (!mapInstanceRef.current || !driverLocation || !window.L) return;
    const { latitude: lat, longitude: lng } = driverLocation;
    if (!lat || !lng) return;

    // Move marker
    driverMarkerRef.current?.setLatLng([lat, lng]);

    // Draw trail
    trailRef.current.push([lat, lng]);
    if (routeLineRef.current) {
      mapInstanceRef.current.removeLayer(routeLineRef.current);
    }
    if (trailRef.current.length > 1) {
      routeLineRef.current = window.L.polyline(trailRef.current, {
        color: "#1d4ed8", weight: 3, opacity: 0.6, dashArray: "6 4",
      }).addTo(mapInstanceRef.current);
    }

    // Pan map to follow driver
    mapInstanceRef.current.panTo([lat, lng], { animate: true, duration: 0.5 });
  }, [driverLocation]);

  return (
    <div className="relative w-full h-64 rounded-xl overflow-hidden border border-slate-200">
      <div ref={mapRef} className="w-full h-full" />
      {driverLocation && (
        <div className="absolute bottom-3 left-3 bg-white rounded-lg px-3 py-1.5 shadow text-xs font-semibold text-slate-700 z-[1000]">
          🚛 {driverLocation.driverName} · {driverLocation.speed?.toFixed(0) || 0} km/h
        </div>
      )}
      {!driverLocation && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-100/80 z-[999]">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-blue-700 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-medium">Waiting for driver location…</p>
          </div>
        </div>
      )}
    </div>
  );
}
