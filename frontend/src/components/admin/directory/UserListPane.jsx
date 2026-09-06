import { Search, X, Smartphone } from "lucide-react";

export default function UserListPane({
  users = [],
  selectedUserId,
  onSelectUser,
  roleTab,
  setRoleTab,
  searchQuery,
  setSearchQuery,
  sortOption,
  setSortOption,
  departmentFilter,
  setDepartmentFilter,
  departments = [],
  counts = { all: 0, teacher: 0, student: 0, admin: 0 }
}) {
  const roleColors = {
    admin: { bg: "rgba(167,139,250,0.15)", text: "var(--purple)", border: "rgba(167,139,250,0.3)" },
    teacher: { bg: "rgba(59,130,246,0.15)", text: "#60a5fa", border: "rgba(59,130,246,0.3)" },
    student: { bg: "rgba(16,185,129,0.15)", text: "#34d399", border: "rgba(16,185,129,0.3)" }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 12 }}>
      {/* Segmented Role Navigation Tabs */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        background: "rgba(255,255,255,0.03)", border: "1px solid var(--glass-border)",
        borderRadius: 10, padding: 4, gap: 4
      }}>
        <button
          type="button"
          onClick={() => setRoleTab("teacher")}
          style={{
            background: roleTab === "teacher" ? "rgba(59,130,246,0.2)" : "transparent",
            color: roleTab === "teacher" ? "#60a5fa" : "var(--text-secondary)",
            border: roleTab === "teacher" ? "1px solid rgba(59,130,246,0.4)" : "1px solid transparent",
            borderRadius: 7, padding: "7px 6px", fontSize: 12, fontWeight: roleTab === "teacher" ? 700 : 500,
            cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            transition: "all 0.15s ease"
          }}
        >
          <span>Faculty</span>
          <span style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 10,
            background: roleTab === "teacher" ? "#3b82f6" : "rgba(255,255,255,0.06)",
            color: roleTab === "teacher" ? "#fff" : "var(--text-muted)"
          }}>
            {counts.teacher}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRoleTab("student")}
          style={{
            background: roleTab === "student" ? "rgba(16,185,129,0.2)" : "transparent",
            color: roleTab === "student" ? "#34d399" : "var(--text-secondary)",
            border: roleTab === "student" ? "1px solid rgba(16,185,129,0.4)" : "1px solid transparent",
            borderRadius: 7, padding: "7px 6px", fontSize: 12, fontWeight: roleTab === "student" ? 700 : 500,
            cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            transition: "all 0.15s ease"
          }}
        >
          <span>Students</span>
          <span style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 10,
            background: roleTab === "student" ? "#10b981" : "rgba(255,255,255,0.06)",
            color: roleTab === "student" ? "#fff" : "var(--text-muted)"
          }}>
            {counts.student}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRoleTab("admin")}
          style={{
            background: roleTab === "admin" ? "rgba(167,139,250,0.2)" : "transparent",
            color: roleTab === "admin" ? "var(--purple)" : "var(--text-secondary)",
            border: roleTab === "admin" ? "1px solid rgba(167,139,250,0.4)" : "1px solid transparent",
            borderRadius: 7, padding: "7px 6px", fontSize: 12, fontWeight: roleTab === "admin" ? 700 : 500,
            cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            transition: "all 0.15s ease"
          }}
        >
          <span>Admins</span>
          <span style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 10,
            background: roleTab === "admin" ? "var(--purple)" : "rgba(255,255,255,0.06)",
            color: roleTab === "admin" ? "#fff" : "var(--text-muted)"
          }}>
            {counts.admin}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setRoleTab("all")}
          style={{
            background: roleTab === "all" ? "var(--glass-a)" : "transparent",
            color: roleTab === "all" ? "var(--text-primary)" : "var(--text-secondary)",
            border: roleTab === "all" ? "1px solid var(--glass-border)" : "1px solid transparent",
            borderRadius: 7, padding: "7px 6px", fontSize: 12, fontWeight: roleTab === "all" ? 700 : 500,
            cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            transition: "all 0.15s ease"
          }}
        >
          <span>All Users</span>
          <span style={{
            fontSize: 10, padding: "1px 6px", borderRadius: 10,
            background: roleTab === "all" ? "rgba(255,255,255,0.15)" : "rgba(255,255,255,0.06)",
            color: roleTab === "all" ? "#fff" : "var(--text-muted)"
          }}>
            {counts.all}
          </span>
        </button>
      </div>

      {/* Search and Filters Header */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <div style={{ position: "relative" }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            className="form-input"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={`Search ${roleTab === "teacher" ? "faculty" : roleTab === "student" ? "students" : "users"} by email / reg no…`}
            style={{ width: "100%", padding: "8px 28px 8px 30px", fontSize: 13 }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              style={{
                position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 2
              }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ flex: 1, position: "relative" }}>
            <select
              className="form-input"
              value={departmentFilter}
              onChange={e => setDepartmentFilter(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
            >
              <option value="all">All Departments</option>
              {departments.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>

          <div style={{ flex: 1, position: "relative" }}>
            <select
              className="form-input"
              value={sortOption}
              onChange={e => setSortOption(e.target.value)}
              style={{ width: "100%", padding: "6px 8px", fontSize: 12 }}
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="email_asc">Email (A → Z)</option>
              <option value="email_desc">Email (Z → A)</option>
              <option value="dept">Department</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Cards Scrollable List */}
      <div style={{
        flex: 1, overflowY: "auto", display: "flex",
        flexDirection: "column", gap: 6, paddingRight: 4, minHeight: 280, maxHeight: 560
      }}>
        {users.length === 0 ? (
          <div style={{
            padding: "32px 16px", textAlign: "center", color: "var(--text-muted)",
            fontSize: 13, background: "rgba(255,255,255,0.01)", borderRadius: 10,
            border: "1px dashed var(--glass-border)"
          }}>
            No users match the current search and filters.
          </div>
        ) : (
          users.map(u => {
            const isSelected = selectedUserId === u.id;
            const rStyle = roleColors[u.role] || roleColors.student;
            const isTeacher = u.role === "teacher";
            const coursesCount = u.assigned_courses?.length || 0;

            return (
              <div
                key={u.id}
                onClick={() => onSelectUser(u)}
                style={{
                  padding: "12px 14px",
                  borderRadius: 10,
                  cursor: "pointer",
                  background: isSelected ? "var(--glass-b)" : "rgba(255,255,255,0.02)",
                  border: isSelected ? `1.5px solid ${rStyle.text}` : "1px solid var(--glass-border)",
                  borderLeft: isSelected ? `4px solid ${rStyle.text}` : "1px solid var(--glass-border)",
                  transition: "all 0.15s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      background: rStyle.bg, color: rStyle.text,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, flexShrink: 0
                    }}>
                      {u.email ? u.email.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, fontWeight: isSelected ? 700 : 600,
                        color: "var(--text-primary)", whiteSpace: "nowrap",
                        overflow: "hidden", textOverflow: "ellipsis"
                      }}>
                        {u.email}
                      </div>
                      {u.registration_number && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                          {u.registration_number}
                        </div>
                      )}
                    </div>
                  </div>

                  <span style={{
                    fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                    padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                    background: rStyle.bg, color: rStyle.text
                  }}>
                    {u.role === "teacher" ? "Faculty" : u.role}
                  </span>
                </div>

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6, fontSize: 11 }}>
                  <span style={{ color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {u.department_name || "General"} {u.section_name ? `• ${u.section_name}` : ""}
                  </span>

                  {/* Teacher: Courses Badge */}
                  {isTeacher && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                      background: coursesCount > 0 ? "rgba(59,130,246,0.12)" : "rgba(245,158,11,0.15)",
                      color: coursesCount > 0 ? "#60a5fa" : "#fbbf24"
                    }}>
                      {coursesCount > 0 ? `${coursesCount} Courses` : "Needs Course"}
                    </span>
                  )}

                  {/* Student: Device Binding Badge */}
                  {u.role === "student" && u.has_bound_device && (
                    <span style={{
                      fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, flexShrink: 0,
                      background: "rgba(16,185,129,0.12)", color: "#34d399", display: "inline-flex", alignItems: "center", gap: 3
                    }}>
                      <Smartphone size={10} /> Locked
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
