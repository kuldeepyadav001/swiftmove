// src/utils/leaflet.js
// Shared Leaflet loader. Leaflet is installed via npm (in package.json) but
// its CSS must be imported separately. This module lazily imports both so
// map components don't pay the cost until they actually mount.
//
// Previously each map component had its own copy of this logic, which raced:
// if the script had already loaded by the time a second component checked,
// that component's "load" listener would fire too late and the map would
// stay blank forever. Caching the promise at module scope fixes this.

let leafletPromise = null;

export function loadLeaflet() {
  if (leafletPromise) return leafletPromise;

  leafletPromise = (async () => {
    // Import JS and CSS from npm package
    const L = (await import("leaflet")).default;
    await import("leaflet/dist/leaflet.css");

    // Fix default marker icon paths (Vite bundles break Leaflet's relative URLs)
    // eslint-disable-next-line no-undef
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
      iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
      shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    });

    window.L = L;
    return L;
  })();

  return leafletPromise;
}
