import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { RefreshCw, Trash2, Clock, AlertCircle } from "lucide-react";

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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="glass-b" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Clock size={18} color="var(--cyan)" />
            <h3 style={{ margin: 0 }}>Attendance Sessions Monitor</h3>
          </div>
          <button onClick={fetchSessions} className="btn-secondary" style={{ padding: "8px 14px" }} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
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
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map(session => {
                const isExpired = new Date(session.expiry_time) < new Date() || session.status === "Expired";
                return (
                  <tr key={session.id}>
                    <td>
                      <span style={{ fontFamily: "monospace", fontSize: 12, color: "var(--text-muted)" }}>#{session.id}</span>
                    </td>
                    <td style={{ fontWeight: 600 }}>{session.course_name}</td>
                    <td>{new Date(session.start_time).toLocaleTimeString()}</td>
                    <td>{new Date(session.expiry_time).toLocaleTimeString()}</td>
                    <td>
                      <span className={`badge ${isExpired ? "badge-defaulter" : "badge-good"}`}>
                        {isExpired ? "Expired" : "Active"}
                      </span>
                    </td>
                    <td>
                      <button
                        onClick={() => handleReset(session.id)}
                        className="btn-danger"
                        style={{ padding: "6px 12px", fontSize: 12 }}
                        disabled={isExpired}
                      >
                        <Trash2 size={12} /> Force Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
              {sessions.length === 0 && !loading && (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>
                    No sessions found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
