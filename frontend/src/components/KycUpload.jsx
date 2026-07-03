// src/components/KycUpload.jsx
import { useState, useEffect, useRef } from "react";
import { authHeaders } from "../api/authApi";

const VEHICLE_TYPES = [
  { id: "bike",          label: "Bike (2-Wheeler)"      },
  { id: "three-wheeler", label: "Three Wheeler"          },
  { id: "tata-ace",      label: "Tata Ace / Mini Truck" },
  { id: "pickup",        label: "Pickup Truck (8ft)"    },
  { id: "large-truck",   label: "Large Truck (18ft)"    },
];

const STATUS_CONFIG = {
  NOT_SUBMITTED: { color: "bg-slate-100 text-slate-600",   icon: "📋", label: "Not submitted"    },
  PENDING:       { color: "bg-amber-100 text-amber-800",   icon: "⏳", label: "Under review"     },
  APPROVED:      { color: "bg-emerald-100 text-emerald-800",icon: "✅", label: "Verified"         },
  REJECTED:      { color: "bg-red-100 text-red-800",       icon: "❌", label: "Action required"  },
  RESUBMIT:      { color: "bg-orange-100 text-orange-800", icon: "🔄", label: "Resubmit required" },
};

// Convert file to base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function UploadBox({ label, required, value, onChange, hint }) {
  const inputRef = useRef(null);

  return (
    <div>
      <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {value ? (
        <div className="relative rounded-xl overflow-hidden border-2 border-emerald-300 bg-emerald-50">
          <img src={value} alt={label}
            className="w-full h-32 object-cover"/>
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/20 transition-all group">
            <button onClick={() => onChange(null)}
              className="opacity-0 group-hover:opacity-100 bg-red-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-all">
              Remove
            </button>
          </div>
          <div className="absolute top-2 right-2 bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            ✓ Uploaded
          </div>
        </div>
      ) : (
        <button onClick={() => inputRef.current?.click()}
          className="w-full h-32 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center gap-2 hover:border-blue-400 hover:bg-blue-50 transition-all text-slate-400 hover:text-blue-600">
          <span className="text-2xl">📷</span>
          <span className="text-xs font-medium">Click to upload</span>
          {hint && <span className="text-xs opacity-70">{hint}</span>}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          if (file.size > 5 * 1024 * 1024) { alert("File too large. Max 5MB."); return; }
          const b64 = await fileToBase64(file);
          onChange(b64);
          e.target.value = "";
        }}/>
    </div>
  );
}

