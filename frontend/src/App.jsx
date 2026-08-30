import {
  useState,
  useEffect,
  createContext,
  useContext,
  useCallback,
} from "react";
import { IC } from "./shared/Icons";
import { StatCard, Badge, EmptyState, PublicNavbar } from "./shared/UI";
import FareEstimate from "./components/FareEstimate";
import LocationPicker from "./components/LocationPicker";
import DriverRouteMap from "./components/DriverRouteMap";
import {
  registerUser,
  loginUser
} from "./api/authApi";
import { apiFetch } from "./api/apiFetch";
 import{saveSession,
  loadSession,
  clearSession,
} from "./api/sessionStorage";
import TrackingMap from "./components/TrackingMap";
import ProfileEditor from "./components/ProfileEditor";
import { useWebSocket } from "./hooks/useWebSocket";
import { useRealGPS } from "./hooks/useLocationSimulator";
import {
  NotificationBell,
  NotificationToasts,
} from "./components/NotificationBell";
import { useNotifications } from "./hooks/useNotifications";
import AdminDashboard from "./pages/AdminDashboard";
import {
  createBooking,
  getMyBookings,
  getPendingJobs,
  getDriverBookings,
  acceptJob,
  cancelBooking,
  // --- Add these ---
  requestDelivery,
  verifyDeliveryOtp,
  resendDeliveryOtp,
  reportDispute
} from "./api/bookingApi";
import ForgotPassword from "./components/ForgotPassword";
import PaymentGateway from "./components/PaymentGateway";
import KycUpload from "./components/KycUpload";
import KycAdmin  from "./components/KycAdmin";
// ─── Booking Context ──────────────────────────────────────────────────────────
const BookingContext = createContext(null);

function BookingProvider({ children }) {
  const [bookings, setBookings] = useState([]);

  const addBookingLocal = (b) => setBookings((prev) => [b, ...prev]);
  const updateBookingLocal = (id, changes) =>
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, ...changes } : b))
    );

  return (
    <BookingContext.Provider
      value={{ bookings, setBookings, addBookingLocal, updateBookingLocal }}
    >
      {children}
    </BookingContext.Provider>
  );
}

const useBookings = () => useContext(BookingContext);

// ─── Router ───────────────────────────────────────────────────────────────────
function useRouter() {
  const [page, setPage] = useState("landing");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const s = loadSession();
    if (s) {
      setUser(s);
      setPage(s.role === "shipper" ? "shipper" : "driver");
    }
  }, []);

  const login = (u) => {
    setUser(u);
    if (u.role === "shipper") setPage("shipper");
    else if (u.role === "driver") setPage("driver");
    else if (u.role === "admin") setPage("admin");
    else setPage("landing");
  };

  const logout = () => {
    clearSession();
    setUser(null);
    setPage("landing");
  };

  return { page, go: setPage, user, login, logout };
}

