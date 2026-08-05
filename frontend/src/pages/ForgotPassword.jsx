import React, { useState } from "react";
import API from "../services/api";
import { ArrowLeft, ShieldCheck, Mail, Lock, Key, AlertCircle, CheckCircle2 } from "lucide-react";

export default function ForgotPassword({ onBackToLogin }) {
  const [step, setStep] = useState(1); // 1 = Request, 2 = Confirm
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;
    setError(""); setMessage(""); setLoading(true);

    try {
      const res = await API.post("/auth/request-password-reset/", { email: email.trim().toLowerCase() });
      setMessage(res.data.message || "A verification OTP has been logged/sent to your email.");
      setStep(2);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.message || "Unable to request password reset.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError(""); setMessage(""); 

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (otp.trim().length !== 6) {
      setError("Please enter a valid 6-digit OTP code.");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("/auth/confirm-password-reset/", {
        email: email.trim().toLowerCase(),
        code: otp.trim(),
        password: newPassword
      });
      setMessage(res.data.message || "Password updated successfully!");
      setStep(3); // success state
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.message || "Reset failed. Please verify your OTP code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-a" style={{
      width: "100%", maxWidth: 440, padding: "44px 36px",
      display: "flex", flexDirection: "column", gap: 28,
      boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
    }}>
      {/* Logo & Header */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: "linear-gradient(135deg, var(--purple), var(--cyan))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 24px var(--purple-glow)",
        }}>
          <Key size={24} color="#07111F" strokeWidth={2.5} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
            {step === 1 ? "Forgot Password" : step === 2 ? "New Password" : "Password Updated"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            {step === 1 
              ? "Enter your email to receive a password reset OTP" 
              : step === 2 
              ? `Enter the 6-digit code sent to ${email}` 
              : "Your account credentials have been successfully updated."}
          </p>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div className="alert alert-danger" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {message && step !== 3 && (
        <div className="alert alert-success" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={15} /> {message}
        </div>
      )}

      {step === 1 && (
        <form onSubmit={handleRequestReset} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12 }}>
              <Mail size={13} color="var(--purple)" /> Email Address
            </label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="you@school.edu" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15 }}>
            {loading ? "Sending..." : "Request Reset OTP"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleConfirmReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 8, fontSize: 12 }}>6-Digit OTP Code</label>
            <input 
              type="text" 
              maxLength="6"
              className="form-input" 
              placeholder="000000" 
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
              style={{
                letterSpacing: "0.35em",
                textAlign: "center",
                fontWeight: "800",
                fontSize: 20,
                fontFamily: "monospace",
                paddingLeft: "0.35em",
                height: 44
              }}
              required 
            />
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12 }}>
              <Lock size={13} color="var(--purple)" /> New Password
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Min 8 characters" 
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required 
            />
          </div>
          <div>
            <label style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8, fontSize: 12 }}>
              <Lock size={13} color="var(--cyan)" /> Confirm Password
            </label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Confirm new password" 
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required 
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, marginTop: 6 }}>
            {loading ? "Saving..." : "Change Password"}
          </button>
        </form>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: "12px 0" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(57,217,138,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--emerald)" }}>
            <CheckCircle2 size={24} />
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14, lineHeight: 1.5 }}>
            Your password has been reset successfully. You can now use your new credentials to sign in.
          </p>
          <button onClick={onBackToLogin} className="btn-primary" style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15 }}>
            Return to Login
          </button>
        </div>
      )}

      {step !== 3 && (
        <button 
          onClick={onBackToLogin} 
          className="btn-secondary" 
          style={{
            width: "100%", justifyContent: "center", marginTop: 8, gap: 8, padding: "10px", fontSize: 13,
            borderTop: "1px solid var(--glass-inner)", borderRadius: 0, borderLeft: "none", borderRight: "none", borderBottom: "none",
            paddingTop: 20
          }}
        >
          <ArrowLeft size={14} /> Back to Login
        </button>
      )}
    </div>
  );
}
