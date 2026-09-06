import { useState, useMemo } from "react";
import API from "../../services/api";
import { UserCheck, Search, CheckSquare, Square, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";

export default function MultiStudentAssignmentForm({
  courses = [],
  students = [],
  onAssignmentComplete,
  initialCourseId = "",
}) {
  const [selectedCourseId, setSelectedCourseId] = useState(
    initialCourseId || (courses.length > 0 ? String(courses[0].id) : "")
  );
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", message: "" });

  // Get current course details (and its already enrolled student IDs if present in course object)
  const currentCourse = useMemo(() => {
    return courses.find((c) => String(c.id) === String(selectedCourseId)) || null;
  }, [courses, selectedCourseId]);

  const alreadyEnrolledSet = useMemo(() => {
    if (!currentCourse?.enrolled_students) return new Set();
    return new Set(currentCourse.enrolled_students.map((s) => s.student_id));
  }, [currentCourse]);

  // Filter students based on search query
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter((s) => {
      const emailMatch = s.email?.toLowerCase().includes(q);
      const regMatch = s.registration_number?.toLowerCase().includes(q);
      const nameMatch = `${s.first_name || ""} ${s.last_name || ""}`.toLowerCase().includes(q);
      return emailMatch || regMatch || nameMatch;
    });
  }, [students, searchQuery]);

  // Toggle single student selection
  const handleToggleStudent = (studentId) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  // Select all visible / filtered students
  const handleSelectAllFiltered = () => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev);
      filteredStudents.forEach((s) => next.add(s.id));
      return next;
    });
  };

  // Deselect all
  const handleDeselectAll = () => {
    setSelectedStudentIds(new Set());
  };

  // Submit bulk assignment
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCourseId) {
      setFeedback({ type: "error", message: "Please select a target course." });
      return;
    }
    if (selectedStudentIds.size === 0) {
      setFeedback({ type: "error", message: "Please select at least one student to assign." });
      return;
    }

    setLoading(true);
    setFeedback({ type: "", message: "" });

    try {
      const res = await API.post("/admin/enrollments/bulk/", {
        course: parseInt(selectedCourseId),
        student_ids: Array.from(selectedStudentIds),
      });

      const data = res.data;
      setFeedback({
        type: "success",
        message: data.message || `Successfully assigned ${data.enrolled_count} student(s)!`,
      });

      // Clear selection on success
      setSelectedStudentIds(new Set());

      if (onAssignmentComplete) {
        onAssignmentComplete();
      }
    } catch (err) {
      const errMsg =
        err.response?.data?.error ||
        err.response?.data?.detail ||
        "Failed to complete student assignments. Please try again.";
      setFeedback({ type: "error", message: errMsg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Target Course Selector */}
      <div>
        <label style={{ display: "block", marginBottom: 6, fontSize: 13, fontWeight: 600 }}>
          Target Course
        </label>
        <select
          className="form-input"
          value={selectedCourseId}
          onChange={(e) => {
            setSelectedCourseId(e.target.value);
            setFeedback({ type: "", message: "" });
          }}
          disabled={loading}
        >
          {courses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.section?.name ? `(${c.section.name})` : ""} — {c.enrollment_count ?? 0} enrolled
            </option>
          ))}
        </select>
      </div>

      {/* Filter and Selection Tools */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 10,
            marginBottom: 8,
          }}
        >
          <label style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>
            Select Students
            <span
              style={{
                marginLeft: 8,
                fontSize: 12,
                fontWeight: 700,
                color: selectedStudentIds.size > 0 ? "var(--emerald)" : "var(--text-muted)",
              }}
            >
              ({selectedStudentIds.size} selected)
            </span>
          </label>

          <div style={{ display: "flex", gap: 6 }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleSelectAllFiltered}
              style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6 }}
              disabled={filteredStudents.length === 0 || loading}
            >
              Select All Filtered ({filteredStudents.length})
            </button>
            {selectedStudentIds.size > 0 && (
              <button
                type="button"
                className="btn-secondary"
                onClick={handleDeselectAll}
                style={{ padding: "4px 10px", fontSize: 11, borderRadius: 6 }}
                disabled={loading}
              >
                Clear Selection
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <Search
            size={14}
            color="var(--text-muted)"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}
          />
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student email or ID…"
            style={{ paddingLeft: 34, fontSize: 13 }}
            disabled={loading}
          />
        </div>

        {/* Student Checklist Container */}
        <div
          style={{
            maxHeight: 240,
            overflowY: "auto",
            border: "1px solid var(--glass-border)",
            borderRadius: 10,
            background: "rgba(0,0,0,0.15)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {filteredStudents.length === 0 ? (
            <div style={{ padding: "24px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
              No students found matching "{searchQuery}".
            </div>
          ) : (
            filteredStudents.map((s) => {
              const isSelected = selectedStudentIds.has(s.id);
              const isAlreadyEnrolled = alreadyEnrolledSet.has(s.id);

              return (
                <div
                  key={s.id}
                  onClick={() => !loading && handleToggleStudent(s.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "9px 12px",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    cursor: loading ? "not-allowed" : "pointer",
                    background: isSelected ? "rgba(79, 142, 247, 0.12)" : "transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    {isSelected ? (
                      <CheckSquare size={16} color="var(--emerald)" style={{ flexShrink: 0 }} />
                    ) : (
                      <Square size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
                    )}
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: isSelected ? 600 : 400,
                        color: isSelected ? "var(--text-primary)" : "var(--text-secondary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {s.email}
                      {s.registration_number ? (
                        <span style={{ fontSize: 11, color: "var(--text-muted)", marginLeft: 6 }}>
                          ({s.registration_number})
                        </span>
                      ) : null}
                    </span>
                  </div>

                  {isAlreadyEnrolled && (
                    <span
                      className="badge"
                      style={{
                        fontSize: 10,
                        padding: "2px 6px",
                        background: "rgba(129, 140, 248, 0.15)",
                        color: "var(--cyan)",
                        borderRadius: 6,
                        flexShrink: 0,
                      }}
                    >
                      Already in course
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback.message && (
        <div
          className={`alert ${feedback.type === "success" ? "alert-success" : "alert-danger"}`}
          style={{ padding: "10px 14px", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}
        >
          {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Submit Action Button */}
      <button
        type="submit"
        className="btn-primary"
        style={{ justifyContent: "center", marginTop: 4, width: "100%" }}
        disabled={loading || selectedStudentIds.size === 0}
      >
        {loading ? (
          <>
            <RefreshCw size={14} className="animate-spin" /> Assigning Students…
          </>
        ) : (
          <>
            <UserCheck size={15} /> Assign {selectedStudentIds.size} Student
            {selectedStudentIds.size !== 1 ? "s" : ""}
          </>
        )}
      </button>
    </form>
  );
}
