// src/api/bookingApi.js
import { authHeaders } from "./authApi";

const BASE = `${import.meta.env.VITE_API_BASE || ""}/api/bookings`;

// ── Shipper ───────────────────────────────────────────────────────────────────

export async function createBooking(data) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to create booking");
  return json;
}

export async function getMyBookings() {
  const res = await fetch(`${BASE}/my`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load bookings");
  return res.json();
}

export async function cancelBooking(id) {
  const res = await fetch(`${BASE}/${id}/cancel`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to cancel booking");
  return res.json();
}

// ── Driver ────────────────────────────────────────────────────────────────────

export async function getPendingJobs() {
  const res = await fetch(`${BASE}/pending`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load jobs");
  return res.json();
}

export async function getDriverBookings() {
  const res = await fetch(`${BASE}/driver/my`, { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load driver bookings");
  return res.json();
}

export async function acceptJob(id) {
  const res = await fetch(`${BASE}/${id}/accept`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to accept job");
  return res.json();
}

// export async function markDelivered(id) {
//   const res = await fetch(`${BASE}/${id}/deliver`, {
//     method: "PUT",
//     headers: authHeaders(),
//   });
//   if (!res.ok) throw new Error("Failed to mark delivered");
//   return res.json();
// }
// ── NEW DELIVERY HAND-OFF METHODS ─────────────────────────────────────────────

/**
 * Driver uploads photos and requests the OTP be sent to the shipper.
 */
export async function requestDelivery(id, images) {
  const res = await fetch(`${BASE}/${id}/request-delivery`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ images }),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || "Failed to request delivery OTP");
  }
  return res.json();
}

/**
 * Driver requests an OTP resend (Backend limit: 3).
 */
export async function resendDeliveryOtp(id) {
  const res = await fetch(`${BASE}/${id}/resend-delivery-otp`, {
    method: "PUT",
    headers: authHeaders(),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || "Failed to resend OTP");
  }
  return res.json();
}

/**
 * Driver enters the OTP code provided by the shipper.
 */
export async function verifyDeliveryOtp(id, otp) {
  const res = await fetch(`${BASE}/${id}/verify-delivery-otp`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ otp }),
  });
  if (!res.ok) {
    const json = await res.json();
    throw new Error(json.message || "Invalid OTP or verification failed");
  }
  return res.json();
}

/**
 * Driver or Shipper reports a dispute.
 */
export async function reportDispute(id, reason) {
  const res = await fetch(`${BASE}/${id}/report-dispute`, {
    method: "PUT",
    headers: authHeaders(),
    body: JSON.stringify({ reason }),
  });
  if (!res.ok) throw new Error("Failed to report dispute");
  return res.json();
}



// ── Admin ─────────────────────────────────────────────────────────────────────

export async function getAdminStats() {
  const res = await fetch("/api/admin/stats", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load stats");
  return res.json();
}

export async function getAllUsers() {
  const res = await fetch("/api/admin/users", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load users");
  return res.json();
}

export async function getAllBookingsAdmin() {
  const res = await fetch("/api/admin/bookings", { headers: authHeaders() });
  if (!res.ok) throw new Error("Failed to load bookings");
  return res.json();
}

export async function deleteUser(id) {
  const res = await fetch(`/api/admin/users/${id}`, {
    method: "DELETE",
    headers: authHeaders(),
  });
  if (!res.ok) throw new Error("Failed to delete user");
  return res.json();
}
