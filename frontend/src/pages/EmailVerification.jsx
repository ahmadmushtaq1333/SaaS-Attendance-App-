import { useState } from "react";
import API from "../services/api";
import { ArrowLeft, ShieldCheck, AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

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
    <div className="glass-a" style={{
      width: "100%", maxWidth: 440, padding: "44px 36px",
      display: "flex", flexDirection: "column", gap: 28,
      boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
    }}>
      {/* Logo & Header */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: "linear-gradient(135deg, var(--emerald), var(--cyan))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 24px var(--emerald-glow)",
        }}>
          <ShieldCheck size={24} color="#07111F" strokeWidth={2.5} />
        </div>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
            Activate Account
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            Enter the 6-digit activation code sent to<br />
            <span style={{ color: "var(--cyan)", fontFamily: "monospace", fontWeight: 600 }}>{email}</span>
          </p>
        </div>
      </div>

      {/* Messaging alerts */}
      {error && (
        <div className="alert alert-danger" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <AlertCircle size={15} /> {error}
        </div>
      )}
      {message && (
        <div className="alert alert-success" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <CheckCircle2 size={15} /> {message}
        </div>
      )}

      {/* Verification Form */}
      <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--text-secondary)" }}>
            6-Digit Verification Code
          </label>
          <input 
            type="text" 
            maxLength="6"
            className="form-input" 
            placeholder="000000" 
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            style={{
              letterSpacing: "0.35em",
              textAlign: "center",
              fontWeight: "800",
              fontSize: 22,
              fontFamily: "monospace",
              paddingLeft: "0.35em",
              height: 48
            }}
            required 
            autoFocus
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading} style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15 }}>
          {loading ? "Activating…" : "Verify & Activate Account"}
        </button>
      </form>

      {/* Form Action Controls */}
      <div style={{
        display: "flex", gap: 12, width: "100%",
        borderTop: "1px solid var(--glass-inner)", paddingTop: 20, margin: 0
      }}>
        <button 
          onClick={handleResend} 
          disabled={resending} 
          className="btn-secondary" 
          style={{ flex: 1, justifyContent: "center", padding: "10px", fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
          {resending ? "Resending..." : "Resend Code"}
        </button>
        
        <button 
          onClick={onCancel} 
          className="btn-secondary" 
          style={{ flex: 1, justifyContent: "center", padding: "10px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={13} />
          Back
        </button>
      </div>
    </div>
  );
}
