import { useState } from "react";
import API from "../services/api";
import { Copy, Repeat2, CheckCircle, AlertTriangle, Loader } from "lucide-react";

/**
 * ReplicateAttendanceButton
 * ─────────────────────────
 * Self-contained button + modal for replicating a live session's attendance
 * to a linked course (e.g. Theory → Lab).
 *
 * Props:
 *   sourceSessionId  — the session whose attendance is being copied
 *   linkedCourses    — array of { id, name } from the /auth/courses/ response
 *   onSuccess        — callback(result) called after a successful replication
 *
 * Renders nothing when linkedCourses is empty, so teachers without
 * paired courses never see this button.
 */
export default function ReplicateAttendanceButton({ sourceSessionId, linkedCourses, onSuccess }) {
  const [open,            setOpen]            = useState(false);
  const [selectedId,      setSelectedId]      = useState(null);
  const [loading,         setLoading]         = useState(false);
  const [error,           setError]           = useState("");
  const [conflictModal,   setConflictModal]   = useState(false);
  const [pendingStrategy, setPendingStrategy] = useState(null);

  // Feature is invisible when no links are configured
  if (!linkedCourses || linkedCourses.length === 0) return null;

  const selectedCourse = linkedCourses.find(c => c.id === selectedId);

  const reset = () => {
    setSelectedId(null);
    setError("");
    setConflictModal(false);
    setPendingStrategy(null);
  };

  const handleOpen = () => { reset(); setOpen(true); };
  const handleClose = () => { setOpen(false); reset(); };

  const doReplicate = async (strategy = "replace") => {
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/sessions/replicate/", {
        source_session_id: sourceSessionId,
        target_course_id: selectedId,
        conflict_strategy: strategy,
      });

      if (res.data.status === "skipped") {
        // A session already exists — show conflict picker
        setPendingStrategy(strategy);
        setConflictModal(true);
        setLoading(false);
        return;
      }

      setOpen(false);
      setConflictModal(false);
      reset();
      onSuccess(res.data);
    } catch (err) {
      setError(err.response?.data?.error || "Replication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleConflict = async (strategy) => {
    setConflictModal(false);
    await doReplicate(strategy);
  };

  return (
    <>
      {/* ── Trigger Button ─────────────────────────────────────────────── */}
      <button
        onClick={handleOpen}
        className="btn-secondary"
        style={{
          display: "inline-flex", alignItems: "center", gap: 7,
          padding: "8px 16px", fontSize: 13,
          color: "var(--purple)", borderColor: "rgba(167,139,250,0.4)",
          background: "rgba(167,139,250,0.08)",
        }}
      >
        <Repeat2 size={15} />
        Replicate Attendance
      </button>

      {/* ── Course Picker Modal ─────────────────────────────────────────── */}
      {open && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
              <div style={iconWrapStyle}>
                <Copy size={17} color="var(--purple)" />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Replicate Attendance</h3>
                <p style={{ margin: 0, fontSize: 12, color: "var(--text-muted)" }}>
                  Select the course to copy today's attendance into.
                </p>
              </div>
            </div>

            {/* Course Options */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, margin: "16px 0" }}>
              {linkedCourses.map(course => (
                <button
                  key={course.id}
                  onClick={() => setSelectedId(course.id)}
                  style={{
                    display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", borderRadius: 10,
                    border: `1px solid ${selectedId === course.id ? "var(--purple)" : "var(--glass-border)"}`,
                    background: selectedId === course.id ? "rgba(167,139,250,0.12)" : "rgba(255,255,255,0.03)",
                    cursor: "pointer", textAlign: "left", width: "100%",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  {/* Radio circle */}
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                    border: `2px solid ${selectedId === course.id ? "var(--purple)" : "var(--text-muted)"}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    {selectedId === course.id && (
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--purple)" }} />
                    )}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text-primary)" }}>
                    {course.name}
                  </span>
                </button>
              ))}
            </div>

            {/* Inline error */}
            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--danger)", fontSize: 13, marginBottom: 12 }}>
                <AlertTriangle size={14} /> {error}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={handleClose} className="btn-secondary" style={{ flex: 1, justifyContent: "center" }}>
                Cancel
              </button>
              <button
                onClick={() => doReplicate("replace")}
                className="btn-primary"
                disabled={!selectedId || loading}
                style={{ flex: 2, justifyContent: "center", gap: 6 }}
              >
                {loading ? <Loader size={14} className="animate-spin" /> : <Repeat2 size={14} />}
                {loading ? "Replicating…" : "Replicate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Conflict Resolution Modal ───────────────────────────────────── */}
      {conflictModal && (
        <div style={overlayStyle}>
          <div style={{ ...modalStyle, maxWidth: 400 }}>
            <div style={{ textAlign: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
              <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700 }}>Session Already Exists</h3>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>
                <strong>{selectedCourse?.name}</strong> already has an attendance session today. How should we proceed?
              </p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
              <button
                onClick={() => handleConflict("replace")}
                className="btn-secondary"
                style={{ padding: "12px 16px", textAlign: "left", flexDirection: "column", alignItems: "flex-start", gap: 2 }}
              >
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Replace</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>
                  Delete existing session and copy fresh attendance.
                </span>
              </button>
              <button
                onClick={() => handleConflict("merge")}
                className="btn-secondary"
                style={{ padding: "12px 16px", textAlign: "left", flexDirection: "column", alignItems: "flex-start", gap: 2 }}
              >
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>Merge</span>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 400 }}>
                  Keep existing records, only add students not yet marked.
                </span>
              </button>
            </div>

            <button onClick={() => { setConflictModal(false); setOpen(true); }} className="btn-secondary" style={{ width: "100%", justifyContent: "center" }}>
              ← Go Back
            </button>
          </div>
        </div>
      )}
    </>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const overlayStyle = {
  position: "fixed", inset: 0, zIndex: 1000,
  background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)",
  display: "flex", alignItems: "center", justifyContent: "center",
  padding: 16,
};

const modalStyle = {
  background: "var(--bg-deep)",
  border: "1px solid var(--glass-border)",
  borderRadius: 16,
  padding: 24,
  width: "100%",
  maxWidth: 460,
  boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
};

const iconWrapStyle = {
  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
  background: "rgba(167,139,250,0.15)",
  display: "flex", alignItems: "center", justifyContent: "center",
};
