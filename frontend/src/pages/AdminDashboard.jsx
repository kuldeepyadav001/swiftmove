// src/pages/AdminDashboard.jsx
import { useState, useEffect } from "react";
import { getAdminStats, getAllUsers, getAllBookingsAdmin, deleteUser } from "../api/bookingApi";
import { clearSession } from "../api/authApi";
import RateCardAdmin from "../components/RateCardAdmin";
import KycAdmin from "../components/KycAdmin";
// ── Icons ─────────────────────────────────────────────────────────────────────
const Icons = {
  Shield: () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>,
  Users:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  Package:  () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  Wallet:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 13a1 1 0 100-2 1 1 0 000 2z" fill="currentColor"/><path d="M2 10h20"/></svg>,
  Truck:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M1 3h15v13H1z"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>,
  Logout:   () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>,
  Trash:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><polyline points="3,6 5,6 21,6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  Chart:    () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>,
};

function StatCard({ label, value, sub, color, icon: Icon }) {
  const colors = {
    blue:  "bg-blue-50 text-blue-700",
    green: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
    slate: "bg-slate-100 text-slate-600",
    red:   "bg-red-50 text-red-600",
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-slate-500">{label}</p>
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colors[color]}`}>
          <Icon />
        </div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function Badge({ status }) {
  const m = {
    PENDING:    "bg-amber-100 text-amber-800",
    ASSIGNED:   "bg-blue-100 text-blue-800",
    IN_TRANSIT: "bg-blue-100 text-blue-800",
    DELIVERED:  "bg-emerald-100 text-emerald-800",
    CANCELLED:  "bg-red-100 text-red-800",
    SHIPPER:    "bg-blue-100 text-blue-800",
    DRIVER:     "bg-slate-100 text-slate-700",
    ADMIN:      "bg-purple-100 text-purple-800",
  };
  return (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${m[status] || "bg-slate-100 text-slate-600"}`}>
      {status}
    </span>
  );
}

