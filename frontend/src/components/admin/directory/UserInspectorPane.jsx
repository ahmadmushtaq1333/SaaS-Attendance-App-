import { useState } from "react";
import API from "../../../services/api";
import {
  User, BookOpen, Smartphone,
  AlertCircle, CheckCircle2, Trash2, Edit3, Save, X,
  Building, Copy, Check, ArrowLeft, RefreshCw, AlertTriangle
} from "lucide-react";

export default function UserInspectorPane({
  user,
  institutions: _institutions = [],
  departments = [],
  onRefresh,
  onCloseMobile,
  isMobile = false,
}) {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("student");
  const [editInst, setEditInst] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editRegNum, setEditRegNum] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editIsEmailVerified, setEditIsEmailVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  if (!user) {
    return (
      <div style={{
        height: "100%", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: 32,
        color: "var(--text-muted)", textAlign: "center"
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 20,
          background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)",
          display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16
        }}>
          <User size={32} style={{ opacity: 0.5 }} />
        </div>
        <h3 style={{ margin: "0 0 6px 0", fontSize: 16, color: "var(--text-primary)" }}>No User Selected</h3>
        <p style={{ margin: 0, fontSize: 13, maxWidth: 280 }}>Select an account from the left directory to view full profile credentials and course assignments.</p>
      </div>
    );
  }

  const roleColors = {
    admin: { bg: "rgba(167,139,250,0.15)", text: "var(--purple)", border: "rgba(167,139,250,0.3)" },
    teacher: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.3)" },
    student: { bg: "rgba(16,185,129,0.15)", text: "#34d399", border: "rgba(16,185,129,0.3)" }
  };
  const roleStyle = roleColors[user.role] || roleColors.student;

  const copyEmail = () => {
    navigator.clipboard.writeText(user.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const startEditing = () => {
    setEditEmail(user.email || "");
    setEditRole(user.role || "student");
    setEditInst(user.institution ? String(user.institution) : "");
    setEditDept(user.department ? String(user.department) : "");
    setEditRegNum(user.registration_number || "");
    setEditIsActive(user.is_active ?? true);
    setEditIsEmailVerified(user.is_email_verified ?? false);
    setNewPassword("");
    setIsEditing(true);
    setMessage({ text: "", type: "" });
  };

  const handleSaveEdit = async () => {
    setActionLoading(true);
    setMessage({ text: "", type: "" });
    try {
      const payload = {
        email: editEmail.trim(),
        role: editRole,
        registration_number: editRegNum.trim() || null,
        institution: editInst ? parseInt(editInst) : null,
        department: (editRole === "student" || editRole === "teacher") && editDept ? parseInt(editDept) : null,
        is_active: editIsActive,
        is_email_verified: editIsEmailVerified,
      };
      if (newPassword.trim()) {
        payload.password = newPassword.trim();
      }
      await API.put(`/admin/users/${user.id}/`, payload);
      setMessage({ text: "User profile updated successfully.", type: "success" });
      setIsEditing(false);
      if (onRefresh) onRefresh();
    } catch (err) {
      setMessage({ text: err.response?.data?.email?.[0] || err.response?.data?.error || "Failed to update profile.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetDevice = async () => {
    if (!window.confirm(`Reset device binding for ${user.email}? The student will be able to bind a new mobile device on their next attendance scan.`)) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await API.post(`/admin/users/${user.id}/reset-device/`);
      setMessage({ text: res.data?.message || "Device binding reset successfully.", type: "success" });
      if (onRefresh) onRefresh();
    } catch {
      setMessage({ text: "Failed to reset device binding.", type: "error" });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!window.confirm(`Permanently delete account ${user.email}? This action cannot be undone.`)) {
      return;
    }
    setActionLoading(true);
    try {
      await API.delete(`/admin/users/${user.id}/`);
      if (onRefresh) onRefresh();
      if (onCloseMobile) onCloseMobile();
    } catch {
      setMessage({ text: "Failed to delete user account.", type: "error" });
      setActionLoading(false);
    }
  };

  const formattedDate = user.date_joined
    ? new Date(user.date_joined).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
    : "Unknown";

  const assignedCourses = user.assigned_courses || [];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 20 }}>
      {/* Mobile Back Header */}
      {isMobile && (
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 12, borderBottom: "1px solid var(--glass-border)" }}>
          <button
            onClick={onCloseMobile}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 13, borderRadius: 8 }}
          >
            <ArrowLeft size={14} /> Back to Directory
          </button>
        </div>
      )}

      {/* Alert banner */}
      {message.text && (
        <div style={{
          padding: "10px 14px", borderRadius: 10, fontSize: 13, display: "flex", alignItems: "center", gap: 8,
          background: message.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
          border: `1px solid ${message.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: message.type === "success" ? "#34d399" : "#f87171"
        }}>
          {message.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span style={{ flex: 1 }}>{message.text}</span>
          <button onClick={() => setMessage({ text: "", type: "" })} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer" }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* User Header Profile Card */}
      <div style={{
        background: "var(--glass-a)", border: "1px solid var(--glass-border)",
        borderRadius: 14, padding: "20px 22px", display: "flex",
        flexDirection: "column", gap: 14, position: "relative"
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14, flexWrap: "wrap" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 14,
              background: roleStyle.bg, border: `1.5px solid ${roleStyle.border}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 20, fontWeight: 700, color: roleStyle.text
            }}>
              {user.email ? user.email.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--text-primary)", wordBreak: "break-all" }}>
                  {user.email}
                </h3>
                <button
                  onClick={copyEmail}
                  title="Copy email"
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    color: copied ? "var(--emerald)" : "var(--text-muted)",
                    padding: 2, display: "inline-flex", alignItems: "center"
                  }}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                </button>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <span style={{
                  background: roleStyle.bg, color: roleStyle.text, border: `1px solid ${roleStyle.border}`,
                  fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px",
                  padding: "2px 8px", borderRadius: 6
                }}>
                  {user.role === "teacher" ? "Faculty / Instructor" : user.role}
                </span>
                <span style={{
                  background: user.is_active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.12)",
                  color: user.is_active ? "#34d399" : "#f87171",
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
                  display: "inline-flex", alignItems: "center", gap: 4
                }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: user.is_active ? "#10b981" : "#ef4444" }} />
                  {user.is_active ? "Active" : "Inactive"}
                </span>
                <span style={{
                  background: user.is_email_verified ? "rgba(59,130,246,0.12)" : "rgba(245,158,11,0.12)",
                  color: user.is_email_verified ? "#60a5fa" : "#fbbf24",
                  fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6
                }}>
                  {user.is_email_verified ? "Verified ✓" : "Pending OTP"}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {!isEditing ? (
              <>
                <button
                  onClick={startEditing}
                  className="btn-secondary"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", fontSize: 12, borderRadius: 8 }}
                >
                  <Edit3 size={13} /> Edit
                </button>
                <button
                  onClick={handleDeleteUser}
                  disabled={actionLoading}
                  style={{
                    background: "rgba(239,68,68,0.1)", color: "#f87171",
                    border: "1px solid rgba(239,68,68,0.25)",
                    padding: "7px 10px", borderRadius: 8, cursor: "pointer",
                    display: "inline-flex", alignItems: "center", gap: 4, fontSize: 12
                  }}
                  title="Delete User"
                >
                  <Trash2 size={13} />
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(false)}
                className="btn-secondary"
                style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "7px 12px", fontSize: 12, borderRadius: 8 }}
              >
                <X size={13} /> Cancel
              </button>
            )}
          </div>
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <div style={{
            marginTop: 8, paddingTop: 16, borderTop: "1px solid var(--glass-border)",
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12
          }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Email Address</label>
              <input
                type="email"
                className="form-input"
                value={editEmail}
                onChange={e => setEditEmail(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Role</label>
              <select
                className="form-input"
                value={editRole}
                onChange={e => setEditRole(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13 }}
              >
                <option value="student">Student</option>
                <option value="teacher">Faculty / Teacher</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Registration Number</label>
              <input
                type="text"
                className="form-input"
                value={editRegNum}
                onChange={e => setEditRegNum(e.target.value)}
                placeholder="Optional"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Department</label>
              <select
                className="form-input"
                value={editDept}
                onChange={e => setEditDept(e.target.value)}
                style={{ width: "100%", padding: "7px 10px", fontSize: 13 }}
              >
                <option value="">None / Unassigned</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>Reset Password</label>
              <input
                type="password"
                className="form-input"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Leave blank to keep current"
                style={{ width: "100%", padding: "7px 10px", fontSize: 13 }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, gridColumn: "1 / -1", flexWrap: "wrap" }}>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={editIsActive}
                  onChange={e => setEditIsActive(e.target.checked)}
                />
                Account Active
              </label>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={editIsEmailVerified}
                  onChange={e => setEditIsEmailVerified(e.target.checked)}
                />
                Email Verified
              </label>
              <button
                onClick={handleSaveEdit}
                disabled={actionLoading}
                className="btn-primary"
                style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: 13 }}
              >
                <Save size={14} /> {actionLoading ? "Saving…" : "Save Changes"}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Role-Specific Dossier Section */}
      {user.role === "teacher" && (
        <div style={{
          background: "var(--glass-a)", border: "1px solid var(--glass-border)",
          borderRadius: 14, padding: "18px 20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BookOpen size={16} color="var(--sapphire)" />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                Teaching Load & Assigned Courses
              </h4>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6,
              background: assignedCourses.length > 0 ? "rgba(59,130,246,0.12)" : "rgba(245,158,11,0.15)",
              color: assignedCourses.length > 0 ? "#60a5fa" : "#fbbf24"
            }}>
              {assignedCourses.length} {assignedCourses.length === 1 ? "Course" : "Courses"}
            </span>
          </div>

          {assignedCourses.length === 0 ? (
            <div style={{
              background: "rgba(245,158,11,0.08)", border: "1px dashed rgba(245,158,11,0.3)",
              borderRadius: 10, padding: "16px 18px", display: "flex", alignItems: "flex-start", gap: 12
            }}>
              <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: 2 }} />
              <div>
                <div style={{ fontWeight: 600, fontSize: 13, color: "#fbbf24" }}>No Courses Assigned Yet</div>
                <p style={{ margin: "4px 0 0 0", fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
                  This faculty member currently has zero courses attached to their account. They will not be able to generate QR attendance codes until assigned to a course in the Courses panel.
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {assignedCourses.map(c => (
                <div key={c.id} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "10px 14px", background: "rgba(255,255,255,0.02)",
                  border: "1px solid var(--glass-border)", borderRadius: 10
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{c.name}</div>
                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                      {c.department_name || "General Department"} {c.section_name ? `• Section ${c.section_name}` : ""}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--sapphire)", background: "rgba(59,130,246,0.1)", padding: "3px 8px", borderRadius: 6, fontWeight: 600 }}>
                    Active Instructor
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {user.role === "student" && (
        <div style={{
          background: "var(--glass-a)", border: "1px solid var(--glass-border)",
          borderRadius: 14, padding: "18px 20px"
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Smartphone size={16} color="var(--emerald)" />
              <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                Anti-Proxy Device Binding
              </h4>
            </div>
          </div>

          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 14px", background: "rgba(255,255,255,0.02)",
            border: "1px solid var(--glass-border)", borderRadius: 10, flexWrap: "wrap", gap: 10
          }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{
                  width: 8, height: 8, borderRadius: "50%",
                  background: user.has_bound_device ? "var(--emerald)" : "var(--text-muted)"
                }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                  {user.has_bound_device ? "Device Bound & Locked" : "No Device Bound (Unlocked)"}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                {user.has_bound_device
                  ? "Student can only mark QR attendance from their registered phone."
                  : "Student will automatically bind their device on their first QR scan."}
              </div>
            </div>

            {user.has_bound_device && (
              <button
                onClick={handleResetDevice}
                disabled={actionLoading}
                className="btn-secondary"
                style={{
                  display: "inline-flex", alignItems: "center", gap: 6,
                  padding: "6px 12px", fontSize: 12, borderRadius: 8, color: "var(--coral)"
                }}
              >
                <RefreshCw size={12} /> Reset Device
              </button>
            )}
          </div>
        </div>
      )}

      {/* Institutional Hierarchy & Details Card */}
      <div style={{
        background: "var(--glass-a)", border: "1px solid var(--glass-border)",
        borderRadius: 14, padding: "18px 20px"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          <Building size={16} color="var(--purple)" />
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
            Organization & Credentials
          </h4>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Institution</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 3 }}>
              {user.institution_name || "Global / Unassigned"}
            </div>
          </div>

          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Department</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 3 }}>
              {user.department_name || "Unassigned"}
            </div>
          </div>

          {user.role === "student" && (
            <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Semester & Section</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 3 }}>
                {user.semester_number ? `Semester ${user.semester_number}` : "No Semester"} {user.section_name ? `(${user.section_name})` : ""}
              </div>
            </div>
          )}

          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Registration No</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 3 }}>
              {user.registration_number || "None"}
            </div>
          </div>

          <div style={{ padding: "10px 12px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>Account Created</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)", marginTop: 3 }}>
              {formattedDate}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
