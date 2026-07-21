import React, { useState, useEffect } from "react";
import API from "../services/api";
import {
  Plus, RefreshCw, Eye, ShieldCheck, Clock, Zap, BookOpen,
  Maximize2, X, Users, AlertTriangle, Send, CheckCircle2, Play, ChevronDown
} from "lucide-react";

export default function Dashboard({ user, onViewReports }) {
  const [courses, setCourses] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Feature: Custom session duration selection (default 60 mins)
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Feature: QR Zoom modal
  const [isZoomed, setIsZoomed] = useState(false);

  // Feature 1 & 2: Live scan counter & quick manual attendance override
  const [sessionReport, setSessionReport] = useState(null);

  // Feature 3 & 5: Low attendance defaulters & email notification
  const [allDefaulters, setAllDefaulters] = useState([]);
  const [notifiedStudents, setNotifiedStudents] = useState({});

  // Feature 4: Recent session history
  const [recentSessions, setRecentSessions] = useState([]);

  useEffect(() => {
    fetchCourses();
    fetchActiveSession();
    fetchRecentSessions();
  }, []);

  // Fetch real-time live attendance for current active session
  useEffect(() => {
    if (!activeSession) {
      setSessionReport(null);
      return;
    }
    fetchLiveReport();
    const interval = setInterval(fetchLiveReport, 5000);
    return () => clearInterval(interval);
  }, [activeSession]);

  const fetchActiveSession = async () => {
    try {
      const res = await API.get("/sessions/");
      if (res.data && res.data.length > 0) {
        const latest = res.data[0];
        const sessionDiff = Math.floor((new Date(latest.expiry_time) - new Date()) / 1000);
        if (sessionDiff > 0) {
          setActiveSession(latest);
          setQrCode(latest.qr_code);
          setTimeLeft(10);
          setSessionTimeLeft(sessionDiff);
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
      fetchAllDefaulters(res.data);
    } catch (e) {
      setError("Failed to fetch assigned courses.");
    }
  };

  const fetchRecentSessions = async () => {
    try {
      const res = await API.get("/sessions/");
      if (res.data) setRecentSessions(res.data.slice(0, 5));
    } catch (e) {
      console.error("Failed to fetch session history");
    }
  };

  const fetchLiveReport = async () => {
    if (!activeSession) return;
    try {
      const res = await API.get(`/reports/course/${activeSession.course}/`);
      setSessionReport(res.data);
    } catch (e) {
      console.error("Failed to fetch live session metrics");
    }
  };

  const fetchAllDefaulters = async (courseList) => {
    try {
      let defaulters = [];
      for (const course of courseList) {
        const res = await API.get(`/reports/course/${course.id}/`);
        if (res.data && res.data.defaulters_list) {
          res.data.defaulters_list.forEach(std => {
            defaulters.push({ ...std, course_name: course.name, course_id: course.id });
          });
        }
      }
      setAllDefaulters(defaulters);
    } catch (e) {
      console.error("Error fetching defaulters list");
    }
  };

  const createSession = async (courseId) => {
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/sessions/", {
        course_id: courseId,
        duration_minutes: parseInt(durationMinutes)
      });
      setActiveSession(res.data);
      setQrCode(res.data.qr_code);
      setTimeLeft(10);
      setSessionTimeLeft(parseInt(durationMinutes) * 60);
      fetchRecentSessions();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to start attendance session");
    } finally {
      setLoading(false);
    }
  };

  const refreshQR = async () => {
    if (!activeSession) return;
    try {
      const res = await API.get(`/sessions/${activeSession.id}/qr/`);
      setQrCode(res.data.qr_code);
      setTimeLeft(10);
    } catch (err) {
      setError("Failed to rotate QR code");
    }
  };

  const stopSession = async () => {
    if (!activeSession) return;
    try {
      await API.post(`/sessions/${activeSession.id}/stop/`);
      setActiveSession(null);
      setQrCode("");
      setTimeLeft(0);
      setSessionTimeLeft(0);
      fetchRecentSessions();
    } catch (err) {
      setError("Failed to end session");
    }
  };

  // QR token rotation timer (10s) and overall session countdown timer
  useEffect(() => {
    if (!activeSession) return;
    if (timeLeft <= 0) {
      refreshQR();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, activeSession]);

  useEffect(() => {
    if (!activeSession || sessionTimeLeft <= 0) return;
    const timer = setTimeout(() => setSessionTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [sessionTimeLeft, activeSession]);

  const toggleStudentAttendance = async (studentId, currentStatus) => {
    if (!activeSession) return;
    try {
      await API.post("/attendance/override/", {
        student_id: studentId,
        session_id: activeSession.id,
        action: currentStatus ? "absent" : "present",
      });
      fetchLiveReport();
    } catch (e) {
      alert("Failed to update student attendance status");
    }
  };

  const sendWarningNotice = (studentId, email) => {
    setNotifiedStudents(prev => ({ ...prev, [studentId]: true }));
    alert(`Warning notice sent to ${email} regarding attendance shortage.`);
  };

  const progressPct = Math.max(0, Math.min(100, (timeLeft / 10) * 100));
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: "long", year: "numeric", month: "long", day: "numeric"
  });
  const firstName = user.email?.split("@")[0]?.split(".")[0];
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "Teacher";

  // Calculate scan count for current session
  const totalEnrolled = sessionReport?.students?.length || 0;
  const presentCount = sessionReport?.students?.filter(s => s.sessions && s.sessions[activeSession?.id])?.length || 0;
  const attendancePercentage = totalEnrolled > 0 ? ((presentCount / totalEnrolled) * 100).toFixed(1) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Welcome Hero Header */}
      <div className="glass-a" style={{ padding: "28px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 6 }}>Hello, {displayName} 👋</h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              {activeSession ? "Live attendance session is currently active." : "No active session — configure and start one below."}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
            <Clock size={14} />
            {todayStr}
          </div>
        </div>

        {/* Quick KPI stats row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 24 }}>
          <div className="glass-c" style={{ padding: "14px 18px" }}>
            <p className="text-meta">Courses Assigned</p>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--emerald)", marginTop: 4 }}>{courses.length}</div>
          </div>
          <div className="glass-c" style={{ padding: "14px 18px" }}>
            <p className="text-meta">Session Status</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div className={`pulse-dot ${activeSession ? "" : "amber"}`} />
              <span style={{ fontSize: 14, fontWeight: 600, color: activeSession ? "var(--emerald)" : "var(--warning)" }}>
                {activeSession ? `Active (${formatTime(sessionTimeLeft)})` : "Idle"}
              </span>
            </div>
          </div>
          <div className="glass-c" style={{ padding: "14px 18px" }}>
            <p className="text-meta">10s QR Rotation</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div className="pulse-dot" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--emerald)" }}>Anti-Cheat Active</span>
            </div>
          </div>
          <div className="glass-c" style={{ padding: "14px 18px" }}>
            <p className="text-meta">Students At Risk</p>
            <div style={{ fontSize: 26, fontWeight: 700, color: allDefaulters.length > 0 ? "var(--danger)" : "var(--emerald)", marginTop: 4 }}>
              {allDefaulters.length}
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Main Grid: Left Column (Session & Courses), Right Column (History & Defaulters) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }} className="dash-grid">
        <style>{`@media(min-width:1024px){ .dash-grid { grid-template-columns: 65fr 35fr !important; } }`}</style>

        {/* Left Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* QR Code Presentation Panel */}
          <details className="acc-panel" open>
            <summary>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(57,217,138,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Zap size={18} color="var(--emerald)" />
              </div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Live Attendance Presentation</h2>
              {activeSession && (
                <span className="badge badge-good" style={{ marginLeft: 8 }}>
                  <div className="pulse-dot" style={{ width: 6, height: 6 }} /> Live ({formatTime(sessionTimeLeft)})
                </span>
              )}
              <ChevronDown size={18} className="acc-panel-chevron" />
            </summary>
            <div className="acc-panel-body">

            {activeSession ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>

                {/* Feature 1: Live Attendance Scan Counter */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 16, padding: "10px 20px",
                  background: "rgba(57,217,138,0.08)", border: "1px solid rgba(57,217,138,0.2)",
                  borderRadius: 12, width: "100%", justifyContent: "space-around"
                }}>
                  <div style={{ textAlign: "center" }}>
                    <div className="text-meta">Present / Total</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--emerald)" }}>
                      {presentCount} / {totalEnrolled}
                    </div>
                  </div>
                  <div style={{ height: 28, width: 1, background: "rgba(255,255,255,0.1)" }} />
                  <div style={{ textAlign: "center" }}>
                    <div className="text-meta">Attendance Rate</div>
                    <div style={{ fontSize: 20, fontWeight: 700, color: "var(--cyan)" }}>
                      {attendancePercentage}%
                    </div>
                  </div>
                </div>

                {/* QR Code with Zoom Trigger */}
                <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setIsZoomed(true)} title="Click to zoom QR code">
                  <div className="qr-ring" style={{ position: "relative" }}>
                    <img src={qrCode} alt="Attendance QR Code" style={{ width: 210, height: 210, display: "block" }} />
                    <div style={{
                      position: "absolute", bottom: 10, right: 10,
                      background: "rgba(0,0,0,0.75)", color: "white", padding: 6,
                      borderRadius: 8, display: "flex", alignItems: "center"
                    }}>
                      <Maximize2 size={14} />
                    </div>
                  </div>
                </div>
                <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
                  Click QR code to view full-screen · Rotates every 10 seconds
                </p>

                {/* 10-Second Rotation Countdown Badge */}
                <div style={{ textAlign: "center" }}>
                  <div className={`countdown-badge ${timeLeft <= 3 ? "urgent" : ""}`}>
                    <RefreshCw size={13} className={timeLeft <= 3 ? "animate-spin" : ""} />
                    Anti-Cheat Rotation in {timeLeft}s
                  </div>
                  <div className="progress-bar" style={{ marginTop: 8, width: 220 }}>
                    <div className={`progress-fill ${timeLeft <= 3 ? "danger" : ""}`} style={{ width: `${progressPct}%` }} />
                  </div>
                </div>

                {/* Session Actions */}
                <div style={{ display: "flex", gap: 12 }}>
                  <button onClick={refreshQR} className="btn-secondary" style={{ gap: 6 }}>
                    <RefreshCw size={14} /> Force Rotate
                  </button>
                  <button onClick={stopSession} className="btn-danger" style={{ gap: 6 }}>
                    End Session
                  </button>
                </div>

                {/* Feature 2: Quick Student Attendance Override Widget */}
                {sessionReport && sessionReport.students && sessionReport.students.length > 0 && (
                  <div style={{ width: "100%", marginTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                      <Users size={15} color="var(--cyan)" />
                      <h4 style={{ margin: 0, fontSize: 14 }}>Quick Attendance Override (Live Roster)</h4>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 180, overflowY: "auto" }}>
                      {sessionReport.students.map(s => {
                        const isPresent = s.sessions && s.sessions[activeSession.id] === true;
                        return (
                          <div key={s.id} style={{
                            display: "flex", justifyContent: "space-between", alignItems: "center",
                            padding: "8px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8,
                            border: "1px solid rgba(255,255,255,0.06)"
                          }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{s.email}</span>
                            <button
                              onClick={() => toggleStudentAttendance(s.id, isPresent)}
                              className={isPresent ? "btn-secondary" : "btn-primary"}
                              style={{ padding: "4px 10px", fontSize: 12 }}
                            >
                              {isPresent ? "Mark Absent" : "Mark Present"}
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

              </div>
            ) : (
              <div style={{ textAlign: "center", padding: "40px 24px", color: "var(--text-secondary)" }}>
                <div style={{
                  width: 64, height: 64, margin: "0 auto 16px",
                  background: "var(--emerald-dim)", borderRadius: "50%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ShieldCheck size={28} color="var(--emerald)" strokeWidth={1.5} />
                </div>
                <p style={{ margin: 0, fontWeight: 600, fontSize: 16, color: "var(--text-primary)" }}>No Active Session</p>
                <p className="text-meta" style={{ marginTop: 6 }}>
                  Select a duration and start a session on any assigned course below.
                </p>
              </div>
            )}
            </div>
          </details>

          {/* Assigned Courses List + Custom Duration Config */}
          <details className="acc-panel" open>
            <summary>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(46,230,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={18} color="var(--cyan)" />
              </div>
              <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600 }}>Your Courses</h2>
              <span style={{ marginLeft: 6, fontSize: 12, color: "var(--text-muted)" }}>({courses.length} assigned)</span>
              <ChevronDown size={18} className="acc-panel-chevron" />
            </summary>
            <div className="acc-panel-body">
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                {/* Feature: Manual Custom Duration Control */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <Clock size={14} color="var(--emerald)" />
                  <span className="text-meta" style={{ fontWeight: 600 }}>Session Length:</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="number"
                      min="1"
                      max="480"
                      className="form-input"
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
                      style={{ width: 72, padding: "6px 10px", textAlign: "center", fontWeight: 700 }}
                    />
                    <span className="text-meta" style={{ fontSize: 13 }}>Minutes</span>
                  </div>
                  <div style={{ display: "flex", gap: 4 }}>
                    {[15, 30, 60, 90, 120].map(mins => (
                      <button
                        key={mins}
                        type="button"
                        onClick={() => setDurationMinutes(mins)}
                        className={durationMinutes === mins ? "btn-primary" : "btn-secondary"}
                        style={{ padding: "4px 8px", fontSize: 11, borderRadius: 6 }}
                      >
                        {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {courses.map((course, i) => (
                  <div key={course.id} className="glass-c" style={{
                    padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                      <div style={{
                        width: 38, height: 38, borderRadius: 10,
                        background: `linear-gradient(135deg, ${["rgba(57,217,138,0.2)", "rgba(46,230,255,0.2)", "rgba(123,97,255,0.2)"][i % 3]}, transparent)`,
                        border: `1px solid ${["rgba(57,217,138,0.3)", "rgba(46,230,255,0.3)", "rgba(123,97,255,0.3)"][i % 3]}`,
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 14, fontWeight: 700,
                        color: ["var(--emerald)", "var(--cyan)", "var(--purple)"][i % 3],
                      }}>
                        {course.name?.charAt(0)?.toUpperCase() || "C"}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>{course.name}</div>
                        <div className="text-meta">{course.institution}{course.department ? ` · ${course.department}` : ""}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => onViewReports(course.id)} className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }}>
                        <Eye size={13} /> Reports
                      </button>
                      <button onClick={() => createSession(course.id)} className="btn-primary" style={{ padding: "7px 14px", fontSize: 13 }} disabled={loading}>
                        <Play size={13} /> Start ({durationMinutes}m)
                      </button>
                    </div>
                  </div>
                ))}
                {courses.length === 0 && (
                  <p className="text-meta" style={{ textAlign: "center", padding: "20px 0" }}>No courses assigned to your account.</p>
                )}
              </div>
            </div>
          </details>
        </div>

        {/* Right Column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

          {/* Feature 3 & 5: Low Attendance Defaulter Alerts & Notification Trigger */}
          <details className="acc-panel" open>
            <summary>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(255,90,90,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={16} color="var(--danger)" />
              </div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Students At Risk (&lt;75%)</h3>
              {allDefaulters.length > 0 && (
                <span className="badge badge-defaulter" style={{ marginLeft: 6 }}>{allDefaulters.length}</span>
              )}
              <ChevronDown size={18} className="acc-panel-chevron" />
            </summary>
            <div className="acc-panel-body">
              {allDefaulters.length === 0 ? (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emerald)", fontSize: 13, paddingTop: 8 }}>
                  <CheckCircle2 size={16} /> All students meet attendance criteria.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 240, overflowY: "auto", paddingTop: 8 }}>
                  {allDefaulters.map(std => (
                    <div key={`${std.course_id}-${std.id}`} style={{
                      padding: 10, background: "rgba(255,90,90,0.06)", border: "1px solid rgba(255,90,90,0.18)",
                      borderRadius: 8, display: "flex", flexDirection: "column", gap: 6
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{std.email}</span>
                        <span className="badge badge-defaulter">{std.attendance_percentage}%</span>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11, color: "var(--text-muted)" }}>
                        <span>{std.course_name}</span>
                        <button
                          onClick={() => sendWarningNotice(std.id, std.email)}
                          className="btn-secondary"
                          style={{ padding: "3px 8px", fontSize: 11, gap: 4 }}
                          disabled={notifiedStudents[std.id]}
                        >
                          <Send size={10} />
                          {notifiedStudents[std.id] ? "Notice Sent" : "Send Notice"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </details>

          {/* Feature 4: Recent Session History */}
          <details className="acc-panel" open>
            <summary>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(46,230,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Clock size={16} color="var(--cyan)" />
              </div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Recent Sessions History</h3>
              <ChevronDown size={18} className="acc-panel-chevron" />
            </summary>
            <div className="acc-panel-body">
              <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingTop: 8 }}>
                {recentSessions.map(s => {
                  const isPast = new Date(s.expiry_time) < new Date();
                  return (
                    <div key={s.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8,
                      border: "1px solid rgba(255,255,255,0.06)"
                    }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>Session #{s.id}</div>
                        <div className="text-meta">{new Date(s.start_time).toLocaleString()}</div>
                      </div>
                      <span className={`badge ${isPast ? "badge-defaulter" : "badge-good"}`}>
                        {isPast ? "Ended" : "Active"}
                      </span>
                    </div>
                  );
                })}
                {recentSessions.length === 0 && (
                  <p className="text-meta" style={{ textAlign: "center", margin: 0 }}>No past sessions found.</p>
                )}
              </div>
            </div>
          </details>

        </div>
      </div>

      {/* Feature: Fullscreen QR Modal */}
      {isZoomed && activeSession && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.85)",
          backdropFilter: "blur(16px)", display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center", padding: 24
        }}>
          <button
            onClick={() => setIsZoomed(false)}
            className="btn-secondary"
            style={{ position: "absolute", top: 24, right: 24, padding: "10px 14px", gap: 6 }}
          >
            <X size={18} /> Close
          </button>
          <div style={{
            background: "white", padding: 24, borderRadius: 24,
            boxShadow: "0 0 50px rgba(57,217,138,0.4)"
          }}>
            <img src={qrCode} alt="Zoomed QR Code" style={{ width: 380, height: 380, display: "block" }} />
          </div>
          <div style={{ marginTop: 20, color: "white", textAlign: "center" }}>
            <h3 style={{ margin: "0 0 6px 0", fontSize: 22 }}>Scan Attendance Code</h3>
            <p style={{ margin: 0, opacity: 0.75 }}>Code auto-rotates every 10 seconds to eliminate proxy attendance.</p>
          </div>
        </div>
      )}

    </div>
  );
}
