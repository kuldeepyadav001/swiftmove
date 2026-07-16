// src/api/bookingApi.js
import { apiFetch } from "./apiFetch";

const BASE = `${import.meta.env.VITE_API_BASE || ""}/api/bookings`;

// ── Shipper ───────────────────────────────────────────────────────────────────
export const createBooking  = (data) => apiFetch(BASE, { method: "POST", body: JSON.stringify(data) });
export const getMyBookings  = ()     => apiFetch(`${BASE}/my`);
export const cancelBooking  = (id)   => apiFetch(`${BASE}/${id}/cancel`, { method: "PUT" });

// ── Driver ────────────────────────────────────────────────────────────────────
export const getPendingJobs    = ()   => apiFetch(`${BASE}/pending`);
export const getDriverBookings = ()   => apiFetch(`${BASE}/driver/my`);
export const acceptJob         = (id) => apiFetch(`${BASE}/${id}/accept`, { method: "PUT" });

// ── Delivery hand-off ─────────────────────────────────────────────────────────
export const requestDelivery    = (id, images) => apiFetch(`${BASE}/${id}/request-delivery`,      { method: "PUT", body: JSON.stringify({ images }) });
export const resendDeliveryOtp  = (id)         => apiFetch(`${BASE}/${id}/resend-delivery-otp`,    { method: "PUT" });
export const verifyDeliveryOtp  = (id, otp)    => apiFetch(`${BASE}/${id}/verify-delivery-otp`,    { method: "PUT", body: JSON.stringify({ otp }) });
export const reportDispute      = (id, reason) => apiFetch(`${BASE}/${id}/report-dispute`,         { method: "PUT", body: JSON.stringify({ reason }) });

// ── Admin ─────────────────────────────────────────────────────────────────────
export const getAdminStats      = ()   => apiFetch("/api/admin/stats");
export const getAllUsers        = ()   => apiFetch("/api/admin/users");
export const getAllBookingsAdmin = ()  => apiFetch("/api/admin/bookings");
export const deleteUser         = (id) => apiFetch(`/api/admin/users/${id}`, { method: "DELETE" });