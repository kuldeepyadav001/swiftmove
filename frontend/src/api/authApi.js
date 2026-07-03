// src/api/authApi.js
// All calls go through Vite's proxy → http://localhost:8080

const BASE = "/api/auth";

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

// Save token + user info to localStorage after login/register
export function saveSession(data) {
  localStorage.setItem("swiftmove_token", data.token);
  localStorage.setItem(
    "swiftmove_user",
    JSON.stringify({
      id: data.id,
      name: data.name,
      email: data.email,
      role: data.role.toLowerCase(),
    })
  );
}

// Load existing session on page reload
export function loadSession() {
  const token = localStorage.getItem("swiftmove_token");
  const user = localStorage.getItem("swiftmove_user");
  if (!token || !user) return null;
  return JSON.parse(user);
}

// Clear on logout
export function clearSession() {
  localStorage.removeItem("swiftmove_token");
  localStorage.removeItem("swiftmove_user");
}

// Attach token to any authenticated API call
export function authHeaders() {
  const token = localStorage.getItem("swiftmove_token");
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}