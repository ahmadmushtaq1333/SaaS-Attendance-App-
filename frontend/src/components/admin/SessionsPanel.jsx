import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { RefreshCw, Trash2, Clock, AlertCircle, ArrowLeft, ArrowRight, Activity, History } from "lucide-react";
import { formatLocalDate, parseUTCDate } from "../../utils/date";
import AccordionSection from "../AccordionSection";


function DashboardActionCard({ icon: Icon, color, title, description, stats, onClick, buttonText }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--glass-a)", border: "1px solid var(--glass-border)",
        borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16,
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hover ? "translateY(-4px)" : "none",
        boxShadow: hover ? "0 16px 40px rgba(0,0,0,0.15)" : "0 4px 12px rgba(0,0,0,0.03)",
        position: "relative", overflow: "hidden", cursor: "pointer"
      }}
      onClick={onClick}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: color, opacity: 0.05, borderRadius: "50%", transform: "translate(30%, -30%)", transition: "transform 0.3s ease", ...(hover ? { transform: "translate(25%, -25%) scale(1.1)" } : {}) }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: color, transition: "transform 0.2s ease", transform: hover ? "scale(1.05)" : "none" }}>
          <Icon size={22} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{description}</p>
        </div>
      </div>
      {stats && (
        <div style={{ display: "flex", gap: 16, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", marginTop: "auto", transition: "background 0.2s ease", ...(hover ? { background: "rgba(255,255,255,0.05)" } : {}) }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}
      <button 
        style={{
          marginTop: stats ? 0 : "auto", padding: "12px 16px", borderRadius: 8,
          background: color, color: "#fff", border: "none", fontWeight: 600, fontSize: 13,
          cursor: "pointer", transition: "all 0.2s ease",
          boxShadow: `0 4px 12px ${color}40`, opacity: hover ? 1 : 0.9,
          display: "flex", justifyContent: "center", alignItems: "center", gap: 6
        }}
      >
        {buttonText} <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default function SessionsPanel() {
  const [activeView, setActiveView] = React.useState("grid");
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true); setError("");
    try {
      const res = await API.get("/admin/sessions/");
      setSessions(res.data.results || res.data);
    } catch { setError("Failed to fetch sessions"); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchSessions(); }, []);

  const handleReset = async (sessionId) => {
    if (!window.confirm(`Force-reset session #${sessionId}?`)) return;
    setError("");
    try {
      await API.post("/admin/sessions/reset/", { session_id: sessionId });
      fetchSessions();
    } catch (err) { setError(err.response?.data?.error || "Error resetting session"); }
  };

  const activeSessions = sessions.filter(s => parseUTCDate(s.expiry_time) >= new Date() && s.status !== "Expired");
  const expiredSessions = sessions.filter(s => parseUTCDate(s.expiry_time) < new Date() || s.status === "Expired");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {activeView === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <DashboardActionCard 
            icon={Activity} 
            color="var(--emerald)" 
            title="Live Sessions" 
            description="Monitor ongoing attendance sessions and force-reset if needed."
            stats={[
              { label: "Active", value: activeSessions.length }
            ]}
            buttonText="View Live Sessions"
            onClick={() => setActiveView("active")}
          />
          <DashboardActionCard 
            icon={History} 
            color="var(--text-muted)" 
            title="Session History" 
            description="Review logs of completed or expired attendance sessions."
            stats={[
              { label: "Completed", value: expiredSessions.length }
            ]}
            buttonText="View History"
            onClick={() => setActiveView("history")}
          />
        </div>
      )}

      {activeView !== "grid" && (
        <div style={{ marginBottom: 4 }}>
          <button 
            onClick={() => setActiveView("grid")}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", fontSize: 13, borderRadius: 8 }}
          >
            <ArrowLeft size={14} /> Back to Actions
          </button>
        </div>
      )}

      {activeView === "active" && (
        <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(57,217,138,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Activity size={20} color="var(--emerald)" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Active Sessions</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{activeSessions.length} sessions currently live</p>
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); fetchSessions(); }}
              className="btn-secondary"
              style={{ padding: "7px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}
              disabled={loading}
            >
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
              Refresh
            </button>
          </div>
          
          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}><AlertCircle size={15} />{error}</div>}
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Course</th>
                  <th>Started</th>
                  <th>Expires</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {activeSessions.map(session => (
                  <tr key={session.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div className="pulse-dot" style={{ width: 7, height: 7 }} />
                        <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>#{session.id}</span>
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{session.course_name}</td>
                    <td>{formatLocalDate(session.start_time)}</td>
                    <td>{formatLocalDate(session.expiry_time)}</td>
                    <td>
                      <button
                        onClick={() => handleReset(session.id)}
                        className="btn-danger"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                      >
                        <Trash2 size={12} /> Force Reset
                      </button>
                    </td>
                  </tr>
                ))}
                {activeSessions.length === 0 && !loading && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
                      No active sessions at this time.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === "history" && (
        <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <History size={20} color="var(--text-muted)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Session History</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{expiredSessions.length} completed</p>
            </div>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Session</th>
                  <th>Course</th>
                  <th>Started</th>
                  <th>Expired</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {expiredSessions.map(session => (
                  <tr key={session.id}>
                    <td><span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>#{session.id}</span></td>
                    <td style={{ fontWeight: 600 }}>{session.course_name}</td>
                    <td>{formatLocalDate(session.start_time)}</td>
                    <td>{formatLocalDate(session.expiry_time)}</td>
                    <td><span className="badge badge-defaulter">Expired</span></td>
                  </tr>
                ))}
                {expiredSessions.length === 0 && (
                  <tr>
                    <td colSpan="5" style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
                      No session history available.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
