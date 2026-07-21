import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { RefreshCw, Trash2, Clock, AlertCircle } from "lucide-react";
import AccordionSection from "../AccordionSection";

export default function SessionsPanel() {
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

  const activeSessions = sessions.filter(s => new Date(s.expiry_time) >= new Date() && s.status !== "Expired");
  const expiredSessions = sessions.filter(s => new Date(s.expiry_time) < new Date() || s.status === "Expired");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── Active Sessions ── */}
      <AccordionSection
        title="Active Sessions"
        subtitle={`(${activeSessions.length} live)`}
        icon={<Clock size={18} color="var(--emerald)" />}
        iconBg="rgba(57,217,138,0.15)"
        defaultOpen={true}
        badge={
          <button
            onClick={(e) => { e.stopPropagation(); fetchSessions(); }}
            className="btn-secondary"
            style={{ padding: "5px 10px", fontSize: 12, display: "flex", alignItems: "center", gap: 5 }}
            disabled={loading}
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
        }
      >
        {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}><AlertCircle size={15} />{error}</div>}
        <div style={{ marginTop: 16 }}>
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
                    <td>{new Date(session.start_time).toLocaleTimeString()}</td>
                    <td>{new Date(session.expiry_time).toLocaleTimeString()}</td>
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
      </AccordionSection>

      {/* ── Expired Sessions History ── */}
      <AccordionSection
        title="Session History"
        subtitle={`(${expiredSessions.length} completed)`}
        icon={<Clock size={18} color="var(--text-muted)" />}
        iconBg="rgba(255,255,255,0.06)"
        defaultOpen={false}
      >
        <div style={{ marginTop: 16 }}>
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
                    <td>{new Date(session.start_time).toLocaleTimeString()}</td>
                    <td>{new Date(session.expiry_time).toLocaleTimeString()}</td>
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
      </AccordionSection>

    </div>
  );
}
