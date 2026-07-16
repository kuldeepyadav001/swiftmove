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