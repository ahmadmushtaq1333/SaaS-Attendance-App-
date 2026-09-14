import { useState } from "react";
import API from "../services/api";
import { ArrowLeft, Smartphone, AlertCircle, CheckCircle2, RefreshCw, ShieldAlert } from "lucide-react";

export default function DeviceRebind({ email, onSuccess, onCancel }) {
  const [step, setStep] = useState("request"); // request | verify | done
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleRequest = async () => {
    setError(""); setMessage(""); setLoading(true);
    try {
      await API.post("/auth/rebind/request/", { email: email.trim().toLowerCase() });
      setStep("verify");
      setMessage("A 6-digit verification code has been sent to your email.");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError(""); setMessage(""); setResending(true);
    try {
      await API.post("/auth/rebind/request/", { email: email.trim().toLowerCase() });
      setMessage("A new code has been sent to your email.");
    } catch (err) {
      setError(err.response?.data?.error || "Unable to resend. Please try again.");
    } finally {
      setResending(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (code.trim().length !== 6) {
      setError("Please enter a valid 6-digit code.");
      return;
    }
    setError(""); setMessage(""); setLoading(true);
    try {
      await API.post("/auth/rebind/confirm/", {
        email: email.trim().toLowerCase(),
        code: code.trim(),
      });
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  // ── Done ─────────────────────────────────────────────────────────────────────
  if (step === "done") {
    return (
      <div className="glass-a" style={{
        width: "100%", maxWidth: 440, padding: "44px 36px",
        display: "flex", flexDirection: "column", gap: 28, textAlign: "center",
        boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 60, height: 60, borderRadius: 16,
            background: "linear-gradient(135deg, var(--emerald), var(--cyan))",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px var(--emerald-glow)",
          }}>
            <CheckCircle2 size={28} color="#07111F" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0 }}>Device Unbound</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8, lineHeight: 1.6 }}>
              Your device binding has been cleared. Log in now to register this device.
            </p>
          </div>
        </div>
        <button
          onClick={onSuccess}
          className="btn-primary"
          style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15 }}
        >
          Back to Login
        </button>
      </div>
    );
  }

  // ── Request ───────────────────────────────────────────────────────────────────
  if (step === "request") {
    return (
      <div className="glass-a" style={{
        width: "100%", maxWidth: 440, padding: "44px 36px",
        display: "flex", flexDirection: "column", gap: 28,
        boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
      }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16,
            background: "linear-gradient(135deg, #f59e0b, #ef4444)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 24px rgba(245,158,11,0.3)",
          }}>
            <ShieldAlert size={24} color="#07111F" strokeWidth={2.5} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
              Unrecognized Device
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.6 }}>
              This account is linked to another device. To log in here, verify your identity with a
              one-time code sent to <span style={{ color: "var(--cyan)", fontFamily: "monospace", fontWeight: 600 }}>{email}</span>.
            </p>
          </div>
        </div>

        {error && (
          <div className="alert alert-danger" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
            <AlertCircle size={15} /> {error}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            onClick={handleRequest}
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15 }}
          >
            {loading ? "Sending…" : "Send Verification Code"}
          </button>
          <button
            onClick={onCancel}
            className="btn-secondary"
            style={{ width: "100%", justifyContent: "center", padding: "10px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          >
            <ArrowLeft size={13} /> Back to Login
          </button>
        </div>
      </div>
    );
  }

  // ── Verify ────────────────────────────────────────────────────────────────────
  return (
    <div className="glass-a" style={{
      width: "100%", maxWidth: 440, padding: "44px 36px",
      display: "flex", flexDirection: "column", gap: 28,
      boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
    }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
        <div style={{
          width: 52, height: 52, borderRadius: 16,
          background: "linear-gradient(135deg, var(--emerald), var(--cyan))",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 0 24px var(--emerald-glow)",
        }}>
          <Smartphone size={24} color="#07111F" strokeWidth={2.5} />
        </div>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: 0, letterSpacing: -0.5 }}>
            Enter Verification Code
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
            Code sent to <span style={{ color: "var(--cyan)", fontFamily: "monospace", fontWeight: 600 }}>{email}</span>
          </p>
        </div>
      </div>

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

      <form onSubmit={handleVerify} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <label style={{ display: "block", marginBottom: 8, fontSize: 12, color: "var(--text-secondary)" }}>
            6-Digit Code
          </label>
          <input
            type="text"
            maxLength="6"
            className="form-input"
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            style={{
              letterSpacing: "0.35em", textAlign: "center",
              fontWeight: "800", fontSize: 22, fontFamily: "monospace",
              paddingLeft: "0.35em", height: 48,
            }}
            required
            autoFocus
          />
        </div>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
          style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15 }}
        >
          {loading ? "Verifying…" : "Confirm & Unbind Device"}
        </button>
      </form>

      <div style={{ display: "flex", gap: 12, borderTop: "1px solid var(--glass-inner)", paddingTop: 20 }}>
        <button
          onClick={handleResend}
          disabled={resending}
          className="btn-secondary"
          style={{ flex: 1, justifyContent: "center", padding: "10px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
        >
          <RefreshCw size={13} className={resending ? "animate-spin" : ""} />
          {resending ? "Resending…" : "Resend Code"}
        </button>
        <button
          onClick={onCancel}
          className="btn-secondary"
          style={{ flex: 1, justifyContent: "center", padding: "10px", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
        >
          <ArrowLeft size={13} /> Back
        </button>
      </div>
    </div>
  );
}
