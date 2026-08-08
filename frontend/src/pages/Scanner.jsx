import React, { useRef, useState, useEffect } from "react";
import jsQR from "jsqr";
import API from "../services/api";
import { saveScanOffline, getPendingScansCount, syncOfflineScans } from "../services/offline";
import {
  Camera, RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle, Info, ScanLine,
  BookOpen, ArrowLeft, ArrowRight, BarChart2, TrendingDown, Clock, CheckCircle2,
  XCircle, Activity
} from "lucide-react";

/* ── Mini progress ring ── */
function ProgressRing({ pct, size = 52, stroke = 4, color = "var(--emerald)" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        style={{ transition: "stroke-dasharray 0.6s ease" }} />
    </svg>
  );
}

/* ── DashboardActionCard ── */
function DashboardActionCard({ icon: Icon, color, title, description, stats, onClick, buttonText }) {
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
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{description}</p>
        </div>
      </div>
      {stats && (
        <div style={{ display: "flex", gap: 16, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.label}</div>
              <div style={{ fontSize: 20, fontWeight: 700, color: stat.color || "var(--text-primary)", marginTop: 2 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}
      <button style={{
        marginTop: "auto", padding: "12px 16px", borderRadius: 8,
        background: color, color: "#fff", border: "none", fontWeight: 600, fontSize: 13,
        cursor: "pointer", boxShadow: `0 4px 12px ${color}40`, opacity: hover ? 1 : 0.9,
        display: "flex", justifyContent: "center", alignItems: "center", gap: 6
      }}>
        {buttonText} <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default function StudentDashboard({ user }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isScanningRef = useRef(false);

  const [activeView, setActiveView] = useState("grid");
  const [scanResult, setScanResult] = useState("");
  const [statusMsg, setStatusMsg] = useState({ text: "", type: "" });
  const [offlineCount, setOfflineCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [scanning, setScanning] = useState(false);

  // Attendance data
  const [courses, setCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseDetail, setCourseDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const firstName = user.email?.split("@")[0]?.split(".")[0];
  const displayName = firstName ? firstName.charAt(0).toUpperCase() + firstName.slice(1) : "Student";

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); triggerSync(); };
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    getPendingScansCount().then(setOfflineCount);
    fetchAttendanceSummary();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const fetchAttendanceSummary = async () => {
    setCoursesLoading(true);
    try {
      const res = await API.get("/reports/student/");
      setCourses(res.data.courses || []);
    } catch { console.error("Failed to fetch attendance summary"); }
    finally { setCoursesLoading(false); }
  };

  const fetchCourseDetail = async (courseId) => {
    setDetailLoading(true);
    try {
      const res = await API.get(`/reports/student/course/${courseId}/`);
      setCourseDetail(res.data);
    } catch { console.error("Failed to fetch course detail"); }
    finally { setDetailLoading(false); }
  };

  const triggerSync = async () => {
    const count = await getPendingScansCount();
    if (count > 0) {
      setStatusMsg({ text: "Syncing offline records…", type: "info" });
      try {
        const res = await syncOfflineScans();
        setStatusMsg({ text: `Successfully synced ${res.success_count} scans!`, type: "success" });
        setOfflineCount(0);
      } catch { setStatusMsg({ text: "Sync failed. Will retry later.", type: "error" }); }
    }
  };

  const startScanning = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } } });
      videoRef.current.srcObject = stream;
      videoRef.current.setAttribute("playsinline", true);
      videoRef.current.play();
      setScanning(true);
      isScanningRef.current = true;
      requestAnimationFrame(tick);
    } catch (err) { setStatusMsg({ text: `Camera error: ${err.message}`, type: "error" }); }
  };

  const stopScanning = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach(t => t.stop());
    }
    setScanning(false);
    isScanningRef.current = false;
  };

  const tick = () => {
    if (!isScanningRef.current) return;
    if (videoRef.current?.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        const w = videoRef.current.videoWidth, h = videoRef.current.videoHeight;
        if (w > 0 && h > 0) {
          canvas.width = w; canvas.height = h;
          ctx.drawImage(videoRef.current, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);
          const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
          if (code) { handleQRMark(code.data); stopScanning(); return; }
        }
      }
    }
    if (isScanningRef.current) requestAnimationFrame(tick);
  };

  const handleQRMark = async (tokenUuid) => {
    setScanResult(tokenUuid);
    setStatusMsg({ text: "Processing attendance scan…", type: "info" });
    if (navigator.onLine) {
      try {
        await API.post("/attendance/mark/", { token_uuid: tokenUuid });
        setStatusMsg({ text: "Attendance marked successfully! ✓", type: "success" });
        fetchAttendanceSummary(); // refresh percentages after scan
      } catch (err) { setStatusMsg({ text: err.response?.data?.error || "Error marking attendance", type: "error" }); }
    } else {
      try {
        await saveScanOffline(tokenUuid);
        setStatusMsg({ text: "Offline: Scan saved. Will sync when connected.", type: "info" });
        const count = await getPendingScansCount();
        setOfflineCount(count);
      } catch { setStatusMsg({ text: "Failed to save scan locally.", type: "error" }); }
    }
  };

  const statusConfig = {
    success: { cls: "alert-success", Icon: CheckCircle },
    error:   { cls: "alert-danger",  Icon: AlertCircle },
    info:    { cls: "alert-info",    Icon: Info },
  };
  const sc = statusConfig[statusMsg.type] || {};

  const overallPct = courses.length > 0
    ? Math.round(courses.reduce((sum, c) => sum + c.attendance_percentage, 0) / courses.length)
    : 0;
  const atRiskCount = courses.filter(c => c.is_at_risk).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* ── Welcome Hero ── */}
      <div className="glass-a" style={{ padding: "28px 32px", position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 28, marginBottom: 6 }}>Hello, {displayName} 👋</h1>
            <p style={{ color: "var(--text-secondary)", margin: 0 }}>Here's your attendance overview for all enrolled courses.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${isOnline ? "badge-good" : "badge-defaulter"}`} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? "Online" : "Offline"}
            </span>
            {offlineCount > 0 && <span className="badge badge-warning">{offlineCount} queued</span>}
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 14, marginTop: 24 }}>
          <div className="glass-c" style={{ padding: "14px 18px", display: "flex", alignItems: "center", gap: 14 }}>
            <ProgressRing pct={overallPct} color={overallPct >= 75 ? "var(--emerald)" : "var(--danger)"} />
            <div>
              <p className="text-meta" style={{ margin: 0 }}>Overall Attendance</p>
              <div style={{ fontSize: 22, fontWeight: 700, color: overallPct >= 75 ? "var(--emerald)" : "var(--danger)" }}>{overallPct}%</div>
            </div>
          </div>
          <div className="glass-c" style={{ padding: "14px 18px" }}>
            <p className="text-meta">Enrolled Courses</p>
            <div style={{ fontSize: 26, fontWeight: 700, color: "var(--cyan)", marginTop: 4 }}>{courses.length}</div>
          </div>
          <div className="glass-c" style={{ padding: "14px 18px" }}>
            <p className="text-meta">Courses At Risk</p>
            <div style={{ fontSize: 26, fontWeight: 700, color: atRiskCount > 0 ? "var(--danger)" : "var(--emerald)", marginTop: 4 }}>{atRiskCount}</div>
          </div>
          <div className="glass-c" style={{ padding: "14px 18px" }}>
            <p className="text-meta">Offline Queue</p>
            <div style={{ fontSize: 26, fontWeight: 700, color: offlineCount > 0 ? "var(--warning)" : "var(--text-muted)", marginTop: 4 }}>{offlineCount}</div>
          </div>
        </div>
      </div>

      {/* ── Back button ── */}
      {activeView !== "grid" && (
        <div>
          <button onClick={() => { setActiveView("grid"); setSelectedCourse(null); setCourseDetail(null); stopScanning(); setStatusMsg({ text: "", type: "" }); }}
            className="btn-secondary" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, borderRadius: 8 }}>
            <ArrowLeft size={14} /> Back to Dashboard
          </button>
        </div>
      )}

      {/* ── Action Card Grid ── */}
      {activeView === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
          <DashboardActionCard
            icon={ScanLine} color="var(--emerald)" title="Scan QR Code"
            description="Open camera to mark your attendance for an active session."
            stats={[{ label: "Offline Queue", value: offlineCount, color: offlineCount > 0 ? "var(--warning)" : "var(--text-primary)" }]}
            buttonText="Open Scanner"
            onClick={() => setActiveView("scanner")}
          />
          <DashboardActionCard
            icon={BarChart2} color="var(--purple)" title="My Attendance"
            description="View your attendance percentage across all enrolled courses."
            stats={[
              { label: "Enrolled", value: courses.length },
              { label: "At Risk", value: atRiskCount, color: atRiskCount > 0 ? "var(--danger)" : "var(--emerald)" }
            ]}
            buttonText="View Attendance"
            onClick={() => setActiveView("attendance")}
          />
        </div>
      )}

      {/* ── QR Scanner Panel ── */}
      {activeView === "scanner" && (
        <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "24px 28px", backdropFilter: "blur(12px)", maxWidth: 560, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(57,217,138,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ScanLine size={22} color="var(--emerald)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>QR Attendance Scanner</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Point your camera at the instructor's QR code</p>
            </div>
          </div>

          {statusMsg.text && (
            <div className={`alert ${sc.cls}`} style={{ marginBottom: 20 }}>
              {sc.Icon && <sc.Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "rgba(7,17,31,0.8)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden", marginBottom: 20 }}>
            <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {scanning && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: 180, height: 180, border: "2px solid var(--emerald)", borderRadius: 12, boxShadow: "0 0 24px rgba(57,217,138,0.4), inset 0 0 24px rgba(57,217,138,0.08)", animation: "scanPulse 2s ease-in-out infinite" }} />
                <style>{`@keyframes scanPulse { 0%,100%{box-shadow:0 0 20px rgba(57,217,138,0.3),inset 0 0 20px rgba(57,217,138,0.06)} 50%{box-shadow:0 0 40px rgba(57,217,138,0.5),inset 0 0 30px rgba(57,217,138,0.12)} }`}</style>
              </div>
            )}
            {!scanning && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "rgba(7,17,31,0.6)", backdropFilter: "blur(4px)" }}>
                <div style={{ width: 60, height: 60, background: "var(--emerald-dim)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(57,217,138,0.3)" }}>
                  <Camera size={26} color="var(--emerald)" />
                </div>
                <button onClick={startScanning} className="btn-primary" style={{ gap: 8 }}>
                  <ScanLine size={16} /> Enable Camera
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {scanning && (
              <button onClick={stopScanning} className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>Cancel Scan</button>
            )}
            {offlineCount > 0 && isOnline && (
              <button onClick={triggerSync} className="btn-primary" style={{ width: "100%", justifyContent: "center" }}>
                <RefreshCw size={15} /> Sync {offlineCount} Offline Scan{offlineCount > 1 ? "s" : ""}
              </button>
            )}
          </div>
          <p className="text-meta" style={{ textAlign: "center", marginTop: 20, lineHeight: 1.6 }}>
            Point your camera at the QR code displayed by your instructor. The code auto-rotates every 10 seconds.
          </p>
        </div>
      )}

      {/* ── My Attendance Summary ── */}
      {activeView === "attendance" && !selectedCourse && (
        <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "24px 28px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(123,97,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <BarChart2 size={22} color="var(--purple)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>My Attendance</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Click any course to view session-by-session history</p>
            </div>
          </div>

          {coursesLoading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>Loading attendance data…</div>
          ) : courses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>You are not enrolled in any courses yet.</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {courses.map(course => {
                const pct = course.attendance_percentage;
                const color = pct >= 75 ? "var(--emerald)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
                return (
                  <div key={course.course_id}
                    onClick={() => { setSelectedCourse(course); setActiveView("detail"); fetchCourseDetail(course.course_id); }}
                    style={{ display: "flex", alignItems: "center", gap: 16, padding: "16px 20px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${course.is_at_risk ? "rgba(255,90,90,0.25)" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", transition: "all 0.2s ease" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  >
                    <ProgressRing pct={pct} size={52} color={color} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{course.course_name}</div>
                      <div className="text-meta">{course.institution_name || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        {course.attended_count} / {course.total_sessions} sessions attended
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 22, fontWeight: 700, color }}>{pct}%</div>
                      {course.is_at_risk && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--danger)", fontSize: 11, marginTop: 2 }}>
                          <TrendingDown size={11} /> At Risk
                        </div>
                      )}
                    </div>
                    <ArrowRight size={16} color="var(--text-muted)" />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Course Session Detail ── */}
      {activeView === "detail" && selectedCourse && (
        <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "24px 28px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <ProgressRing pct={selectedCourse.attendance_percentage} size={52}
              color={selectedCourse.attendance_percentage >= 75 ? "var(--emerald)" : "var(--danger)"} />
            <div>
              <h2 style={{ margin: 0, fontSize: 20, fontWeight: 700 }}>{selectedCourse.course_name}</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{selectedCourse.institution_name}</p>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: selectedCourse.attendance_percentage >= 75 ? "var(--emerald)" : "var(--danger)" }}>
                {selectedCourse.attendance_percentage}%
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {selectedCourse.attended_count} / {selectedCourse.total_sessions} sessions
              </div>
            </div>
          </div>

          {selectedCourse.is_at_risk && (
            <div className="alert alert-danger" style={{ marginBottom: 16, marginTop: 12 }}>
              <TrendingDown size={16} style={{ flexShrink: 0 }} />
              <span>Your attendance is below 75%. You may be at risk of academic action. Contact your instructor.</span>
            </div>
          )}

          <h3 style={{ fontSize: 15, fontWeight: 600, margin: "20px 0 12px", color: "var(--text-secondary)" }}>Session History</h3>

          {detailLoading ? (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>Loading session history…</div>
          ) : courseDetail?.session_log?.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {courseDetail.session_log.map(s => (
                <div key={s.session_id} style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "10px 16px", borderRadius: 10,
                  background: s.present ? "rgba(57,217,138,0.06)" : "rgba(255,90,90,0.05)",
                  border: `1px solid ${s.present ? "rgba(57,217,138,0.2)" : "rgba(255,90,90,0.15)"}`,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: s.present ? "rgba(57,217,138,0.15)" : "rgba(255,90,90,0.12)", flexShrink: 0 }}>
                    {s.present ? <CheckCircle2 size={16} color="var(--emerald)" /> : <XCircle size={16} color="var(--danger)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>Session #{s.session_id}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                      <Clock size={10} style={{ display: "inline", marginRight: 4 }} />{s.date} at {s.time}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.present ? "var(--emerald)" : "var(--danger)" }}>
                    {s.present ? "Present" : "Absent"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>No sessions have been conducted for this course yet.</div>
          )}

          <button onClick={() => { setActiveView("attendance"); setSelectedCourse(null); setCourseDetail(null); }}
            className="btn-secondary" style={{ marginTop: 20, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <ArrowLeft size={14} /> Back to All Courses
          </button>
        </div>
      )}
    </div>
  );
}
