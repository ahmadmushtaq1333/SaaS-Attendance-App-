import React, { useState } from "react";
import API from "../services/api";
import { ArrowLeft, ShieldCheck, Mail, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

export default function EmailVerification({ email, onVerificationSuccess, onCancel }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError("Please enter a valid 6-digit OTP code.");
      return;
    }
    setError(""); setMessage(""); setLoading(true);

    try {
      const res = await API.post("/auth/verify-email/", {
        email: email.trim().toLowerCase(),
        code: code.trim()
      });
      setMessage(res.data.message || "Account verified successfully!");
      setTimeout(() => {
        onVerificationSuccess();
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.message || "Invalid or expired activation code.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(""); setMessage(""); setResending(true);
    try {
      const res = await API.post("/auth/send-otp/", { email: email.trim().toLowerCase() });
      setMessage(res.data.message || "A new verification code has been generated.");
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || err.message || "Unable to resend OTP.");
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="login-card glass-a">
      <div className="login-header">
        <div className="login-logo" style={{ background: "linear-gradient(135deg, var(--emerald), var(--cyan))" }}>
          <ShieldCheck size={20} color="#07111F" strokeWidth={2.5} />
        </div>
        <h2>Verify Your Email</h2>
        <p className="login-subtitle">
          We have generated an activation OTP code for <code style={{ color: "var(--cyan)" }}>{email}</code>. 
          Enter it below to unlock access.
        </p>
      </div>

      {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}><AlertCircle size={15} />{error}</div>}
      {message && <div className="alert alert-success" style={{ marginBottom: 16 }}><CheckCircle2 size={15} />{message}</div>}

      <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div className="input-group">
          <label>6-Digit Activation Code</label>
          <div className="input-wrapper">
            <ShieldCheck className="input-icon" size={16} />
            <input 
              type="text" 
              maxLength="6"
              className="form-input" 
              placeholder="123456" 
              value={code}
              onChange={(e) => setCode(e.target.value)}
              style={{ letterSpacing: "0.25em", textAlign: "center", fontWeight: "bold", fontSize: 18 }}
              required 
            />
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ justifyContent: "center" }}>
          {loading ? "Verifying..." : "Verify & Activate Account"}
        </button>
      </form>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 20, fontSize: 13 }}>
        <button 
          onClick={handleResend} 
          disabled={resending} 
          className="btn-secondary" 
          style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <RefreshCw size={12} className={resending ? "animate-spin" : ""} />
          {resending ? "Sending..." : "Resend Code"}
        </button>
        
        <button 
          onClick={onCancel} 
          className="btn-secondary" 
          style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={12} />
          Cancel
        </button>
      </div>
    </div>
  );
}
