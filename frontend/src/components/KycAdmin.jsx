// src/components/KycAdmin.jsx
import { useState, useEffect } from "react";
import { authHeaders } from "../api/authApi";

const STATUS_BADGE = {
  PENDING:  "bg-amber-100 text-amber-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
};

function timeAgo(str) {
  if (!str) return "—";
  const diff = Date.now() - new Date(str).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1)  return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h/24)}d ago`;
}

export default function KycAdmin() {
  const [docs, setDocs]         = useState([]);
  const [filter, setFilter]     = useState("PENDING");
  const [loading, setLoading]   = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing]     = useState(false);
  const [imageView, setImageView]       = useState(null);

  useEffect(() => { loadDocs(); }, []);

  async function loadDocs() {
    setLoading(true);
    try {
      const res = await fetch("/api/kyc/admin/all", { headers: authHeaders() });
      setDocs(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleApprove(id) {
    setProcessing(true);
    try {
      await fetch(`/api/kyc/admin/${id}/approve`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ note: "Documents verified" }),
      });
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: "APPROVED" } : d));
      setSelected(null);
    } catch (e) { alert("Failed: " + e.message); }
    finally { setProcessing(false); }
  }

  async function handleReject(id) {
    if (!rejectReason.trim()) { alert("Please enter a rejection reason"); return; }
    setProcessing(true);
    try {
      await fetch(`/api/kyc/admin/${id}/reject`, {
        method: "PUT", headers: authHeaders(),
        body: JSON.stringify({ reason: rejectReason }),
      });
      setDocs(prev => prev.map(d => d.id === id ? { ...d, status: "REJECTED" } : d));
      setSelected(null);
      setRejectReason("");
    } catch (e) { alert("Failed: " + e.message); }
    finally { setProcessing(false); }
  }

  const filtered = docs.filter(d => filter === "ALL" || d.status === filter);
  const counts   = {
    ALL:      docs.length,
    PENDING:  docs.filter(d => d.status === "PENDING").length,
    APPROVED: docs.filter(d => d.status === "APPROVED").length,
    REJECTED: docs.filter(d => d.status === "REJECTED").length,
  };

  return (
    <div className="space-y-4">

      {/* Image lightbox */}
      {imageView && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setImageView(null)}>
          <div className="max-w-2xl w-full" onClick={e => e.stopPropagation()}>
            <img src={imageView} className="w-full rounded-xl" alt="Document"/>
            <button onClick={() => setImageView(null)}
              className="mt-3 w-full py-2 bg-white/20 text-white rounded-xl text-sm font-semibold hover:bg-white/30 transition-all">
              Close
            </button>
          </div>
        </div>
      )}

      {/* Filter tabs */}
      <div className="flex gap-2 flex-wrap">
        {["PENDING","APPROVED","REJECTED","ALL"].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all
              ${filter === f ? "bg-blue-700 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-blue-300"}`}>
            {f} ({counts[f]})
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-blue-200 border-t-blue-700 rounded-full animate-spin"/>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-10 text-center text-slate-400 text-sm">
          No {filter.toLowerCase()} KYC submissions
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(doc => (
            <div key={doc.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {/* Header row */}
              <div className="flex items-center gap-4 px-5 py-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {doc.driverName?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 text-sm">{doc.driverName}</p>
                  <p className="text-xs text-slate-400">{doc.driverEmail} · {timeAgo(doc.submittedAt)}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[doc.status] || "bg-slate-100 text-slate-600"}`}>
                    {doc.status}
                  </span>
                  {doc.status === "PENDING" && (
                    <button onClick={() => setSelected(selected?.id === doc.id ? null : doc)}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all">
                      {selected?.id === doc.id ? "Close" : "Review"}
                    </button>
                  )}
                </div>
              </div>

              {/* Details panel */}
              {selected?.id === doc.id && (
                <div className="border-t border-slate-100 px-5 py-4 space-y-4">

                  {/* Info grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    {[
                      ["Aadhar",  doc.aadharNumber],
                      ["PAN",     doc.panNumber],
                      ["License", doc.licenseNumber],
                      ["Vehicle", doc.vehicleNumber],
                    ].map(([l, v]) => (
                      <div key={l} className="bg-slate-50 rounded-lg p-2.5">
                        <p className="text-slate-400 mb-0.5">{l}</p>
                        <p className="font-semibold text-slate-800">{v || "—"}</p>
                      </div>
                    ))}
                  </div>

                  {/* Document images */}
                  <div>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Documents</p>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {[
                        ["Aadhar F", doc.aadharFrontImage],
                        ["Aadhar B", doc.aadharBackImage],
                        ["PAN",      doc.panImage],
                        ["License",  doc.licenseImage],
                        ["RC",       doc.vehicleRcImage],
                        ["Selfie",   doc.selfieImage],
                      ].map(([label, src]) => (
                        <div key={label}>
                          {src ? (
                            <button onClick={() => setImageView(src)}
                              className="w-full aspect-square rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-all group relative">
                              <img src={src} alt={label} className="w-full h-full object-cover"/>
                              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 flex items-center justify-center transition-all">
                                <span className="text-white text-xs opacity-0 group-hover:opacity-100 font-bold">View</span>
                              </div>
                            </button>
                          ) : (
                            <div className="w-full aspect-square rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-slate-300">
                              <span className="text-xs">—</span>
                            </div>
                          )}
                          <p className="text-xs text-center text-slate-400 mt-1">{label}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Approve / Reject actions */}
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                      placeholder="Rejection reason (required to reject)…"
                      rows={2}
                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:border-red-400 focus:ring-2 focus:ring-red-100 outline-none text-sm resize-none"/>
                    <div className="flex gap-3">
                      <button onClick={() => handleReject(doc.id)} disabled={processing}
                        className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm">
                        {processing ? "…" : "❌ Reject"}
                      </button>
                      <button onClick={() => handleApprove(doc.id)} disabled={processing}
                        className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold rounded-xl transition-all text-sm shadow-lg shadow-emerald-200">
                        {processing ? "…" : "✅ Approve"}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
