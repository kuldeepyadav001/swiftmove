// src/utils/leaflet.js
// Single shared Leaflet loader used by every map component (TrackingMap,
// LocationPicker, DriverRouteMap). Previously each component had its own
// copy of this logic, which raced: if the <script> tag had already finished
// loading by the time a second component checked for it, that component's
// "load" listener would attach AFTER the event already fired and would
// therefore never resolve — leaving that map permanently blank. Caching the
// promise at module scope means every caller awaits the exact same promise,
// so there is no race no matter which component mounts first.

let leafletPromise = null;

export function loadLeaflet() {
  if (leafletPromise) return leafletPromise;

  leafletPromise = new Promise((resolve) => {
    if (window.L) { resolve(window.L); return; }

    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.onload = () => resolve(window.L);
    document.head.appendChild(script);
  });

  return leafletPromise;
}