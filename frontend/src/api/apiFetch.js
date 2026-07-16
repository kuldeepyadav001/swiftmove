// src/api/apiFetch.js
// Shared fetch wrapper for every authenticated API call.
//
// WHY THIS EXISTS: every api/*.js file used to do its own raw fetch() + its
// own res.ok/error-parsing logic — repeated boilerplate in ~10 places, and
// NONE of them checked for a 401. That meant an expired token (see the JWT
// bug) would just show a confusing generic error instead of logging the
// person out and sending them back to login.
//
// This is the "interceptor" pattern: instead of repeating cross-cutting
// concerns (auth header, session-expiry handling, error parsing) in every
// caller, one shared function does it once, and everything else gets thinner.
import { authHeaders, clearSession } from "./sessionStorage";

export async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: { ...authHeaders(), ...(options.headers || {}) },
  });

  // Expired/invalid token → the backend now returns a clean 401 (previously
  // a raw 500 crash — see JwtAuthFilter fix). Treat it the same way
  // everywhere: drop the stale session and send the person back to login
  // instead of showing them a broken screen.
  if (res.status === 401) {
    clearSession();
    window.location.href = "/";
    throw new Error("Session expired. Please log in again.");
  }

  let data;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    throw new Error(data?.message || "Something went wrong");
  }
  return data;
}