// src/components/DriverRouteMap.jsx
// Google-Maps-style navigation for the driver: live position, actual road
// route (not a straight line) via OSRM's free public routing API, distance
// + ETA, and auto-follow as the driver moves.

import { useEffect, useRef, useState, useCallback } from "react";
import { loadLeaflet } from "../utils/leaflet";

// Haversine, km — used to decide when it's worth re-fetching the route
function distKm(a, b) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s = Math.sin(dLat / 2) ** 2 + Math.cos((a.lat * Math.PI) / 180) *
    Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

export default function DriverRouteMap({ booking, myPosition }) {
  const mapRef          = useRef(null);
  const mapInstanceRef  = useRef(null);
  const driverMarkerRef = useRef(null);
  const destMarkerRef   = useRef(null);
  const routeLineRef    = useRef(null);
  const lastRouteFromRef = useRef(null);
  const followRef       = useRef(true);

  const [routeInfo, setRouteInfo] = useState(null); // { km, mins }
  const [routeError, setRouteError] = useState("");
  const [following, setFollowing] = useState(true);

  // Heading to pickup while ASSIGNED, then to drop once picked up / in transit
  const headingToPickup = booking.status === "ASSIGNED";
  const dest = headingToPickup
    ? { lat: booking.pickupLat, lng: booking.pickupLng, label: booking.pickup, kind: "Pickup" }
    : { lat: booking.dropLat, lng: booking.dropLng, label: booking.drop, kind: "Drop-off" };

  const hasDest = dest.lat != null && dest.lng != null;
  const hasDriverPos = myPosition && myPosition.lat != null;

  const fetchRoute = useCallback(async (from, to) => {
    try {
      const res = await fetch(
        `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=full&geometries=geojson`
      );
      const data = await res.json();
      if (data.code !== "Ok" || !data.routes?.length) throw new Error("No route found");
      const route = data.routes[0];
      setRouteInfo({ km: route.distance / 1000, mins: route.duration / 60 });
      setRouteError("");
      return route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
    } catch (e) {
      setRouteError("Live road routing unavailable — showing straight-line path.");
      return [[from.lat, from.lng], [to.lat, to.lng]];
    }
  }, []);

  const draw = useCallback(async (L, map, from, to) => {
    const driverIcon = L.divIcon({
      html: `<div style="width:18px;height:18px;border-radius:50%;background:#1d4ed8;border:3px solid white;box-shadow:0 0 0 4px rgba(29,78,216,0.25)"></div>`,
      iconSize: [18, 18], iconAnchor: [9, 9], className: "",
    });
    const destIcon = L.divIcon({
      html: `<div style="width:22px;height:22px;border-radius:50% 50% 50% 0;background:${headingToPickup ? "#f59e0b" : "#16a34a"};transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.35)"></div>`,
      iconSize: [22, 22], iconAnchor: [11, 20], className: "",
    });

    if (!driverMarkerRef.current) {
      driverMarkerRef.current = L.marker([from.lat, from.lng], { icon: driverIcon }).addTo(map);
    } else {
      driverMarkerRef.current.setLatLng([from.lat, from.lng]);
    }

    if (!destMarkerRef.current) {
      destMarkerRef.current = L.marker([to.lat, to.lng], { icon: destIcon }).addTo(map)
        .bindPopup(`${dest.kind}: ${dest.label}`);
    } else {
      destMarkerRef.current.setLatLng([to.lat, to.lng]);
    }

    const coords = await fetchRoute(from, to);

    if (routeLineRef.current) map.removeLayer(routeLineRef.current);
    routeLineRef.current = L.polyline(coords, { color: "#1d4ed8", weight: 5, opacity: 0.85 }).addTo(map);

    if (followRef.current) {
      map.fitBounds(L.latLngBounds(coords), { padding: [40, 40], maxZoom: 16 });
    }
  }, [dest.kind, dest.label, fetchRoute, headingToPickup]);

  // Init map — re-runs once GPS position first arrives too, not just when
  // the destination/phase changes (this was the bug: without hasDriverPos in
  // the deps, the map never created itself once GPS data showed up after
  // the initial mount, leaving a permanently empty div).
  useEffect(() => {
    if (!hasDest || !hasDriverPos) return;
    loadLeaflet().then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const map = L.map(mapRef.current, { zoomControl: true }).setView([myPosition.lat, myPosition.lng], 14);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors", maxZoom: 19,
      }).addTo(map);
      map.on("dragstart", () => { followRef.current = false; setFollowing(false); });
      mapInstanceRef.current = map;
      lastRouteFromRef.current = { lat: myPosition.lat, lng: myPosition.lng };
      draw(L, map, myPosition, dest);
      setTimeout(() => map.invalidateSize(), 150);
    });
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        driverMarkerRef.current = null;
        destMarkerRef.current = null;
        routeLineRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasDest, hasDriverPos, headingToPickup]);

  // Update marker + re-route as the driver moves (only re-fetch OSRM when
  // they've moved a meaningful distance, to avoid hammering the free API)
  useEffect(() => {
    if (!mapInstanceRef.current || !hasDriverPos || !hasDest) return;
    loadLeaflet().then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;
      const moved = lastRouteFromRef.current ? distKm(lastRouteFromRef.current, myPosition) : Infinity;
      if (moved > 0.15) {
        lastRouteFromRef.current = { lat: myPosition.lat, lng: myPosition.lng };
        draw(L, map, myPosition, dest);
      } else if (driverMarkerRef.current) {
        driverMarkerRef.current.setLatLng([myPosition.lat, myPosition.lng]);
        if (followRef.current) map.panTo([myPosition.lat, myPosition.lng]);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [myPosition?.lat, myPosition?.lng]);

  const recenter = () => {
    followRef.current = true;
    setFollowing(true);
    if (mapInstanceRef.current && driverMarkerRef.current) {
      mapInstanceRef.current.panTo(driverMarkerRef.current.getLatLng());
    }
  };

  if (!hasDest) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-500">
          No precise coordinates on this booking — navigate manually to <span className="text-slate-800 font-medium">{dest.label}</span>.
        </p>
      </div>
    );
  }

  if (!hasDriverPos) {
    return (
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-500">Waiting for GPS signal to start navigation…</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wide" style={{ color: headingToPickup ? "#d97706" : "#16a34a" }}>
          Navigate to {dest.kind}
        </p>
        {routeInfo && (
          <p className="text-xs text-slate-700 font-bold">
            {routeInfo.km.toFixed(1)} km · {Math.round(routeInfo.mins)} min
          </p>
        )}
      </div>
      <div className="relative rounded-xl overflow-hidden border border-slate-200">
        <div ref={mapRef} className="w-full h-56" />
        {!following && (
          <button onClick={recenter}
            className="absolute bottom-3 right-3 bg-white border border-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg shadow-lg flex items-center gap-1.5 hover:bg-slate-50 transition-colors">
            Re-center
          </button>
        )}
        <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-2.5 py-1 text-[11px] text-slate-700">
          {dest.label}
        </div>
      </div>
      {routeError && <p className="text-[11px] text-slate-400">{routeError}</p>}
    </div>
  );
}