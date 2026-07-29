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
      setError(err.response?.data?.error || "Unable to request password reset.");
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
      setError(err.response?.data?.error || "Reset failed. Please verify your OTP code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-card glass-a">
      <div className="login-header">
        <div className="login-logo" style={{ background: "linear-gradient(135deg, var(--purple), var(--cyan))" }}>
          <Key size={20} color="#07111F" strokeWidth={2.5} />
        </div>
        <h2>{step === 1 ? "Forgot Password" : step === 2 ? "Set New Password" : "Password Updated"}</h2>
        <p className="login-subtitle">
          {step === 1 
            ? "Enter your email to receive a password reset OTP" 
            : step === 2 
            ? `Enter the 6-digit code sent to ${email}` 
            : "Your account credentials have been successfully updated."}
        </p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}><AlertCircle size={15} />{error}</div>}
      {message && step !== 3 && <div className="alert alert-success" style={{ marginBottom: 16 }}><CheckCircle2 size={15} />{message}</div>}

      {step === 1 && (
        <form onSubmit={handleRequestReset} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="input-group">
            <label>Email Address</label>
            <div className="input-wrapper">
              <Mail className="input-icon" size={16} />
              <input 
                type="email" 
                className="form-input" 
                placeholder="you@school.edu" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: "center" }}>
            {loading ? "Sending..." : "Request Reset OTP"}
          </button>
        </form>
      )}

      {step === 2 && (
        <form onSubmit={handleConfirmReset} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div className="input-group">
            <label>6-Digit OTP Code</label>
            <div className="input-wrapper">
              <ShieldCheck className="input-icon" size={16} />
              <input 
                type="text" 
                maxLength="6"
                className="form-input" 
                placeholder="123456" 
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                style={{ letterSpacing: "0.2em", textAlign: "center", fontWeight: "bold" }}
                required 
              />
            </div>
          </div>
          <div className="input-group">
            <label>New Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="Min 8 characters" 
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required 
              />
            </div>
          </div>
          <div className="input-group">
            <label>Confirm Password</label>
            <div className="input-wrapper">
              <Lock className="input-icon" size={16} />
              <input 
                type="password" 
                className="form-input" 
                placeholder="Confirm password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required 
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: "center" }}>
            {loading ? "Saving..." : "Change Password"}
          </button>
        </form>
      )}

      {step === 3 && (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, textAlign: "center", padding: "12px 0" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(57,217,138,0.15)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--emerald)" }}>
            <CheckCircle2 size={24} />
          </div>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Your password has been reset successfully. You can now use your new password to sign in.
          </p>
          <button onClick={onBackToLogin} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
            Return to Login
          </button>
        </div>
      )}

      {step !== 3 && (
        <button 
          onClick={onBackToLogin} 
          className="btn-secondary" 
          style={{ width: "100%", justifyContent: "center", marginTop: 16, gap: 8 }}
        >
          <ArrowLeft size={14} /> Back to Login
        </button>
      )}
    </div>
  );
}
