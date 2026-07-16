// src/hooks/useDistancePrice.js
// Calls POST /api/fare/calculate with debounce
// Falls back gracefully when ORS key not set

import { useState, useEffect, useRef } from "react";
import { authHeaders } from "../api/sessionStorage";

export function useDistancePrice(pickup, drop, vehicleType) {
  const [fare, setFare]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const timerRef              = useRef(null);

  useEffect(() => {
    // Need all three to calculate
    if (!pickup || !drop || !vehicleType) {
      setFare(null);
      return;
    }

    // Debounce — wait 800ms after user stops typing
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch("/api/fare/calculate", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({ pickup, drop, vehicleType }),
        });
        if (!res.ok) throw new Error("Could not calculate fare");
        const data = await res.json();
        setFare(data);
      } catch (e) {
        setError("Could not calculate fare. Please check city names.");
        setFare(null);
      } finally {
        setLoading(false);
      }
    }, 800);

    return () => clearTimeout(timerRef.current);
  }, [pickup, drop, vehicleType]);

  return { fare, loading, error };
}
