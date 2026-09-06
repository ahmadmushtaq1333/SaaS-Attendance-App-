import { useState, useMemo, useEffect } from "react";
import UserListPane from "./UserListPane";
import UserInspectorPane from "./UserInspectorPane";
import { Users, UserPlus } from "lucide-react";

export default function UserDirectory({
  users = [],
  institutions = [],
  departments = [],
  courses = [],
  onRefresh,
  onOpenOnboarding
}) {
  const [roleTab, setRoleTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [sortOption, setSortOption] = useState("newest");
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [mobileShowInspector, setMobileShowInspector] = useState(false);
  const [isMobile, setIsMobile] = useState(() => typeof window !== "undefined" && window.innerWidth <= 900);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 900);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute counts for the segmented navigation pills
  const counts = useMemo(() => {
    let teacher = 0;
    let student = 0;
    let admin = 0;
    users.forEach(u => {
      if (u.role === "teacher") teacher++;
      else if (u.role === "student") student++;
      else if (u.role === "admin") admin++;
    });
    return { all: users.length, teacher, student, admin };
  }, [users]);

  // Filter users based on role tab, search query, and department
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      // Role filter
      if (roleTab !== "all" && u.role !== roleTab) return false;

      // Department filter
      if (departmentFilter !== "all") {
        const deptId = u.department || u.computed_department;
        if (String(deptId) !== String(departmentFilter)) return false;
      }

      // Search query (email, registration number, name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const emailMatch = (u.email || "").toLowerCase().includes(q);
        const regMatch = (u.registration_number || "").toLowerCase().includes(q);
        const deptMatch = (u.department_name || "").toLowerCase().includes(q);
        if (!emailMatch && !regMatch && !deptMatch) return false;
      }

      return true;
    });
  }, [users, roleTab, departmentFilter, searchQuery]);

  // Sort filtered users based on selected sort option
  const sortedUsers = useMemo(() => {
    const list = [...filteredUsers];
    if (sortOption === "newest") {
      list.sort((a, b) => {
        const dateA = a.date_joined ? new Date(a.date_joined).getTime() : a.id || 0;
        const dateB = b.date_joined ? new Date(b.date_joined).getTime() : b.id || 0;
        return dateB - dateA;
      });
    } else if (sortOption === "oldest") {
      list.sort((a, b) => {
        const dateA = a.date_joined ? new Date(a.date_joined).getTime() : a.id || 0;
        const dateB = b.date_joined ? new Date(b.date_joined).getTime() : b.id || 0;
        return dateA - dateB;
      });
    } else if (sortOption === "email_asc") {
      list.sort((a, b) => (a.email || "").localeCompare(b.email || ""));
    } else if (sortOption === "email_desc") {
      list.sort((a, b) => (b.email || "").localeCompare(a.email || ""));
    } else if (sortOption === "dept") {
      list.sort((a, b) => (a.department_name || "").localeCompare(b.department_name || ""));
    }
    return list;
  }, [filteredUsers, sortOption]);

  // Auto-select user
  useEffect(() => {
    if (sortedUsers.length > 0) {
      // If no selected user or selected user not in sorted list, select first
      const exists = sortedUsers.some(u => u.id === selectedUserId);
      if (!exists) {
        setSelectedUserId(sortedUsers[0].id);
      }
    } else {
      setSelectedUserId(null);
    }
  }, [sortedUsers, selectedUserId]);

  const selectedUser = useMemo(() => {
    return users.find(u => u.id === selectedUserId) || null;
  }, [users, selectedUserId]);

  const handleSelectUser = (u) => {
    setSelectedUserId(u.id);
    if (isMobile) {
      setMobileShowInspector(true);
    }
  };

  return (
    <div style={{
      background: "var(--glass-b)", border: "1px solid var(--glass-border)",
      borderRadius: 16, padding: "20px 22px", backdropFilter: "blur(12px)",
      display: "flex", flexDirection: "column", gap: 16
    }}>
      {/* Top Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 42, height: 42, borderRadius: 12,
            background: "rgba(167,139,250,0.15)", border: "1px solid rgba(167,139,250,0.3)",
            display: "flex", alignItems: "center", justifyContent: "center", color: "var(--purple)"
          }}>
            <Users size={22} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>User Directory & Faculty Hub</h2>
            <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
              {sortedUsers.length} accounts found • {counts.teacher} faculty • {counts.student} students
            </p>
          </div>
        </div>

        {onOpenOnboarding && (
          <button
            onClick={onOpenOnboarding}
            className="btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", fontSize: 13, borderRadius: 8 }}
          >
            <UserPlus size={14} /> Register New Account
          </button>
        )}
      </div>

      {/* Master-Detail Split Grid */}
      <div className="directory-split-layout" style={{
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : "minmax(340px, 38%) 1fr",
        gap: 18,
        minHeight: 560
      }}>
        {/* Left List Pane (shown on desktop, or mobile when inspector not active) */}
        {(!isMobile || !mobileShowInspector) && (
          <div className="directory-list-pane" style={{
            background: "var(--glass-a)", border: "1px solid var(--glass-border)",
            borderRadius: 14, padding: "16px 14px", height: "100%"
          }}>
            <UserListPane
              users={sortedUsers}
              selectedUserId={selectedUserId}
              onSelectUser={handleSelectUser}
              roleTab={roleTab}
              setRoleTab={setRoleTab}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              sortOption={sortOption}
              setSortOption={setSortOption}
              departmentFilter={departmentFilter}
              setDepartmentFilter={setDepartmentFilter}
              departments={departments}
              counts={counts}
            />
          </div>
        )}

        {/* Right Detail Inspector Pane (shown on desktop, or mobile when inspector active) */}
        {(!isMobile || mobileShowInspector) && (
          <div className="directory-inspector-pane" style={{
            background: "var(--glass-a)", border: "1px solid var(--glass-border)",
            borderRadius: 14, padding: "20px 22px", height: "100%", overflowY: "auto"
          }}>
            <UserInspectorPane
              user={selectedUser}
              institutions={institutions}
              departments={departments}
              courses={courses}
              onRefresh={onRefresh}
              onCloseMobile={() => setMobileShowInspector(false)}
              isMobile={isMobile}
            />
          </div>
        )}
      </div>
    </div>
  );
}