function DashboardShell({
  user, logout, children, navItems, activeTab, setActiveTab,
  notifications, unreadCount, markAllRead, markOneRead,
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isShipper = user?.role === "shipper";
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {sidebarOpen && (
        <div className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          onClick={() => setSidebarOpen(false)} />
      )}
      <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-30 flex flex-col transition-transform duration-200
        ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0 lg:static lg:z-auto`}>
        <div className="h-16 flex items-center px-5 border-b border-slate-100 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white mr-2.5">
            <IC.Truck />
          </div>
          <span className="font-bold text-slate-900">
            Swift<span className="text-blue-700">Move</span>
          </span>
          <button className="ml-auto lg:hidden text-slate-400" onClick={() => setSidebarOpen(false)}>
            <IC.X />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-slate-100">
          <span className={`text-xs font-bold px-3 py-1 rounded-full ${isShipper ? "bg-blue-100 text-blue-700" : "bg-slate-800 text-white"}`}>
            {isShipper ? "Shipper account" : "Driver account"}
          </span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ id, label, icon: Icon }) => (
            <button key={id}
              onClick={() => { setActiveTab(id); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all
                ${activeTab === id ? "bg-blue-700 text-white shadow-md shadow-blue-200" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"}`}>
              <Icon />
              {label}
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-slate-100 flex-shrink-0">
          <div className="flex items-center gap-3 mb-3 px-2">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm flex-shrink-0">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name}</p>
              <p className="text-xs text-slate-400 truncate">{user?.email}</p>
            </div>
          </div>
          <button onClick={logout}
            className="w-full flex items-center gap-2 text-sm text-slate-500 hover:text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg transition-all">
            <IC.Logout />
            Log out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
          <button className="lg:hidden text-slate-500" onClick={() => setSidebarOpen(true)}>
            <IC.Menu />
          </button>
          <h1 className="text-base font-bold text-slate-900">
            {navItems.find((n) => n.id === activeTab)?.label}
          </h1>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell
              notifications={notifications || []}
              unreadCount={unreadCount || 0}
              markAllRead={markAllRead || (() => {})}
              markOneRead={markOneRead || (() => {})}
            />
            <div className="w-8 h-8 rounded-full bg-blue-700 flex items-center justify-center text-white text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX 1 & 3: ShipperHome
//   • Destructures `setBookings` from context (was missing → caused the crash)
//   • Actually calls subscribeToBooking() so shipper receives live updates
//   • Updates booking status + driverLocation when WS messages arrive
//   • Triggers in-app notification when driver accepts
// ─────────────────────────────────────────────────────────────────────────────
function ShipperHome({ user, goBook, addNotification }) {
  // ✅ FIX 1: destructure setBookings (it WAS exported by context but never pulled in)
  const { bookings, setBookings } = useBookings();
  const { subscribeToBooking, unsubscribeFromBooking } = useWebSocket();
  const [driverLocation, setDriverLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  // Load shipper's bookings from MongoDB on mount
  useEffect(() => {
    getMyBookings()
      .then((data) => setBookings(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const my = bookings.filter(
    (b) => b.shipperEmail === user?.email || b.shipperUserId === user?.id
  );
  const inTransit = my.filter(
    (b) => b.status === "ASSIGNED" || b.status === "IN_TRANSIT"
  );
  const delivered = my.filter((b) => b.status === "DELIVERED");
  const pending   = my.filter((b) => b.status === "PENDING");

  // ✅ FIX 3: actually subscribe to WebSocket for every in-transit booking.
  //    Handles two message types from the server:
  //      { type: "location",       latitude, longitude, speed }
  //      { type: "status_update",  status, driverName, driverId }
  useEffect(() => {
    if (inTransit.length === 0) return;

    inTransit.forEach((b) => {
      subscribeToBooking(b.id, (msg) => {
        if (msg.type === "location") {
          // Live location → update the map
          setDriverLocation({
            latitude:  msg.latitude,
            longitude: msg.longitude,
            speed:     msg.speed,
          });
        } else if (msg.type === "status_update") {
          // Driver accepted / status changed → update this booking in context
          setBookings((prev) =>
            prev.map((bk) =>
              bk.id === b.id ? { ...bk, ...msg } : bk
            )
          );
          // ✅ Fire in-app notification so shipper knows
          if (msg.status === "ASSIGNED" && addNotification) {
            addNotification({
              title: "Driver assigned!",
              body:  `${msg.driverName || "A driver"} accepted booking ${b.id}`,
              bookingId: b.id,
            });
          }
        }
      });
    });

    return () => {
      inTransit.forEach((b) => unsubscribeFromBooking(b.id));
    };
    // Re-subscribe whenever the set of in-transit bookings changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inTransit.length]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total shipments" value={my.length}         sub="All time"        color="blue"  icon={IC.Package} />
        <StatCard label="In transit"      value={inTransit.length}  sub="Live now"        color="amber" icon={IC.Truck}   />
        <StatCard label="Delivered"       value={delivered.length}  sub="Completed"       color="green" icon={IC.Check}  />
        <StatCard label="Pending"         value={pending.length}    sub="Awaiting driver" color="slate" icon={IC.Bell}   />
      </div>

      {inTransit.length > 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900">Live — {inTransit[0].id}</h2>
            <Badge status={inTransit[0].status} />
          </div>
          <TrackingMap booking={inTransit[0]} driverLocation={driverLocation} />
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              ["From",   inTransit[0].pickup],
              ["To",     inTransit[0].drop],
              ["Goods",  inTransit[0].goodsType],
              ["Driver", inTransit[0].driverName || "Searching…"],
            ].map(([l, v]) => (
              <div key={l}>
                <p className="text-xs text-slate-400 mb-0.5">{l}</p>
                <p className="font-semibold text-slate-800">{v}</p>
              </div>
            ))}
          </div>
          {/* ── Call driver button ── */}
          {inTransit[0].driverPhone && (
            <a href={`tel:${inTransit[0].driverPhone}`}
              className="flex items-center justify-center gap-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all text-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
              </svg>
              Call {inTransit[0].driverName}
            </a>
          )}
          {driverLocation && (
            <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Receiving live location
            </div>
          )}
        </div>
      ) : (
        my.length === 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <EmptyState
              title="No shipments yet"
              subtitle="Book your first shipment to get started"
              action="Book a shipment"
              onAction={goBook}
            />
          </div>
        )
      )}

      {my.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Recent orders</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {my.slice(0, 5).map((b) => (
              <div key={b.id}
                className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
                  <IC.Package />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">
                    {b.id} · {b.pickup} → {b.drop}
                  </p>
                  <p className="text-xs text-slate-400">{b.goodsType} · {b.createdAt}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-sm font-bold text-slate-900">
                    ₹{Number(b.totalFare).toLocaleString("en-IN")}
                  </p>
                  <Badge status={b.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={goBook}
        className="w-full py-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-2xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
        <IC.Plus /> Book a new shipment
      </button>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX 2: ShipperBooking
//   • Was calling `addBooking` (undefined) — renamed to `addBookingLocal`
//   • Calls addBookingLocal(saved) after successful API call so the context
//     is immediately updated — booking is visible in ShipperHome without
//     waiting for a page reload
// ─────────────────────────────────────────────────────────────────────────────
function ShipperBooking({ user, goHome }) {
  // ✅ FIX 2: was `addBooking` which doesn't exist on the context
  const { addBookingLocal } = useBookings();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    pickup: "", drop: "", goodsType: "", weight: "", vehicle: "", date: "now",
    pickupLat: null, pickupLng: null, dropLat: null, dropLng: null,
  });
  const [fareData, setFareData] = useState(null);
  const [booked, setBooked]     = useState(null);
  const [fare, setFare]         = useState("—");
const [showPayment, setShowPayment] = useState(false);
const [bookedData, setBookedData]   = useState(null);
  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setLoc = (prefix) => ({ address, lat, lng }) =>
    setForm((f) => ({ ...f, [prefix]: address, [`${prefix}Lat`]: lat, [`${prefix}Lng`]: lng }));

  const vehicles = [
  { id:"bike",         label:"Bike (2-Wheeler)",   cap:"Up to 20 kg",   price:"from ₹60"  },
  { id:"three-wheeler",label:"Three Wheeler",       cap:"500-750 kg",    price:"from ₹200" },
  { id:"tata-ace",     label:"Tata Ace / Mini Truck",cap:"750-1000 kg", price:"from ₹320" },
  { id:"pickup",       label:"Pickup Truck (8ft)",  cap:"Up to 1250 kg", price:"from ₹400" },
  { id:"large-truck",  label:"Large Truck (18ft)",  cap:"2000+ kg",      price:"from ₹700" },
];
  const sel = vehicles.find((v) => v.id === form.vehicle);

const handleBook = async () => {
  try {
    const saved = await createBooking({
      pickup:        form.pickup,
      drop:          form.drop,
      pickupLat:     form.pickupLat,
      pickupLng:     form.pickupLng,
      dropLat:       form.dropLat,
      dropLng:       form.dropLng,
      goodsType:     form.goodsType,
      weight:        form.weight,
      vehicleType:   form.vehicle,
      vehicleLabel:  sel?.label,
      pickupType:    form.date,
      totalFare:     fareData?.totalFare   || 0,
      driverCut:     fareData?.driverCut   || 0,
      appCut:        fareData?.appCut      || 0,
      distanceKm:    fareData?.distanceKm  || 0,
      fareBreakdown: fareData?.breakdown   || "",
    });

    // ✅ Save booking then show payment screen
    setBookedData(saved);
    setShowPayment(true);

  } catch (e) {
    alert("Booking failed: " + e.message);
  }
};
// ✅ Show payment screen after booking is saved
if (showPayment && bookedData) return (
  <div className="max-w-md mx-auto">
    <div className="bg-white rounded-2xl border border-slate-200 p-6">
      <h2 className="font-bold text-slate-900 mb-5">Complete payment</h2>
      <PaymentGateway
        booking={bookedData}
        user={user}
        onSuccess={(paymentInfo) => {
          setShowPayment(false);
          addBookingLocal(bookedData);
          setBooked({ ...bookedData, paymentInfo });
          setStep(5);
        }}
        onCancel={() => {
          setShowPayment(false);
        }}
      />
    </div>
  </div>
);

  if (step === 5)
    return (
      <div className="max-w-md mx-auto">
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4 text-emerald-600 text-2xl">
            ✓
          </div>
          <h2 className="text-xl font-extrabold text-slate-900 mb-2">Booking confirmed!</h2>
          <p className="text-slate-500 text-sm mb-6">
            Booking <span className="font-bold text-blue-700">{booked?.id}</span> is live. A driver will accept shortly.
          </p>
          <div className="bg-slate-50 rounded-xl p-4 text-sm space-y-2 mb-6 text-left">
            {[
              ["From",    booked?.pickup],
              ["To",      booked?.drop],
              ["Goods",   booked?.goodsType],
              ["Vehicle", booked?.vehicleLabel],
              ["Fare",    `₹${Number(booked?.totalFare).toLocaleString("en-IN")}`],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-slate-400">{l}</span>
                <span className="font-semibold text-slate-800">{v}</span>
              </div>
            ))}
          </div>
          <button onClick={goHome}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all">
            Go to dashboard
          </button>
        </div>
      </div>
    );

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-3">
        {["Route", "Goods", "Vehicle", "Confirm"].map((s, i) => (
          <div key={s} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
              ${step > i + 1 ? "bg-emerald-500 text-white" : step === i + 1 ? "bg-blue-700 text-white" : "bg-slate-200 text-slate-400"}`}>
              {step > i + 1 ? "✓" : i + 1}
            </div>
            <span className={`text-xs font-medium hidden sm:block ${step === i + 1 ? "text-blue-700" : "text-slate-400"}`}>
              {s}
            </span>
            {i < 3 && (
              <div className={`flex-1 h-0.5 ${step > i + 1 ? "bg-emerald-400" : "bg-slate-200"}`} />
            )}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-900">Where are we going?</h2>
          <LocationPicker
            label="Pickup location"
            placeholder="Search house, street, landmark…"
            accent="blue"
            value={{ address: form.pickup, lat: form.pickupLat, lng: form.pickupLng }}
            onChange={setLoc("pickup")}
          />
          <LocationPicker
            label="Drop location"
            placeholder="Search house, street, landmark…"
            accent="amber"
            value={{ address: form.drop, lat: form.dropLat, lng: form.dropLng }}
            onChange={setLoc("drop")}
          />
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Pickup time</label>
            <div className="flex gap-3">
              {[["now", "Immediate"], ["scheduled", "Schedule later"]].map(([v, l]) => (
                <button key={v} onClick={() => up("date", v)}
                  className={`flex-1 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all
                    ${form.date === v ? "border-blue-600 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-500"}`}>
                  {l}
                </button>
              ))}
            </div>
          </div>
          <button onClick={() => setStep(2)} disabled={!form.pickup || !form.drop}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2">
            Continue <IC.Arrow />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-900">Describe your goods</h2>
          {[
            ["goodsType", "Type of goods",      "e.g. Electronics, Furniture"],
            ["weight",    "Estimated weight",   "e.g. 200 kg, 1.5 ton"],
          ].map(([k, l, p]) => (
            <div key={k}>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{l}</label>
              <input value={form[k]} onChange={(e) => up(k, e.target.value)} placeholder={p}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
          ))}
          <div className="flex gap-3">
            <button onClick={() => setStep(1)}
              className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:border-slate-300 transition-all">
              Back
            </button>
            <button onClick={() => setStep(3)} disabled={!form.goodsType || !form.weight}
              className="flex-1 py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold rounded-xl transition-all">
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-900">Choose a vehicle</h2>
          <div className="space-y-3">
            {vehicles.map((v) => (
              <button key={v.id} onClick={() => up("vehicle", v.id)}
                className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
                  ${form.vehicle === v.id ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                  ${form.vehicle === v.id ? "bg-blue-700 text-white" : "bg-slate-100 text-slate-500"}`}>
                  <IC.Truck />
                </div>
                <div className="flex-1">
                  <p className={`font-bold text-sm ${form.vehicle === v.id ? "text-blue-700" : "text-slate-800"}`}>{v.label}</p>
                  <p className="text-xs text-slate-400">{v.cap}</p>
                </div>
                <span className={`text-sm font-bold ${form.vehicle === v.id ? "text-blue-700" : "text-slate-600"}`}>{v.price}</span>
              </button>
            ))}
          </div>
          {form.vehicle && (
            <FareEstimate
              pickup={form.pickup} drop={form.drop}
              pickupLat={form.pickupLat} pickupLng={form.pickupLng}
              dropLat={form.dropLat} dropLng={form.dropLng}
              vehicleType={form.vehicle}
              vehicleLabel={vehicles.find((v) => v.id === form.vehicle)?.label}
              onFareCalculated={(f) => {
                setFareData(f);
                setFare(`₹${Number(f.totalFare).toLocaleString("en-IN")}`);
              }}
            />
          )}
          <div className="flex gap-3">
            <button onClick={() => setStep(2)}
              className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:border-slate-300 transition-all">
              Back
            </button>
            <button onClick={() => setStep(4)} disabled={!form.vehicle}
              className="flex-1 py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-40 text-white font-bold rounded-xl transition-all">
              Continue
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4">
          <h2 className="font-bold text-slate-900">Confirm booking</h2>
          <div className="bg-slate-50 rounded-xl p-4 space-y-3 text-sm">
            {[
              ["From",    form.pickup],
              ["To",      form.drop],
              ["Goods",   `${form.goodsType} · ${form.weight}`],
              ["Vehicle", sel?.label],
              ["Pickup",  form.date === "now" ? "Immediate" : "Scheduled"],
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between">
                <span className="text-slate-500">{l}</span>
                <span className="font-semibold text-slate-800">{v}</span>
              </div>
            ))}
            <div className="border-t border-slate-200 pt-3 flex justify-between">
              <span className="font-bold text-slate-700">Estimated fare</span>
              <span className="font-extrabold text-blue-700">{fare}</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => setStep(3)}
              className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:border-slate-300 transition-all">
              Back
            </button>
            <button onClick={handleBook}
              className="flex-1 py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200">
              Book now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ShipperOrders — unchanged, already correct (has its own local state + API fetch)
function ShipperOrders({ user }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [ratingFor, setRatingFor] = useState(null);  // bookingId being rated
  const [stars, setStars]       = useState(5);

  useEffect(() => {
    getMyBookings()
      .then(setBookings)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id) => {
    try {
      await cancelBooking(id);
      setBookings((prev) => prev.map((b) => b.id === id ? { ...b, status: "CANCELLED" } : b));
    } catch (e) { alert(e.message); }
  };

  const openRating = (id) => { setRatingFor(id); setStars(5); };

  const submitRating = async () => {
    try {
      await apiFetch(`/api/bookings/${ratingFor}/rate`, {
        method: "PUT",
        body: JSON.stringify({ stars }),
      });
      setBookings(prev => prev.map(b => b.id === ratingFor ? { ...b, shipperRating: stars } : b));
      setRatingFor(null);
    } catch (e) { alert(e.message); }
  };

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
      </div>
    );

  if (bookings.length === 0)
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <EmptyState title="No orders yet" subtitle="Your booking history will appear here." />
      </div>
    );

  return (
    <div className="bg-white rounded-2xl border border-slate-200">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="font-bold text-slate-900">All orders ({bookings.length})</h2>
      </div>
      <div className="divide-y divide-slate-100">
        {bookings.map((b) => (
          <div key={b.id} className="flex items-start gap-4 px-5 py-4 hover:bg-slate-50">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0 mt-0.5">
              <IC.Package />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{b.id}</p>
              <p className="text-sm text-slate-600">{b.pickup} → {b.drop}</p>
              <p className="text-xs text-slate-400">
                {b.goodsType} · {b.vehicleLabel} · {new Date(b.createdAt).toLocaleDateString("en-IN")}
              </p>
              {b.driverName && (
                <p className="text-xs text-blue-600 font-medium mt-0.5">
                  Driver: {b.driverName}
                  {b.driverPhone && (
                    <a href={`tel:${b.driverPhone}`} className="ml-2 text-emerald-600 hover:text-emerald-700" title="Call driver">
                       {b.driverPhone}
                    </a>
                  )}
                </p>
              )}
            </div>
           <div className="text-right flex-shrink-0 space-y-1.5">
  <p className="text-sm font-bold text-slate-900">
    ₹{Number(b.totalFare).toLocaleString("en-IN")}
  </p>
  
  {/* The Status Badge */}
  <Badge status={b.status} />
  
  {/* --- NEW: OTP DISPLAY SECTION FOR SHIPPER --- */}
  {/* If the driver has arrived and requested delivery, show the OTP here */}
  {b.status === "DELIVERED_PENDING_CONFIRMATION" && b.deliveryOtp && (
    <div className="mt-2 bg-amber-50 border border-amber-200 p-2 rounded-lg shadow-sm">
      <p className="text-[10px] text-amber-600 font-bold uppercase text-center leading-tight">
        Share OTP with Driver
      </p>
      <p className="text-lg font-black text-slate-900 text-center tracking-widest">
        {b.deliveryOtp}
      </p>
    </div>
  )}
  {/* --------------------------------------------- */}

  {b.status === "PENDING" && (
    <button onClick={() => handleCancel(b.id)}
      className="block text-xs text-red-500 hover:text-red-700 font-medium ml-auto">
      Cancel
    </button>
  )}
  {b.status === "DELIVERED" && !b.shipperRating && (
    <button onClick={() => openRating(b.id)}
      className="block text-xs text-amber-600 hover:text-amber-700 font-bold ml-auto">
       Rate driver
    </button>
  )}
  {b.shipperRating && (
    <div className="flex items-center gap-0.5 mt-1">
      {[1,2,3,4,5].map(s => (
        <span key={s} className={`text-xs ${s <= b.shipperRating ? "text-amber-400" : "text-slate-300"}`}>★</span>
      ))}
    </div>
  )}
</div>
          </div>
        ))}
      </div>
    </div>
    {/* ── Rating Modal ── */}
    {ratingFor && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}
        onClick={() => setRatingFor(null)}>
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center" onClick={e => e.stopPropagation()}>
          <p className="text-lg font-bold text-slate-900 mb-1">Rate your driver</p>
          <p className="text-sm text-slate-400 mb-6">How was the delivery?</p>
          <div className="flex justify-center gap-2 mb-6">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setStars(s)}
                className={`text-3xl transition-all hover:scale-110 ${s <= stars ? "text-amber-400" : "text-slate-200"}`}>
                ★
              </button>
            ))}
          </div>
          <div className="flex gap-3">
            <button onClick={() => setRatingFor(null)}
              className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl text-sm hover:border-slate-300 transition-all">
              Skip
            </button>
            <button onClick={submitRating}
              className="flex-1 py-3 bg-blue-700 text-white font-bold rounded-xl text-sm hover:bg-blue-800 transition-all shadow-lg shadow-blue-200">
              Submit
            </button>
          </div>
        </div>
      </div>
    )}
  );
}

