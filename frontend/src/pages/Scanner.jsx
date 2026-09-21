import { useRef, useState, useEffect } from "react";
import jsQR from "jsqr";
import API from "../services/api";
import { saveScanOffline, getPendingScansCount, syncOfflineScans } from "../services/offline";
import {
  Camera, RefreshCw, Wifi, WifiOff, CheckCircle, AlertCircle, Info, ScanLine,
  ArrowLeft, ArrowRight, BarChart2, TrendingDown, Clock, CheckCircle2,
  XCircle, BookOpen
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

export default function StudentDashboard({ user, initialView = "grid" }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const isScanningRef = useRef(false);

  const [activeView, setActiveView] = useState(initialView);
  const [attendanceFilter, setAttendanceFilter] = useState("all");
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

  const fetchAttendanceSummary = async () => {
    setCoursesLoading(true);
    try {
      const res = await API.get("/reports/student/");
      setCourses(res.data.courses || []);
    } catch { console.error("Failed to fetch attendance summary"); }
    finally { setCoursesLoading(false); }
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

  const fetchCourseDetail = async (courseId) => {
    setDetailLoading(true);
    try {
      const res = await API.get(`/reports/student/course/${courseId}/`);
      setCourseDetail(res.data);
    } catch { console.error("Failed to fetch course detail"); }
    finally { setDetailLoading(false); }
  };


  const startScanning = async () => {
    // Guard: mediaDevices API unavailable (HTTP context, restrictive WebView, old browser)
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatusMsg({
        text: "Camera API unavailable. The app must be opened over HTTPS to access the camera.",
        type: "error",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      const video = videoRef.current;
      // ── Fix: set attributes BEFORE attaching stream ──────────────────────────
      // Chrome Android requires playsinline & muted to be set on the element
      // before srcObject is assigned, otherwise play() can be blocked silently.
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.muted = true; // also set as property for older browsers
      video.srcObject = stream;
      await video.play(); // await so NotAllowedError surfaces if Chrome blocks autoplay

      setScanning(true);
      isScanningRef.current = true;
      requestAnimationFrame(tick);
    } catch (err) {
      // ── Fix: typed error messages per DOMException name ──────────────────────
      if (err.name === "NotAllowedError") {
        setStatusMsg({
          text: "PERMISSION_DENIED", // sentinel value — rendered as JSX below
          type: "error",
        });
      } else if (err.name === "NotFoundError") {
        setStatusMsg({ text: "No camera was found on this device.", type: "error" });
      } else if (err.name === "NotReadableError") {
        setStatusMsg({ text: "Camera is in use by another app. Close it and try again.", type: "error" });
      } else {
        setStatusMsg({ text: `Camera error: ${err.message}`, type: "error" });
      }
    }
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
    setStatusMsg({ text: "Processing attendance scan…", type: "info" });
    if (navigator.onLine) {
      try {
        const res = await API.post("/attendance/mark/", { token_uuid: tokenUuid });
        
        if (res.data?.already_recorded) {
          setStatusMsg({ text: "You're already marked present for this session ✓", type: "success" });
        } else {
          setStatusMsg({ text: "Attendance marked successfully! ✓", type: "success" });
        }
        
        fetchAttendanceSummary(); // refresh percentages after scan
      } catch (err) {
        const data = err.response?.data;
        if (data?.error === "QR code expired — please scan the latest code.") {
          setStatusMsg({ text: "QR code just rotated — please scan the new code.", type: "info" });
        } else {
          setStatusMsg({ text: data?.error || "Error marking attendance", type: "error" });
        }
      }
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

  let totalAttended = 0;
  let totalSessions = 0;
  courses.forEach(c => {
    totalAttended += c.attended_count || 0;
    totalSessions += c.total_sessions || 0;
  });
  const overallPct = totalSessions > 0
    ? Math.round((totalAttended / totalSessions) * 100)
    : 100;
  const atRiskCount = courses.filter(c => c.is_at_risk).length;
  
  const filteredCourses = courses.filter(c => attendanceFilter === "risk" ? c.is_at_risk : true);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* ── Interactive Welcome Hero ── */}
      <div className="glass-a panel-pad" style={{ position: "relative", overflow: "hidden" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 style={{ fontSize: 24, marginBottom: 4 }}>Hello, {displayName} 👋</h1>
            <p style={{ color: "var(--text-secondary)", margin: 0, fontSize: 13 }}>Here's your quick attendance overview.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span className={`badge ${isOnline ? "badge-good" : "badge-defaulter"}`} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
              {isOnline ? "Online" : "Offline"}
            </span>
            {offlineCount > 0 && <span className="badge badge-warning">{offlineCount} queued</span>}
          </div>
        </div>

        {/* Clickable Quick Filters */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginTop: 18 }}>
          
          {/* Overall Action Card */}
          <div className="glass-c" 
               onClick={() => { setAttendanceFilter("all"); setActiveView("attendance"); }}
               style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", transition: "transform 0.2s ease", ':hover': { transform: 'scale(1.02)' } }}>
            <ProgressRing pct={totalSessions === 0 ? 100 : overallPct} size={46} color={totalSessions === 0 ? "var(--text-muted)" : overallPct >= 75 ? "var(--emerald)" : "var(--warning)"} />
            <div>
              <p className="text-meta" style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>Overall Standing</p>
              <div style={{ fontSize: 20, fontWeight: 700, color: totalSessions === 0 ? "var(--text-primary)" : overallPct >= 75 ? "var(--emerald)" : "var(--warning)" }}>{totalSessions === 0 ? "—" : `${overallPct}%`}</div>
            </div>
          </div>
          
          {/* At Risk Action Card */}
          <div className="glass-c" 
               onClick={() => { if(atRiskCount > 0) { setAttendanceFilter("risk"); setActiveView("attendance"); } }}
               style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 12, cursor: atRiskCount > 0 ? "pointer" : "default", opacity: atRiskCount === 0 ? 0.7 : 1 }}>
            <div style={{ width: 46, height: 46, borderRadius: "50%", background: atRiskCount > 0 ? "rgba(248,113,113,0.15)" : "rgba(16,185,129,0.1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              {atRiskCount > 0 ? <TrendingDown size={22} color="var(--danger)" /> : <CheckCircle2 size={22} color="var(--emerald)" />}
            </div>
            <div>
              <p className="text-meta" style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>Courses at Risk</p>
              <div style={{ fontSize: 20, fontWeight: 700, color: atRiskCount > 0 ? "var(--danger)" : "var(--emerald)" }}>{atRiskCount} {atRiskCount === 0 && <span style={{fontSize: 11, fontWeight: "normal"}}>Safe</span>}</div>
            </div>
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

      {/* ── Premium Action Grid ── */}
      {activeView === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 16 }}>
          <DashboardActionCard
            icon={ScanLine} color="var(--emerald)" title="Scan QR Code"
            description="Tap here to instantly open your camera and mark your attendance."
            buttonText="Open Scanner"
            onClick={() => setActiveView("scanner")}
          />
          <DashboardActionCard
            icon={BookOpen} color="var(--purple)" title="Course Details"
            description="View your attendance history for all enrolled subjects."
            buttonText="View Details"
            onClick={() => { setAttendanceFilter("all"); setActiveView("attendance"); }}
          />
        </div>
      )}

      {/* ── QR Scanner Panel ── */}
      {activeView === "scanner" && (
        <div className="panel-pad" style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, backdropFilter: "blur(12px)", maxWidth: 560, margin: "0 auto", width: "100%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(79,142,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ScanLine size={22} color="var(--emerald)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>QR Attendance Scanner</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Point your camera at the instructor's QR code</p>
            </div>
          </div>

          {statusMsg.text && (
            <div className={`alert ${sc.cls}`} style={{ marginBottom: 20 }}>
              {sc.Icon && <sc.Icon size={16} style={{ flexShrink: 0, marginTop: 1 }} />}
              {statusMsg.text === "PERMISSION_DENIED" ? (
                <span>
                  Camera permission denied. If you already granted permission in Settings,{" "}
                  <button
                    onClick={() => window.location.reload()}
                    style={{
                      background: "none", border: "none", color: "inherit", cursor: "pointer",
                      textDecoration: "underline", padding: 0, font: "inherit", fontWeight: 700,
                    }}
                  >
                    tap here to reload the page
                  </button>{" "}
                  and try again.
                </span>
              ) : (
                <span>{statusMsg.text}</span>
              )}
            </div>
          )}

          <div style={{ position: "relative", width: "100%", aspectRatio: "4/3", background: "rgba(7,17,31,0.8)", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)", overflow: "hidden", marginBottom: 20 }}>
            <video ref={videoRef} muted playsInline style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            <canvas ref={canvasRef} style={{ display: "none" }} />
            {scanning && (
              <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none" }}>
                <div style={{ width: 180, height: 180, border: "2px solid var(--emerald)", borderRadius: 12, boxShadow: "0 0 24px rgba(79,142,247,0.4), inset 0 0 24px rgba(79,142,247,0.08)", animation: "scanPulse 2s ease-in-out infinite" }} />
                <style>{`@keyframes scanPulse { 0%,100%{box-shadow:0 0 20px rgba(79,142,247,0.3),inset 0 0 20px rgba(79,142,247,0.06)} 50%{box-shadow:0 0 40px rgba(79,142,247,0.5),inset 0 0 30px rgba(79,142,247,0.12)} }`}</style>
              </div>
            )}
            {!scanning && (
              <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16, background: "rgba(7,17,31,0.6)", backdropFilter: "blur(4px)" }}>
                <div style={{ width: 60, height: 60, background: "var(--emerald-dim)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(79,142,247,0.3)" }}>
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
        </div>
      )}

      {/* ── Course Details & Filtered List ── */}
      {activeView === "attendance" && !selectedCourse && (
        <div className="panel-pad" style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, backdropFilter: "blur(12px)" }}>
          
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <BookOpen size={22} color="var(--purple)" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Course Details</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Select a course to view history</p>
              </div>
            </div>

            {/* Smart View Toggles */}
            <div style={{ display: "flex", gap: 8, background: "rgba(255,255,255,0.03)", padding: 4, borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)" }}>
              <button onClick={() => setAttendanceFilter("all")} 
                      style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
                               background: attendanceFilter === "all" ? "var(--purple)" : "transparent",
                               color: attendanceFilter === "all" ? "#fff" : "var(--text-secondary)" }}>
                All Courses
              </button>
              <button onClick={() => setAttendanceFilter("risk")} 
                      style={{ padding: "6px 14px", fontSize: 13, fontWeight: 600, borderRadius: 6, border: "none", cursor: "pointer",
                               background: attendanceFilter === "risk" ? "var(--danger)" : "transparent",
                               color: attendanceFilter === "risk" ? "#fff" : "var(--text-secondary)" }}>
                At Risk
              </button>
            </div>
          </div>

          {coursesLoading ? (
            <div style={{ textAlign: "center", padding: "32px 0", color: "var(--text-muted)" }}>Loading attendance data…</div>
          ) : filteredCourses.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
              <CheckCircle2 size={32} color="var(--emerald)" style={{ margin: "0 auto 12px", opacity: 0.5 }} />
              <p>No courses found in this category.</p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {filteredCourses.map(course => {
                const pct = course.total_sessions > 0 ? course.attendance_percentage : 100;
                const displayPct = course.total_sessions > 0 ? `${pct}%` : "—";
                const color = course.total_sessions === 0 ? "var(--text-muted)" : pct >= 75 ? "var(--emerald)" : pct >= 50 ? "var(--warning)" : "var(--danger)";
                return (
                  <div key={course.course_id}
                    onClick={() => { setSelectedCourse(course); setActiveView("detail"); fetchCourseDetail(course.course_id); }}
                    style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 12, border: `1px solid ${course.is_at_risk ? "rgba(248,113,113,0.25)" : "rgba(255,255,255,0.06)"}`, cursor: "pointer", transition: "all 0.2s ease", flexWrap: "wrap" }}
                    onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
                    onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.03)"}
                  >
                    <ProgressRing pct={pct} size={48} color={color} />
                    <div style={{ flex: "1 1 180px", minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{course.course_name}</div>
                      <div className="text-meta">{course.institution_name || "—"}</div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                        {course.attended_count} / {course.total_sessions} sessions attended
                      </div>
                    </div>
                    <div style={{ textAlign: "right", marginLeft: "auto" }}>
                      <div style={{ fontSize: 20, fontWeight: 700, color }}>{displayPct}</div>
                      {course.is_at_risk && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--danger)", fontSize: 11, marginTop: 2 }}>
                          <TrendingDown size={11} /> At Risk
                        </div>
                      )}
                    </div>
                    <ArrowRight size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Session History Detail ── */}
      {activeView === "detail" && selectedCourse && (
        <div className="panel-pad" style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8, flexWrap: "wrap" }}>
            <ProgressRing pct={selectedCourse.total_sessions > 0 ? selectedCourse.attendance_percentage : 100} size={48}
              color={selectedCourse.total_sessions === 0 ? "var(--text-muted)" : selectedCourse.attendance_percentage >= 75 ? "var(--emerald)" : "var(--danger)"} />
            <div style={{ minWidth: 0, flex: "1 1 180px" }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>{selectedCourse.course_name}</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{selectedCourse.institution_name}</p>
            </div>
            <div style={{ marginLeft: "auto", textAlign: "right" }}>
              <div style={{ fontSize: 24, fontWeight: 700, color: selectedCourse.total_sessions === 0 ? "var(--text-muted)" : selectedCourse.attendance_percentage >= 75 ? "var(--emerald)" : "var(--danger)" }}>
                {selectedCourse.total_sessions > 0 ? `${selectedCourse.attendance_percentage}%` : "—"}
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
                  background: s.present ? "rgba(79,142,247,0.06)" : "rgba(248,113,113,0.05)",
                  border: `1px solid ${s.present ? "rgba(79,142,247,0.2)" : "rgba(248,113,113,0.15)"}`,
                }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", background: s.present ? "rgba(79,142,247,0.15)" : "rgba(248,113,113,0.12)", flexShrink: 0 }}>
                    {s.present ? <CheckCircle2 size={16} color="var(--emerald)" /> : <XCircle size={16} color="var(--danger)" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 500, fontSize: 13 }}>Session {s.session_number ?? s.session_id}</div>
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
            <ArrowLeft size={14} /> Back to Courses
          </button>
        </div>
      )}
    </div>
  );
}
