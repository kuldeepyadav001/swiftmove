// src/components/LocationPicker.jsx
// Precise pickup/drop location capture: type-ahead address search (Nominatim,
// free, no API key) + a draggable pin on a Leaflet map so the user can fine-tune
// to the exact house/gate, not just the city. Emits { address, lat, lng }.

import { useState, useEffect, useRef, useCallback } from "react";
import { loadLeaflet } from "../utils/leaflet";

const DEFAULT_CENTER = [26.4499, 80.3319]; // Kanpur — same fallback as the rest of the app

export default function LocationPicker({ label, placeholder, value, onChange, accent = "blue" }) {
  const [query, setQuery]           = useState(value?.address || "");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching]   = useState(false);
  const [showMap, setShowMap]       = useState(false);
  const [locating, setLocating]     = useState(false);
  const [error, setError]           = useState("");

  const mapRef         = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef       = useRef(null);
  const debounceRef     = useRef(null);

  const dot   = accent === "amber" ? "bg-amber-500" : "bg-blue-600";
  const ring  = accent === "amber" ? "focus:border-amber-400 focus:ring-amber-100" : "focus:border-blue-400 focus:ring-blue-100";
  const text  = accent === "amber" ? "text-amber-600" : "text-blue-600";
  const pinColor = accent === "amber" ? "#f59e0b" : "#1d4ed8";

  // Keep the input text in sync if the parent resets `value` externally
  useEffect(() => {
    if (value?.address !== undefined && value.address !== query) setQuery(value.address || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value?.address]);

  // ── Type-ahead search via Nominatim (free, no key) ─────────────────────────
  const handleQueryChange = (v) => {
    setQuery(v);
    setError("");
    clearTimeout(debounceRef.current);
    if (v.trim().length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(v)}`,
          { headers: { "Accept-Language": "en" } }
        );
        const data = await res.json();
        setSuggestions(data || []);
      } catch (e) {
        setSuggestions([]);
      } finally { setSearching(false); }
    }, 450);
  };

  const pickSuggestion = (s) => {
    const lat = parseFloat(s.lat), lng = parseFloat(s.lon);
    setQuery(s.display_name);
    setSuggestions([]);
    onChange({ address: s.display_name, lat, lng });
    setShowMap(true);
    placeMarker(lat, lng, true);
  };

  // ── "Use my current location" ──────────────────────────────────────────────
  const useCurrentLocation = () => {
    if (!navigator.geolocation) { setError("Location access not supported by this browser."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setShowMap(true);
        placeMarker(lat, lng, true);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
            { headers: { "Accept-Language": "en" } }
          );
          const data = await res.json();
          const address = data?.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setQuery(address);
          onChange({ address, lat, lng });
        } catch {
          const address = `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
          setQuery(address);
          onChange({ address, lat, lng });
        } finally { setLocating(false); }
      },
      () => { setError("Couldn't get your location. Check browser permissions."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // ── Map + draggable marker ──────────────────────────────────────────────────
  const placeMarker = useCallback((lat, lng, recenter) => {
    loadLeaflet().then((L) => {
      if (!mapRef.current) return;
      if (!mapInstanceRef.current) {
        const map = L.map(mapRef.current, { zoomControl: true }).setView([lat, lng], 16);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "© OpenStreetMap contributors", maxZoom: 19,
        }).addTo(map);
        mapInstanceRef.current = map;
      } else if (recenter) {
        mapInstanceRef.current.setView([lat, lng], 16);
      }

      const icon = L.divIcon({
        html: `<div style="width:20px;height:20px;border-radius:50% 50% 50% 0;background:${pinColor};transform:rotate(-45deg);border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.35)"></div>`,
        iconSize: [20, 20], iconAnchor: [10, 18], className: "",
      });

      if (!markerRef.current) {
        markerRef.current = L.marker([lat, lng], { icon, draggable: true }).addTo(mapInstanceRef.current);
        markerRef.current.on("dragend", async () => {
          const { lat: nlat, lng: nlng } = markerRef.current.getLatLng();
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=json&lat=${nlat}&lon=${nlng}`,
              { headers: { "Accept-Language": "en" } }
            );
            const data = await res.json();
            const address = data?.display_name || `${nlat.toFixed(5)}, ${nlng.toFixed(5)}`;
            setQuery(address);
            onChange({ address, lat: nlat, lng: nlng });
          } catch {
            const address = `${nlat.toFixed(5)}, ${nlng.toFixed(5)}`;
            setQuery(address);
            onChange({ address, lat: nlat, lng: nlng });
          }
        });
      } else {
        markerRef.current.setLatLng([lat, lng]);
      }

      // Leaflet needs a nudge to size correctly once its container becomes visible
      setTimeout(() => mapInstanceRef.current && mapInstanceRef.current.invalidateSize(), 150);
    });
  }, [pinColor]);

  // Initialize map lazily the first time it's shown
  useEffect(() => {
    if (showMap) {
      const lat = value?.lat || DEFAULT_CENTER[0];
      const lng = value?.lng || DEFAULT_CENTER[1];
      placeMarker(lat, lng, !!value?.lat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showMap]);

  useEffect(() => () => {
    if (mapInstanceRef.current) { mapInstanceRef.current.remove(); mapInstanceRef.current = null; markerRef.current = null; }
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</label>
        <button type="button" onClick={useCurrentLocation} disabled={locating}
          className={`text-[11px] font-bold ${text} hover:underline flex items-center gap-1 disabled:opacity-50`}>
          {locating ? "Locating…" : "Use my location"}
        </button>
      </div>

      <div className="relative">
        <input
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full px-4 py-3 rounded-xl border border-slate-200 ${ring} outline-none text-sm focus:ring-2`}
        />
        {searching && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-3.5 h-3.5 border-2 border-slate-200 border-t-slate-500 rounded-full animate-spin" />
          </div>
        )}

        {suggestions.length > 0 && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-64 overflow-y-auto">
            {suggestions.map((s) => (
              <button key={s.place_id} type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickSuggestion(s)}
                className="w-full text-left px-4 py-2.5 hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors">
                <p className="text-sm text-slate-800 truncate">{s.display_name}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500 font-medium mt-1.5">⚠ {error}</p>}

      {value?.lat && (
        <button type="button" onClick={() => setShowMap((s) => !s)}
          className="text-[11px] text-slate-400 hover:text-slate-600 mt-1.5 flex items-center gap-1">
          <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
          {showMap ? "Hide map" : "Fine-tune pin on map"} · {value.lat.toFixed(5)}, {value.lng.toFixed(5)}
        </button>
      )}

      {showMap && (
        <div className="mt-2 rounded-xl overflow-hidden border border-slate-200 relative">
          <div ref={mapRef} className="w-full h-52" />
          <div className="absolute bottom-2 left-2 right-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-500 pointer-events-none">
            Drag the pin to the exact spot
          </div>
        </div>
      )}
    </div>
  );
}