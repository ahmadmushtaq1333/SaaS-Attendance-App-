import { useState, useEffect, useCallback } from "react";
import API from "../services/api";
import {
  RefreshCw, Eye, ShieldCheck, Clock, Zap, BookOpen,
  Maximize2, Users, AlertTriangle, Play,
  ArrowLeft, History
} from "lucide-react";
import { formatLocalDate, parseUTCDate } from "../utils/date";
import AttendanceAlertsPanel from "../components/AttendanceAlertsPanel";
import Sparkline from "../components/Sparkline";
import DashboardActionCard from "../components/DashboardActionCard";
import ReplicateAttendanceButton from "../components/ReplicateAttendanceButton";
import { useQrRotation } from "../hooks/useQrRotation";
import QrZoomModal from "../components/QrZoomModal";

export default function Dashboard({ user, onViewReports }) {
  const [courses, setCourses] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [sessionTimeLeft, setSessionTimeLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [isZoomed, setIsZoomed] = useState(false);
  const [sessionReport, setSessionReport] = useState(null);
  const [courseDefaulters, setCourseDefaulters] = useState(null);
  const [selectedAlertCourseId, setSelectedAlertCourseId] = useState("");
  const [recentSessions, setRecentSessions] = useState([]);
  const [activeView, setActiveView] = useState("grid");

  const fetchActiveAndRecentSessions = async () => {
    try {
      const res = await API.get("/sessions/");
      if (res.data) {
        setRecentSessions(res.data.slice(0, 5));
        if (res.data.length > 0) {
          const latest = res.data[0];
          const expiryDate = parseUTCDate(latest.expiry_time);
          const sessionDiff = Math.floor((expiryDate - new Date()) / 1000);
          if (sessionDiff > 0) {
            setActiveSession(latest);
            setSessionTimeLeft(sessionDiff);
          }
        }
      }
    } catch { console.error("Failed to load sessions"); }
  };
  const fetchRecentSessions = fetchActiveAndRecentSessions;

  const handleSessionExpired = useCallback(() => {
    setActiveSession(null);
    setSessionTimeLeft(0);
    fetchActiveAndRecentSessions();
  }, []);

  const { qrCode, timeLeft, loading: qrLoading, forceRotate } = useQrRotation({
    sessionId: activeSession?.id ?? null,
    initialQrCode: activeSession?.qr_code || null,
    onSessionExpired: handleSessionExpired,
    onError: setError,
  });

  useEffect(() => {
    fetchCourses();
    fetchActiveAndRecentSessions();
  }, []);

  useEffect(() => {
    if (!activeSession) { setSessionReport(null); return; }
    fetchLiveReport();
    const interval = setInterval(fetchLiveReport, 5000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession]);

  const fetchCourses = async () => {
    try {
      const res = await API.get("/auth/courses/");
      setCourses(res.data);
      if (res.data.length > 0) {
        setSelectedAlertCourseId(res.data[0].id.toString());
      }
    } catch { setError("Failed to fetch assigned courses."); }
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
      setSessionTimeLeft(parseInt(durationMinutes) * 60);
      fetchRecentSessions();
      setActiveView("live");
    } catch (err) { setError(err.response?.data?.error || "Failed to start attendance session"); }
    finally { setLoading(false); }
  };

  const stopSession = async () => {
    if (!activeSession) return;
    try {
      await API.post(`/sessions/${activeSession.id}/stop/`);
      setActiveSession(null); setSessionTimeLeft(0);
      fetchRecentSessions();
    } catch { setError("Failed to end session"); }
  };

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

  const progressPct = Math.max(0, Math.min(100, (timeLeft / 10) * 100));
  const formatTime = (secs) => `${Math.floor(secs / 60)}m ${(secs % 60).toString().padStart(2, "0")}s`;

  const todayStr = new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const fallbackName = user.email?.split("@")[0]?.split(".")[0];
  const displayName = user.full_name || (fallbackName ? fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1) : "Teacher");

  const totalEnrolled = sessionReport?.students?.length || 0;
  const presentCount = sessionReport?.students?.filter(s => s.sessions && s.sessions[activeSession?.id])?.length || 0;
  const attendancePercentage = totalEnrolled > 0 ? ((presentCount / totalEnrolled) * 100).toFixed(1) : 0;

  // Sparkline mock data based on real values
  const courseSparkData = courses.map((_, i) => (i + 1) * 2);
  const sessionSparkData = recentSessions.map((s, i) => i + 1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Welcome Hero Header ── */}
      <div className="glass-a panel-pad" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 4 }}>Hello, {displayName} 👋</h1>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: 13 }}>
              {activeSession ? "Live attendance session is currently active." : "No active session — pick a course and start one below."}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 13 }}>
            <Clock size={14} />{todayStr}
          </div>
        </div>

        {/* KPI Cards with sparklines */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 12, marginTop: 18 }}>
          <div className="glass-c" style={{ padding: "12px 14px" }}>
            <p className="text-meta" style={{ fontSize: 11 }}>Courses Assigned</p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--emerald)" }}>{courses.length}</div>
              <Sparkline values={courseSparkData.length ? courseSparkData : [1]} color="var(--emerald)" />
            </div>
          </div>
          <div className="glass-c" style={{ padding: "12px 14px" }}>
            <p className="text-meta" style={{ fontSize: 11 }}>Session Status</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div className={`pulse-dot ${activeSession ? "" : "amber"}`} />
              <span style={{ fontSize: 13, fontWeight: 600, color: activeSession ? "var(--emerald)" : "var(--warning)" }}>
                {activeSession ? `Active (${formatTime(sessionTimeLeft)})` : "Idle"}
              </span>
            </div>
          </div>
          <div className="glass-c" style={{ padding: "12px 14px" }}>
            <p className="text-meta" style={{ fontSize: 11 }}>Recent Sessions</p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: "var(--cyan)" }}>{recentSessions.length}</div>
              <Sparkline values={sessionSparkData.length ? sessionSparkData : [1]} color="var(--cyan)" />
            </div>
          </div>
          <div className="glass-c" style={{ padding: "12px 14px" }}>
            <p className="text-meta" style={{ fontSize: 11 }}>Attendance Alerts</p>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
              <div className="pulse-dot amber" />
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--warning)" }}>
                View details
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
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
        <div className="panel-pad" style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(79,142,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Zap size={22} color="var(--emerald)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Live Attendance Presentation</h2>
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
              <div style={{ display: "flex", gap: 16, padding: "10px 16px", background: "rgba(79,142,247,0.08)", border: "1px solid rgba(79,142,247,0.2)", borderRadius: 12, width: "100%", maxWidth: 420, justifyContent: "space-around", flexWrap: "wrap" }}>
                <div style={{ textAlign: "center" }}>
                  <div className="text-meta">Present / Total</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--emerald)" }}>{presentCount} / {totalEnrolled}</div>
                </div>
                <div style={{ height: 36, width: 1, background: "rgba(255,255,255,0.1)" }} />
                <div style={{ textAlign: "center" }}>
                  <div className="text-meta">Attendance Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: "var(--cyan)" }}>{attendancePercentage}%</div>
                </div>
              </div>

              <div style={{ position: "relative", cursor: "pointer" }} onClick={() => setIsZoomed(true)} title="Click to zoom QR code">
                <div className="qr-ring" style={{ position: "relative" }}>
                  {qrCode ? (
                    <img src={qrCode} alt="Attendance QR Code" style={{ width: "min(210px, 70vw)", height: "auto", display: "block" }} />
                  ) : (
                    <div style={{ width: "min(210px, 70vw)", height: "min(210px, 70vw)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
                      Loading QR Code…
                    </div>
                  )}
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
                  <RefreshCw size={13} className={timeLeft <= 3 || qrLoading ? "animate-spin" : ""} />
                  Anti-Cheat Rotation in {timeLeft}s
                </div>
                <div className="progress-bar" style={{ marginTop: 8, width: "min(220px, 70vw)" }}>
                  <div className={`progress-fill ${timeLeft <= 3 ? "danger" : ""}`} style={{ width: `${progressPct}%` }} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button onClick={forceRotate} className="btn-secondary" style={{ gap: 6 }} disabled={qrLoading}>
                  <RefreshCw size={14} className={qrLoading ? "animate-spin" : ""} /> Force Rotate
                </button>
                <button onClick={stopSession} className="btn-danger" style={{ gap: 6 }}>End Session</button>
                
                {/* Replicate Attendance Button (only renders if linked courses exist) */}
                <ReplicateAttendanceButton
                  sourceSessionId={activeSession.id}
                  linkedCourses={courses.find(c => c.id === activeSession.course)?.linked_courses || []}
                  onSuccess={(result) => {
                    alert(`✅ Successfully replicated ${result.records_cloned} attendance records to ${result.target_course_name}.`);
                    fetchRecentSessions();
                  }}
                />
              </div>

              {sessionReport?.students?.length > 0 && (
                <div style={{ width: "100%", maxWidth: 520, borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 12 }}>
                    <Users size={15} color="var(--cyan)" />
                    <h4 style={{ margin: 0, fontSize: 14 }}>Quick Attendance Override (Live Roster)</h4>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 200, overflowY: "auto" }}>
                    {[...sessionReport.students].sort((a, b) => {
                      const regA = a.registration_number ? String(a.registration_number) : (a.email ? a.email.split("@")[0] : "");
                      const regB = b.registration_number ? String(b.registration_number) : (b.email ? b.email.split("@")[0] : "");
                      return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: "base" });
                    }).map(s => {
                      const isPresent = s.sessions && s.sessions[activeSession.id] === true;
                      return (
                        <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 8 }}>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: 13, fontWeight: 500 }}>{s.email}</span>
                            {s.full_name && (
                              <span style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                                <sub>{s.full_name}</sub>
                              </span>
                            )}
                          </div>
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
        <div className="panel-pad" style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BookOpen size={22} color="var(--purple)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>My Courses</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{courses.length} courses assigned</p>
            </div>
          </div>

          <div className="chip-scroll-row" style={{ alignItems: "center", gap: 8, marginBottom: 20, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <Clock size={14} color="var(--emerald)" />
            <span className="text-meta" style={{ fontWeight: 600 }}>Session Length:</span>
            <input type="number" min="1" max="480" className="form-input" value={durationMinutes}
              onChange={(e) => setDurationMinutes(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ width: 68, padding: "6px 8px", textAlign: "center", fontWeight: 700 }} />
            <span className="text-meta" style={{ fontSize: 13 }}>Min</span>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
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
              <div key={course.id} className="glass-c" style={{ padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0, flex: "1 1 200px" }}>
                  <div style={{
                    width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                    background: `linear-gradient(135deg, ${["rgba(79,142,247,0.2)", "rgba(129,140,248,0.2)", "rgba(167,139,250,0.2)"][i % 3]}, transparent)`,
                    border: `1px solid ${["rgba(79,142,247,0.3)", "rgba(129,140,248,0.3)", "rgba(167,139,250,0.3)"][i % 3]}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 700, color: ["var(--emerald)", "var(--cyan)", "var(--purple)"][i % 3]
                  }}>
                    {course.name?.charAt(0)?.toUpperCase() || "C"}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 15, wordBreak: "break-word" }}>{course.name}</div>
                    <div className="text-meta">{course.institution}{course.department ? ` · ${course.department}` : ""}</div>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
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
        <AttendanceAlertsPanel 
          courses={courses}
          selectedCourseId={selectedAlertCourseId}
          onCourseSelect={setSelectedAlertCourseId}
          courseDefaulters={courseDefaulters}
          loading={courseDefaulters === null && selectedAlertCourseId !== ""}
        />
      )}

      {/* ── Session History Panel ── */}
      {activeView === "history" && (
        <div className="panel-pad" style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(129,140,248,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <History size={22} color="var(--cyan)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Session History</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Recent attendance sessions</p>
            </div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {recentSessions.map(s => {
              const isPast = parseUTCDate(s.expiry_time) < new Date();
              const sessionCourse = courses.find(c => c.id === s.course);
              const linkedCourses = sessionCourse?.linked_courses || [];
              return (
                <div key={s.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>Session {s.session_number ?? s.id}</div>
                    <div className="text-meta">{formatLocalDate(s.start_time)}</div>
                    {s.present_count !== undefined && (
                      <div style={{ fontSize: 12, color: "var(--emerald)", marginTop: 2 }}>{s.present_count} students present</div>
                    )}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span className={`badge ${isPast ? "badge-defaulter" : "badge-good"}`}>{isPast ? "Ended" : "Active"}</span>
                    <ReplicateAttendanceButton
                      sourceSessionId={s.id}
                      linkedCourses={linkedCourses}
                      onSuccess={(result) => {
                        alert(`Replicated ${result.records_cloned} records to ${result.target_course_name}.`);
                        fetchRecentSessions();
                      }}
                    />
                  </div>
                </div>
              );
            })}
            {recentSessions.length === 0 && <p className="text-meta" style={{ textAlign: "center", margin: 0 }}>No past sessions found.</p>}
          </div>
        </div>
      )}

      {/* Fullscreen QR Modal */}
      {isZoomed && activeSession && (
        <QrZoomModal
          qrCode={qrCode}
          timeLeft={timeLeft}
          loading={qrLoading}
          onClose={() => setIsZoomed(false)}
        />
      )}
    </div>
  );
}
