import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";

export function useWebSocket() {
  const clientRef = useRef(null);
  const subscriptionsRef = useRef({});

  useEffect(() => {
    const client = new Client({
      brokerURL:  import.meta.env.VITE_WS_URL || "ws://localhost:8080/ws",
      reconnectDelay: 5000,
      debug: () => {},
    });

    client.onConnect = () => console.log("WebSocket connected ✓");
    client.onStompError = (f) => console.error("STOMP error", f);
    client.activate();
    clientRef.current = client;

    return () => client.deactivate();
  }, []);

  const sendLocation = useCallback((msg) => {
    if (clientRef.current?.connected) {
      clientRef.current.publish({
        destination: "/app/location",
        body: JSON.stringify(msg),
      });
    }
  }, []);

  /**
   * Generic subscribe to any STOMP topic.
   * Key is used to track + unsubscribe later.
   * Safe to call before connection is ready — polls until connected.
   */
  const subscribe = useCallback((key, topic, onMessage) => {
    // Unsubscribe existing sub for this key if any
    if (subscriptionsRef.current[key]) {
      subscriptionsRef.current[key].unsubscribe();
      delete subscriptionsRef.current[key];
    }

    const wait = setInterval(() => {
      if (clientRef.current?.connected) {
        clearInterval(wait);
        const sub = clientRef.current.subscribe(topic, (frame) => {
          try {
            onMessage(JSON.parse(frame.body));
          } catch (e) {
            console.error("WS parse error", e);
          }
        });
        subscriptionsRef.current[key] = sub;
      }
    }, 200);
  }, []);

  const unsubscribe = useCallback((key) => {
    subscriptionsRef.current[key]?.unsubscribe();
    delete subscriptionsRef.current[key];
  }, []);

  // Convenience wrappers kept for backward compatibility
  const subscribeToBooking = useCallback(
    (bookingId, onMessage) =>
      subscribe(`booking-${bookingId}`, `/topic/booking/${bookingId}`, onMessage),
    [subscribe]
  );

  const unsubscribeFromBooking = useCallback(
    (bookingId) => unsubscribe(`booking-${bookingId}`),
    [unsubscribe]
  );

  // Driver: subscribe to new-job broadcasts
  const subscribeToNewJobs = useCallback(
    (onMessage) => subscribe("new-jobs", "/topic/jobs/new", onMessage),
    [subscribe]
  );

  const unsubscribeFromNewJobs = useCallback(
    () => unsubscribe("new-jobs"),
    [unsubscribe]
  );

  return {
    sendLocation,
    subscribe,
    unsubscribe,
    subscribeToBooking,
    unsubscribeFromBooking,
    subscribeToNewJobs,
    unsubscribeFromNewJobs,
  };
}