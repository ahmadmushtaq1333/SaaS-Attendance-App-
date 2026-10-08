import { useState } from "react";
import API, { setAuthTokens } from "../services/api";
import { Lock, Mail, Eye, EyeOff, Activity, Shield, ArrowRight, Sun, Moon, Fingerprint } from "lucide-react";
import EmailVerification from "./EmailVerification";
import ForgotPassword from "./ForgotPassword";
import DeviceRebind from "./DeviceRebind";
import { WebAuthnClient } from "../utils/webauthn";

export default function Login({ onLoginSuccess, lightMode, setLightMode }) {
  const [viewState, setViewState] = useState("login"); // login, verify, forgot_password, rebind, webauthn_register, webauthn_verify
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [preAuthToken, setPreAuthToken] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { getDeviceFingerprint } = await import("../utils/deviceFingerprint");
      const deviceFingerprint = await getDeviceFingerprint();

      const loginRes = await API.post("/auth/login/", {
        email: email.trim().toLowerCase(),
        password,
        device_fingerprint: deviceFingerprint
      });

      if (loginRes.data?.requires_webauthn) {
        if (!WebAuthnClient.isSupported()) {
          setError("Biometric login isn't supported in this browser. Open the app in Safari (iOS) or Chrome (Android), or add it to your Home Screen for the best experience.");
          return;
        }
        setPreAuthToken(loginRes.data.pre_auth_token);
        if (loginRes.data.is_registered) {
          setViewState("webauthn_verify");
        } else {
          setViewState("webauthn_register");
        }
        return;
      }

      if (loginRes.data?.access) {
        setAuthTokens({ access: loginRes.data.access, refresh: loginRes.data.refresh });
      }
      const userRes = await API.get("/auth/me/");
      onLoginSuccess(userRes.data);
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData?.device_mismatch) {
        setViewState("rebind");
      } else if (errorData?.device_locked) {
        setError(errorData?.detail || "This device has already been used by another account today.");
      } else if (errorData?.email_unverified) {
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

  const handleWebAuthnRegister = async () => {
    setError("");
    setLoading(true);
    try {
      // 1. Get challenge
      const challengeRes = await API.get("auth/webauthn/register/challenge/", {
        headers: { Authorization: `Bearer ${preAuthToken}` },
      });

      // 2. Client Face ID / Touch ID interaction
      const credential = await WebAuthnClient.register(challengeRes.data);

      // 3. Verify on server & receive final tokens
      const verifyRes = await API.post("auth/webauthn/register/verify/", credential, {
        headers: { Authorization: `Bearer ${preAuthToken}` },
      });

      setAuthTokens({ access: verifyRes.data.access, refresh: verifyRes.data.refresh });
      const userRes = await API.get("/auth/me/");
      onLoginSuccess(userRes.data);
    } catch (err) {
      if (err.name === "NotAllowedError") {
        setError("Biometric prompt dismissed. Please try again.");
      } else {
        setError(err.response?.data?.error || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleWebAuthnVerify = async () => {
    setError("");
    setLoading(true);
    try {
      // 1. Get challenge
      const challengeRes = await API.get("auth/webauthn/auth/challenge/", {
        headers: { Authorization: `Bearer ${preAuthToken}` },
      });

      // 2. Client Face ID / Touch ID interaction
      const credential = await WebAuthnClient.authenticate(challengeRes.data);

      // 3. Verify on server & receive final tokens
      const verifyRes = await API.post("auth/webauthn/auth/verify/", credential, {
        headers: { Authorization: `Bearer ${preAuthToken}` },
      });

      setAuthTokens({ access: verifyRes.data.access, refresh: verifyRes.data.refresh });
      const userRes = await API.get("/auth/me/");
      onLoginSuccess(userRes.data);
    } catch (err) {
      if (err.response?.data?.error === "WebAuthn credential not found for this user.") {
        // is_registered changed mid-flow — redirect to register
        setViewState("webauthn_register");
        setError("No device found for this account. Please register this device instead.");
      } else if (err.name === "NotAllowedError") {
        setError("Biometric prompt dismissed. Please try again.");
      } else {
        setError(err.response?.data?.error || "Authentication failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };


  const handleVerificationSuccess = async () => {
    setViewState("login");
    setError("");
  };

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      padding: 24, position: "relative", zIndex: 1,
    }}>
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

      {viewState === "forgot_password" && (
        <ForgotPassword 
          onBackToLogin={() => setViewState("login")} 
        />
      )}

      {viewState === "rebind" && (
        <DeviceRebind 
          email={email} 
          onSuccess={() => {
            setViewState("login");
            setError("Device unbound successfully. Please log in to complete binding.");
          }}
          onCancel={() => setViewState("login")} 
        />
      )}

      {(viewState === "webauthn_register" || viewState === "webauthn_verify") && (
        <div className="glass-a" style={{
          width: "100%", maxWidth: 440, padding: "44px 36px",
          display: "flex", flexDirection: "column", gap: 28, textAlign: "center",
          boxShadow: "0 24px 64px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.2)",
        }}>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              background: "linear-gradient(135deg, var(--purple), var(--cyan))",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 32px rgba(168, 85, 247, 0.4)",
            }}>
              <Fingerprint size={32} color="white" />
            </div>
          </div>
          
          <div>
            <h2 style={{ margin: "0 0 8px 0", fontSize: 22, fontWeight: 700 }}>
              {viewState === "webauthn_register" ? "Register this Device" : "Verify Device"}
            </h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 14, lineHeight: 1.5 }}>
              {viewState === "webauthn_register" 
                ? "This device is not registered. Please set up a Passkey (Face ID/Touch ID) to securely bind it to your account."
                : "Please verify your Passkey (Face ID/Touch ID) to log in securely."}
            </p>
          </div>

          {error && (
            <div className="alert alert-danger" style={{ margin: 0, textAlign: "left" }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <button
              onClick={viewState === "webauthn_register" ? handleWebAuthnRegister : handleWebAuthnVerify}
              className="btn-primary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }}
            >
              {loading ? "Waiting..." : (viewState === "webauthn_register" ? "Set up Passkey" : "Verify Passkey")}
            </button>
            <button
              onClick={() => {
                setViewState("login");
                setPreAuthToken("");
                setError("");
              }}
              className="btn-secondary"
              disabled={loading}
              style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }}
            >
              Cancel
            </button>
          </div>
        </div>
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
