// src/components/ForgotPassword.jsx
// 3-step flow: Enter email → Enter OTP → Set new password

import { useState, useRef } from "react";

const EyeIcon = ({ open }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
    {open ? (
      <><path d="M1 12S5 5 12 5s11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></>
    ) : (
      <><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>
    )}
  </svg>
);

export default function ForgotPassword({ onBack, onSuccess }) {
  const [step, setStep]         = useState(1); // 1=email, 2=otp, 3=newpass
  const [email, setEmail]       = useState("");
  const [otp, setOtp]           = useState(["","","","","",""]);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm]   = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");
  const [maskedEmail, setMaskedEmail] = useState("");
  const otpRefs = useRef([]);

  // ── Step 1: Request OTP ───────────────────────────────────────────────────
  const handleRequestOtp = async () => {
    if (!email || !email.includes("@")) {
      setError("Enter a valid email address"); return;
    }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to send OTP");
      setMaskedEmail(data.message.replace("OTP sent to ", ""));
      setStep(2);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  // ── OTP input handling ────────────────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    // Auto-advance to next field
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(""));
      otpRefs.current[5]?.focus();
    }
  };

  // ── Step 2: Verify OTP ────────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    const otpString = otp.join("");
    if (otpString.length !== 6) { setError("Enter the 6-digit OTP"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otpString }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid OTP");
      setStep(3);
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  // ── Step 3: Reset password ────────────────────────────────────────────────
  const handleResetPassword = async () => {
    if (password.length < 8) { setError("Password must be at least 8 characters"); return; }
    if (password !== confirm)  { setError("Passwords do not match"); return; }
    setError(""); setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp: otp.join(""), newPassword: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Reset failed");
      if (onSuccess) onSuccess();
    } catch (e) {
      setError(e.message);
    } finally { setLoading(false); }
  };

  const stepLabels = ["Email", "Verify OTP", "New Password"];

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden">

        {/* Header */}
        <div className="bg-blue-700 px-8 py-6">
          <button onClick={onBack}
            className="text-blue-300 hover:text-white text-xs font-semibold mb-2 transition-colors">
            ← Back to login
          </button>
          <h1 className="text-2xl font-extrabold text-white">Reset password</h1>
          <p className="text-blue-200 text-sm mt-1">
            {step === 1 && "We'll send an OTP to your email"}
            {step === 2 && `Enter the 6-digit code sent to ${maskedEmail}`}
            {step === 3 && "Choose a strong new password"}
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex border-b border-slate-100">
          {stepLabels.map((label, i) => (
            <div key={label} className={`flex-1 py-3 text-center text-xs font-semibold transition-all
              ${step === i+1 ? "text-blue-700 border-b-2 border-blue-700" :
                step > i+1 ? "text-emerald-600" : "text-slate-300"}`}>
              {step > i+1 ? "✓ " : ""}{label}
            </div>
          ))}
        </div>

        <div className="p-8 space-y-5">

          {/* Error */}
          {error && (
            <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 font-medium">
              {error}
            </div>
          )}

          {/* Step 1 — Email */}
          {step === 1 && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Email address
                </label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleRequestOtp()}
                  placeholder="your@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"/>
              </div>
              <button onClick={handleRequestOtp} disabled={loading || !email}
                className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-sm">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Sending OTP…</>
                  : "Send OTP →"}
              </button>
            </>
          )}

          {/* Step 2 — OTP */}
          {step === 2 && (
            <>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3 block">
                  6-digit OTP
                </label>
                <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
                  {otp.map((digit, i) => (
                    <input key={i} type="text" inputMode="numeric" maxLength={1}
                      value={digit}
                      ref={el => otpRefs.current[i] = el}
                      onChange={e => handleOtpChange(i, e.target.value)}
                      onKeyDown={e => handleOtpKeyDown(i, e)}
                      className={`w-12 h-14 text-center text-xl font-bold rounded-xl border-2 outline-none transition-all
                        ${digit ? "border-blue-500 bg-blue-50 text-blue-700" : "border-slate-200 text-slate-900"}
                        focus:border-blue-500 focus:ring-2 focus:ring-blue-100`}/>
                  ))}
                </div>
                <p className="text-xs text-slate-400 text-center mt-3">
                  Didn't receive it?{" "}
                  <button onClick={() => { setOtp(["","","","","",""]); handleRequestOtp(); }}
                    className="text-blue-600 font-semibold hover:text-blue-800 transition-colors">
                    Resend OTP
                  </button>
                </p>
              </div>
              <button onClick={handleVerifyOtp} disabled={loading || otp.join("").length !== 6}
                className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-sm">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Verifying…</>
                  : "Verify OTP →"}
              </button>
            </>
          )}

          {/* Step 3 — New password */}
          {step === 3 && (
            <>
              {[
                ["password", "New password",    password, setPassword],
                ["confirm",  "Confirm password", confirm,  setConfirm],
              ].map(([id, label, val, setter]) => (
                <div key={id}>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                    {label}
                  </label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} value={val}
                      onChange={e => setter(e.target.value)} placeholder="Min. 8 characters"
                      className="w-full px-4 py-3 pr-11 rounded-xl border border-slate-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100 outline-none text-sm"/>
                    {id === "password" && (
                      <button onClick={() => setShowPass(!showPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <EyeIcon open={showPass}/>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Password strength indicator */}
              {password.length > 0 && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`flex-1 h-1 rounded-full transition-all ${
                        password.length >= i * 3
                          ? i <= 1 ? "bg-red-400"
                          : i <= 2 ? "bg-amber-400"
                          : i <= 3 ? "bg-blue-400"
                          : "bg-emerald-500"
                          : "bg-slate-200"
                      }`}/>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400">
                    {password.length < 8 ? "Too short" :
                     password.length < 10 ? "Weak — add numbers or symbols" :
                     password.length < 14 ? "Good password" : "Strong password ✓"}
                  </p>
                </div>
              )}

              <button onClick={handleResetPassword}
                disabled={loading || password.length < 8 || password !== confirm}
                className="w-full py-3.5 bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-2 text-sm">
                {loading
                  ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>Resetting…</>
                  : "Reset password"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
