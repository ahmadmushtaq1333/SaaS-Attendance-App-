import React, { useState, useEffect } from "react";
import API from "../services/api";
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, XCircle, Download, Trash2, BarChart2 } from "lucide-react";

export default function Reports({ courseId: initialCourseId, onBack }) {
  const [courses, setCourses] = useState([]);
  const [activeCourseId, setActiveCourseId] = useState(initialCourseId || "");
  const [report, setReport] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTeacherCourses();
  }, []);

  const fetchTeacherCourses = async () => {
    try {
      const res = await API.get("/auth/courses/");
      setCourses(res.data);
      if (!activeCourseId && res.data.length > 0) {
        setActiveCourseId(res.data[0].id);
      }
    } catch (e) {
      console.error("Failed to fetch courses list");
    }
  };

  const fetchReports = async () => {
    if (!activeCourseId) {
      setLoading(false);
      return;
    }
    setLoading(true); setError("");
    try {
      const res = await API.get(`/reports/course/${activeCourseId}/`);
      setReport(res.data);
      const courseSessions = res.data.session_list || [];
      setSessions(courseSessions);
      if (courseSessions.length > 0) {
        setSelectedSessionId(prev => prev || courseSessions[courseSessions.length - 1].id);
      } else {
        setSelectedSessionId("");
      }
    } catch (err) {
      const msg = err.response?.data?.error || "Failed to fetch report. Check your connection or permissions.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionAttendance = () => {
    if (!selectedSessionId || !report) return;
    // Backend returns string keys — coerce to string for lookup
    const key = String(selectedSessionId);
    const list = report.students.map(s => ({
      ...s,
      isPresent: s.sessions && s.sessions[key] === true,
    }));
    setSessionAttendance(list);
  };

  useEffect(() => { fetchReports(); }, [activeCourseId]);
  useEffect(() => { fetchSessionAttendance(); }, [selectedSessionId, report]);

  const toggleAttendance = async (studentId, currentStatus) => {
    if (!selectedSessionId) return;
    try {
      await API.post("/attendance/override/", {
        student_id: studentId, session_id: selectedSessionId,
        action: currentStatus ? "absent" : "present",
      });
      setSessionAttendance(prev => prev.map(s => s.id === studentId ? { ...s, isPresent: !currentStatus } : s));
      fetchReports();
    } catch { alert("Failed to override attendance status"); }
  };

  const deleteSession = async () => {
    if (!selectedSessionId) return;
    if (!window.confirm("Delete this session? All attendance records will be lost.")) return;
    try {
      await API.delete(`/sessions/${selectedSessionId}/`);
      setSelectedSessionId(""); fetchReports();
    } catch { alert("Failed to delete session."); }
  };

  const downloadCSV = () => {
    if (!report) return;
    let csv = "Student Email,";
    const sl = report.session_list || [];
    sl.forEach(s => { csv += `Session ${s.id} (${new Date(s.start_time).toLocaleDateString()}),`; });
    csv += "Total Attended,Attendance %,Status\n";
    report.students.forEach(student => {
      let row = `${student.email},`;
      sl.forEach(s => { row += (student.sessions && student.sessions[s.id]) ? "Present," : "Absent,"; });
      row += `${student.attended_count},${student.attendance_percentage}%,${student.attendance_percentage < 75 ? "Defaulter" : "Good"}\n`;
      csv += row;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `attendance_report_${activeCourseId}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  };

  const getRiskConfig = (pct) => {
    if (pct >= 80) return { label: "Good", cls: "badge-good", barCls: "" };
    if (pct >= 75) return { label: "Watch", cls: "badge-warning", barCls: "warning" };
    return { label: "At Risk", cls: "badge-defaulter", barCls: "danger" };
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button onClick={onBack} className="btn-secondary" style={{ padding: "8px 14px" }}>
            <ArrowLeft size={15} /> Back
          </button>
          <div>
            <h1 style={{ margin: 0, fontSize: 24 }}>
              {report ? report.course_name : "Course Reports"}
            </h1>
            <p className="text-meta" style={{ marginTop: 2 }}>Attendance analytics &amp; management</p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {courses.length > 0 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <label htmlFor="course-select" className="text-meta" style={{ whiteSpace: "nowrap" }}>Course:</label>
              <select
                id="course-select"
                className="form-input"
                value={activeCourseId}
                onChange={(e) => setActiveCourseId(parseInt(e.target.value))}
                style={{ width: "auto", padding: "7px 32px 7px 12px" }}
              >
                {courses.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <button onClick={downloadCSV} className="btn-primary" disabled={loading || !report} style={{ gap: 8 }}>
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {error && <div className="alert alert-warning"><AlertTriangle size={16} />{error}</div>}

      {loading ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "60px 0" }}>
          <div className="spinner-ring" />
          <p className="text-meta">Loading course metrics…</p>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
            {[
              { label: "Sessions Held",    value: report?.total_sessions || 0,            color: "var(--cyan)",    glow: "rgba(46,230,255,0.2)" },
              { label: "Students Enrolled", value: report?.students?.length || 0,           color: "var(--emerald)", glow: "rgba(57,217,138,0.2)" },
              { label: "At-Risk (<75%)",   value: report?.defaulters_list?.length || 0,    color: "var(--danger)",  glow: "rgba(255,90,90,0.18)" },
            ].map(kpi => (
              <div key={kpi.label} className="glass-b" style={{
                padding: "20px 22px",
                borderTop: `2px solid ${kpi.color}`,
                position: "relative", overflow: "hidden",
              }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, background: `radial-gradient(circle, ${kpi.glow}, transparent 70%)`, borderRadius: "50%" }} />
                <p className="text-meta" style={{ margin: "0 0 8px 0" }}>{kpi.label}</p>
                <div style={{ fontSize: 36, fontWeight: 800, color: kpi.color, letterSpacing: -1 }}>{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Defaulters alert */}
          {(report?.defaulters_list?.length || 0) > 0 && (
            <div className="alert alert-danger">
              <AlertTriangle size={18} style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, marginBottom: 2 }}>Attendance Risk Alert</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>
                  {report.defaulters_list.length} student{report.defaulters_list.length > 1 ? "s are" : " is"} below the 75% attendance threshold.
                </div>
              </div>
            </div>
          )}

          {/* Session Override Panel */}
          {sessions.length > 0 && (
            <div className="glass-b" style={{ padding: 24 }}>
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 18 }}>
                <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <BarChart2 size={17} color="var(--purple)" />
                  Session Override Panel
                </h3>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <label htmlFor="session-select" className="text-meta" style={{ whiteSpace: "nowrap" }}>Session:</label>
                  <select
                    id="session-select"
                    className="form-input"
                    value={selectedSessionId}
                    onChange={(e) => setSelectedSessionId(parseInt(e.target.value))}
                    style={{ width: "auto", padding: "7px 32px 7px 12px" }}
                  >
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>
                        Session #{s.id} · {new Date(s.start_time).toLocaleDateString()}
                      </option>
                    ))}
                  </select>
                  <button onClick={deleteSession} className="btn-danger" style={{ padding: "8px 10px" }} title="Delete Session">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Status</th>
                      <th>Override</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionAttendance.map(student => (
                      <tr key={student.id}>
                        <td style={{ fontWeight: 500 }}>{student.email}</td>
                        <td>
                          <span className={`badge ${student.isPresent ? "badge-good" : "badge-defaulter"}`}>
                            {student.isPresent ? <CheckCircle size={11} /> : <XCircle size={11} />}
                            {student.isPresent ? "Present" : "Absent"}
                          </span>
                        </td>
                        <td>
                          <button
                            onClick={() => toggleAttendance(student.id, student.isPresent)}
                            className={student.isPresent ? "btn-danger" : "btn-secondary"}
                            style={{ padding: "6px 14px", fontSize: 12 }}
                          >
                            {student.isPresent ? "Mark Absent" : "Mark Present"}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Student Summary Table */}
          {report?.students && report.students.length > 0 && (
            <div className="glass-b" style={{ padding: 24 }}>
              <h3 style={{ margin: "0 0 18px 0" }}>Student Attendance Summary</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Sessions Attended</th>
                      <th>Attendance %</th>
                      <th>Risk Level</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.students.map(student => {
                      const risk = getRiskConfig(student.attendance_percentage);
                      return (
                        <tr key={student.id}>
                          <td style={{ fontWeight: 500 }}>{student.email}</td>
                          <td style={{ color: "var(--text-secondary)" }}>{student.attended_count} / {report.total_sessions}</td>
                          <td>
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 100 }}>
                              <span style={{ fontWeight: 700, fontSize: 14, color: student.attendance_percentage < 75 ? "var(--danger)" : "var(--emerald)" }}>
                                {student.attendance_percentage.toFixed(1)}%
                              </span>
                              <div className="progress-bar">
                                <div
                                  className={`progress-fill ${risk.barCls}`}
                                  style={{ width: `${Math.min(student.attendance_percentage, 100)}%` }}
                                />
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className={`badge ${risk.cls}`}>{risk.label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
