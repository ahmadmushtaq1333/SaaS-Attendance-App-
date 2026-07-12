import React, { useState, useEffect } from "react";
import API from "../services/api";
import { Plus, RefreshCw, Eye } from "lucide-react";

export default function Dashboard({ user, onViewReports }) {
  const [courses, setCourses] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Setup sample courses for testing (since we are creating standard API routes, we query them)
  useEffect(() => {
    fetchCourses();
    fetchActiveSession();
  }, []);

  const fetchActiveSession = async () => {
    try {
      const res = await API.get("/sessions/");
      if (res.data && res.data.length > 0) {
        const latest = res.data[0];
        const expiry = new Date(latest.expiry_time);
        const now = new Date();
        const diff = Math.floor((expiry - now) / 1000);
        
        if (diff > 0) {
          setActiveSession(latest);
          setQrCode(latest.qr_code);
          setTimeLeft(diff);
        }
      }
    } catch (e) {
      console.error("Failed to restore active session");
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await API.get("/auth/courses/");
      setCourses(res.data);
    } catch (e) {
      setError("Failed to fetch courses");
    }
  };

  const createSession = async (courseId) => {
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/sessions/", { course_id: courseId });
      setActiveSession(res.data);
      setQrCode(res.data.qr_code);
      setTimeLeft(120);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create attendance session");
    } finally {
      setLoading(false);
    }
  };

  const refreshQR = async () => {
    if (!activeSession) return;
    try {
      const res = await API.get(`/sessions/${activeSession.id}/qr/`);
      setQrCode(res.data.qr_code);
      setTimeLeft(120);
    } catch (err) {
      setError("Failed to rotate QR token");
    }
  };

  const stopSession = async () => {
    if (!activeSession) return;
    try {
      await API.post(`/sessions/${activeSession.id}/stop/`);
      setActiveSession(null);
      setQrCode("");
      setTimeLeft(0);
    } catch (err) {
      setError("Failed to stop session");
    }
  };

  // Timer countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      if (activeSession) {
        // Auto rotate QR code once expires
        refreshQR();
      }
      return;
    }
    const timer = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, activeSession]);

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: "700" }}>Teacher Dashboard</h1>
          <p style={{ color: "#9ca3af", margin: "4px 0 0 0" }}>Logged in as: {user.email}</p>
        </div>
      </div>

      {error && (
        <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid #ef4444", borderRadius: "8px", padding: "12px", color: "#f87171" }}>
          {error}
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px" }}>
        {/* Course management panel */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "12px" }}>Your Enrolled Courses</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {courses.map((course) => (
              <div key={course.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px", background: "rgba(255,255,255,0.02)", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <h4 style={{ margin: 0 }}>{course.name}</h4>
                  <small style={{ color: "#9ca3af" }}>ID: {course.id}</small>
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <button onClick={() => onViewReports(course.id)} className="btn-secondary" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
                    <Eye size={16} /> Reports
                  </button>
                  <button onClick={() => createSession(course.id)} className="btn-primary" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }} disabled={loading}>
                    <Plus size={16} /> Start
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* QR Session presentation panel */}
        <div className="glass-panel" style={{ padding: "24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "350px" }}>
          {activeSession ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%" }}>
              <div style={{ padding: "16px", background: "white", borderRadius: "16px", boxShadow: "0 10px 25px rgba(0,0,0,0.5)", marginBottom: "20px" }}>
                <img src={qrCode} alt="QR Code" style={{ width: "200px", height: "200px" }} />
              </div>
              <h4 style={{ margin: "0 0 8px 0" }}>Scan this code to mark attendance</h4>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", color: timeLeft < 15 ? "#f87171" : "#4ade80", fontWeight: "600", fontSize: "1.1rem" }}>
                <RefreshCw className={timeLeft < 15 ? "animate-spin" : ""} size={18} />
                Regenerating in {timeLeft} seconds
              </div>
              <div style={{ display: "flex", gap: "12px", marginTop: "16px", width: "100%", maxWidth: "300px" }}>
                <button onClick={refreshQR} className="btn-secondary" style={{ flex: 1 }}>
                  Force Rotate
                </button>
                <button onClick={stopSession} className="btn-secondary" style={{ flex: 1, borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }}>
                  End Session
                </button>
              </div>
            </div>
          ) : (
            <div style={{ textAlign: "center", color: "#9ca3af" }}>
              <p>No active attendance session</p>
              <small>Click "Start" on any course to generate a live QR code</small>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
