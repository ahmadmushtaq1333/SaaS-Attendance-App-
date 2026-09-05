import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, UserPlus, ArrowLeft, ArrowRight, Edit, Trash, Check, X, ArrowUpDown, Filter, Download, AlertTriangle, Users, FileSpreadsheet } from "lucide-react";
import AccordionSection from "../AccordionSection";
import ExcelImportPanel from "./ExcelImportPanel";


function DashboardActionCard({ icon: Icon, color, title, description, stats, onClick, buttonText }) {
  const [hover, setHover] = React.useState(false);
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--glass-a)", border: "1px solid var(--glass-border)",
        borderRadius: 16, padding: 24, display: "flex", flexDirection: "column", gap: 16,
        transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
        transform: hover ? "translateY(-4px)" : "none",
        boxShadow: hover ? "0 16px 40px rgba(0,0,0,0.15)" : "0 4px 12px rgba(0,0,0,0.03)",
        position: "relative", overflow: "hidden", cursor: "pointer"
      }}
      onClick={onClick}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 120, height: 120, background: color, opacity: 0.05, borderRadius: "50%", transform: "translate(30%, -30%)", transition: "transform 0.3s ease", ...(hover ? { transform: "translate(25%, -25%) scale(1.1)" } : {}) }} />
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: color, transition: "transform 0.2s ease", transform: hover ? "scale(1.05)" : "none" }}>
          <Icon size={22} />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{title}</h3>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>{description}</p>
        </div>
      </div>
      {stats && (
        <div style={{ display: "flex", gap: 16, padding: "12px 16px", background: "rgba(255,255,255,0.03)", borderRadius: 10, border: "1px solid rgba(255,255,255,0.05)", marginTop: "auto", transition: "background 0.2s ease", ...(hover ? { background: "rgba(255,255,255,0.05)" } : {}) }}>
          {stats.map((stat, i) => (
            <div key={i} style={{ flex: 1 }}>
              <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>{stat.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>{stat.value}</div>
            </div>
          ))}
        </div>
      )}
      <button 
        style={{
          marginTop: stats ? 0 : "auto", padding: "12px 16px", borderRadius: 8,
          background: color, color: "#fff", border: "none", fontWeight: 600, fontSize: 13,
          cursor: "pointer", transition: "all 0.2s ease",
          boxShadow: `0 4px 12px ${color}40`, opacity: hover ? 1 : 0.9,
          display: "flex", justifyContent: "center", alignItems: "center", gap: 6
        }}
      >
        {buttonText} <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default function UsersPanel({ user }) {
  const [activeView, setActiveView] = React.useState("grid");
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [courses, setCourses] = useState([]);

  // Creation form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [registrationNumber, setRegistrationNumber] = useState("");
  const [role, setRole] = useState("student");
  const [selectedInst, setSelectedInst] = useState("");
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedSec, setSelectedSec] = useState("");

  // Bulk
  const [bulkInst, setBulkInst] = useState("");
  const [bulkDepts, setBulkDepts] = useState([]);
  const [bulkDept, setBulkDept] = useState("");
  const [bulkSems, setBulkSems] = useState([]);
  const [bulkSem, setBulkSem] = useState("");
  const [bulkSecs, setBulkSecs] = useState([]);
  const [bulkSec, setBulkSec] = useState("");
  const [bulkPrefix, setBulkPrefix] = useState("std_");
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkPassword, setBulkPassword] = useState("");
  const [bulkCourse, setBulkCourse] = useState("");
  const [generatedAccounts, setGeneratedAccounts] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState("");

  // Filter & sort
  const [universityFilter, setUniversityFilter] = useState("all");
  const [filterDept, setFilterDept] = useState("all");
  const [filterSem, setFilterSem] = useState("all");
  const [filterSec, setFilterSec] = useState("all");
  const [filterDepts, setFilterDepts] = useState([]);
  const [filterSems, setFilterSems] = useState([]);
  const [filterSecs, setFilterSecs] = useState([]);

  const [sortField, setSortField] = useState("email");
  const [sortDesc, setSortDesc] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRegNum, setEditRegNum] = useState("");
  const [editIsEmailVerified, setEditIsEmailVerified] = useState(false);
  const [editRole, setEditRole] = useState("student");
  const [editInst, setEditInst] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editSem, setEditSem] = useState("");
  const [editSec, setEditSec] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editDepts, setEditDepts] = useState([]);
  const [editSems, setEditSems] = useState([]);
  const [editSecs, setEditSecs] = useState([]);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchUsers(); fetchInitialData(); }, []);

  // Creation cascades
  useEffect(() => {
    if (selectedInst) {
      API.get(`/admin/departments/?institution=${selectedInst}`).then(r => {
        const data = r.data.results || r.data;
        setDepartments(data);
        if (data.length > 0) setSelectedDept(String(data[0].id));
        else setSelectedDept("");
      });
    } else { setDepartments([]); setSelectedDept(""); }
  }, [selectedInst]);

  useEffect(() => {
    if (selectedDept) {
      API.get(`/admin/semesters/?department=${selectedDept}`).then(r => {
        const data = r.data.results || r.data;
        setSemesters(data);
        if (data.length > 0) setSelectedSem(String(data[0].id));
        else setSelectedSem("");
      });
    } else { setSemesters([]); setSelectedSem(""); }
  }, [selectedDept]);

  useEffect(() => {
    if (selectedSem) {
      API.get(`/admin/sections/?semester=${selectedSem}`).then(r => {
        const data = r.data.results || r.data;
        setSections(data);
        if (data.length > 0) setSelectedSec(String(data[0].id));
        else setSelectedSec("");
      });
    } else { setSections([]); setSelectedSec(""); }
  }, [selectedSem]);

  // List filter cascades
  useEffect(() => {
    if (universityFilter !== "all" && universityFilter) {
      API.get(`/admin/departments/?institution=${universityFilter}`).then(r => {
        setFilterDepts(r.data.results || r.data);
        setFilterDept("all");
        setFilterSem("all");
        setFilterSec("all");
      });
    } else { 
      setFilterDepts([]); setFilterDept("all"); 
      setFilterSems([]); setFilterSem("all");
      setFilterSecs([]); setFilterSec("all");
    }
  }, [universityFilter]);

  useEffect(() => {
    if (filterDept !== "all" && filterDept) {
      API.get(`/admin/semesters/?department=${filterDept}`).then(r => {
        setFilterSems(r.data.results || r.data);
        setFilterSem("all");
        setFilterSec("all");
      });
    } else { 
      setFilterSems([]); setFilterSem("all");
      setFilterSecs([]); setFilterSec("all");
    }
  }, [filterDept]);

  useEffect(() => {
    if (filterSem !== "all" && filterSem) {
      API.get(`/admin/sections/?semester=${filterSem}`).then(r => {
        setFilterSecs(r.data.results || r.data);
        setFilterSec("all");
      });
    } else { 
      setFilterSecs([]); setFilterSec("all"); 
    }
  }, [filterSem]);

  // Bulk cascades
  useEffect(() => {
    if (bulkInst) {
      API.get(`/admin/departments/?institution=${bulkInst}`).then(r => {
        const data = r.data.results || r.data;
        setBulkDepts(data);
        if (data.length > 0) setBulkDept(String(data[0].id));
        else setBulkDept("");
      });
    } else { setBulkDepts([]); setBulkDept(""); }
  }, [bulkInst]);

  useEffect(() => {
    if (bulkDept) {
      API.get(`/admin/semesters/?department=${bulkDept}`).then(r => {
        const data = r.data.results || r.data;
        setBulkSems(data);
        if (data.length > 0) setBulkSem(String(data[0].id));
        else setBulkSem("");
      });
    } else { setBulkSems([]); setBulkSem(""); }
  }, [bulkDept]);

  useEffect(() => {
    if (bulkSem) {
      API.get(`/admin/sections/?semester=${bulkSem}`).then(r => {
        const data = r.data.results || r.data;
        setBulkSecs(data);
        if (data.length > 0) setBulkSec(String(data[0].id));
        else setBulkSec("");
      });
    } else { setBulkSecs([]); setBulkSec(""); }
  }, [bulkSem]);

  // Edit cascades
  useEffect(() => { if (editInst) { API.get(`/admin/departments/?institution=${editInst}`).then(r => setEditDepts(r.data.results || r.data)); } else setEditDepts([]); }, [editInst]);
  useEffect(() => { if (editDept) { API.get(`/admin/semesters/?department=${editDept}`).then(r => setEditSems(r.data.results || r.data)); } else setEditSems([]); }, [editDept]);
  useEffect(() => { if (editSem) { API.get(`/admin/sections/?semester=${editSem}`).then(r => setEditSecs(r.data.results || r.data)); } else setEditSecs([]); }, [editSem]);

  const fetchInitialData = async () => {
    try {
      const ri = await API.get("/admin/institutions/");
      const insts = ri.data.results || ri.data;
      setInstitutions(insts);
      if (!user?.is_superuser && user?.institution) {
        setSelectedInst(String(user.institution));
        setBulkInst(String(user.institution));
      } else if (insts.length > 0) {
        setSelectedInst(String(insts[0].id));
        setBulkInst(String(insts[0].id));
      }
      const rc = await API.get("/admin/courses/"); setCourses(rc.data.results || rc.data);
    } catch { setError("Failed to fetch administrative records"); }
  };

  const fetchUsers = async () => {
    try { const r = await API.get("/admin/users/"); setUsers(r.data.results || r.data); }
    catch { setError("Failed to fetch user accounts"); }
  };

  const handleRegister = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await API.post("/admin/users/", {
        email, password, role,
        registration_number: registrationNumber.trim() || null,
        institution: selectedInst ? parseInt(selectedInst) : null,
        department: (role === "student" || role === "teacher") && selectedDept ? parseInt(selectedDept) : null,
        section: role === "student" && selectedSec ? parseInt(selectedSec) : null
      });
      setEmail(""); setPassword(""); setRegistrationNumber("");
      fetchUsers();
    } catch (err) { setError(err.response?.data?.email?.[0] || err.response?.data?.error || "Registration error occurred"); }
    finally { setLoading(false); }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault(); setBulkError(""); setBulkSuccessMsg(""); setBulkLoading(true);
    try {
      const res = await API.post("/admin/users/bulk-generate/", {
        section_id: parseInt(bulkSec),
        count: parseInt(bulkCount),
        prefix: bulkPrefix.trim(),
        password: bulkPassword.trim() || null,
        course_id: bulkCourse ? parseInt(bulkCourse) : null
      });
      setGeneratedAccounts(res.data.users || []);
      setBulkSuccessMsg(res.data.message || `Successfully generated ${res.data.users?.length || bulkCount} student accounts!`);
      setBulkPrefix("std_"); setBulkCount(5); setBulkPassword(""); setBulkCourse("");
      fetchUsers();
    } catch (err) { setBulkError(err.response?.data?.error || "Failed to bulk generate accounts"); }
    finally { setBulkLoading(false); }
  };

  const downloadCredentialsAsCSV = () => {
    if (!generatedAccounts.length) return;
    let csv = "Email Address,Generated Password,Department,Semester,Section,Auto-Enrolled Course\n";
    generatedAccounts.forEach(a => { csv += `${a.email},${a.password},${a.department_name},${a.semester_number},${a.section_name},${a.enrolled_course || "None"}\n`; });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a"); link.href = url; link.download = "generated_student_credentials.csv";
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Permanently delete this user account?")) return;
    try { await API.delete(`/admin/users/${id}/`); fetchUsers(); }
    catch { setError("Failed to delete user"); }
  };

  const handleSaveEdit = async (id) => {
    setError(""); setLoading(true);
    try {
      const payload = {
        email: editEmail, role: editRole,
        registration_number: editRegNum.trim() || null,
        is_email_verified: editIsEmailVerified,
        institution: editInst ? parseInt(editInst) : null,
        department: (editRole === "student" || editRole === "teacher") && editDept ? parseInt(editDept) : null,
        section: editRole === "student" && editSec ? parseInt(editSec) : null,
        is_active: editIsActive
      };
      if (editPassword.trim()) payload.password = editPassword.trim();
      await API.put(`/admin/users/${id}/`, payload);
      setEditingId(null); fetchUsers();
    } catch (err) {
      const data = err.response?.data;
      let msg = "Failed to save user modifications";
      if (data) {
        if (typeof data === "string") msg = data;
        else if (data.error) msg = data.error;
        else if (data.detail) msg = data.detail;
        else {
          const keys = Object.keys(data);
          if (keys.length > 0) {
            msg = keys.map(k => `${k}: ${Array.isArray(data[k]) ? data[k].join(", ") : data[k]}`).join(" | ");
          }
        }
      }
      setError(msg);
    } finally { setLoading(false); }
  };

  const filteredUsers = users.filter(u => {
    const instId = u.institution || u.computed_institution;
    const instMatch = universityFilter === "all" || String(instId) === String(universityFilter);
    const deptId = u.department || u.computed_department;
    const deptMatch = filterDept === "all" || String(deptId) === String(filterDept);
    const semId = u.computed_semester;
    const semMatch = filterSem === "all" || String(semId) === String(filterSem);
    const secMatch = filterSec === "all" || String(u.section) === String(filterSec);
    return instMatch && deptMatch && semMatch && secMatch;
  });
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(false);
    }
  };

  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortField === "institution_name" || sortField === "dept_sem_sec") {
      const instA = a.institution_name || "Global Admin";
      const instB = b.institution_name || "Global Admin";
      let cmp = instA.localeCompare(instB);
      if (cmp === 0) {
        const deptA = a.department_name || "";
        const deptB = b.department_name || "";
        cmp = deptA.localeCompare(deptB);
        if (cmp === 0) {
          const semA = String(a.semester_number ?? "");
          const semB = String(b.semester_number ?? "");
          cmp = semA.localeCompare(semB);
          if (cmp === 0) {
            const secA = a.section_name || "";
            const secB = b.section_name || "";
            cmp = secA.localeCompare(secB);
          }
        }
      }
      return sortDesc ? -cmp : cmp;
    }

    let valA = a[sortField];
    let valB = b[sortField];
    
    let cmp = 0;
    if (typeof valA === "string" && typeof valB === "string") cmp = valA.localeCompare(valB);
    else if (typeof valA === "boolean" && typeof valB === "boolean") cmp = valA === valB ? 0 : valA ? -1 : 1;
    else if (valA < valB) cmp = -1;
    else if (valA > valB) cmp = 1;
    
    return sortDesc ? -cmp : cmp;
  });

  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null;
    return <span style={{ marginLeft: 4 }}>{sortDesc ? "↓" : "↑"}</span>;
  };

  const roleBadge = (r) => {
    if (r === "admin") return <span className="badge badge-purple">Admin</span>;
    if (r === "teacher") return <span className="badge badge-info">Teacher</span>;
    return <span className="badge badge-good">Student</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {activeView === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <DashboardActionCard 
            icon={Users} 
            color="var(--purple)" 
            title="Manage User Directory" 
            description="View, filter, edit, or delete existing users."
            stats={[
              { label: "Total Users", value: users.length },
              { label: "Active", value: users.filter(u => u.is_active).length }
            ]}
            buttonText="View Directory"
            onClick={() => setActiveView("directory")}
          />
          <DashboardActionCard 
            icon={UserPlus} 
            color="var(--emerald)" 
            title="User Onboarding" 
            description="Register new accounts or perform bulk imports via Excel/CSV."
            stats={[
              { label: "Pending OTP", value: users.filter(u => !u.is_email_verified).length },
              { label: "Teachers", value: users.filter(u => u.role === "teacher").length }
            ]}
            buttonText="Open Onboarding"
            onClick={() => setActiveView("onboarding")}
          />
        </div>
      )}

      {activeView !== "grid" && (
        <div style={{ marginBottom: 4 }}>
          <button 
            onClick={() => setActiveView("grid")}
            className="btn-secondary"
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", fontSize: 13, borderRadius: 8 }}
          >
            <ArrowLeft size={14} /> Back to Actions
          </button>
        </div>
      )}

      {activeView === "directory" && (
        <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(167,139,250,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={20} color="var(--purple)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>User Directory</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{sortedUsers.length} users matching filters</p>
            </div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 7 }}>
              <Filter size={14} color="var(--text-muted)" />
              <select className="form-input" value={universityFilter} onChange={e => setUniversityFilter(e.target.value)} style={{ width: "auto", padding: "7px 20px 7px 12px" }}>
                <option value="all">All Universities</option>
                {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              {universityFilter !== "all" && (
                <select className="form-input" value={filterDept} onChange={e => setFilterDept(e.target.value)} style={{ width: "auto", padding: "7px 20px 7px 12px" }}>
                  <option value="all">All Departments</option>
                  {filterDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              )}
              {filterDept !== "all" && (
                <select className="form-input" value={filterSem} onChange={e => setFilterSem(e.target.value)} style={{ width: "auto", padding: "7px 20px 7px 12px" }}>
                  <option value="all">All Semesters</option>
                  {filterSems.map(s => <option key={s.id} value={s.id}>Semester {s.number}</option>)}
                </select>
              )}
              {filterSem !== "all" && (
                <select className="form-input" value={filterSec} onChange={e => setFilterSec(e.target.value)} style={{ width: "auto", padding: "7px 20px 7px 12px" }}>
                  <option value="all">All Sections</option>
                  {filterSecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              )}
            </div>
            <div style={{ fontSize: 13, color: "var(--text-muted)" }}>Click column headers to sort</div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort("email")} style={{ cursor: "pointer", userSelect: "none" }}>Email / Reg No <SortIndicator field="email" /></th>
                  <th onClick={() => handleSort("role")} style={{ cursor: "pointer", userSelect: "none" }}>Role <SortIndicator field="role" /></th>
                  <th onClick={() => handleSort("institution_name")} style={{ cursor: "pointer", userSelect: "none" }}>Institution <SortIndicator field="institution_name" /></th>
                  <th onClick={() => handleSort("dept_sem_sec")} style={{ cursor: "pointer", userSelect: "none" }}>Dept / Sem / Sec <SortIndicator field="dept_sem_sec" /></th>
                  <th onClick={() => handleSort("is_active")} style={{ cursor: "pointer", userSelect: "none" }}>Status <SortIndicator field="is_active" /></th>
                  <th onClick={() => handleSort("is_email_verified")} style={{ cursor: "pointer", userSelect: "none" }}>Verification <SortIndicator field="is_email_verified" /></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map(u => (
                  <tr key={u.id}>
                    {editingId === u.id ? (
                      <>
                        <td>
                          <input type="email" className="form-input" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ padding: "6px 10px", marginBottom: 4 }} />
                          <input type="text" className="form-input" value={editRegNum} onChange={e => setEditRegNum(e.target.value)} placeholder="Reg Number" style={{ padding: "5px 10px", fontSize: 12, marginBottom: 4 }} />
                          <input type="password" className="form-input" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="New password (optional)" style={{ padding: "5px 10px", fontSize: 12 }} />
                        </td>
                        <td><select className="form-input" value={editRole} onChange={e => setEditRole(e.target.value)} style={{ padding: "6px 10px" }}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Administrator</option></select></td>
                        <td><select className="form-input" value={editInst} onChange={e => { setEditInst(e.target.value); setEditDept(""); setEditSem(""); setEditSec(""); }} style={{ padding: "6px 10px" }}><option value="">None (Global Admin)</option>{institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></td>
                        <td>
                          {editRole === "student" && <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <select className="form-input" value={editDept} onChange={e => { setEditDept(e.target.value); setEditSem(""); setEditSec(""); }} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Dept</option>{editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                            <select className="form-input" value={editSem} onChange={e => { setEditSem(e.target.value); setEditSec(""); }} disabled={!editDept} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Sem</option>{editSems.map(s => <option key={s.id} value={s.id}>{s.number}</option>)}</select>
                            <select className="form-input" value={editSec} onChange={e => setEditSec(e.target.value)} disabled={!editSem} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Sec</option>{editSecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                          </div>}
                          {editRole === "teacher" && <select className="form-input" value={editDept} onChange={e => setEditDept(e.target.value)} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Dept</option>{editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
                          {editRole === "admin" && <span style={{ color: "var(--text-muted)" }}>—</span>}
                        </td>
                        <td><select className="form-input" value={editIsActive ? "active" : "disabled"} onChange={e => setEditIsActive(e.target.value === "active")} style={{ padding: "6px 10px" }}><option value="active">Active</option><option value="disabled">Disabled</option></select></td>
                        <td><select className="form-input" value={editIsEmailVerified ? "verified" : "pending"} onChange={e => setEditIsEmailVerified(e.target.value === "verified")} style={{ padding: "6px 10px" }}><option value="verified">Verified</option><option value="pending">Pending OTP</option></select></td>
                        <td><div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 120 }}>
                          <button onClick={() => handleSaveEdit(u.id)} disabled={loading} className="btn-primary" style={{ padding: "6px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }} title="Confirm Changes">
                            <Check size={13} /> {loading ? "Saving…" : "Confirm Changes"}
                          </button>
                          <button onClick={() => setEditingId(null)} disabled={loading} className="btn-secondary" style={{ padding: "5px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }} title="Cancel">
                            <X size={13} /> Cancel
                          </button>
                        </div></td>
                      </>
                    ) : (
                      <>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.email}</div>
                          {u.registration_number && (
                            <div style={{ fontSize: 11, color: "var(--cyan)", marginTop: 2, fontFamily: "monospace" }}>
                              Reg: {u.registration_number}
                            </div>
                          )}
                        </td>
                        <td>{roleBadge(u.role)}</td>
                        <td style={{ fontSize: 13 }}>{u.institution_name || <span style={{ color: "var(--text-muted)" }}>Global Admin</span>}</td>
                        <td>
                          {u.role === "student" ? <div style={{ fontSize: 12, color: "var(--text-secondary)" }}><div>Dept: {u.department_name || "—"}</div><div>Sem: {u.semester_number || "—"}</div><div>Sec: {u.section_name || "—"}</div></div>
                           : u.role === "teacher" ? <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Dept: {u.department_name || "—"}</div>
                           : <span style={{ color: "var(--text-muted)" }}>—</span>}
                        </td>
                        <td><span className={`badge ${u.is_active ? "badge-good" : "badge-defaulter"}`}>{u.is_active ? "Active" : "Disabled"}</span></td>
                        <td>
                          <span className={`badge ${u.is_email_verified ? "badge-good" : "badge-defaulter"}`}>
                            {u.is_email_verified ? "Verified" : "Pending OTP"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => {
                              setEditingId(u.id);
                              setEditEmail(u.email);
                              setEditRole(u.role);
                              const instId = u.institution || u.computed_institution || "";
                              const deptId = u.department || u.computed_department || "";
                              const semId = u.computed_semester || "";
                              const secId = u.section || "";
                              setEditInst(instId ? String(instId) : "");
                              setEditDept(deptId ? String(deptId) : "");
                              setEditSem(semId ? String(semId) : "");
                              setEditSec(secId ? String(secId) : "");
                              setEditIsActive(u.is_active);
                              setEditPassword("");
                              setEditRegNum(u.registration_number || "");
                              setEditIsEmailVerified(u.is_email_verified);
                            }} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }}><Edit size={12} /> Edit</button>
                            <button onClick={() => handleDelete(u.id)} className="btn-danger" style={{ padding: "6px 12px", fontSize: 13 }}><Trash size={12} /> Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan="7" style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === "onboarding" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* REGISTER NEW USER */}
          <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(79,142,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserPlus size={20} color="var(--emerald)" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Register Individual User</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Create an account directly</p>
              </div>
            </div>
            
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label>Email</label><input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@mit.edu" required /></div>
                <div><label>Registration Number</label><input type="text" className="form-input" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} placeholder="e.g. CS-2026-105" /></div>
                <div><label>Password</label><input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="password123" required /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label>Role</label>
                  <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div><label>Institution</label>
                  <select className="form-input" value={selectedInst} onChange={e => setSelectedInst(e.target.value)} disabled={!user?.is_superuser}>
                    {user?.is_superuser ? (
                      <>
                        <option value="">-- Global (No Institution) --</option>
                        {institutions.map(i => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
                      </>
                    ) : (
                      institutions.filter(i => i.id === user.institution).map(i => (
                        <option key={i.id} value={String(i.id)}>{i.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              {role === "student" && (
                <div style={{ background: "rgba(255,255,255,0.04)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                  {selectedInst && departments.length === 0 && (
                    <div className="alert alert-warning" style={{ marginBottom: 10 }}><AlertTriangle size={14} />No departments yet. Set up hierarchy first.</div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div><label>Dept</label>
                      <select className="form-input" value={selectedDept} onChange={e => setSelectedDept(e.target.value)} disabled={!departments.length}>
                        <option value="">Select</option>
                        {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                      </select>
                    </div>
                    <div><label>Semester</label>
                      <select className="form-input" value={selectedSem} onChange={e => setSelectedSem(e.target.value)} disabled={!selectedDept || !semesters.length}>
                        <option value="">Select</option>
                        {semesters.map(s => <option key={s.id} value={String(s.id)}>Sem {s.number}</option>)}
                      </select>
                    </div>
                    <div><label>Section</label>
                      <select className="form-input" value={selectedSec} onChange={e => setSelectedSec(e.target.value)} disabled={!selectedSem || !sections.length}>
                        <option value="">Select</option>
                        {sections.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {role === "teacher" && (
                <div><label>Department</label>
                  <select className="form-input" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                    <option value="">-- Select Department --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="btn-primary" disabled={loading}><Plus size={15} /> Register User</button>
              </div>
            </form>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* BULK GENERATE */}
            <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(129,140,248,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={20} color="var(--cyan)" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Bulk Generator</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Auto-create student accounts</p>
                </div>
              </div>
              
              {bulkSuccessMsg && <div className="alert alert-success" style={{ marginBottom: 12 }}>{bulkSuccessMsg}</div>}
              {bulkError && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{bulkError}</div>}
              
              <form onSubmit={handleBulkGenerate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label>Inst</label><select className="form-input" value={bulkInst} onChange={e => setBulkInst(e.target.value)}><option value="">--</option>{institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                  <div><label>Dept</label><select className="form-input" value={bulkDept} onChange={e => setBulkDept(e.target.value)} disabled={!bulkInst}><option value="">--</option>{bulkDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label>Sem</label><select className="form-input" value={bulkSem} onChange={e => setBulkSem(e.target.value)} disabled={!bulkDept}><option value="">--</option>{bulkSems.map(s => <option key={s.id} value={s.id}>{s.number}</option>)}</select></div>
                  <div><label>Sec</label><select className="form-input" value={bulkSec} onChange={e => setBulkSec(e.target.value)} disabled={!bulkSem}><option value="">--</option>{bulkSecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label>Prefix</label><input type="text" className="form-input" value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value)} placeholder="std_" required /></div>
                  <div><label>Count</label><input type="number" className="form-input" min="1" max="100" value={bulkCount} onChange={e => setBulkCount(e.target.value)} required /></div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button type="submit" className="btn-primary" disabled={bulkLoading || !bulkSec}>{bulkLoading ? "Generating…" : "Generate"}</button>
                </div>
              </form>

              {generatedAccounts.length > 0 && (
                <div style={{ marginTop: 20, padding: 20, background: "rgba(79,142,247,0.06)", border: "1px solid rgba(79,142,247,0.25)", borderRadius: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 style={{ margin: 0, color: "var(--emerald)", display: "flex", alignItems: "center", gap: 8 }}>
                      <Check size={18} /> Generated Credentials ({generatedAccounts.length})
                    </h4>
                    <button className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }} onClick={downloadCredentialsAsCSV}>
                      <Download size={14} /> Download CSV
                    </button>
                  </div>
                  <div className="table-container" style={{ maxHeight: 260, overflowY: "auto" }}>
                    <table>
                      <thead><tr><th>Email</th><th>Password</th></tr></thead>
                      <tbody>
                        {generatedAccounts.map((acc, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{acc.email}</td>
                            <td><code style={{ background: "rgba(79,142,247,0.08)", color: "var(--emerald)", padding: "2px 7px", borderRadius: 5, fontSize: 12 }}>{acc.password}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* BATCH IMPORT EXCEL */}
            <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(79,142,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileSpreadsheet size={20} color="var(--emerald)" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Excel / CSV Import</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Import accounts from file</p>
                </div>
              </div>
              <ExcelImportPanel user={user} onImportComplete={fetchUsers} />
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger" style={{ marginTop: 16 }}>{error}</div>}
    </div>
  );
}
