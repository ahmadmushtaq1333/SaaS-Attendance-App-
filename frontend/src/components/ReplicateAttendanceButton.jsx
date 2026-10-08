import { useState } from "react";
import { createPortal } from "react-dom";
import API from "../services/api";
import { Repeat2, Loader2, AlertCircle, CheckCircle2, Layers, ChevronRight } from "lucide-react";

export default function ReplicateAttendanceButton({ sourceSessionId, linkedCourses, onSuccess }) {
  const [open,       setOpen]       = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState("");
  const [conflict,   setConflict]   = useState(false);
  const [done,       setDone]       = useState(null);

  const hasLinks = linkedCourses && linkedCourses.length > 0;

  const reset = () => {
    setSelectedId(null);
    setError("");
    setConflict(false);
    setDone(null);
    setLoading(false);
  };

  const handleOpen  = () => { 
    reset(); 
    if (linkedCourses && linkedCourses.length > 0) {
      setSelectedId(linkedCourses[0].id);
    }
    setOpen(true); 
  };
  const handleClose = () => { setOpen(false); reset(); };

  const doReplicate = async (strategy = "replace") => {
    if (!selectedId) return;
    setLoading(true);
    setError("");
    try {
      const res = await API.post("/sessions/replicate/", {
        source_session_id: sourceSessionId,
        target_course_id: selectedId,
        conflict_strategy: strategy,
      });

      if (res.data.status === "skipped") {
        setConflict(true);
        setLoading(false);
        return;
      }

      setDone(res.data);
      setLoading(false);
      setTimeout(() => {
        handleClose();
        onSuccess?.(res.data);
      }, 1800);
    } catch (err) {
      setError(err.response?.data?.error || "Replication failed. Please try again.");
      setLoading(false);
    }
  };

  const selectedCourse = linkedCourses?.find(c => c.id === selectedId);

  return (
    <>
      {/* ── Trigger Button ── */}
      <button
        onClick={handleOpen}
        disabled={!hasLinks}
        title={!hasLinks ? "No linked courses configured. Go to Admin → Courses → Course Links." : "Replicate attendance to a linked course"}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          border: `1px solid ${hasLinks ? "var(--purple-glow)" : "var(--glass-border)"}`,
          background: hasLinks ? "var(--purple-glow)" : "transparent",
          color: hasLinks ? "var(--purple)" : "var(--text-muted)",
          opacity: hasLinks ? 1 : 0.55,
          cursor: hasLinks ? "pointer" : "not-allowed",
          transition: "background 0.15s",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
      >
        <Repeat2 size={14} />
        Replicate
      </button>

      {/* ── Backdrop and Modal via Portal ── */}
      {open && typeof document !== "undefined" && createPortal(
        <div
          onClick={handleClose}
          style={{
            position: "fixed", inset: 0, zIndex: 9999,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: 20,
          }}
        >
          {/* ── Card (same pattern as ForgotPassword) ── */}
          <div
            onClick={e => e.stopPropagation()}
            className="glass-a"
            style={{
              width: "100%", maxWidth: 420,
              padding: "36px 32px",
              display: "flex", flexDirection: "column", gap: 24,
              boxShadow: "0 24px 64px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
              animation: "popIn 0.2s cubic-bezier(0.34,1.2,0.64,1)",
            }}
          >
            {/* Header */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 10 }}>
              <div style={{
                width: 52, height: 52, borderRadius: 16,
                background: "linear-gradient(135deg, var(--purple), var(--cyan))",
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 0 24px rgba(167,139,250,0.4)",
              }}>
                <Layers size={24} color="#07111F" strokeWidth={2.5} />
              </div>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.5, margin: 0, color: "var(--text-primary)" }}>
                  {done ? "Replicated!" : conflict ? "Session Exists" : "Replicate Attendance"}
                </h1>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 6, lineHeight: 1.5 }}>
                  {done
                    ? `${done.records_cloned} record${done.records_cloned !== 1 ? "s" : ""} copied to ${done.target_course_name}`
                    : conflict
                    ? `${selectedCourse?.name} already has a session today. How should we proceed?`
                    : "Select the course to copy this session's attendance into."}
                </p>
              </div>
            </div>

            {/* ── SUCCESS ── */}
            {done && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 56, height: 56, borderRadius: "50%",
                  background: "rgba(52,211,153,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <CheckCircle2 size={28} color="var(--emerald)" />
                </div>
                {done.records_skipped_not_enrolled > 0 && (
                  <p style={{ fontSize: 12, color: "var(--text-muted)", margin: 0, textAlign: "center" }}>
                    {done.records_skipped_not_enrolled} skipped — not enrolled in target course
                  </p>
                )}
              </div>
            )}

            {/* ── CONFLICT ── */}
            {!done && conflict && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <button onClick={() => { setConflict(false); doReplicate("replace"); }} disabled={loading} style={conflictBtnStyle}>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Replace</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Delete existing session and copy fresh attendance</div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
                <button onClick={() => { setConflict(false); doReplicate("merge"); }} disabled={loading} style={conflictBtnStyle}>
                  <div style={{ flex: 1, textAlign: "left" }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)" }}>Merge</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Keep existing, only add missing students</div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
              </div>
            )}

            {/* ── NORMAL: pick course ── */}
            {!done && !conflict && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {linkedCourses.map(course => {
                  const active = selectedId === course.id;
                  return (
                    <button
                      key={course.id}
                      onClick={() => setSelectedId(course.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 12,
                        padding: "13px 16px", borderRadius: 12, width: "100%",
                        border: `1.5px solid ${active ? "var(--purple)" : "var(--glass-border)"}`,
                        background: active ? "var(--purple-glow)" : "var(--glass-c)",
                        cursor: "pointer", fontFamily: "inherit",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                    >
                      <div style={{
                        width: 34, height: 34, borderRadius: 9, flexShrink: 0,
                        background: active ? "var(--purple-glow)" : "var(--glass-inner)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontWeight: 800, fontSize: 14,
                        color: active ? "var(--purple)" : "var(--text-muted)",
                      }}>
                        {course.name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ flex: 1, textAlign: "left", fontSize: 14, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        {course.name}
                      </span>
                      <div style={{
                        width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                        border: `2px solid ${active ? "var(--purple)" : "var(--text-muted)"}`,
                        background: active ? "var(--purple)" : "transparent",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "all 0.15s",
                      }}>
                        {active && <div style={{ width: 6, height: 6, borderRadius: "50%", background: "white" }} />}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Error */}
            {error && (
              <div className="alert alert-danger" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <AlertCircle size={14} /> {error}
              </div>
            )}

            {/* ── Actions ── */}
            {!done && !conflict && (
              <button
                onClick={() => doReplicate("replace")}
                disabled={!selectedId || loading}
                className="btn-primary"
                style={{ width: "100%", justifyContent: "center", padding: "12px 20px", fontSize: 15, gap: 8 }}
              >
                {loading
                  ? <><Loader2 size={16} style={{ animation: "spin 0.9s linear infinite" }} /> Replicating…</>
                  : <><Repeat2 size={15} /> Replicate Attendance</>
                }
              </button>
            )}

            {/* Back / Close link */}
            {!done && (
              <button
                onClick={conflict ? () => setConflict(false) : handleClose}
                className="btn-secondary"
                style={{
                  width: "100%", justifyContent: "center", fontSize: 13,
                  borderTop: "1px solid var(--glass-inner)", borderRadius: 0,
                  borderLeft: "none", borderRight: "none", borderBottom: "none",
                  paddingTop: 20, marginTop: 4,
                }}
              >
                {conflict ? "← Go Back" : "Cancel"}
              </button>
            )}
          </div>
        </div>
      , document.body)}

      <style>{`
        @keyframes popIn { from { transform: scale(0.92); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes spin  { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}

const conflictBtnStyle = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "13px 16px", borderRadius: 12, width: "100%",
  border: "1.5px solid var(--glass-border)",
  background: "var(--glass-c)",
  cursor: "pointer", fontFamily: "inherit",
  transition: "border-color 0.15s, background 0.15s",
};
