// src/components/RateCardAdmin.jsx
// Add this tab to AdminDashboard
import { useState, useEffect } from "react";
import { authHeaders } from "../api/authApi";

const CITIES = ["kanpur","delhi","mumbai","lucknow","agra","varanasi",
                "bangalore","hyderabad","chennai","kolkata","pune","jaipur"];

const VEHICLE_ORDER = ["bike","three-wheeler","tata-ace","pickup","large-truck"];

function formatINR(n) { return `₹${Number(n||0).toLocaleString("en-IN")}`; }

export default function RateCardAdmin() {
  const [city, setCity]         = useState("kanpur");
  const [cards, setCards]       = useState([]);
  const [editing, setEditing]   = useState(null);   // rateCard being edited
  const [form, setForm]         = useState({});
  const [loading, setLoading]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [success, setSuccess]   = useState("");

  useEffect(() => { loadCards(); }, [city]);

  async function loadCards() {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/rate-cards/${city}`, { headers: authHeaders() });
      const data = await res.json();
      // Sort by vehicle order
      const sorted = [...data].sort((a,b) =>
        VEHICLE_ORDER.indexOf(a.vehicleType) - VEHICLE_ORDER.indexOf(b.vehicleType));
      setCards(sorted);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function startEdit(card) {
    setEditing(card.id);
    setForm({
      baseFare:           card.baseFare,
      perKmRate:          card.perKmRate,
      perMinWaitingRate:  card.perMinWaitingRate,
      commissionPct:      Math.round(card.commissionPct * 100),
      peakHourMultiplier: card.peakHourMultiplier,
      weekendMultiplier:  card.weekendMultiplier,
      includedDistanceKm: card.includedDistanceKm,
      includedWaitingMins:card.includedWaitingMins,
    });
    setSuccess("");
  }

  async function saveCard() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/rate-cards/${editing}`, {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          ...form,
          commissionPct: form.commissionPct / 100,  // convert % back to decimal
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSuccess("Rate card updated!");
      setEditing(null);
      loadCards();
    } catch (e) { alert("Save failed: " + e.message); }
    finally { setSaving(false); }
  }

  const up = (k, v) => setForm(f => ({ ...f, [k]: parseFloat(v) || 0 }));

  return (
    <div className="space-y-4">
      {/* City selector */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-semibold text-slate-700">City:</span>
        <div className="flex gap-2 flex-wrap">
          {CITIES.map(c => (
            <button key={c} onClick={() => setCity(c)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all
                ${city===c ? "bg-blue-700 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"}`}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {success && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          {success}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
        </div>
      ) : (
        <div className="space-y-3">
          {cards.length === 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-6 text-center text-sm text-slate-400">
              No rate cards for {city} yet. They will be auto-created when first fare is calculated.
            </div>
          )}
          {cards.map(card => (
            <div key={card.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Card header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
                <div>
                  <p className="font-bold text-slate-900 text-sm">{card.vehicleLabel}</p>
                  <p className="text-xs text-slate-400">{card.capacity} · {city}</p>
                </div>
                {editing !== card.id ? (
                  <button onClick={() => startEdit(card)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all">
                    Edit rates
                  </button>
                ) : (
                  <div className="flex gap-2">
                    <button onClick={() => setEditing(null)}
                      className="text-xs font-semibold text-slate-500 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 transition-all">
                      Cancel
                    </button>
                    <button onClick={saveCard} disabled={saving}
                      className="text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 px-3 py-1.5 rounded-lg transition-all disabled:opacity-50">
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </div>
                )}
              </div>

              {/* View mode */}
              {editing !== card.id && (
                <div className="px-5 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  {[
                    ["Base fare",      formatINR(card.baseFare)],
                    ["Per km",         `₹${card.perKmRate}/km`],
                    ["Per min wait",   `₹${card.perMinWaitingRate}/min`],
                    ["Commission",     `${Math.round(card.commissionPct*100)}%`],
                    ["Incl. distance", `${card.includedDistanceKm} km`],
                    ["Incl. waiting",  `${card.includedWaitingMins} min`],
                    ["Peak multiplier",`${card.peakHourMultiplier}×`],
                    ["Weekend",        `${card.weekendMultiplier}×`],
                  ].map(([l,v]) => (
                    <div key={l}>
                      <p className="text-xs text-slate-400">{l}</p>
                      <p className="font-semibold text-slate-800">{v}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Edit mode */}
              {editing === card.id && (
                <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    ["baseFare",           "Base fare (₹)",     "number"],
                    ["perKmRate",          "Per km rate (₹)",   "number"],
                    ["perMinWaitingRate",  "Per min wait (₹)",  "number"],
                    ["commissionPct",      "Commission (%)",    "number"],
                    ["includedDistanceKm","Included km",       "number"],
                    ["includedWaitingMins","Included mins",    "number"],
                    ["peakHourMultiplier", "Peak multiplier",  "number"],
                    ["weekendMultiplier",  "Weekend multiplier","number"],
                  ].map(([k,l,t]) => (
                    <div key={k}>
                      <label className="text-xs font-semibold text-slate-500 mb-1 block">{l}</label>
                      <input type={t} value={form[k]} onChange={e => up(k, e.target.value)} step="0.1"
                        className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm font-medium"/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
