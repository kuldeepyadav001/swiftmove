// src/shared/UI.jsx
// Reusable UI primitives used across multiple pages.
// Extracted from App.jsx to reduce its size and allow other components
// to use these without circular dependencies.

import React from "react";
import { IC } from "./Icons";

export function StatCard({ label, value, sub, color = "blue", icon: Icon }) {
  const c = {
    blue: "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
  };
  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-slate-500 font-medium">{label}</p>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c[color]}`}>
          <Icon />
        </div>
      </div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

export function Badge({ status }) {
  const m = {
    "In transit": "bg-blue-100 text-blue-800",
    "DELIVERED":  "bg-emerald-100 text-emerald-800",
    "PENDING":    "bg-amber-100 text-amber-800",
    "CANCELLED":  "bg-red-100 text-red-800",
    "ASSIGNED":   "bg-blue-100 text-blue-800",
    "IN_TRANSIT": "bg-blue-100 text-blue-800",
    "DELIVERED_PENDING_CONFIRMATION": "bg-purple-100 text-purple-800",
    "DISPUTED": "bg-red-600 text-white shadow-sm animate-pulse",
  };

  const label = status === "DELIVERED_PENDING_CONFIRMATION" ? "Awaiting OTP" : status;

  return (
    <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-md ${m[status] || "bg-slate-100 text-slate-600"}`}>
      {label}
    </span>
  );
}

export function EmptyState({ title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-300 mb-4">
        <IC.Package />
      </div>
      <h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-6 max-w-xs">{subtitle}</p>
      {action && (
        <button onClick={onAction}
          className="px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-blue-200">
          {action}
        </button>
      )}
    </div>
  );
}

export function PublicNavbar({ go }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-slate-200">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => go("landing")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white">
            <IC.Truck />
          </div>
          <span className="text-lg font-bold text-slate-900">
            Swift<span className="text-blue-700">Move</span>
          </span>
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => go("login")}
            className="text-sm font-semibold text-slate-700 hover:text-blue-700 px-4 py-2">
            Log in
          </button>
          <button onClick={() => go("register")}
            className="text-sm font-semibold bg-blue-700 hover:bg-blue-800 text-white px-5 py-2.5 rounded-lg transition-colors">
            Get started
          </button>
        </div>
      </div>
    </nav>
  );
}