function ProfilePage({ user, onUpdate }) {
  return <ProfileEditor user={user} onUpdate={onUpdate} />;
}
/**
 * Component for drivers to handle the multi-step delivery handoff.
 */
function DeliveryHandoffPanel({ booking, onUpdate }) {
  const [images, setImages] = useState([]);
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Helper: Compress + convert File to Base64 for MongoDB storage
  // Client-side compression keeps images at ~300-500KB (vs 5-15MB from phone cameras)
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.size > 15 * 1024 * 1024) { setError("Image too large (max 15MB before compression)"); return; }
      const { compressImage } = await import("../utils/imageCompress");
      const b64 = await compressImage(file);
      if (b64) setImages(prev => [...prev, b64]);
    }
  };

  const handleRequest = async () => {
    if (images.length === 0) return setError("Please upload at least one proof photo.");
    setLoading(true); setError("");
    try {
      const updated = await requestDelivery(booking.id, images);
      onUpdate(updated); // Refresh local state
      if (updated.otpEmailSent === false) {
  alert(
    "Heads up: the OTP email couldn't be delivered to the shipper. " +
    "Ask them to open the SwiftMove app → Orders, where the same code is shown."
  );
}
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleVerify = async () => {
    if (otp.length < 6) return setError("Enter the 6-digit OTP provided by shipper.");
    setLoading(true); setError("");
    try {
      const updated = await verifyDeliveryOtp(booking.id, otp);
      onUpdate(updated);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleResend = async () => {
    setLoading(true); setError("");
    try {
   const updated = await resendDeliveryOtp(booking.id);
if (updated.otpEmailSent === false) {
  alert(
    "New OTP generated, but the email couldn't be delivered. " +
    "Ask the shipper to check the code on their Orders page in the app."
  );
} else {
  alert("New OTP sent to shipper!");
}
onUpdate(updated);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const handleDispute = async () => {
    const reason = prompt("Describe the issue (e.g. Shipper refused OTP, Item damaged):");
    if (!reason) return;
    try {
      const updated = await reportDispute(booking.id, reason);
      onUpdate(updated);
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-4">
      {error && <p className="text-xs text-red-500 font-bold">{error}</p>}

      {/* STEP 1: UPLOAD PHOTOS */}
      {booking.status !== "DELIVERED_PENDING_CONFIRMATION" && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-700 uppercase">Step 1: Upload Proof</p>
          <input type="file" multiple accept="image/*" onChange={handleFileChange} className="hidden" id="proof-upload" />
          <label htmlFor="proof-upload" className="block w-full py-3 border-2 border-dashed border-slate-300 rounded-xl text-center text-slate-400 hover:border-blue-400 cursor-pointer text-sm">
            {images.length > 0 ? `${images.length} photos selected` : "Tap to capture delivery photos"}
          </label>
          <button onClick={handleRequest} disabled={loading || images.length === 0} className="w-full py-3 bg-blue-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50">
            {loading ? "Sending OTP..." : "Request Delivery OTP"}
          </button>
        </div>
      )}

      {/* STEP 2: VERIFY OTP */}
      {booking.status === "DELIVERED_PENDING_CONFIRMATION" && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-700 uppercase">Step 2: Verify Shipper OTP</p>
          <input type="text" maxLength="6" placeholder="000000" value={otp} onChange={(e) => setOtp(e.target.value)}
            className="w-full text-center text-2xl font-bold tracking-[10px] py-3 rounded-xl border-2 border-blue-200 outline-none focus:border-blue-500" />
          <button onClick={handleVerify} disabled={loading || otp.length < 6} className="w-full py-3 bg-emerald-600 text-white font-bold rounded-xl shadow-lg">
            {loading ? "Verifying..." : "Confirm & Finish Delivery"}
          </button>
          
          <div className="flex justify-between items-center px-1">
            <button onClick={handleResend} className="text-xs text-blue-600 font-bold hover:underline">Resend OTP ({booking.deliveryOtpResendCount || 0}/3)</button>
            <button onClick={handleDispute} className="text-xs text-red-500 font-bold hover:underline">Report Dispute</button>
          </div>
        </div>
      )}
    </div>
  );
}
// ─────────────────────────────────────────────────────────────────────────────
// DriverHome — largely unchanged; uses its own API state (correct)
// Added: subscribeToNewJobs so driver hears new bookings in real-time
// ─────────────────────────────────────────────────────────────────────────────
function DriverHome({ user }) {
  const { sendLocation, subscribeToNewJobs, unsubscribeFromNewJobs } = useWebSocket();
  const [online,   setOnline]   = useState(false);
  const [pending,  setPending]  = useState([]);
  const [myActive, setMyActive] = useState([]);
  const [myDone,   setMyDone]   = useState([]);
  const [loading,  setLoading]  = useState(true);

  // Load jobs from MongoDB on mount
  useEffect(() => {
    Promise.all([getPendingJobs(), getDriverBookings()])
      .then(([pJobs, dJobs]) => {
        setPending(pJobs);
   setMyActive(dJobs.filter((b) =>
  b.status === "ASSIGNED" ||
  b.status === "IN_TRANSIT" ||
  b.status === "DELIVERED_PENDING_CONFIRMATION"
));
        setMyDone(dJobs.filter((b) => b.status === "DELIVERED"));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Real-time new job notifications via WebSocket
  useEffect(() => {
    if (!online) { unsubscribeFromNewJobs(); return; }
    subscribeToNewJobs((newJob) => {
      setPending((prev) => {
        // avoid duplicates
        if (prev.find((j) => j.id === newJob.id)) return prev;
        return [newJob, ...prev];
      });
    });
    return () => unsubscribeFromNewJobs();
  }, [online, subscribeToNewJobs, unsubscribeFromNewJobs]);

  const earned        = myDone.reduce((s, b) => s + (b.totalFare || 0), 0);
  const activeBooking = myActive[0] || null;

  const handleAccept = async (jobId) => {
    try {
      const updated = await acceptJob(jobId);
      setPending((prev) => prev.filter((j) => j.id !== jobId));
      setMyActive((prev) => [updated, ...prev]);
    } catch (e) { alert(e.message); }
  };

  // const handleDeliver = async (jobId) => {
  //   try {
  //     const updated = await markDelivered(jobId);
  //     setMyActive((prev) => prev.filter((j) => j.id !== jobId));
  //     setMyDone((prev) => [updated, ...prev]);
  //   } catch (e) { alert(e.message); }
  // };

  const [myPosition, setMyPosition] = useState(null);

  const handleLocationUpdate = useCallback((pos) => {
    setMyPosition({ lat: pos.latitude, lng: pos.longitude });
    if (!activeBooking) return;
    sendLocation({
      bookingId:  activeBooking.id,
      driverId:   user?.id,
      driverName: user?.name,
      latitude:   pos.latitude,
      longitude:  pos.longitude,
      speed:      pos.speed,
      status:     "en_route",
      type:       "location",   // ← tag so shipper WS handler can distinguish
    });
  }, [activeBooking, user, sendLocation]);

  useRealGPS( online && !!activeBooking, handleLocationUpdate);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      {/* Online toggle */}
      <div className={`rounded-2xl p-5 flex items-center justify-between transition-all
        ${online ? "bg-emerald-50 border-2 border-emerald-300" : "bg-slate-100 border-2 border-slate-200"}`}>
        <div>
          <p className="font-bold text-slate-900">{online ? "You are online" : "You are offline"}</p>
          <p className="text-sm text-slate-500">
            {online ? `${pending.length} job${pending.length !== 1 ? "s" : ""} available` : "Go online to start receiving jobs"}
          </p>
        </div>
        <button onClick={() => setOnline(!online)}
          className={`relative w-14 h-7 rounded-full transition-all duration-300 ${online ? "bg-emerald-500" : "bg-slate-300"}`}>
          <span className={`absolute top-0.5 w-6 h-6 bg-white rounded-full shadow transition-all duration-300 ${online ? "left-7" : "left-0.5"}`} />
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total earned"    value={`₹${earned.toLocaleString("en-IN")}`} sub="All time"   color="green" icon={IC.Wallet}  />
        <StatCard label="Trips done"      value={myDone.length}                         sub="Completed"  color="blue"  icon={IC.TrendUp} />
        <StatCard label="Active"          value={myActive.length}                       sub="In progress" color="amber" icon={IC.Truck}   />
        <StatCard label="Available jobs"  value={pending.length}                        sub="Right now"  color="slate" icon={IC.Package} />
      </div>

      {/* Active delivery */}
      {myActive.length > 0 && (
        <div className="space-y-3">
          <h2 className="font-bold text-slate-900">Active delivery</h2>
       {myActive.map((j) => (
  <div key={j.id} className="bg-white rounded-2xl border-2 border-blue-200 p-5 space-y-4">
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-2">
           <p className="font-bold text-slate-900">{j.id}</p>
           <Badge status={j.status} />
        </div>
        <p className="text-xs text-slate-400 mt-0.5">{j.goodsType} · {j.vehicleLabel}</p>
      </div>
      <span className="text-lg font-extrabold text-blue-700">₹{Number(j.totalFare).toLocaleString("en-IN")}</span>
    </div>

    {/* Live Status indicator */}
    {online && j.status !== "DELIVERED_PENDING_CONFIRMATION" && (
       <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50 p-2 rounded-lg">
         <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
         Broadcasting location to shipper
       </div>
    )}

    <div className="space-y-1.5 text-sm py-2">
      <div className="flex gap-2"><span className="text-slate-400 w-16">Pickup:</span><span className="font-medium text-slate-800">{j.pickup}</span></div>
      <div className="flex gap-2"><span className="text-slate-400 w-16">Drop:</span><span className="font-medium text-slate-800">{j.drop}</span></div>
      <div className="flex gap-2"><span className="text-slate-400 w-16">Shipper:</span><span className="font-medium text-slate-800">{j.shipperName}</span></div>
    </div>

    {/* Turn-by-turn style navigation to pickup (then drop once picked up) */}
    {j.status !== "DELIVERED_PENDING_CONFIRMATION" && (
      <DriverRouteMap booking={j} myPosition={myPosition} />
    )}

    {/* THE NEW HANDOFF UI */}
    <DeliveryHandoffPanel 
      booking={j} 
      onUpdate={(updated) => {
        setMyActive(prev => prev.map(b => b.id === updated.id ? updated : b));
        if(updated.status === "DELIVERED") {
          setMyActive(prev => prev.filter(b => b.id !== updated.id));
          setMyDone(prev => [updated, ...prev]);
        }
      }} 
    />
  </div>
))}
        </div>
      )}

      {/* Previous orders — now shows completed trips */}
      {myDone.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="font-bold text-slate-900">Previous orders ({myDone.length})</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {myDone.map((j) => (
              <div key={j.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                  <IC.Truck />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900">{j.id} · {j.pickup} → {j.drop}</p>
                  <p className="text-xs text-slate-400">{j.goodsType} · {new Date(j.createdAt).toLocaleDateString("en-IN")}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className="text-sm font-bold text-emerald-600">
                    ₹{Number(j.totalFare).toLocaleString("en-IN")}
                  </p>
                  <Badge status={j.status} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job feed */}
      {online ? (
        pending.length > 0 ? (
          <div className="space-y-3">
            <h2 className="font-bold text-slate-900">New job requests ({pending.length})</h2>
            {pending.map((j) => (
              <div key={j.id}
                className="bg-white rounded-2xl border border-slate-200 p-5 hover:border-blue-200 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{j.id}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{j.goodsType} · {j.vehicleLabel}</p>
                  </div>
                  <span className="text-lg font-extrabold text-blue-700">
                    ₹{Number(j.totalFare).toLocaleString("en-IN")}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                  <IC.Map />
                  <span className="font-medium truncate">{j.pickup}</span>
                  <span className="text-slate-300 flex-shrink-0">→</span>
                  <span className="font-medium truncate">{j.drop}</span>
                </div>
                <p className="text-xs text-slate-400 mb-3">
                  By {j.shipperName} · {new Date(j.createdAt).toLocaleDateString("en-IN")}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setPending((prev) => prev.filter((p) => p.id !== j.id))}
                    className="flex-1 py-2.5 border-2 border-slate-200 text-slate-500 font-bold rounded-xl hover:border-red-300 hover:text-red-500 transition-all text-sm">
                    Decline
                  </button>
                  <button onClick={() => handleAccept(j.id)}
                    className="flex-1 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-md shadow-blue-200 text-sm">
                    Accept job
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <EmptyState title="No jobs right now" subtitle="New shipment requests will appear here automatically." />
          </div>
        )
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <EmptyState title="You are offline" subtitle="Toggle online above to see available job requests." />
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX 4: DriverEarnings
//   • Was reading from shared BookingContext which only has SHIPPER bookings
//   • Now fetches driver's own history directly from the API
// ─────────────────────────────────────────────────────────────────────────────
function DriverEarnings({ user }) {
  // ✅ FIX 4: fetch driver bookings from API, not from shared context
  const [myDone,   setMyDone]   = useState([]);
  const [myActive, setMyActive] = useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    getDriverBookings()
      .then((jobs) => {
        setMyActive(jobs.filter((b) => b.status === "ASSIGNED" || b.status === "IN_TRANSIT"));
        setMyDone(jobs.filter((b) => b.status === "DELIVERED"));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const my     = [...myActive, ...myDone];
  const earned = myDone.reduce((s, b) => s + (b.totalFare || 0), 0);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin" />
      </div>
    );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard label="Total earned"      value={`₹${earned.toLocaleString("en-IN")}`} sub={`${myDone.length} trips`} color="green" icon={IC.TrendUp} />
        <StatCard label="Active deliveries" value={myActive.length}                       sub="In progress"              color="blue"  icon={IC.Truck}   />
        <StatCard label="Completed"         value={myDone.length}                         sub="All time"                 color="slate" icon={IC.Check}   />
      </div>
      <div className="bg-white rounded-2xl border border-slate-200">
        {my.length === 0 ? (
          <EmptyState title="No trips yet" subtitle="Your completed deliveries and earnings will appear here." />
        ) : (
          <>
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="font-bold text-slate-900">Trip history ({my.length})</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {my.map((t) => (
                <div key={t.id} className="flex items-center gap-4 px-5 py-4 hover:bg-slate-50">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 flex-shrink-0">
                    <IC.Truck />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      {t.id} · {t.pickup} → {t.drop}
                    </p>
                    <p className="text-xs text-slate-400">
                      {new Date(t.createdAt).toLocaleDateString("en-IN")} · {t.goodsType}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0 space-y-1">
                    <p className="text-sm font-bold text-emerald-600">
                      ₹{Number(t.totalFare).toLocaleString("en-IN")}
                    </p>
                    <Badge status={t.status} />
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// BUG FIX 5: ShipperDashboard
//   • Passes `addNotification` down to ShipperHome so it can fire a toast
//     when the WebSocket status_update says a driver was assigned
// ─────────────────────────────────────────────────────────────────────────────
function ShipperDashboard({ user, logout }) {
  const ws = useWebSocket();
  const {
    notifications, unreadCount, toasts,
    markAllRead, markOneRead, dismissToast,
    addNotification,
  } = useNotifications(user, ws);
  const [tab, setTab] = useState("home");
  const navItems = [
    { id: "home",    label: "Dashboard",     icon: IC.Home  },
    { id: "book",    label: "Book shipment", icon: IC.Plus  },
    { id: "orders",  label: "My orders",     icon: IC.List  },
    { id: "profile", label: "My profile",    icon: IC.User  },

  ];
  return (
    <>
      <NotificationToasts toasts={toasts} dismissToast={dismissToast} />
      <DashboardShell
        user={user} logout={logout} navItems={navItems}
        activeTab={tab} setActiveTab={setTab}
        notifications={notifications} unreadCount={unreadCount}
        markAllRead={markAllRead} markOneRead={markOneRead}
      >
        {tab === "home"    && <ShipperHome    user={user} goBook={() => setTab("book")} addNotification={addNotification} />}
        {tab === "book"    && <ShipperBooking user={user} goHome={() => setTab("home")} />}
        {tab === "orders"  && <ShipperOrders  user={user} />}
        {tab === "profile" && <ProfilePage    user={user} onUpdate={(u) => console.log("updated", u)} />}
      </DashboardShell>
    </>
  );
}

function DriverDashboard({ user, logout }) {
  const ws = useWebSocket();
  const {
    notifications, unreadCount, toasts,
    markAllRead, markOneRead, dismissToast,
  } = useNotifications(user, ws);
  const [tab, setTab] = useState("home");
  const navItems = [
    { id: "home",     label: "Dashboard", icon: IC.Home   },
    { id: "earnings", label: "Earnings",  icon: IC.Wallet },
    { id: "profile",  label: "My profile", icon: IC.User  },
  ];
  return (
    <>
      <NotificationToasts toasts={toasts} dismissToast={dismissToast} />
      <DashboardShell
        user={user} logout={logout} navItems={navItems}
        activeTab={tab} setActiveTab={setTab}
        notifications={notifications} unreadCount={unreadCount}
        markAllRead={markAllRead} markOneRead={markOneRead}
      >
        {tab === "home"     && <DriverHome     user={user} />}
        {tab === "earnings" && <DriverEarnings user={user} />}
       {tab === "profile" && (
  <div className="space-y-4">
    <KycUpload user={user} />
    <ProfilePage user={user} onUpdate={(u) => console.log("updated", u)}/>
  </div>
)}
      </DashboardShell>
    </>
  );
}

// ─── Auth pages (unchanged) ───────────────────────────────────────────────────
function LoginPage({ go, login }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [role, setRole]         = useState("shipper");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async () => {
    if (!email || !password) { setError("Please fill in all fields."); return; }
    setError(""); setLoading(true);
    try {
      const data = await loginUser({ email, password, role });
      saveSession(data);
      login({ id: data.id, name: data.name, email: data.email, role: data.role.toLowerCase() });
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally { setLoading(false); }
  };
if (showForgot) return (
  <div className="min-h-screen bg-slate-50 flex flex-col">
    <PublicNavbar go={go}/>
    <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-12">
      <ForgotPassword
        onBack={() => setShowForgot(false)}
        onSuccess={() => { setShowForgot(false); alert("Password reset! Please log in."); }}
      />
    </div>
  </div>
);
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar go={go} />
      <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
            <div className="bg-blue-700 px-8 py-6">
              <h1 className="text-2xl font-extrabold text-white">Welcome back</h1>
              <p className="text-blue-200 text-sm mt-1">Log in to your SwiftMove account</p>
            </div>
            <div className="p-8">
              <div className="flex rounded-xl bg-slate-100 p-1 mb-6">
                {["shipper", "driver"].map((r) => (
                  <button key={r} onClick={() => setRole(r)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold capitalize transition-all
                      ${role === r ? "bg-white text-blue-700 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
                    {r}
                  </button>
                ))}
              </div>
              {error && (
                <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>
              )}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Email address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="you@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Password</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleSubmit()} placeholder="••••••••"
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
                    <button onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <IC.Eye open={showPass} />
                    </button>
                  </div>
                  <div className="flex justify-end mt-1.5">
                    <button onClick={() => setShowForgot(true)} className="text-xs text-blue-600 hover:text-blue-800 font-semibold">Forgot password?</button>
                  </div>
                </div>
              </div>
              <button onClick={handleSubmit} disabled={loading || !email || !password}
                className="w-full mt-6 py-3.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-sm">
                {loading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Signing in…</>
                ) : `Log in as ${role}`}
              </button>
              <p className="text-center text-sm text-slate-500 mt-5">
                No account?{" "}
                <button onClick={() => go("register")} className="text-blue-600 font-bold hover:text-blue-800">Create one free</button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterPage({ go, login }) {
  const [step, setStep]         = useState(1);
  const [role, setRole]         = useState("shipper");
  const [form, setForm]         = useState({ name: "", email: "", phone: "", password: "" });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const up = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleRegister = async () => {
    setError(""); setLoading(true);
    try {
      const data = await registerUser({
        name: form.name, email: form.email,
        phone: form.phone.replace(/\D/g, ""), password: form.password, role,
      });
      saveSession(data);
      login({ id: data.id, name: data.name, email: data.email, role: data.role.toLowerCase() });
    } catch (err) {
      setError(err.message || "Registration failed. Please try again.");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <PublicNavbar go={go} />
      <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-12">
        <div className="w-full max-w-md">
          {step === 1 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="bg-blue-700 px-8 py-6">
                <h1 className="text-2xl font-extrabold text-white">Create your account</h1>
                <p className="text-blue-200 text-sm mt-1">Join SwiftMove — free to start</p>
              </div>
              <div className="p-8">
                <p className="text-sm font-semibold text-slate-700 mb-3">I want to join as a…</p>
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {[
                    { r: "shipper", label: "Shipper", sub: "Send goods" },
                    { r: "driver",  label: "Driver",  sub: "Earn by driving" },
                  ].map(({ r, label, sub }) => (
                    <button key={r} onClick={() => setRole(r)}
                      className={`border-2 rounded-xl p-4 text-left transition-all
                        ${role === r ? "border-blue-600 bg-blue-50" : "border-slate-200 hover:border-slate-300"}`}>
                      <p className={`text-sm font-bold ${role === r ? "text-blue-700" : "text-slate-800"}`}>{label}</p>
                      <p className="text-xs text-slate-400">{sub}</p>
                      {role === r && <div className="mt-2 text-blue-600"><IC.Check /></div>}
                    </button>
                  ))}
                </div>
                <button onClick={() => setStep(2)}
                  className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 text-sm flex items-center justify-center gap-2">
                  Continue as {role} <IC.Arrow />
                </button>
                <p className="text-center text-sm text-slate-500 mt-5">
                  Already have an account?{" "}
                  <button onClick={() => go("login")} className="text-blue-600 font-bold hover:text-blue-800">Log in</button>
                </p>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">
              <div className="bg-blue-700 px-8 py-6">
                <button onClick={() => setStep(1)} className="text-blue-300 hover:text-white text-xs font-semibold mb-2 transition-colors">
                  ← Change role
                </button>
                <h1 className="text-2xl font-extrabold text-white">Your details</h1>
                <p className="text-blue-200 text-sm mt-1">Registering as <span className="font-bold text-white capitalize">{role}</span></p>
              </div>
              <div className="p-8 space-y-4">
                {error && (
                  <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">{error}</div>
                )}
                {[
                  ["name",     "Full name",       "text",     "Priya Sharma"],
                  ["email",    "Email address",   "email",    "priya@example.com"],
                  ["phone",    "Mobile number",   "tel",      "9876543210"],
                  ["password", "Password",        "password", "Min. 8 characters"],
                ].map(([k, l, t, p]) => (
                  <div key={k}>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">{l}</label>
                    <div className="relative">
                      <input type={k === "password" ? (showPass ? "text" : "password") : t}
                        value={form[k]} onChange={(e) => up(k, e.target.value)} placeholder={p}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
                      {k === "password" && (
                        <button onClick={() => setShowPass(!showPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          <IC.Eye open={showPass} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                {role === "driver" && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs font-medium text-amber-800">
                    You will need to upload Aadhar, PAN and commercial license after registration.
                  </div>
                )}
                <button onClick={handleRegister}
                  disabled={loading || !form.name || !form.email || !form.phone || !form.password}
                  className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-sm">
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating account…</>
                  ) : "Create my account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LandingPage({ go }) {
  const features = [
    { icon: IC.Map,    title: "Live GPS tracking",  desc: "Real-time tracking from pickup to delivery."     },
    { icon: IC.Truck,  title: "Verified drivers",   desc: "KYC-verified with Aadhar, PAN and licenses."    },
    { icon: IC.Wallet, title: "Flexible payments",  desc: "UPI, cards, net banking or cash."               },
    { icon: IC.Shield, title: "Cargo insurance",    desc: "Optional insurance on every booking."           },
  ];
  return (
    <div className="min-h-screen bg-white">
      <PublicNavbar go={go} />
      <section className="pt-32 pb-20 px-6 bg-gradient-to-br from-slate-50 via-blue-50 to-slate-100">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row items-center gap-16">
          <div className="flex-1 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-800 text-xs font-semibold px-3 py-1.5 rounded-full mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
              Now live in beta
            </div>
            <h1 className="text-5xl lg:text-6xl font-extrabold text-slate-900 leading-tight tracking-tight mb-6">
              India's smartest<br />
              <span className="text-blue-700">logistics platform</span>
            </h1>
            <p className="text-lg text-slate-500 max-w-xl mb-10 leading-relaxed">
              On-demand goods transport with a verified driver network. Book, track and pay — all in one place.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <button onClick={() => go("register")}
                className="flex items-center justify-center gap-2 bg-blue-700 hover:bg-blue-800 text-white font-bold px-8 py-4 rounded-xl transition-all shadow-lg shadow-blue-200 text-base">
                Create free account <IC.Arrow />
              </button>
              <button onClick={() => go("login")}
                className="flex items-center justify-center border-2 border-slate-300 hover:border-blue-400 text-slate-700 hover:text-blue-700 font-bold px-8 py-4 rounded-xl transition-all text-base">
                Log in
              </button>
            </div>
          </div>
          <div className="flex-1 max-w-md w-full">
            <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl shadow-blue-100 overflow-hidden">
              <div className="bg-blue-700 px-5 py-4 flex items-center justify-between">
                <span className="text-white font-bold text-sm">Live shipment</span>
                <span className="text-xs bg-emerald-400 text-emerald-900 font-bold px-2.5 py-1 rounded-full">● In transit</span>
              </div>
              <div className="relative h-40 bg-slate-100 overflow-hidden">
                <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 160">
                  <path d="M60 130 Q 160 80 340 30" fill="none" stroke="#1d4ed8" strokeWidth="2.5"
                    strokeDasharray="8 4" strokeLinecap="round" />
                  <circle cx="60"  cy="130" r="7" fill="#1d4ed8" />
                  <circle cx="340" cy="30"  r="7" fill="#16a34a" />
                  <circle cx="210" cy="78"  r="9" fill="white" stroke="#1d4ed8" strokeWidth="2" />
                </svg>
                <div className="absolute bottom-2 left-3 bg-white rounded-lg px-2.5 py-1 shadow text-xs font-semibold">📍 Kanpur</div>
                <div className="absolute top-2 right-3 bg-white rounded-lg px-2.5 py-1 shadow text-xs font-semibold">📍 Delhi</div>
              </div>
              <div className="px-5 py-3 grid grid-cols-3 gap-3 border-b border-slate-100">
                {[["ETA", "2h 40m"], ["Distance", "420 km"], ["Driver", "4.9 ★"]].map(([l, v]) => (
                  <div key={l}>
                    <p className="text-xs text-slate-400">{l}</p>
                    <p className="text-sm font-bold text-slate-900">{v}</p>
                  </div>
                ))}
              </div>
              <div className="px-5 py-3 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">RK</div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">Rajesh Kumar</p>
                  <p className="text-xs text-slate-400">Tata Ace · UP32 AB 4821</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-20 px-6 bg-slate-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-extrabold text-slate-900">Everything logistics needs</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title}
                className="bg-white rounded-xl border border-slate-200 p-6 hover:border-blue-300 hover:shadow-lg transition-all group">
                <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center mb-4 group-hover:bg-blue-700 group-hover:text-white transition-all">
                  <Icon />
                </div>
                <h3 className="font-bold text-slate-900 mb-2 text-sm">{title}</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="py-20 px-6 bg-blue-700">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">Ready to move smarter?</h2>
          <p className="text-blue-200 text-lg mb-10">Join thousands of shippers and drivers already using SwiftMove.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button onClick={() => go("register")}
              className="bg-white text-blue-700 font-bold px-8 py-4 rounded-xl hover:bg-blue-50 transition-all text-base shadow-xl">
              Create free account
            </button>
            <button onClick={() => go("login")}
              className="border-2 border-white/40 text-white font-bold px-8 py-4 rounded-xl hover:bg-white/10 transition-all text-base">
              Log in
            </button>
          </div>
        </div>
      </section>
      <footer className="bg-slate-900 text-slate-400 py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-blue-600 flex items-center justify-center text-white"><IC.Truck /></div>
            <span className="text-white font-bold">Swift<span className="text-blue-400">Move</span></span>
          </div>
          <p className="text-sm text-slate-500">© {new Date().getFullYear()} SwiftMove.</p>
          <div className="flex gap-6 text-sm">
            {["Privacy", "Terms", "Contact"].map((l) => (
              <a key={l} href="#" className="hover:text-white transition-colors">{l}</a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  const { page, go, user, login, logout } = useRouter();
  return (
    <BookingProvider>
      {page === "login"    && <LoginPage    go={go} login={login} />}
      {page === "register" && <RegisterPage go={go} login={login} />}
      {page === "shipper"  && <ShipperDashboard user={user} logout={logout} />}
      {page === "driver"   && <DriverDashboard  user={user} logout={logout} />}
      {page === "admin"    && <AdminDashboard   user={user} onLogout={logout} />}
      {page === "landing"  && <LandingPage go={go} />}
    </BookingProvider>
  );
}