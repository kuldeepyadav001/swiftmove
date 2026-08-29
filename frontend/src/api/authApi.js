// src/api/authApi.js
// All calls go through Vite's proxy → http://localhost:8080
//
// NOTE: login/register deliberately use plain fetch() instead of apiFetch().
// Why: apiFetch() redirects to the login page on a 401 (session expired).
// For login/register, a 401 means "wrong password" or "bad request" — it
// does NOT mean the session is expired (there IS no session yet). Routing
// these through apiFetch would kick the user back to the login page they're
// already on, losing their form state. So these stay on plain fetch.
//
// saveSession is intentionally NOT exported from here. The canonical copy
// lives in ./sessionStorage.js — App.jsx imports it from there. Keeping one
// source of truth prevents import confusion.

const BASE = `${import.meta.env.VITE_API_BASE || ""}/api/auth`;

async function request(url, body) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  let data;
  try {
    data = await res.json();
  } catch {
    // backend might return plain text error
    data = null;
  }

  if (!res.ok) {
    const msg =
      typeof data === "string"
        ? data
        : data?.message || "Something went wrong";
    throw new Error(msg);
  }

  return data;
}

export async function registerUser({ name, email, phone, password, role }) {
  return request(`${BASE}/register`, {
    name,
    email,
    phone,
    password,
    role: role?.toUpperCase(),
  });
}

export async function loginUser({ email, password, role }) {
  return request(`${BASE}/login`, {
    email,
    password,
    role: role?.toUpperCase(),
  });
}
