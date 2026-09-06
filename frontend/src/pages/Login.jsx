import { useState } from "react";
import API, { setAuthTokens } from "../services/api";
import { Lock, Mail, Eye, EyeOff, Activity, Shield, ArrowRight, Sun, Moon } from "lucide-react";
import EmailVerification from "./EmailVerification";
import ForgotPassword from "./ForgotPassword";
import DeviceRebind from "./DeviceRebind";

const getOrCreateDeviceId = () => {
  let deviceId = localStorage.getItem("device_id");
  if (!deviceId) {
    deviceId = window.crypto && crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2) + Date.now().toString(36);
    localStorage.setItem("device_id", deviceId);
  }
  return deviceId;
};

export default function Login({ onLoginSuccess, lightMode, setLightMode }) {
  const [viewState, setViewState] = useState("login"); // login, verify, forgot_password, device_rebind
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const device_id = getOrCreateDeviceId();
      // Support dual-auth: HTTPOnly cookies (Android/same-origin) & Bearer headers (iOS Safari ITP)
      const loginRes = await API.post("/auth/login/", { email: email.trim().toLowerCase(), password, device_id });
      if (loginRes.data?.access) {
        setAuthTokens({ access: loginRes.data.access, refresh: loginRes.data.refresh });
      }
      const userRes = await API.get("/auth/me/");
      onLoginSuccess(userRes.data);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.device_mismatch) {
        // Dispatch rebind OTP to user's email and switch to self-service rebind screen
        API.post("/auth/request-device-rebind/", { email: email.trim().toLowerCase() }).catch(() => {});
        setViewState("device_rebind");
      } else if (errorData?.email_unverified) {
        // Direct to activation OTP
        setViewState("verify");
      } else if (!err.response) {
        setError("Unable to connect to server. Please check your network connection.");
      } else {
        setError(errorData?.detail || "Invalid email or password credentials.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerificationSuccess = async () => {
    // Attempt automatic login after verification since user knows password
    setViewState("login");
    setError("");
    setLoading(true);
    try {
      const device_id = getOrCreateDeviceId();
      const loginRes = await API.post("/auth/login/", { email: email.trim().toLowerCase(), password, device_id });
      if (loginRes.data?.access) {
        setAuthTokens({ access: loginRes.data.access, refresh: loginRes.data.refresh });
      }
      const userRes = await API.get("/auth/me/");
      onLoginSuccess(userRes.data);
    } catch {
      setError("Email verified successfully! Please log in now.");
    } finally {
      setLoading(false);
      setPassword(""); // Clear password from state after login attempt
    }
  };

  const handleRebindSuccess = async () => {
    // Attempt automatic login after device rebind since user already provided password
    setViewState("login");
    setError("");
    setLoading(true);
    try {
      const device_id = getOrCreateDeviceId();
      const loginRes = await API.post("/auth/login/", { email: email.trim().toLowerCase(), password, device_id });
      if (loginRes.data?.access) {
        setAuthTokens({ access: loginRes.data.access, refresh: loginRes.data.refresh });
      }
      const userRes = await API.get("/auth/me/");
      onLoginSuccess(userRes.data);
    } catch {
      setError("Device linked successfully! Please enter your password to sign in.");
    } finally {
      setLoading(false);
      setPassword("");
    }
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", zIndex: 1,
    }}>
      {/* Theme toggle in corner */}
      <button
        onClick={() => setLightMode(!lightMode)}
        className="nav-icon-btn"
        style={{ position: "fixed", top: 24, right: 24, zIndex: 10 }}
        title={lightMode ? "Dark Mode" : "Light Mode"}
      >
        {lightMode ? <Moon size={16} /> : <Sun size={16} />}
      </button>

      {viewState === "verify" && (
        <EmailVerification 
          email={email} 
          onVerificationSuccess={handleVerificationSuccess} 
          onCancel={() => setViewState("login")} 
        />
      )}

      {viewState === "device_rebind" && (
        <DeviceRebind
          email={email}
          deviceId={getOrCreateDeviceId()}
          onRebindSuccess={handleRebindSuccess}
          onCancel={() => setViewState("login")}
        />
      )}

      {viewState === "forgot_password" && (
        <ForgotPassword 
          onBackToLogin={() => setViewState("login")} 
        />
      )}

      {viewState === "login" && (
        <div className="glass-a" style={{
          width: "100%", maxWidth: 440, padding: "44px 36px",
          display: "flex", flexDirection: "column", gap: 28,
          boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}>

          {/* Brand header */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 12 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 16,
              background: "linear-gradient(135deg, var(--emerald), var(--cyan))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 24px var(--emerald-glow)",
            }}>
              <Activity size={24} color="#07111F" strokeWidth={2.5} />
            </div>
            <div>
              <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: -0.5, margin: 0 }}>
                Quorum
              </h1>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>
                Sign in to your institute portal
              </p>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="alert alert-danger" style={{ margin: 0 }}>
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Mail size={13} color="var(--emerald)" /> Email Address
              </label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
                required
                autoFocus
              />
            </div>

            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                  <Lock size={13} color="var(--cyan)" /> Password
                </label>
                <button
                  type="button"
                  onClick={() => setViewState("forgot_password")}
                  style={{ background: "none", border: "none", color: "var(--purple)", cursor: "pointer", fontSize: 12, padding: 0 }}
                >
                  Forgot Password?
                </button>
              </div>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  style={{ paddingRight: 40 }}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck="false"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
                    background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer",
                    padding: 4, display: "flex", alignItems: "center",
                  }}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "12px 20px", marginTop: 6, fontSize: 15 }}
            >
              {loading ? "Authenticating…" : (
                <>Sign In <ArrowRight size={16} /></>
              )}
            </button>
          </form>

          {/* Security Footer */}
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            fontSize: 12, color: "var(--text-muted)", borderTop: "1px solid var(--glass-inner)",
            paddingTop: 18, margin: 0,
          }}>
            <Shield size={12} color="var(--emerald)" /> Secure &amp; Encrypted Connection
          </div>

        </div>
      )}
    </div>
  );
}
