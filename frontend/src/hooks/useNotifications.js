// src/hooks/useNotifications.js
import { useState, useEffect, useCallback, useRef } from "react";
import { authHeaders } from "../api/sessionStorage";

export function useNotifications(user, wsClient) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [toasts, setToasts]               = useState([]);
  const subRef = useRef(null);

  // ── Load existing notifications from MongoDB ──────────────────────────
  const loadNotifications = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await fetch("/api/notifications", { headers: authHeaders() });
      if (!res.ok) return;
      const data = await res.json();
      setNotifications(data);
      setUnreadCount(data.filter(n => !n.read).length);
    } catch (e) {
      console.error("Failed to load notifications", e);
    }
  }, [user?.id]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // ── Subscribe to real-time notifications via WebSocket ─────────────────
  useEffect(() => {
    if (!wsClient?.current?.connected || !user?.id) return;

    // Subscribe to personal notifications
    const personalSub = wsClient.current.subscribe(
      `/topic/notifications/${user.id}`,
      (frame) => {
        try {
          const notif = JSON.parse(frame.body);
          addNotification(notif);
        } catch (e) {
          console.error("Notification parse error", e);
        }
      }
    );

    // Drivers subscribe to broadcast channel too
    let driverSub = null;
    if (user.role === "driver") {
      driverSub = wsClient.current.subscribe(
        "/topic/notifications/drivers",
        (frame) => {
          try {
            const notif = JSON.parse(frame.body);
            addNotification(notif);
          } catch (e) {
            console.error("Driver notification parse error", e);
          }
        }
      );
    }

    subRef.current = { personalSub, driverSub };

    return () => {
      personalSub?.unsubscribe();
      driverSub?.unsubscribe();
    };
  }, [wsClient?.current?.connected, user?.id]);

  // ── Add notification + show toast ─────────────────────────────────────
  const addNotification = useCallback((notif) => {
    setNotifications(prev => [notif, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show toast for 4 seconds
    const toastId = Date.now();
    setToasts(prev => [...prev, { ...notif, toastId }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.toastId !== toastId));
    }, 4000);
  }, []);

  // ── Mark all read ──────────────────────────────────────────────────────
  const markAllRead = useCallback(async () => {
    try {
      await fetch("/api/notifications/mark-all-read", {
        method: "PUT",
        headers: authHeaders(),
      });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  }, []);

  // ── Mark one read ──────────────────────────────────────────────────────
  const markOneRead = useCallback(async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: "PUT",
        headers: authHeaders(),
      });
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) {
      console.error("Failed to mark read", e);
    }
  }, []);

  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.toastId !== toastId));
  }, []);

  return {
    notifications,
    unreadCount,
    toasts,
    markAllRead,
    markOneRead,
    dismissToast,
    addNotification,
  };
}
