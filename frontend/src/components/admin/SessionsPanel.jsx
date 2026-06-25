import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { RefreshCw, Trash2 } from "lucide-react";

export default function SessionsPanel() {
  const [sessions, setSessions] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Note: To list all active sessions, we fetch from a reporting or session helper.
  // In our Django admin setup, since we have direct models, let's create a visual check
  // or fetch from active sessions. For security we query our DB helper.
  const fetchSessions = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get("/admin/sessions/");
      setSessions(res.data.results || res.data);
    } catch (err) {
      setError("Failed to fetch sessions");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleReset = async (sessionId) => {
    if (!window.confirm(`Are you sure you want to force-reset and expire session #${sessionId}?`)) return;
    
    setError("");
    try {
      await API.post("/admin/sessions/reset/", { session_id: sessionId });
      fetchSessions();
      alert(`Session #${sessionId} terminated successfully.`);
    } catch (err) {
      setError(err.response?.data?.error || "Error resetting attendance session");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>Attendance Sessions Monitor</h3>
          <button onClick={fetchSessions} className="btn-secondary" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }} disabled={loading}>
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>

        {error && <div style={{ color: "#f87171", marginBottom: "12px", fontSize: "0.9rem" }}>{error}</div>}

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Session ID</th>
                <th>Course</th>
                <th>Started At</th>
                <th>Expires At</th>
                <th>Live Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((session) => {
                const isExpired = new Date(session.expiry_time) < new Date() || session.status === "Expired";
                return (
                  <tr key={session.id}>
                    <td>#{session.id}</td>
                    <td style={{ fontWeight: "600" }}>{session.course_name}</td>
                    <td>{new Date(session.start_time).toLocaleTimeString()}</td>
                    <td>{new Date(session.expiry_time).toLocaleTimeString()}</td>
                    <td>
                      {isExpired ? (
                        <span className="badge-defaulter">Expired</span>
                      ) : (
                        <span className="badge-good">Active</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleReset(session.id)}
                        className="btn-secondary"
                        style={{ padding: "6px 10px", color: "#ef4444", borderColor: "rgba(239,68,68,0.2)", display: "flex", alignItems: "center", gap: "4px" }}
                        disabled={isExpired}
                      >
                        <Trash2 size={12} /> Force Reset
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
