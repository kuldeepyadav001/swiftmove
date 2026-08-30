// src/shared/UI.jsx
// Reusable UI primitives used across multiple pages.
// ChinaLogist-inspired clean professional style.

import React from "react";
import { IC } from "./Icons";

export function StatCard({ label, value, sub, color = "blue", icon: Icon }) {
  const c = {
    blue:  { bg: "bg-blue-50",     text: "text-blue-600",     border: "border-blue-100"   },
    green: { bg: "bg-emerald-50",  text: "text-emerald-600",  border: "border-emerald-100" },
    amber: { bg: "bg-amber-50",    text: "text-amber-600",    border: "border-amber-100"   },
    slate: { bg: "bg-slate-50",    text: "text-slate-500",    border: "border-slate-200"   },
  };
  const s = c[color] || c.slate;
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 hover:border-slate-200 hover:shadow-md transition-all duration-200 group">
      <div className="flex items-start justify-between mb-4">
        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{label}</p>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.bg} ${s.text} border ${s.border} group-hover:scale-110 transition-transform duration-200`}>
          <Icon />
        </div>
      </div>
      <p className="text-3xl font-extrabold text-slate-900 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1.5 font-medium">{sub}</p>}
    </div>
  );
}

export function Badge({ status }) {
  const m = {
    "In transit": { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
    "DELIVERED":  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    "PENDING":    { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-500"   },
    "CANCELLED":  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
    "ASSIGNED":   { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
    "IN_TRANSIT": { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
    "DELIVERED_PENDING_CONFIRMATION": { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
    "DISPUTED":   { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  };
  const s = m[status] || { bg: "bg-slate-50", text: "text-slate-600", dot: "bg-slate-400" };
  const label = status === "DELIVERED_PENDING_CONFIRMATION" ? "Awaiting OTP" : status;

  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot} ${status === "DISPUTED" ? "animate-pulse" : ""}`} />
      {label}
    </span>
  );
}

export function EmptyState({ title, subtitle, action, onAction }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200 flex items-center justify-center text-slate-300 mb-5">
        <IC.Package />
      </div>
      <h3 className="text-base font-bold text-slate-700 mb-1">{title}</h3>
      <p className="text-sm text-slate-400 mb-6 max-w-xs leading-relaxed">{subtitle}</p>
      {action && (
        <button onClick={onAction}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-blue-200 hover:scale-[1.02]">
          {action}
        </button>
      )}
    </div>
  );
}

export function PublicNavbar({ go }) {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        <button onClick={() => go("landing")} className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <IC.Truck />
          </div>
          <span className="text-lg font-extrabold text-slate-900">
            Swift<span className="text-blue-600">Move</span>
          </span>
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => go("login")}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 px-4 py-2 rounded-lg hover:bg-slate-50 transition-all">
            Log in
          </button>
          <button onClick={() => go("register")}
            className="text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-lg transition-all shadow-sm hover:shadow-md">
            Get started
          </button>
        </div>
      </div>
    </nav>
  );
}
