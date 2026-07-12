import React, { useState, useEffect } from "react";
import API from "../services/api";
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle, XCircle, Download, Trash2 } from "lucide-react";

export default function Reports({ courseId, onBack }) {
  const [report, setReport] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [sessionAttendance, setSessionAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchReports = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await API.get(`/reports/course/${courseId}/`);
      setReport(res.data);
      
      // Use the session list provided by the new backend payload
      const courseSessions = res.data.session_list || [];
      setSessions(courseSessions);
      
      // If we previously had a session selected, keep it, otherwise select the latest
      if (courseSessions.length > 0) {
        setSelectedSessionId(prev => prev || courseSessions[courseSessions.length - 1].id);
      } else {
        setSelectedSessionId("");
      }
    } catch (err) {
      setError("Failed to fetch reports. Database details could be empty.");
      // Setup temporary visual mock data if DB isn't loaded so we can see the reporting module
      setReport({
        course_name: "Advanced Web Engineering",
        total_sessions: 12,
        students: [
          { id: 101, email: "alex.jones@student.edu", attended_count: 10, attendance_percentage: 83.33 },
          { id: 102, email: "sarah.connor@student.edu", attended_count: 11, attendance_percentage: 91.67 },
          { id: 103, email: "michael.scott@student.edu", attended_count: 6, attendance_percentage: 50.00 },
          { id: 104, email: "pam.beesly@student.edu", attended_count: 9, attendance_percentage: 75.00 },
          { id: 105, email: "jim.halpert@student.edu", attended_count: 5, attendance_percentage: 41.67 }
        ],
        defaulters_list: [
          { id: 103, email: "michael.scott@student.edu", attended_count: 6, attendance_percentage: 50.00 },
          { id: 105, email: "jim.halpert@student.edu", attended_count: 5, attendance_percentage: 41.67 }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchSessionAttendance = () => {
    if (!selectedSessionId || !report) return;
    
    // Construct a list of all students and their presence status in this session
    // using the 'sessions' dictionary returned from the updated backend.
    const attendanceList = report.students.map(student => {
      return {
        ...student,
        isPresent: student.sessions && student.sessions[selectedSessionId] === true
      };
    });
    setSessionAttendance(attendanceList);
  };

  useEffect(() => {
    fetchReports();
  }, [courseId]);

  useEffect(() => {
    fetchSessionAttendance();
  }, [selectedSessionId, report]);

  const toggleAttendance = async (studentId, currentStatus) => {
    if (!selectedSessionId) return;
    
    try {
      const action = currentStatus ? "absent" : "present";
      await API.post("/attendance/override/", {
        student_id: studentId,
        session_id: selectedSessionId,
        action: action
      });
      
      // Update local state status instantly
      setSessionAttendance(prev => prev.map(s => s.id === studentId ? { ...s, isPresent: !currentStatus } : s));
      // Refresh overall reports calculation in background
      fetchReports();
    } catch (err) {
      alert("Failed to override attendance status");
    }
  };

  const deleteSession = async () => {
    if (!selectedSessionId) return;
    if (!window.confirm("Are you sure you want to permanently delete this session? All associated attendance records will be lost.")) return;
    
    try {
      await API.delete(`/sessions/${selectedSessionId}/`);
      setSelectedSessionId(""); // Clear selection
      fetchReports(); // Refresh data
    } catch (err) {
      alert("Failed to delete session.");
    }
  };

  const downloadCSV = () => {
    if (!report) return;
    
    // Header row
    let csvContent = "Student Email,";
    const sessionList = report.session_list || [];
    
    sessionList.forEach(session => {
      csvContent += `Session ${session.id} (${new Date(session.start_time).toLocaleDateString()}),`;
    });
    csvContent += "Total Attended,Attendance %,Status\n";
    
    // Data rows
    report.students.forEach(student => {
      let row = `${student.email},`;
      sessionList.forEach(session => {
        row += (student.sessions && student.sessions[session.id]) ? "Present," : "Absent,";
      });
      row += `${student.attended_count},${student.attendance_percentage}%,`;
      row += student.attendance_percentage < 75 ? "Defaulter\n" : "Good\n";
      csvContent += row;
    });
    
    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `attendance_report_${courseId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="animate-fade-in-up" style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={onBack} className="btn-secondary" style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: "6px" }}>
            <ArrowLeft size={16} /> Back
          </button>
          <h1 style={{ margin: 0, fontSize: "1.8rem", fontWeight: "700" }}>
            Reports: {report ? report.course_name : "Course Summary"}
          </h1>
        </div>
        <button onClick={downloadCSV} className="btn-primary" style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "8px" }} disabled={loading || !report}>
          <Download size={18} /> Export CSV
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "40px" }}>
          <RefreshCw className="animate-spin" style={{ margin: "auto" }} />
          <p style={{ marginTop: "12px", color: "#9ca3af" }}>Loading course metrics...</p>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px" }}>
            <div className="glass-panel" style={{ padding: "20px" }}>
              <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Total Sessions Held</span>
              <h2 style={{ fontSize: "2.2rem", margin: "8px 0 0 0", color: "#6366f1" }}>{report.total_sessions}</h2>
            </div>
            <div className="glass-panel" style={{ padding: "20px" }}>
              <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Total Enrolled</span>
              <h2 style={{ fontSize: "2.2rem", margin: "8px 0 0 0", color: "#38bdf8" }}>{report.students.length}</h2>
            </div>
            <div className="glass-panel" style={{ padding: "20px" }}>
              <span style={{ color: "#9ca3af", fontSize: "0.9rem" }}>Defaulters (&lt;75%)</span>
              <h2 style={{ fontSize: "2.2rem", margin: "8px 0 0 0", color: "#f87171" }}>{report.defaulters_list.length}</h2>
            </div>
          </div>

          {report.defaulters_list.length > 0 && (
            <div style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "12px", padding: "16px", display: "flex", gap: "12px", alignItems: "center" }}>
              <AlertTriangle color="#f87171" />
              <div>
                <h4 style={{ margin: 0, color: "#f87171" }}>Defaulters Alert</h4>
                <p style={{ margin: "4px 0 0 0", fontSize: "0.9rem", color: "#fca5a5" }}>
                  {report.defaulters_list.length} student(s) are below the 75% mandatory attendance threshold.
                </p>
              </div>
            </div>
          )}

          {/* Section: Manual override panel */}
          {sessions.length > 0 && (
            <div className="glass-panel" style={{ padding: "24px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0 }}>Attendance Record Override (Per Session)</h3>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label style={{ fontSize: "0.9rem", color: "#9ca3af" }}>Select Session:</label>
                  <select className="form-input" value={selectedSessionId} onChange={(e) => setSelectedSessionId(parseInt(e.target.value))} style={{ padding: "6px 12px", width: "auto", appearance: "auto" }}>
                    {sessions.map((s) => (
                      <option key={s.id} value={s.id}>Session #{s.id} ({new Date(s.start_time).toLocaleDateString()})</option>
                    ))}
                  </select>
                  <button onClick={deleteSession} className="btn-secondary" style={{ padding: "6px 10px", borderColor: "rgba(239,68,68,0.3)", color: "#f87171" }} title="Delete Session">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Student Email</th>
                      <th>Session Status</th>
                      <th>Manual Adjustment</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sessionAttendance.map((student) => (
                      <tr key={student.id}>
                        <td style={{ fontWeight: "500" }}>{student.email}</td>
                        <td>
                          {student.isPresent ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#4ade80", fontWeight: "600" }}>
                              <CheckCircle size={16} /> Present
                            </span>
                          ) : (
                            <span style={{ display: "flex", alignItems: "center", gap: "6px", color: "#f87171", fontWeight: "600" }}>
                              <XCircle size={16} /> Absent
                            </span>
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => toggleAttendance(student.id, student.isPresent)}
                            className="btn-secondary"
                            style={{ padding: "6px 12px", fontSize: "0.85rem", borderColor: student.isPresent ? "rgba(239,68,68,0.2)" : "rgba(34,197,94,0.2)", color: student.isPresent ? "#f87171" : "#4ade80" }}
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

          {/* Section: Course overview list */}
          <div className="glass-panel" style={{ padding: "24px" }}>
            <h3 style={{ margin: "0 0 16px 0" }}>Student Attendance List (Course Summary)</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Student Email</th>
                    <th>Attended Count</th>
                    <th>Attendance %</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {report.students.map((student) => {
                    const isDefaulter = student.attendance_percentage < 75;
                    return (
                      <tr key={student.id}>
                        <td>{student.email}</td>
                        <td>{student.attended_count}</td>
                        <td style={{ fontWeight: "600", color: isDefaulter ? "#f87171" : "#4ade80" }}>
                          {student.attendance_percentage}%
                        </td>
                        <td>
                          {isDefaulter ? (
                            <span className="badge-defaulter">Defaulter</span>
                          ) : (
                            <span className="badge-good">Good</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
