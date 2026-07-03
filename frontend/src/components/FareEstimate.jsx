// src/components/FareEstimate.jsx
import { useState, useEffect, useRef } from "react";
import { authHeaders } from "../api/authApi";

function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function formatMins(m) {
  if (!m) return "—";
  if (m < 60) return `${Math.round(m)} min`;
  return `${Math.floor(m/60)}h ${Math.round(m%60)}m`;
}

function Row({ label, sub, amount, highlight }) {
  return (
    <div className={`flex items-center justify-between py-2 ${highlight ? "border-t border-slate-200 mt-1 pt-3" : "border-b border-slate-50"}`}>
      <div>
        <span className={`text-xs ${highlight ? "font-bold text-slate-900" : "text-slate-600"}`}>{label}</span>
        {sub && <span className="text-xs text-slate-400 ml-1">· {sub}</span>}
      </div>
      <span className={`text-xs font-semibold ${highlight ? "text-blue-700 text-sm font-extrabold" : "text-slate-800"}`}>{amount}</span>
    </div>
  );
}

export default function FareEstimate({ pickup, drop, vehicleType, vehicleLabel, waitingMins = 0, onFareCalculated }) {
  const [fare, setFare]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");
  const timerRef              = useRef(null);

  useEffect(() => {
    if (!pickup || !drop || !vehicleType) { setFare(null); return; }

    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setLoading(true); setError("");
      try {
        const res = await fetch("/api/fare/calculate", {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify({
            pickup,
            drop,
            vehicleType,
            estimatedWaitingMins: waitingMins || 0,
          }),
        });
        if (!res.ok) throw new Error("Fare calculation failed");
        const data = await res.json();
        setFare(data);
        if (onFareCalculated) onFareCalculated(data);
      } catch (e) {
        setError("Could not calculate fare. Please check city names.");
        setFare(null);
      } finally { setLoading(false); }
    }, 800);

    return () => clearTimeout(timerRef.current);
  }, [pickup, drop, vehicleType, waitingMins]);

  if (!pickup || !drop || !vehicleType) return (
    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-4 text-center">
      <p className="text-xs text-slate-400">Enter pickup, drop and select a vehicle to see fare</p>
    </div>
  );

  if (loading) return (
    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-center gap-3">
      <div className="w-4 h-4 border-2 border-blue-300 border-t-blue-700 rounded-full animate-spin flex-shrink-0"/>
      <p className="text-xs text-blue-600 font-medium">Calculating fare…</p>
    </div>
  );

  if (error) return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
      <p className="text-xs text-red-600 font-medium">{error}</p>
    </div>
  );

  if (!fare) return null;

  return (
    <div className="border-2 border-blue-200 rounded-xl overflow-hidden">

      {/* Header */}
      <div className="bg-blue-700 px-4 py-3.5 flex items-center justify-between">
        <div>
          <p className="text-white font-bold text-sm">{fare.vehicleLabel}</p>
          <p className="text-blue-200 text-xs mt-0.5">
            {fare.distanceKm} km · {formatMins(fare.durationMins)}
            {!fare.orsApiUsed && <span className="ml-1 opacity-70">(estimated)</span>}
          </p>
        </div>
        <div className="text-right">
          <p className="text-white font-extrabold text-2xl">{formatINR(fare.totalFare)}</p>
          <p className="text-blue-200 text-xs">You pay</p>
        </div>
      </div>

      <div className="bg-white px-4 py-3 space-y-0.5">

        {/* API notice */}
        {!fare.orsApiUsed && (
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
            <span className="text-amber-500 text-xs mt-0.5 flex-shrink-0">⚠</span>
            <p className="text-xs text-amber-700 leading-relaxed">
              Using estimated distance. Add ORS API key for exact road distance and more accurate fares.
            </p>
          </div>
        )}

        {/* Surge */}
        {fare.surgeApplied && (
          <div className="flex items-center gap-2 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-3">
            <span className="text-orange-500 text-xs flex-shrink-0">⚡</span>
            <p className="text-xs text-orange-700 font-semibold">
              {Math.round((fare.surgeMultiplier - 1) * 100)}% surge · {fare.surgeReason}
            </p>
          </div>
        )}

        {/* Fare breakdown */}
        <Row
          label={`Base fare`}
          sub={`first ${fare.includedDistanceKm} km + ${fare.includedWaitingMins} min incl.`}
          amount={formatINR(fare.baseFare)}
        />
        {fare.distanceCharge > 0 && (
          <Row
            label="Distance charge"
            sub={`${(fare.distanceKm - fare.includedDistanceKm).toFixed(1)} km × ₹${fare.perKmRate}/km`}
            amount={formatINR(fare.distanceCharge)}
          />
        )}
        {fare.waitingCharge > 0 && (
          <Row
            label="Waiting charge"
            sub={`${waitingMins - fare.includedWaitingMins} min × ₹${fare.perMinWaitingRate}/min`}
            amount={formatINR(fare.waitingCharge)}
          />
        )}
        {fare.surgeApplied && fare.surgeCharge > 0 && (
          <Row
            label="Surge charge"
            sub={fare.surgeReason}
            amount={`+${formatINR(fare.surgeCharge)}`}
          />
        )}
        <Row label="Total" amount={formatINR(fare.totalFare)} highlight />

        {/* Divider */}
        <div className="border-t border-slate-100 my-2"/>

        {/* Driver / app split */}
       

        {/* Capacity */}
        <p className="text-center text-xs text-slate-400 pt-1 pb-0.5">
          {fare.capacity} · Rounded to nearest ₹5
        </p>
      </div>
    </div>
  );
}
