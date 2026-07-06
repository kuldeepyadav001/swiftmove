// src/components/BookingDetailModal.jsx
// Admin clicks a booking row → full breakdown modal opens

function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function fmtDate(d) {
  return d ? new Date(d).toLocaleString("en-IN") : "—";
}

// Supports both new (driverPayout / platformCommission / commissionPct)
// and legacy (driverCut / appCut) field names.
function getSplit(b) {
  const total = Number(b.totalFare || 0);
  const driver = Number(b.driverPayout != null ? b.driverPayout : (b.driverCut || 0));
  const platform = Number(b.platformCommission != null ? b.platformCommission : (b.appCut || 0));
  const commissionPct = b.commissionPct != null
    ? Number(b.commissionPct)
    : (total > 0 ? platform / total : 0);
  return { total, driver, platform, commissionPct };
}

const STATUS_COLORS = {
  PENDING: "#fbbf24",
  ASSIGNED: "#38bdf8",
  IN_TRANSIT: "#38bdf8",
  DELIVERED_PENDING_CONFIRMATION: "#a78bfa",
  DELIVERED: "#34d399",
  DISPUTED: "#f87171",
  CANCELLED: "#94a3b8",
};

function Row({ label, value, mono }) {
  return (
    <div
      className="flex justify-between items-start py-2 border-b"
      style={{ borderColor: "#1e293b" }}
    >
      <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
      <span
        className={`text-sm font-semibold text-white text-right ${mono ? "font-mono" : ""}`}
      >
        {value}
      </span>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
        {title}
      </p>
      {children}
    </div>
  );
}

export default function BookingDetailModal({ booking, onClose }) {
  if (!booking) return null;
  const b = booking;

  const { total, driver, platform, commissionPct } = getSplit(b);
  const driverPct = Math.round((1 - commissionPct) * 100);
  const platformPct = Math.round(commissionPct * 100);

  const statusColor = STATUS_COLORS[b.status] || "#94a3b8";

  const driverValue = (
    <span style={{ color: "#34d399" }}>
      {formatINR(driver)} ({driverPct}%)
    </span>
  );

  const platformValue = (
    <span style={{ color: "#f59e0b" }}>
      {formatINR(platform)} ({platformPct}%)
    </span>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl"
        style={{ background: "#0f172a", border: "1px solid #1e293b" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between px-6 py-4 z-10"
          style={{
            background: "linear-gradient(135deg,#1a2235,#0f172a)",
            borderBottom: "1px solid #1e293b",
          }}
        >
          <div>
            <p className="font-bold text-white">{b.id}</p>
            <span
              className="text-xs font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${statusColor}20`, color: statusColor }}
            >
              {b.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Route */}
          <Section title="Route">
            <Row label="Pickup" value={b.pickup} />
            <Row label="Drop" value={b.drop} />
            <Row
              label="Distance"
              value={b.distanceKm ? `${b.distanceKm.toFixed(1)} km` : "—"}
            />
            <Row label="Vehicle" value={b.vehicleLabel} />
            <Row label="Goods" value={`${b.goodsType} · ${b.weight}`} />
          </Section>

          {/* Cargo photo */}
          {b.cargoImage && (
            <Section title="Cargo photo (uploaded by shipper)">
              <img
                src={b.cargoImage}
                alt="Cargo"
                className="w-full h-48 object-cover rounded-xl border"
                style={{ borderColor: "#1e293b" }}
              />
            </Section>
          )}

          {/* Shipper */}
          <Section title="Shipper">
            <Row label="Name" value={b.shipperName} />
            <Row label="Email" value={b.shipperEmail} />
          </Section>

          {/* Driver */}
          {b.driverName && (
            <Section title="Driver">
              <Row label="Name" value={b.driverName} />
              <Row label="Email" value={b.driverEmail} />
            </Section>
          )}

          {/* Money breakdown */}
          <Section title="Money breakdown (admin only)">
            <div
              className="rounded-xl p-4 space-y-1"
              style={{ background: "#1a2235" }}
            >
              <Row label="Total fare (customer paid)" value={formatINR(total)} />
              <Row label="Driver payout" value={driverValue} />
              <Row label="App commission" value={platformValue} />
              {b.fareBreakdown && (
                <Row label="Calculation" value={b.fareBreakdown} />
              )}
            </div>

            {/* Visual split cards */}
            <div className="flex gap-2 pt-3">
              <div className="flex-1 bg-emerald-50 rounded-lg px-3 py-2.5 text-center">
                <p className="text-emerald-700 font-bold text-sm">
                  {formatINR(driver)}
                </p>
                <p className="text-emerald-600 text-xs">Driver earns</p>
                <p className="text-emerald-500 text-xs">{driverPct}%</p>
              </div>
              <div className="flex-1 bg-blue-50 rounded-lg px-3 py-2.5 text-center">
                <p className="text-blue-700 font-bold text-sm">
                  {formatINR(platform)}
                </p>
                <p className="text-blue-600 text-xs">Platform fee</p>
                <p className="text-blue-500 text-xs">{platformPct}%</p>
              </div>
            </div>
          </Section>

          {/* Delivery proof */}
          {b.driverProofImages && b.driverProofImages.length > 0 && (
            <Section title="Delivery proof (driver uploaded)">
              <div className="grid grid-cols-2 gap-2">
                {b.driverProofImages.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`Proof ${i + 1}`}
                    className="w-full h-32 object-cover rounded-xl border"
                    style={{ borderColor: "#1e293b" }}
                  />
                ))}
              </div>
            </Section>
          )}

          {/* Dispute */}
          {b.status === "DISPUTED" && b.disputeReason && (
            <Section title="Dispute reason">
              <div
                className="rounded-xl p-4"
                style={{
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                }}
              >
                <p className="text-sm text-red-300">{b.disputeReason}</p>
              </div>
            </Section>
          )}

          {/* Timeline */}
          <Section title="Timeline">
            <Row label="Booked" value={fmtDate(b.createdAt)} />
            <Row label="Accepted" value={fmtDate(b.acceptedAt)} />
            <Row label="Delivered" value={fmtDate(b.deliveredAt)} />
            <Row label="Last updated" value={fmtDate(b.updatedAt)} />
          </Section>
        </div>
      </div>
    </div>
  );
}