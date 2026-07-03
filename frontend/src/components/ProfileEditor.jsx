// src/components/ProfileEditor.jsx
// Editable profile form — saves to MongoDB via PUT /api/user/profile

import { useState } from "react";
import { authHeaders } from "../api/authApi";

export default function ProfileEditor({ user, onUpdate }) {
  const [editing, setEditing]   = useState(false);
  const [form, setForm]         = useState({ name: user?.name || "", phone: "" });
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState("");
  const [error, setError]       = useState("");

  const up = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setError(""); setSuccess(""); setLoading(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PUT",
        headers: authHeaders(),
        body: JSON.stringify({
          name:  form.name,
          phone: form.phone.replace(/\D/g, ""),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Update failed");
      setSuccess("Profile updated successfully!");
      setEditing(false);
      // Update parent with new name
      if (onUpdate) onUpdate({ name: data.name });
      // Update localStorage
      const saved = localStorage.getItem("swiftmove_user");
      if (saved) {
        const u = JSON.parse(saved);
        u.name = data.name;
        localStorage.setItem("swiftmove_user", JSON.stringify(u));
      }
    } catch (err) {
      setError(err.message || "Failed to update profile.");
    } finally {
      setLoading(false); }
  };

  const isShipper = user?.role === "shipper";

  return (
    <div className="max-w-lg space-y-4">
      {/* Avatar + name card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-4 mb-6">
          <div className={`w-16 h-16 rounded-2xl flex items-center justify-center font-extrabold text-2xl
            ${isShipper ? "bg-blue-100 text-blue-700" : "bg-slate-800 text-white"}`}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">{user?.name}</h2>
            <p className="text-sm text-slate-400">{user?.email}</p>
            <span className={`mt-1 inline-block text-xs font-bold px-2.5 py-0.5 rounded-full
              ${isShipper ? "bg-blue-100 text-blue-700" : "bg-slate-800 text-white"}`}>
              {isShipper ? "Shipper" : "Driver"}
            </span>
          </div>
          {!editing && (
            <button onClick={() => setEditing(true)}
              className="ml-auto text-sm font-semibold text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-all">
              Edit profile
            </button>
          )}
        </div>

        {/* Success / error */}
        {success && (
          <div className="mb-4 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-xl text-sm text-emerald-700 font-medium">
            {success}
          </div>
        )}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        {editing ? (
          /* Edit mode */
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Full name</label>
              <input value={form.name} onChange={e => up("name", e.target.value)} placeholder="Your full name"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Mobile number</label>
              <input value={form.phone} onChange={e => up("phone", e.target.value)} placeholder="10-digit mobile number"
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">Email address</label>
              <input value={user?.email} disabled
                className="w-full px-4 py-3 rounded-xl border border-slate-100 bg-slate-50 text-slate-400 text-sm cursor-not-allowed" />
              <p className="text-xs text-slate-400 mt-1">Email cannot be changed</p>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => { setEditing(false); setError(""); setSuccess(""); }}
                className="flex-1 py-3 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:border-slate-300 transition-all text-sm">
                Cancel
              </button>
              <button onClick={handleSave} disabled={loading || !form.name}
                className="flex-1 py-3 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 text-sm flex items-center justify-center gap-2">
                {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : "Save changes"}
              </button>
            </div>
          </div>
        ) : (
          /* View mode */
          <div className="space-y-1">
            {[
              ["Full name",   user?.name  || "—"],
              ["Email",       user?.email || "—"],
              ["Account ID",  user?.id    || "—"],
              ["Role",        isShipper ? "Shipper" : "Driver"],
              ["Status",      "Active ✓"],
              ...(!isShipper ? [["KYC status", "Pending verification"]] : []),
            ].map(([l, v]) => (
              <div key={l} className="flex justify-between py-2.5 border-b border-slate-100 last:border-0">
                <span className="text-sm text-slate-500">{l}</span>
                <span className="text-sm font-medium text-slate-800 break-all text-right max-w-xs">{v}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Driver KYC card */}
      {!isShipper && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
          <p className="text-sm font-semibold text-amber-800 mb-1">KYC documents needed</p>
          <p className="text-xs text-amber-700 mb-3">
            Upload your Aadhar, PAN and commercial license to get fully verified and start receiving premium jobs.
          </p>
          <button className="text-xs font-bold text-amber-800 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors">
            Upload documents
          </button>
        </div>
      )}
    </div>
  );
}
