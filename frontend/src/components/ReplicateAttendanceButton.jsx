import { useState } from "react";
import API from "../services/api";
import { Repeat2, X, ChevronRight, Loader2, AlertCircle, CheckCircle2, Layers } from "lucide-react";

/**
 * ReplicateAttendanceButton — Redesigned
 * Clean trigger button + full-screen bottom-anchored action sheet.
 * Single-step: pick target course → confirm. Conflict handled inline.
 */
export default function ReplicateAttendanceButton({ sourceSessionId, linkedCourses, onSuccess }) {
  const [open, setOpen]             = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [conflict, setConflict]     = useState(false); // session already exists
  const [done, setDone]             = useState(null);  // success result

  const hasLinks = linkedCourses && linkedCourses.length > 0;

  const reset = () => {
    setSelectedId(null);
    setError("");
    setConflict(false);
    setDone(null);
    setLoading(false);
  };

  const handleOpen = () => { reset(); setOpen(true); };
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
      // Auto-close and call onSuccess after a brief success flash
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
      {/* ── Trigger ── */}
      <button
        onClick={handleOpen}
        disabled={!hasLinks}
        title={!hasLinks ? "No linked courses configured. Set them up in Admin → Courses → Course Links." : "Replicate this session's attendance to a linked course"}
        style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "7px 14px", borderRadius: 8, fontSize: 13, fontWeight: 600,
          border: `1px solid ${hasLinks ? "rgba(167,139,250,0.45)" : "rgba(255,255,255,0.1)"}`,
          background: hasLinks ? "rgba(167,139,250,0.1)" : "transparent",
          color: hasLinks ? "var(--purple)" : "var(--text-muted)",
          opacity: hasLinks ? 1 : 0.55,
          cursor: hasLinks ? "pointer" : "not-allowed",
          transition: "background 0.15s, border-color 0.15s",
          fontFamily: "inherit",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={e => { if (hasLinks) e.currentTarget.style.background = "rgba(167,139,250,0.18)"; }}
        onMouseLeave={e => { if (hasLinks) e.currentTarget.style.background = "rgba(167,139,250,0.1)"; }}
      >
        <Repeat2 size={14} />
        Replicate
      </button>

      {/* ── Backdrop ── */}
      {open && (
        <div
          onClick={handleClose}
          style={{
            position: "fixed", inset: 0, zIndex: 1100,
            background: "rgba(0,0,0,0.6)",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            animation: "fadeIn 0.18s ease",
          }}
        />
      )}

      {/* ── Bottom Sheet ── */}
      {open && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 1101,
          background: "var(--bg-deep)",
          borderTop: "1px solid rgba(167,139,250,0.25)",
          borderRadius: "20px 20px 0 0",
          padding: "0 0 env(safe-area-inset-bottom, 0)",
          boxShadow: "0 -16px 48px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          animation: "slideUp 0.25s cubic-bezier(0.32, 0.72, 0, 1)",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}>

          {/* Handle pill */}
          <div style={{ display: "flex", justifyContent: "center", paddingTop: 12, paddingBottom: 4 }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)" }} />
          </div>

          {/* Header */}
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            padding: "16px 24px 12px",
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: "rgba(167,139,250,0.15)",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <Layers size={18} color="var(--purple)" />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Replicate Attendance</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 1 }}>
                Copy this session's attendance records to a linked course
              </div>
            </div>
            <button
              onClick={handleClose}
              style={{
                width: 32, height: 32, borderRadius: 8, border: "none",
                background: "rgba(255,255,255,0.07)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "var(--text-muted)", fontFamily: "inherit",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {/* Scrollable body */}
          <div style={{ overflowY: "auto", padding: "20px 24px 24px", display: "flex", flexDirection: "column", gap: 16 }}>

            {/* ── SUCCESS state ── */}
            {done && (
              <div style={{
                display: "flex", flexDirection: "column", alignItems: "center",
                gap: 12, padding: "32px 0", textAlign: "center",
              }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "rgba(52,211,153,0.15)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  animation: "popIn 0.3s cubic-bezier(0.34,1.56,0.64,1)",
                }}>
                  <CheckCircle2 size={28} color="var(--emerald)" />
                </div>
                <div style={{ fontWeight: 700, fontSize: 17 }}>Replicated!</div>
                <div style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  <strong style={{ color: "var(--emerald)" }}>{done.records_cloned}</strong> student{done.records_cloned !== 1 ? "s" : ""} copied to{" "}
                  <strong style={{ color: "var(--text-primary)" }}>{done.target_course_name}</strong>
                  {done.records_skipped_not_enrolled > 0 && (
                    <span style={{ display: "block", marginTop: 4, color: "var(--text-muted)" }}>
                      {done.records_skipped_not_enrolled} skipped (not enrolled in target)
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* ── CONFLICT state ── */}
            {!done && conflict && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{
                  display: "flex", gap: 12, padding: "14px 16px",
                  background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.25)",
                  borderRadius: 12,
                }}>
                  <AlertCircle size={18} color="var(--warning)" style={{ flexShrink: 0, marginTop: 1 }} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: "var(--warning)" }}>Session already exists</div>
                    <div style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
                      <strong>{selectedCourse?.name}</strong> already has an attendance session today. How should we handle it?
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => { setConflict(false); doReplicate("replace"); }}
                  disabled={loading}
                  style={conflictOptionStyle}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Replace</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Delete existing and copy fresh attendance</div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
                <button
                  onClick={() => { setConflict(false); doReplicate("merge"); }}
                  disabled={loading}
                  style={conflictOptionStyle}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>Merge</div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Keep existing, only add missing students</div>
                  </div>
                  <ChevronRight size={16} color="var(--text-muted)" />
                </button>
                <button
                  onClick={() => setConflict(false)}
                  style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: 13, cursor: "pointer", fontFamily: "inherit", padding: "4px 0" }}
                >
                  ← Go back
                </button>
              </div>
            )}

            {/* ── NORMAL state: pick a target course ── */}
            {!done && !conflict && (
              <>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                  Select target course
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {linkedCourses.map(course => {
                    const active = selectedId === course.id;
                    return (
                      <button
                        key={course.id}
                        onClick={() => setSelectedId(course.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 14,
                          padding: "14px 16px", borderRadius: 12, width: "100%",
                          border: `1.5px solid ${active ? "var(--purple)" : "rgba(255,255,255,0.08)"}`,
                          background: active ? "rgba(167,139,250,0.1)" : "rgba(255,255,255,0.03)",
                          cursor: "pointer", textAlign: "left", fontFamily: "inherit",
                          transition: "border-color 0.15s, background 0.15s",
                        }}
                      >
                        {/* Course icon */}
                        <div style={{
                          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
                          background: active ? "rgba(167,139,250,0.2)" : "rgba(255,255,255,0.06)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 15, fontWeight: 800,
                          color: active ? "var(--purple)" : "var(--text-muted)",
                          transition: "background 0.15s, color 0.15s",
                        }}>
                          {course.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: 15, fontWeight: 600, color: active ? "var(--text-primary)" : "var(--text-secondary)", flex: 1 }}>
                          {course.name}
                        </span>
                        {/* Selected indicator */}
                        <div style={{
                          width: 20, height: 20, borderRadius: "50%", flexShrink: 0,
                          border: `2px solid ${active ? "var(--purple)" : "rgba(255,255,255,0.2)"}`,
                          background: active ? "var(--purple)" : "transparent",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          transition: "all 0.15s",
                        }}>
                          {active && <div style={{ width: 7, height: 7, borderRadius: "50%", background: "white" }} />}
                        </div>
                      </button>
                    );
                  })}
                </div>

                {error && (
                  <div style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px", borderRadius: 8,
                    background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.25)",
                    color: "var(--danger)", fontSize: 13,
                  }}>
                    <AlertCircle size={14} style={{ flexShrink: 0 }} /> {error}
                  </div>
                )}

                {/* CTA */}
                <button
                  onClick={() => doReplicate("replace")}
                  disabled={!selectedId || loading}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                    padding: "14px 20px", borderRadius: 12, width: "100%",
                    fontWeight: 700, fontSize: 15, fontFamily: "inherit",
                    border: "none", cursor: selectedId && !loading ? "pointer" : "not-allowed",
                    background: selectedId ? "var(--purple)" : "rgba(167,139,250,0.15)",
                    color: selectedId ? "white" : "var(--text-muted)",
                    opacity: loading ? 0.7 : 1,
                    transition: "background 0.15s, color 0.15s",
                    boxShadow: selectedId ? "0 4px 20px rgba(167,139,250,0.35)" : "none",
                  }}
                >
                  {loading ? (
                    <><Loader2 size={16} style={{ animation: "spin 0.9s linear infinite" }} /> Replicating…</>
                  ) : (
                    <><Repeat2 size={16} /> Replicate Attendance</>
                  )}
                </button>
              </>
            )}

          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn  { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes popIn   { from { transform: scale(0.5); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes spin    { to { transform: rotate(360deg) } }
      `}</style>
    </>
  );
}

const conflictOptionStyle = {
  display: "flex", alignItems: "center", gap: 12,
  padding: "14px 16px", borderRadius: 12, width: "100%",
  border: "1.5px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.03)",
  cursor: "pointer", textAlign: "left", fontFamily: "inherit",
  transition: "border-color 0.15s, background 0.15s",
};
