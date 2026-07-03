// src/components/NotificationBell.jsx
import { useState, useRef, useEffect } from "react";

const TYPE_STYLES = {
  NEW_JOB:       { bg: "bg-blue-50",    icon: "📦", dot: "bg-blue-500"    },
  JOB_ACCEPTED:  { bg: "bg-emerald-50", icon: "✅", dot: "bg-emerald-500" },
  JOB_DELIVERED: { bg: "bg-emerald-50", icon: "🎉", dot: "bg-emerald-500" },
  JOB_CANCELLED: { bg: "bg-red-50",     icon: "❌", dot: "bg-red-500"     },
  DEFAULT:       { bg: "bg-slate-50",   icon: "🔔", dot: "bg-slate-400"   },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NotificationBell({ notifications, unreadCount, markAllRead, markOneRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleOpen = () => {
    setOpen(!open);
  };

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button onClick={handleOpen}
        className="relative p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 01-3.46 0"/>
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-12 w-80 bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <h3 className="font-bold text-slate-900 text-sm">
              Notifications
              {unreadCount > 0 && (
                <span className="ml-2 text-xs bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} new
                </span>
              )}
            </h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-50">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-2xl mb-2">🔔</p>
                <p className="text-sm font-medium text-slate-600">No notifications yet</p>
                <p className="text-xs text-slate-400 mt-1">You'll see updates here</p>
              </div>
            ) : (
              notifications.slice(0, 20).map(n => {
                const style = TYPE_STYLES[n.type] || TYPE_STYLES.DEFAULT;
                return (
                  <button key={n.id} onClick={() => { markOneRead(n.id); }}
                    className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-slate-50 transition-colors text-left
                      ${!n.read ? "bg-blue-50/40" : ""}`}>
                    <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center text-base flex-shrink-0 mt-0.5`}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-semibold text-slate-900 truncate ${!n.read ? "font-bold" : ""}`}>
                          {n.title}
                        </p>
                        {!n.read && <span className={`w-2 h-2 rounded-full flex-shrink-0 ${style.dot}`} />}
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 leading-relaxed line-clamp-2">{n.message}</p>
                      <p className="text-xs text-slate-400 mt-1">{timeAgo(n.createdAt)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {notifications.length > 20 && (
            <div className="px-4 py-3 border-t border-slate-100 text-center">
              <p className="text-xs text-slate-400">Showing 20 of {notifications.length}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Toast notifications ────────────────────────────────────────────────────
export function NotificationToasts({ toasts, dismissToast }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[9999] space-y-2 pointer-events-none">
      {toasts.map(t => {
        const style = TYPE_STYLES[t.type] || TYPE_STYLES.DEFAULT;
        return (
          <div key={t.toastId}
            className="bg-white border border-slate-200 rounded-xl shadow-lg shadow-slate-200 p-4 flex items-start gap-3 min-w-72 max-w-80 pointer-events-auto animate-slide-in">
            <div className={`w-9 h-9 rounded-xl ${style.bg} flex items-center justify-center text-base flex-shrink-0`}>
              {style.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-slate-900">{t.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">{t.message}</p>
            </div>
            <button onClick={() => dismissToast(t.toastId)}
              className="text-slate-300 hover:text-slate-500 transition-colors flex-shrink-0 mt-0.5">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
