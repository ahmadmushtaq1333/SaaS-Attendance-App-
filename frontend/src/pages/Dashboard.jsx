import { useState, useEffect } from "react";
import API from "../services/api";
import {
  RefreshCw, Eye, ShieldCheck, Clock, Zap, BookOpen,
  Maximize2, X, Users, AlertTriangle, Send, CheckCircle2, Play,
  ArrowLeft, ArrowRight, History
} from "lucide-react";
import { formatLocalDate, parseUTCDate } from "../utils/date";

/* ── Sparkline mini-chart ── */
function Sparkline({ values = [], color = "var(--emerald)", height = 36, width = 80 }) {
  if (!values.length) return null;
  const max = Math.max(...values, 1);
  const min = Math.min(...values);
  const range = max - min || 1;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ display: "block" }}>
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z0-9]/gi, "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} />
    </svg>
  );
}

/* ── DashboardActionCard ── */
function DashboardActionCard({ icon: Icon, color, title, description, stats, onClick, buttonText, badge }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
      style={{
        background: "var(--glass-a)", border: "1px solid var(--glass-border)",
        borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16,
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hover ? "translateY(-4px)" : "none",
        boxShadow: hover ? "0 16px 40px rgba(0,0,0,0.15)" : "0 4px 12px rgba(0,0,0,0.03)",
        position: "relative", overflow: "hidden", cursor: "pointer"
      }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: color, opacity: 0.05, borderRadius: "50%", transform: hover ? "translate(25%,-25%) scale(1.1)" : "translate(30%,-30%)", transition: "transform 0.3s ease" }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}20`, display: "flex", alignItems: "center", justifyContent: "center", color: color, transform: hover ? "scale(1.05)" : "none", transition: "transform 0.2s ease", flexShrink: 0 }}>
          <Icon size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
            {badge}
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{description}</p>
        </div>
      </div>
      {stats && (
        <div style={{ display: "flex", gap: 16, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", transition: "background 0.2s ease", ...(hover ? { background: "rgba(255,255,255,0.05)" } : {}) }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color || "var(--text-primary)", marginTop: 2 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}
      <button
        style={{
          marginTop: "auto", padding: "12px 16px", borderRadius: 8,
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

export default function Dashboard({ user, onViewReports }) {
  const [courses, setCourses] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isZoomed, setIsZoomed] = useState(false);
  const [sessionReport, setSessionReport] = useState(null);
  const [courseDefaulters, setCourseDefaulters] = useState(null);
  const [selectedAlertCourseId, setSelectedAlertCourseId] = useState("");
  const [notifiedStudents, setNotifiedStudents] = useState({});
  const [recentSessions, setRecentSessions] = useState([]);
  const [activeView, setActiveView] = useState("grid");

  useEffect(() => {
    fetchCourses();
    fetchActiveSession();
    fetchRecentSessions();
  }, []);

  useEffect(() => {
    if (!activeSession) { setSessionReport(null); return; }
    fetchLiveReport();
    const interval = setInterval(fetchLiveReport, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

  const fetchActiveSession = async () => {
    try {
      const res = await API.get("/sessions/");
      if (res.data && res.data.length > 0) {
        const latest = res.data[0];
        const expiryDate = parseUTCDate(latest.expiry_time);
        const sessionDiff = Math.floor((expiryDate - new Date()) / 1000);
        if (sessionDiff > 0) {
          setActiveSession(latest);
          setQrCode(latest.qr_code);
          setTimeLeft(10);
          setSessionTimeLeft(sessionDiff);
        }
      }
    } catch { console.error("Failed to restore active session"); }
  };

  const fetchCourses = async () => {
    try {
      const res = await API.get("/auth/courses/");
      setCourses(res.data);
      if (res.data.length > 0) {
        setSelectedAlertCourseId(res.data[0].id.toString());
      }
    } catch { setError("Failed to fetch assigned courses."); }
  };

  const fetchRecentSessions = async () => {
    try {
      const res = await API.get("/sessions/");
      if (res.data) setRecentSessions(res.data.slice(0, 5));
    } catch { console.error("Failed to fetch session history"); }
  };

  const fetchLiveReport = async () => {
    if (!activeSession) return;
    try {
      const res = await API.get(`/reports/course/${activeSession.course}/`);
      setSessionReport(res.data);
    } catch { console.error("Failed to fetch live session metrics"); }
  };

  const fetchDefaultersForCourse = async (courseId) => {
    if (!courseId) return;
    try {
      setCourseDefaulters(null);
      const res = await API.get(`/reports/course/${courseId}/`);
      if (res.data && res.data.defaulters_list) {
        setCourseDefaulters(res.data.defaulters_list);
      } else {
        setCourseDefaulters([]);
      }
    } catch { console.error("Error fetching defaulters list"); }
  };

  useEffect(() => {
    if (activeView === "alerts" && selectedAlertCourseId) {
      fetchDefaultersForCourse(selectedAlertCourseId);
    }
  }, [activeView, selectedAlertCourseId]);

  const createSession = async (courseId) => {
    setLoading(true); setError("");
    try {
      const res = await API.post("/sessions/", { course_id: courseId, duration_minutes: parseInt(durationMinutes) });
      setActiveSession(res.data);
      setQrCode(res.data.qr_code);
      setTimeLeft(10);
      setSessionTimeLeft(parseInt(durationMinutes) * 60);
      fetchRecentSessions();
      setActiveView("live");
    } catch (err) { setError(err.response?.data?.error || "Failed to start attendance session"); }
    finally { setLoading(false); }
  };

  const refreshQR = async () => {
    if (!activeSession) return;
    try {
      const res = await API.get(`/sessions/${activeSession.id}/qr/`);
      setQrCode(res.data.qr_code);
      setTimeLeft(10);
    } catch { setError("Failed to rotate QR code"); }
  };

  const stopSession = async () => {
    if (!activeSession) return;
    try {
      await API.post(`/sessions/${activeSession.id}/stop/`);
      setActiveSession(null); setQrCode(""); setTimeLeft(0); setSessionTimeLeft(0);
      fetchRecentSessions();
    } catch { setError("Failed to end session"); }
  };

  useEffect(() => {
    if (!activeSession) return;
    if (timeLeft <= 0) { refreshQR(); return; }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    } catch { alert("Failed to update student attendance status"); }
  };

  const sendWarningNotice = (studentId, email) => {
    setNotifiedStudents(prev => ({ ...prev, [studentId]: true }));
    alert(`Warning notice sent to ${email} regarding attendance shortage.`);
  };

  const progressPct = Math.max(0, Math.min(100, (timeLeft / 10) * 100));
  const formatTime = (secs) => `${Math.floor(secs / 60)}m ${(secs % 60).toString().padStart(2, "0")}s`;

  const todayStr = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const firstName = user.email?.split("@")[0]?.split(".")[0];
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "Teacher";

  const totalEnrolled = sessionReport?.students?.length || 0;
  const presentCount = sessionReport?.students?.filter(s => s.sessions && s.sessions[activeSession?.id])?.length || 0;
  const attendancePercentage = totalEnrolled > 0 ? ((presentCount / totalEnrolled) * 100).toFixed(1) : 0;

  // Sparkline mock data based on real values
  const courseSparkData = courses.map((_, i) => (i + 1) * 2);
  const sessionSparkData = recentSessions.map((s, i) => i + 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Welcome Hero Header ── */}
      <div className="glass-a" style={{ padding: "28px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 6 }}>Hello, {displayName} 👋</h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>
              {activeSession ? "Live attendance session is currently active." : "No active session — pick a course and start one below."}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
            <Clock size={14} />{todayStr}
          </div>
        </div>

        {/* KPI Cards with sparklines */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginTop: 24 }}>
          <div className="glass-c" style={{ padding: "14px 18px" }}>
            <p className="text-meta">Courses Assigned</p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--emerald)" }}>{courses.length}</div>
              <Sparkline values={courseSparkData.length ? courseSparkData : [1]} color="var(--emerald)" />
            </div>
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
            <p className="text-meta">Recent Sessions</p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--cyan)" }}>{recentSessions.length}</div>
              <Sparkline values={sessionSparkData.length ? sessionSparkData : [1]} color="var(--cyan)" />
            </div>
          </div>
          <div className="glass-c" style={{ padding: "14px 18px" }}>
            <p className="text-meta">Attendance Alerts</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div className="pulse-dot amber" />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--warning)" }}>
                View details in panel
              </span>
            </div>
          </div>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ── Action Grid / Panel Views ── */}
      {activeView !== "grid" && (
        <div>
          <button onClick={() => setActiveView("grid")} className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, borderRadius: 8 }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      )}

      {activeView === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <DashboardActionCard
            icon={Zap} color="var(--emerald)" title="Live Session"
            description="Present QR code, monitor real-time attendance, override manually."
            badge={activeSession && (
              <span className="badge badge-good" style={{ fontSize: 10, padding: "2px 7px", display: "flex", alignItems: "center", gap: 4 }}>
                <div className="pulse-dot" style={{ width: 5, height: 5 }} /> Live
              </span>
            )}
            stats={activeSession ? [
              { label: "Present", value: `${presentCount}/${totalEnrolled}`, color: "var(--emerald)" },
              { label: "Rate", value: `${attendancePercentage}%`, color: "var(--cyan)" }
            ] : [{ label: "Status", value: "No Active Session" }]}
            buttonText="Open Session Panel"
            onClick={() => setActiveView("live")}
          />
          <DashboardActionCard
            icon={BookOpen} color="var(--purple)" title="My Courses"
            description="Browse assigned courses and launch new attendance sessions."
            stats={[{ label: "Courses", value: courses.length }, { label: "Duration", value: `${durationMinutes}m` }]}
            buttonText="Manage Courses"
            onClick={() => setActiveView("courses")}
          />
          <DashboardActionCard
            icon={AlertTriangle} color="var(--danger)" title="Attendance Alerts"
            description="Students currently below the 75% attendance threshold."
            stats={[{ label: "Action", value: "Review Alerts", color: "var(--text-primary)" }]}
            buttonText="View Alerts"
            onClick={() => setActiveView("alerts")}
          />
          <DashboardActionCard
            icon={History} color="var(--cyan)" title="Session History"
            description="Review your recent attendance sessions and their status."
            stats={[{ label: "Sessions", value: recentSessions.length }]}
            buttonText="View History"
            onClick={() => setActiveView("history")}
          />
        </div>
      )}

      {/* ── Live Session Panel ── */}
      {activeView === "live" && (
        <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "24px 28px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(79,142,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={22} color="var(--emerald)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Live Attendance Presentation</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                {activeSession ? `Session active — ${formatTime(sessionTimeLeft)} remaining` : "No session running. Start one from My Courses."}
              </p>
            </div>
            {activeSession && (
              <span className="badge badge-good" style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6 }}>
                <div className="pulse-dot" style={{ width: 6, height: 6 }} /> Live ({formatTime(sessionTimeLeft)})
              </span>
            )}
          </div>

          {activeSession ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
              <div style={{ display: "flex", gap: 24, padding: "10px 24px", background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 12, width: "100%", maxWidth: 420, justifyContent: "space-around" }}>
                <div style={{ textAlign: "center" }}>
                  <div className="text-meta">Present / Total</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--emerald)" }}>{presentCount} / {totalEnrolled}</div>
                </div>
                <div style={{ height: 36, width: 1, background: "rgba(255,255,255,0.1)" }} />
                <div style={{ textAlign: "center" }}>
                  <div className="text-meta">Attendance Rate</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: "var(--cyan)" }}>{attendancePercentage}%</div>
                </div>
              </div>

              <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setIsZoomed(true)} title="Click to zoom QR code">
                <div className="qr-ring" style={{ position: "relative" }}>
                  <img src={qrCode} alt="Attendance QR Code" style={{ width: 210, height: 210, display: "block" }} />
                  <div style={{ position: "absolute", bottom: 10, right: 10, background: "rgba(0,0,0,0.75)", color: "white", padding: 6, borderRadius: 8, display: "flex", alignItems: "center" }}>
                    <Maximize2 size={14} />
                  </div>
                </div>
              </div>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: 13, textAlign: "center" }}>
                Click QR to full-screen · Auto-rotates every 10 seconds
              </p>

              <div style={{ textAlign: "center" }}>
                <div className={`countdown-badge ${timeLeft <= 3 ? "urgent" : ""}`}>
                  <RefreshCw size={13} className={timeLeft <= 3 ? "animate-spin" : ""} />
                  Anti-Cheat Rotation in {timeLeft}s
                </div>
                <div className="progress-bar" style={{ marginTop: 8, width: 220 }}>
                  <div className={`progress-fill ${timeLeft <= 3 ? "danger" : ""}`} style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button onClick={refreshQR} className="btn-secondary" style={{ gap: 6 }}><RefreshCw size={14} /> Force Rotate</button>
                <button onClick={stopSession} className="btn-danger" style={{ gap: 6 }}>End Session</button>
              </div>

              {sessionReport?.students?.length > 0 && (
                <div style={{ width: "100%", maxWidth: 520, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <Users size={15} color="var(--cyan)" />
                    <h4 style={{ margin: 0, fontSize: 14 }}>Quick Attendance Override (Live Roster)</h4>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                    {sessionReport.students.map(s => {
                      const isPresent = s.sessions && s.sessions[activeSession.id] === true;
                      return (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{s.email}</span>
                          <button onClick={() => toggleStudentAttendance(s.id, isPresent)} className={isPresent ? "btn-secondary" : "btn-primary"} style={{ padding: "4px 10px", fontSize: 12 }}>
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
              <div style={{ width: 64, height: 64, margin: "0 auto 16px", background: "var(--emerald-dim)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ShieldCheck size={28} color="var(--emerald)" strokeWidth={1.5} />
              </div>
              <p style={{ margin: 0, fontWeight: 600, fontSize: 16, color: "var(--text-primary)" }}>No Active Session</p>
              <p className="text-meta" style={{ marginTop: 6 }}>Go to "My Courses" to select a course and start a session.</p>
              <button onClick={() => setActiveView("courses")} className="btn-primary" style={{ marginTop: 16, gap: 6 }}>
                <BookOpen size={14} /> Open My Courses
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── My Courses Panel ── */}
      {activeView === "courses" && (
        <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "24px 28px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={22} color="var(--purple)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>My Courses</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{courses.length} courses assigned</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 20, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <Clock size={14} color="var(--emerald)" />
            <span className="text-meta" style={{ fontWeight: 600 }}>Session Length:</span>
            <input type="number" min="1" max="480" className="form-input" value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: 72, padding: "6px 10px", textAlign: "center", fontWeight: 700 }} />
            <span className="text-meta" style={{ fontSize: 13 }}>Minutes</span>
            <div style={{ display: "flex", gap: 4 }}>
              {[15, 30, 60, 90, 120].map(mins => (
                <button key={mins} type="button" onClick={() => setDurationMinutes(mins)}
                  className={durationMinutes === mins ? "btn-primary" : "btn-secondary"}
                  style={{ padding: "4px 8px", fontSize: 11, borderRadius: 6 }}>
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {courses.map((course, i) => (
              <div key={course.id} className="glass-c" style={{ padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10,
                    background: `linear-gradient(135deg, ${["rgba(79,142,247,0.2)", "rgba(129,140,248,0.2)", "rgba(167,139,250,0.2)"][i % 3]}, transparent)`,
                    border: `1px solid ${["rgba(79,142,247,0.3)", "rgba(129,140,248,0.3)", "rgba(167,139,250,0.3)"][i % 3]}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: ["var(--emerald)", "var(--cyan)", "var(--purple)"][i % 3]
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
            {courses.length === 0 && <p className="text-meta" style={{ textAlign: "center", padding: "20px 0" }}>No courses assigned to your account.</p>}
          </div>
        </div>
      )}

      {/* ── Attendance Alerts Panel ── */}
      {activeView === "alerts" && (
        <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "24px 28px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(248,113,113,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <AlertTriangle size={22} color="var(--danger)" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Students At Risk</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Students below 75% attendance threshold</p>
              </div>
            </div>
            {courses.length > 0 && (
              <select 
                value={selectedAlertCourseId} 
                onChange={(e) => setSelectedAlertCourseId(e.target.value)}
                className="form-input" 
                style={{ width: "auto", minWidth: 200, padding: "8px 12px" }}
              >
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
          </div>

          {!selectedAlertCourseId ? (
            <p className="text-meta">Please select a course.</p>
          ) : courseDefaulters === null ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14, padding: "16px 0" }}>
              <RefreshCw size={14} className="animate-spin" /> Fetching defaulters...
            </div>
          ) : courseDefaulters.length === 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emerald)", fontSize: 14, padding: "16px 0" }}>
              <CheckCircle2 size={18} /> All students meet the 75% attendance threshold for this course.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {courseDefaulters.map(std => (
                <div key={std.id} style={{ padding: "12px 16px", background: "rgba(248,113,113,0.06)", border: "1px solid rgba(248,113,113,0.18)", borderRadius: 10, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{std.email}</div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="badge badge-defaulter">{std.attendance_percentage}%</span>
                    <button onClick={() => sendWarningNotice(std.id, std.email)} className="btn-secondary"
                      style={{ padding: "5px 12px", fontSize: 12, gap: 4 }} disabled={notifiedStudents[std.id]}>
                      <Send size={11} />
                      {notifiedStudents[std.id] ? "Notice Sent" : "Send Notice"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Session History Panel ── */}
      {activeView === "history" && (
        <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "24px 28px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(129,140,248,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <History size={22} color="var(--cyan)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>Session History</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Recent attendance sessions</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentSessions.map(s => {
              const isPast = parseUTCDate(s.expiry_time) < new Date();
              return (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Session #{s.id}</div>
                    <div className="text-meta">{formatLocalDate(s.start_time)}</div>
                  </div>
                  <span className={`badge ${isPast ? "badge-defaulter" : "badge-good"}`}>{isPast ? "Ended" : "Active"}</span>
                </div>
              );
            })}
            {recentSessions.length === 0 && <p className="text-meta" style={{ textAlign: "center", margin: 0 }}>No past sessions found.</p>}
          </div>
        </div>
      )}

      {/* Fullscreen QR Modal */}
      {isZoomed && activeSession && (
        <div style={{ position: "fixed", inset: 0, zIndex: 999, background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <button onClick={() => setIsZoomed(false)} className="btn-secondary" style={{ position: "absolute", top: 24, right: 24, padding: "10px 14px", gap: 6 }}>
            <X size={18} /> Close
          </button>
          <div style={{ background: "white", padding: 24, borderRadius: 24, boxShadow: "0 0 50px rgba(79,142,247,0.4)" }}>
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