function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  if (isNaN(d)) return "—";
  const diff = Date.now() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboard({ user, onLogout }) {
  const [tab, setTab]           = useState("overview");
  const [stats, setStats]       = useState(null);
  const [users, setUsers]       = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [userFilter, setUserFilter] = useState("ALL");
  const [search, setSearch]     = useState("");

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    try {
      const [s, u, b] = await Promise.all([
        getAdminStats(),
        getAllUsers(),
        getAllBookingsAdmin(),
      ]);
      setStats(s);
      setUsers(u);
      setBookings(b);
    } catch (e) {
      console.error("Admin load error", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteUser(id) {
    if (!window.confirm("Delete this user? This cannot be undone.")) return;
    try {
      await deleteUser(id);
      setUsers(prev => prev.filter(u => u.id !== id));
    } catch (e) {
      alert("Failed to delete user");
    }
  }

  const filteredUsers = users.filter(u => {
    const matchRole = userFilter === "ALL" || u.role === userFilter;
    const matchSearch = !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    return matchRole && matchSearch;
  });

  const navItems = [
    { id: "overview", label: "Overview",  icon: Icons.Chart   },
    { id: "users",    label: "Users",     icon: Icons.Users   },
    { id: "bookings", label: "Bookings",  icon: Icons.Package },
    { id: "rates", label: "Rate cards", icon: Icons.Chart },
    { id: "kyc", label: "KYC Review", icon: Icons.Shield },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-56 bg-white border-r border-slate-200 flex-col flex-shrink-0">
        <div className="h-16 flex items-center px-5 border-b border-slate-100">
          <div className="w-7 h-7 rounded-lg bg-blue-700 flex items-center justify-center text-white mr-2">
            <Icons.Truck />
          </div>
          <span className="font-bold text-slate-900 text-sm">Swift<span className="text-blue-700">Move</span></span>
          <span className="ml-2 text-xs bg-purple-100 text-purple-700 font-bold px-2 py-0.5 rounded-full">Admin</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                ${tab === id ? "bg-blue-700 text-white" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
              <Icon />{label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-2 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">Admin</p>
            </div>
          </div>
          <button onClick={onLogout}
            className="w-full flex items-center gap-2 text-xs text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all">
            <Icons.Logout /> Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
          <h1 className="text-sm font-bold text-slate-900 capitalize">{tab}</h1>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-slate-400">Last updated just now</span>
            <button onClick={loadAll} className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-3 py-1.5 border border-blue-200 rounded-lg hover:bg-blue-50 transition-all">
              Refresh
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">

          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="w-8 h-8 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
            </div>
          )}

          {!loading && tab === "overview" && stats && (
            <div className="space-y-6">
              {/* Stat grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard label="Total users"    value={stats.totalUsers}    sub={`${stats.totalShippers} shippers · ${stats.totalDrivers} drivers`} color="blue"  icon={Icons.Users}   />
                <StatCard label="Total bookings" value={stats.totalBookings} sub={`${stats.pending} pending`}  color="slate" icon={Icons.Package} />
                <StatCard label="App revenue"    value={formatINR(stats.totalRevenue)} sub="From delivered orders" color="green" icon={Icons.Wallet} />
                <StatCard label="Driver payouts" value={formatINR(stats.totalPayouts)} sub="Paid to drivers"        color="amber" icon={Icons.Truck}  />
              </div>

              {/* Booking status breakdown */}
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-bold text-slate-900 mb-4 text-sm">Booking status breakdown</h2>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    ["Pending",   stats.pending,   "bg-amber-500"],
                    ["Assigned",  stats.assigned,  "bg-blue-500"],
                    ["Delivered", stats.delivered, "bg-emerald-500"],
                    ["Cancelled", stats.cancelled, "bg-red-400"],
                  ].map(([label, count, color]) => (
                    <div key={label} className="text-center">
                      <div className={`w-10 h-10 ${color} rounded-full flex items-center justify-center text-white font-bold mx-auto mb-2`}>
                        {count}
                      </div>
                      <p className="text-xs text-slate-500">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recent bookings */}
              <div className="bg-white rounded-xl border border-slate-200">
                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 text-sm">Recent bookings</h2>
                  <button onClick={() => setTab("bookings")} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">View all</button>
                </div>
                <div className="divide-y divide-slate-100">
                  {bookings.slice(0, 5).map(b => (
                    <div key={b.id} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                        <Icons.Package />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900">{b.id} · {b.pickup} → {b.drop}</p>
                        <p className="text-xs text-slate-400">{b.shipperName} · {timeAgo(b.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs font-bold text-slate-800">{formatINR(b.totalFare)}</span>
                        <Badge status={b.status} />
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && (
                    <div className="py-10 text-center text-sm text-slate-400">No bookings yet</div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!loading && tab === "users" && (
            <div className="space-y-4">
              {/* Filters */}
              <div className="flex items-center gap-3 flex-wrap">
                <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or email…"
                  className="flex-1 min-w-48 px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
                <div className="flex rounded-lg border border-slate-200 overflow-hidden">
                  {["ALL","SHIPPER","DRIVER"].map(r => (
                    <button key={r} onClick={() => setUserFilter(r)}
                      className={`px-4 py-2.5 text-xs font-semibold transition-all ${userFilter===r ? "bg-blue-700 text-white" : "bg-white text-slate-600 hover:bg-slate-50"}`}>
                      {r === "ALL" ? `All (${users.length})` : r === "SHIPPER" ? `Shippers (${users.filter(u=>u.role==="SHIPPER").length})` : `Drivers (${users.filter(u=>u.role==="DRIVER").length})`}
                    </button>
                  ))}
                </div>
              </div>

              {/* User table */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100">
                  <h2 className="font-bold text-slate-900 text-sm">{filteredUsers.length} users</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {filteredUsers.map(u => (
                    <div key={u.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0
                        ${u.role === "SHIPPER" ? "bg-blue-100 text-blue-700" : u.role === "DRIVER" ? "bg-slate-200 text-slate-700" : "bg-purple-100 text-purple-700"}`}>
                        {u.name?.charAt(0).toUpperCase() || "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-slate-900">{u.name}</p>
                        <p className="text-xs text-slate-400">{u.email}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge status={u.role} />
                        {u.verified && <span className="text-xs text-emerald-600 font-medium">Verified</span>}
                        <button onClick={() => handleDeleteUser(u.id)}
                          className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                          <Icons.Trash />
                        </button>
                      </div>
                    </div>
                  ))}
                  {filteredUsers.length === 0 && (
                    <div className="py-10 text-center text-sm text-slate-400">No users found</div>
                  )}
                </div>
              </div>
            </div>
          )}


          {!loading && tab === "bookings" && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between">
                  <h2 className="font-bold text-slate-900 text-sm">{bookings.length} total bookings</h2>
                </div>
                <div className="divide-y divide-slate-100">
                  {bookings.map(b => (
                    <div key={b.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50 transition-colors">
                      <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0 mt-0.5">
                        <Icons.Package />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-sm font-semibold text-slate-900">{b.id}</p>
                          <Badge status={b.status} />
                        </div>
                        <p className="text-xs text-slate-600">{b.pickup} → {b.drop}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          Shipper: {b.shipperName}
                          {b.driverName ? ` · Driver: ${b.driverName}` : " · No driver yet"}
                          {" · "}{b.vehicleLabel}
                        </p>
                        <p className="text-xs text-slate-400">{timeAgo(b.createdAt)}</p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-slate-900">{formatINR(b.totalFare)}</p>
                        <p className="text-xs text-emerald-600">{formatINR(b.driverCut)} driver</p>
                        <p className="text-xs text-blue-600">{formatINR(b.appCut)} app</p>
                      </div>
                    </div>
                  ))}
                  {bookings.length === 0 && (
                    <div className="py-10 text-center text-sm text-slate-400">No bookings yet</div>
                  )}
                </div>
              </div>
            </div>
          )}
 {!loading && tab === "rates" && <RateCardAdmin />}
 {!loading && tab === "kyc" && <KycAdmin />}
        </main>
      </div>
    </div>
  );
}
