import { useState, useEffect } from "react";
import { apiFetch } from "../api/apiFetch";   // <-- import your helper

function formatINR(n) {
  return `₹${Number(n || 0).toLocaleString("en-IN")}`;
}

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) { resolve(true); return; }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload  = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function PaymentGateway({ booking, user, onSuccess }) {
  const [method, setMethod]         = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [razorpayReady, setRazorpayReady] = useState(false);
  const [checking, setChecking]     = useState(true);

  const amount = booking?.totalFare || 0;

  // Check if Razorpay keys are configured
  useEffect(() => {
    apiFetch("/api/payments/razorpay-ready")
      .then(d => setRazorpayReady(d.ready))
      .catch(() => setRazorpayReady(false))
      .finally(() => setChecking(false));
  }, []);

  // ── Handle Razorpay ──────────────────────────────────────────
  const handleRazorpay = async (selectedMethod) => {
    setError(""); setLoading(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Failed to load Razorpay. Check your internet connection.");

      // Create order
      const order = await apiFetch("/api/payments/create-order", {
        method: "POST",
        body: JSON.stringify({
          bookingId: booking.id,
          amount,
          method: selectedMethod,
        }),
      });

      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: "SwiftMove",
        description: `Booking ${booking.id} — ${booking.pickup} → ${booking.drop}`,
        order_id: order.razorpayOrderId,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#1d4ed8" },
        method: selectedMethod === "upi"
          ? { upi: true, card: false }
          : { upi: false, card: true },

        handler: async (response) => {
          try {
            const verified = await apiFetch("/api/payments/verify", {
              method: "POST",
              body: JSON.stringify({
                razorpayOrderId:   response.razorpay_order_id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature,
                bookingId: booking.id,
              }),
            });
            onSuccess({
              method: selectedMethod,
              paymentType: "PREPAID",
              paymentId: response.razorpay_payment_id,
              amount,
            });
          } catch (e) {
            setError("Payment received but verification failed. Contact support with ID: " +
              response.razorpay_payment_id);
          }
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setError("Payment cancelled. You can try again.");
          },
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (response) => {
        setError("Payment failed: " + response.error.description);
        setLoading(false);
      });
      rzp.open();

    } catch (e) {
      setError(e.message);
      setLoading(false);
    }
  };

  // ── Handle COD ────────────────────────────────────────────
  const handleCod = async () => {
    setError(""); setLoading(true);
    try {
      await apiFetch("/api/payments/cod", {
        method: "POST",
        body: JSON.stringify({ bookingId: booking.id, amount }),
      });
      onSuccess({ method: "cod", paymentType: "COD", amount });
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  if (checking) return (
    <div className="flex items-center justify-center py-12">
      <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-4">

      {/* Booking summary */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-700">Booking {booking?.id}</span>
          <span className="text-xl font-extrabold text-blue-700">{formatINR(amount)}</span>
        </div>
        <p className="text-xs text-slate-500">{booking?.pickup} → {booking?.drop}</p>
        <p className="text-xs text-slate-400">{booking?.vehicleLabel} · {booking?.goodsType}</p>
      </div>

      {/* Error */}
      {error && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Payment not configured notice */}
      {!razorpayReady && (
        <div className="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
          ⚠ Razorpay keys not configured yet. Only Cash on Delivery is available.
          Add <code className="bg-amber-100 px-1 rounded">razorpay.key.id</code> and{" "}
          <code className="bg-amber-100 px-1 rounded">razorpay.key.secret</code> to{" "}
          <code className="bg-amber-100 px-1 rounded">application.properties</code> to enable UPI/Card.
        </div>
      )}

      {/* Payment method selection */}
      <div className="space-y-3">
        <p className="text-sm font-semibold text-slate-700">Choose payment method</p>

        {/* UPI */}
        <button
          onClick={() => razorpayReady && handleRazorpay("upi")}
          disabled={!razorpayReady || loading}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
            ${!razorpayReady ? "opacity-40 cursor-not-allowed border-slate-200" :
              "border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"}`}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-xs">UPI</span>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-slate-900">UPI Payment</p>
            <p className="text-xs text-slate-400">PhonePe · Google Pay · Paytm · Any UPI app</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/120px-UPI-Logo-vector.svg.png"
              className="h-5 object-contain" alt="UPI" onError={e => e.target.style.display='none'}/>
          </div>
        </button>

        {/* Card */}
        <button
          onClick={() => razorpayReady && handleRazorpay("card")}
          disabled={!razorpayReady || loading}
          className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 text-left transition-all
            ${!razorpayReady ? "opacity-40 cursor-not-allowed border-slate-200" :
              "border-slate-200 hover:border-blue-400 hover:bg-blue-50 cursor-pointer"}`}>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="w-6 h-6">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <path d="M2 10h20"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-slate-900">Debit / Credit Card</p>
            <p className="text-xs text-slate-400">Visa · Mastercard · RuPay</p>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="w-8 h-5 bg-blue-600 rounded text-white text-xs font-bold flex items-center justify-center">VISA</div>
            <div className="w-8 h-5 bg-red-500 rounded text-white text-xs font-bold flex items-center justify-center">MC</div>
          </div>
        </button>

        {/* COD */}
        <button
          onClick={handleCod}
          disabled={loading}
          className="w-full flex items-center gap-4 p-4 rounded-xl border-2 border-slate-200 hover:border-emerald-400 hover:bg-emerald-50 text-left transition-all cursor-pointer disabled:opacity-50">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" className="w-6 h-6">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
              <path d="M12 6v6l4 2"/>
            </svg>
          </div>
          <div className="flex-1">
            <p className="font-bold text-sm text-slate-900">Cash on Delivery</p>
            <p className="text-xs text-slate-400">Pay {formatINR(amount)} in cash to the driver</p>
          </div>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full flex-shrink-0">
            Always available
          </span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
          <p className="text-sm text-slate-500">Processing…</p>
        </div>
      )}

      <button onClick={onCancel} disabled={loading}
        className="w-full py-3 border-2 border-slate-200 text-slate-500 font-semibold rounded-xl hover:border-slate-300 transition-all text-sm disabled:opacity-50">
        Cancel
      </button>
    </div>
  );
}