export default function KycUpload({ user, onStatusChange }) {
  const [kycStatus, setKycStatus] = useState(null);
  const [loading, setLoading]     = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");
  const [showForm, setShowForm]   = useState(false);

  const [form, setForm] = useState({
    aadharNumber:     "",
    panNumber:        "",
    licenseNumber:    "",
    vehicleNumber:    "",
    vehicleType:      "",
    aadharFrontImage: null,
    aadharBackImage:  null,
    panImage:         null,
    licenseImage:     null,
    vehicleRcImage:   null,
    selfieImage:      null,
  });

  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // Load current KYC status
  useEffect(() => {
    fetch("/api/kyc/status", { headers: authHeaders() })
      .then(r => r.json())
      .then(data => {
        setKycStatus(data);
        if (onStatusChange) onStatusChange(data.status);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async () => {
    // Validate required fields
    if (!form.aadharNumber || !form.panNumber || !form.licenseNumber ||
        !form.vehicleNumber || !form.vehicleType) {
      setError("Please fill in all required fields."); return;
    }
    if (!form.aadharFrontImage || !form.panImage || !form.licenseImage) {
      setError("Please upload Aadhar (front), PAN and License images."); return;
    }

    setError(""); setSubmitting(true);
    try {
      const res = await fetch("/api/kyc/submit", {
        method: "POST",
        headers: authHeaders(),
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Submission failed");
      setSuccess("Documents submitted! We'll review within 24-48 hours.");
      setKycStatus({ status: "PENDING", submittedAt: new Date().toISOString() });
      setShowForm(false);
      if (onStatusChange) onStatusChange("PENDING");
    } catch (e) {
      setError(e.message);
    } finally { setSubmitting(false); }
  };

  if (loading) return (
    <div className="flex justify-center py-8">
      <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
    </div>
  );

  const status = kycStatus?.status || "NOT_SUBMITTED";
  const cfg    = STATUS_CONFIG[status] || STATUS_CONFIG.NOT_SUBMITTED;

  return (
    <div className="space-y-4">

      {/* Status card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-900">KYC Verification</h2>
          <span className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5 ${cfg.color}`}>
            {cfg.icon} {cfg.label}
          </span>
        </div>

        {/* Progress steps */}
        <div className="flex items-center gap-2 mb-4">
          {[
            { label: "Submit",  done: status !== "NOT_SUBMITTED" },
            { label: "Review",  done: status === "APPROVED" || status === "REJECTED" },
            { label: "Verified",done: status === "APPROVED" },
          ].map((step, i) => (
            <div key={step.label} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                ${step.done ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-500"}`}>
                {step.done ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-medium ${step.done ? "text-emerald-600" : "text-slate-400"}`}>
                {step.label}
              </span>
              {i < 2 && <div className={`flex-1 h-0.5 ${step.done ? "bg-emerald-400" : "bg-slate-200"}`}/>}
            </div>
          ))}
        </div>

        {/* Status specific messages */}
        {status === "NOT_SUBMITTED" && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">KYC required to go online</p>
            <p className="text-xs text-amber-700">
              Upload your Aadhar, PAN and commercial driving license to start accepting jobs.
            </p>
          </div>
        )}

        {status === "PENDING" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-blue-800 mb-1">Documents under review</p>
            <p className="text-xs text-blue-700">
              Submitted on {new Date(kycStatus.submittedAt).toLocaleDateString("en-IN")}.
              Typically verified within 24-48 hours.
            </p>
          </div>
        )}

        {status === "APPROVED" && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-emerald-800 mb-1">✅ Fully verified</p>
            <p className="text-xs text-emerald-700">
              Your account is verified. You can go online and accept jobs.
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
              {[
                ["Aadhar",  kycStatus.hasAadhar],
                ["PAN",     kycStatus.hasPan],
                ["License", kycStatus.hasLicense],
              ].map(([doc, has]) => (
                <div key={doc} className={`text-center py-1.5 rounded-lg font-medium
                  ${has ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"}`}>
                  {has ? "✓" : "—"} {doc}
                </div>
              ))}
            </div>
          </div>
        )}

        {status === "REJECTED" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-semibold text-red-800 mb-1">Action required</p>
            <p className="text-xs text-red-700 mb-2">
              <strong>Reason:</strong> {kycStatus.rejectionReason || "Documents unclear or incomplete"}
            </p>
            <p className="text-xs text-red-600">Please resubmit with corrected documents.</p>
          </div>
        )}

        {/* Already submitted details */}
        {status !== "NOT_SUBMITTED" && kycStatus.aadharNumber && (
          <div className="space-y-1 text-sm mb-4">
            {[
              ["Aadhar",  kycStatus.aadharNumber],
              ["PAN",     kycStatus.panNumber],
              ["License", kycStatus.licenseNumber],
              ["Vehicle", kycStatus.vehicleNumber],
            ].filter(([,v]) => v).map(([l, v]) => (
              <div key={l} className="flex justify-between py-1.5 border-b border-slate-50 last:border-0">
                <span className="text-slate-400">{l}</span>
                <span className="font-medium text-slate-800">{v}</span>
              </div>
            ))}
          </div>
        )}

        {/* Action buttons */}
        {(status === "NOT_SUBMITTED" || status === "REJECTED") && !showForm && (
          <button onClick={() => setShowForm(true)}
            className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 text-sm">
            {status === "REJECTED" ? "Resubmit documents" : "Upload documents"}
          </button>
        )}
      </div>

      {/* Upload form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">Upload documents</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 text-sm">
              ✕ Cancel
            </button>
          </div>

          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Personal details */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Personal details</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                ["aadharNumber",  "Aadhar Number",   "12-digit number",  true],
                ["panNumber",     "PAN Number",       "e.g. ABCDE1234F",  true],
                ["licenseNumber", "License Number",   "DL number",        true],
                ["vehicleNumber", "Vehicle Number",   "e.g. UP32AB1234",  true],
              ].map(([k, l, p, req]) => (
                <div key={k}>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1 block">
                    {l} {req && <span className="text-red-500">*</span>}
                  </label>
                  <input value={form[k]} onChange={e => up(k, e.target.value)} placeholder={p}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"/>
                </div>
              ))}
            </div>

            {/* Vehicle type */}
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                Vehicle type <span className="text-red-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {VEHICLE_TYPES.map(v => (
                  <button key={v.id} onClick={() => up("vehicleType", v.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all
                      ${form.vehicleType === v.id
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Document uploads */}
          <div className="space-y-3">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Documents</p>
            <div className="grid grid-cols-2 gap-4">
              <UploadBox label="Aadhar Front" required value={form.aadharFrontImage}
                onChange={v => up("aadharFrontImage", v)} hint="Front side"/>
              <UploadBox label="Aadhar Back" value={form.aadharBackImage}
                onChange={v => up("aadharBackImage", v)} hint="Back side"/>
              <UploadBox label="PAN Card" required value={form.panImage}
                onChange={v => up("panImage", v)} hint="Clear photo"/>
              <UploadBox label="Driving License" required value={form.licenseImage}
                onChange={v => up("licenseImage", v)} hint="Commercial license"/>
              <UploadBox label="Vehicle RC" value={form.vehicleRcImage}
                onChange={v => up("vehicleRcImage", v)} hint="Registration certificate"/>
              <UploadBox label="Selfie" value={form.selfieImage}
                onChange={v => up("selfieImage", v)} hint="Clear face photo"/>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            📎 Max 5MB per image · JPG, PNG supported · Ensure documents are clearly readable
          </p>

          <button onClick={handleSubmit} disabled={submitting}
            className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-sm">
            {submitting
              ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Submitting…</>
              : "Submit for verification"}
          </button>
        </div>
      )}

      {success && (
        <div className="px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
          {success}
        </div>
      )}
    </div>
  );
}
