import React, { useState, useEffect } from 'react';
import { AlertTriangle, Send, RefreshCw, CheckCircle2 } from 'lucide-react';
import API from '../services/api';
import Toast from './Toast';

export default function AttendanceAlertsPanel({ courses, selectedCourseId, onCourseSelect, courseDefaulters, loading }) {
  const [sendingTiers, setSendingTiers] = useState({});
  const [sendResults, setSendResults] = useState({}); // { tier: { sentCount, notifiedEmails: Set } }
  const [resendingStudents, setResendingStudents] = useState(new Set());
  const [toast, setToast] = useState(null);

  // Clear states when course changes
  useEffect(() => {
    setSendingTiers({});
    setSendResults({});
    setResendingStudents(new Set());
  }, [selectedCourseId]);

  const showToast = (message, type) => setToast({ message, type, id: Date.now() });

  const sendBulkNotice = async (tier) => {
    if (!selectedCourseId) return;
    setSendingTiers(prev => ({ ...prev, [tier]: true }));
    try {
      const res = await API.post("/reports/notify-tier/", {
        course_id: selectedCourseId,
        tier: tier
      });
      const notified = res.data.notified || [];
      setSendResults(prev => ({
        ...prev,
        [tier]: {
          sentCount: notified.length,
          notifiedEmails: new Set(notified)
        }
      }));
      showToast(`Successfully sent bulk notice to ${notified.length} students.`, "success");
    } catch (err) {
      showToast("Failed to send bulk notice for tier " + tier, "error");
    } finally {
      setSendingTiers(prev => ({ ...prev, [tier]: false }));
    }
  };

  const resendNotice = async (studentId, email) => {
    if (!selectedCourseId) return;
    setResendingStudents(prev => new Set(prev).add(studentId));
    try {
      await API.post("/reports/notify-student/", {
        course_id: selectedCourseId,
        student_id: studentId
      });
      showToast(`Notice resent to ${email}`, "success");
      
      // Update local set so it shows "✓ Sent"
      setSendResults(prev => {
        const newResults = { ...prev };
        // We don't know the exact tier here, but we can search and add
        for (const t in newResults) {
          if (newResults[t]) {
             newResults[t].notifiedEmails.add(email);
          }
        }
        return newResults;
      });
    } catch (err) {
      showToast(`Failed to resend notice to ${email}`, "error");
    } finally {
      setResendingStudents(prev => {
        const next = new Set(prev);
        next.delete(studentId);
        return next;
      });
    }
  };

  return (
    <div className="panel-pad" style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, backdropFilter: "blur(12px)" }}>
      {toast && <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 14, marginBottom: 20 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "rgba(248,113,113,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <AlertTriangle size={22} color="var(--danger)" />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Students At Risk</h2>
            <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Students below 75% attendance threshold</p>
          </div>
        </div>
        {courses.length > 0 && (
          <select 
            value={selectedCourseId} 
            onChange={(e) => onCourseSelect(e.target.value)}
            className="form-input" 
            style={{ width: "auto", minWidth: 160, maxWidth: "100%", padding: "8px 12px" }}
          >
            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {!selectedCourseId ? (
        <p className="text-meta">Please select a course.</p>
      ) : loading ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-muted)", fontSize: 14, padding: "16px 0" }}>
          <RefreshCw size={14} className="animate-spin" /> Fetching defaulters...
        </div>
      ) : courseDefaulters && courseDefaulters.length === 0 ? (
        <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--emerald)", fontSize: 14, padding: "16px 0" }}>
          <CheckCircle2 size={18} /> All students meet the 75% attendance threshold for this course.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            { tier: "CRITICAL", title: "🔴 Critical (< 25%)", color: "#dc2626", bg: "rgba(220,38,38,0.04)" },
            { tier: "SEVERE", title: "🟠 Severe (25% - 50%)", color: "#ea580c", bg: "rgba(234,88,12,0.04)" },
            { tier: "WARNING", title: "🟡 Warning (50% - 75%)", color: "#ca8a04", bg: "rgba(202,138,4,0.04)" }
          ].map(({ tier, title, color, bg }) => {
            const students = courseDefaulters?.filter(s => s.tier === tier) || [];
            if (students.length === 0) return null;
            
            const results = sendResults[tier];
            const hasSent = !!results;
            const isSending = sendingTiers[tier];
            
            return (
              <div key={tier} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color }}>{title} ({students.length})</h3>
                  <button 
                    onClick={() => sendBulkNotice(tier)} 
                    className="btn-secondary"
                    style={{ padding: "5px 12px", fontSize: 12, gap: 4, borderColor: `${color}40`, color }}
                    disabled={isSending}
                  >
                    <Send size={11} />
                    {isSending ? "Sending..." : hasSent ? `✓ Sent to ${results.sentCount}` : "Send Bulk Notice"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {students.map(std => {
                    const isResending = resendingStudents.has(std.id);
                    // Check if this student was notified either in bulk or individually
                    const wasNotified = Object.values(sendResults).some(res => res && res.notifiedEmails.has(std.email));
                    
                    return (
                      <div key={std.id} style={{ padding: "10px 14px", background: bg, border: `1px solid ${color}20`, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{std.email}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span className="badge" style={{ backgroundColor: `${color}15`, color }}>{std.attendance_percentage}%</span>
                          <button 
                            onClick={() => resendNotice(std.id, std.email)}
                            disabled={isResending}
                            style={{ 
                              background: 'none', border: 'none', 
                              color: wasNotified ? 'var(--emerald)' : 'var(--text-secondary)',
                              fontSize: 12, cursor: 'pointer', padding: '4px 8px',
                              display: 'flex', alignItems: 'center', gap: 4,
                              opacity: isResending ? 0.5 : 1
                            }}
                          >
                            {isResending ? "..." : wasNotified ? "✓ Sent" : "Resend"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
