import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, UserPlus, Edit, Trash, Check, X, ArrowUpDown, Filter, Download, AlertTriangle, Users } from "lucide-react";
import AccordionSection from "../AccordionSection";

export default function UsersPanel({ user }) {
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [courses, setCourses] = useState([]);

  // Creation form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
  const [sortBy, setSortBy] = useState("email");

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editEmail, setEditEmail] = useState("");
  const [editPassword, setEditPassword] = useState("");
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
        institution: selectedInst ? parseInt(selectedInst) : null,
        department: (role === "student" || role === "teacher") && selectedDept ? parseInt(selectedDept) : null,
        section: role === "student" && selectedSec ? parseInt(selectedSec) : null
      });
      setEmail(""); setPassword("");
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
        institution: editInst ? parseInt(editInst) : null,
        department: (editRole === "student" || editRole === "teacher") && editDept ? parseInt(editDept) : null,
        section: editRole === "student" && editSec ? parseInt(editSec) : null,
        is_active: editIsActive
      };
      if (editPassword.trim()) payload.password = editPassword.trim();
      await API.put(`/admin/users/${id}/`, payload);
      setEditingId(null); fetchUsers();
    } catch (err) { setError(err.response?.data?.error || "Failed to save user modifications"); }
    finally { setLoading(false); }
  };

  const filteredUsers = users.filter(u => universityFilter === "all" || u.institution === parseInt(universityFilter) || u.institution_name === institutions.find(i => i.id === parseInt(universityFilter))?.name);
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === "email") return a.email.localeCompare(b.email);
    if (sortBy === "role") return a.role.localeCompare(b.role);
    if (sortBy === "university") return (a.institution_name || "").localeCompare(b.institution_name || "");
    if (sortBy === "status") return a.is_active === b.is_active ? 0 : a.is_active ? -1 : 1;
    return 0;
  });

  const roleBadge = (r) => {
    if (r === "admin") return <span className="badge badge-purple">Admin</span>;
    if (r === "teacher") return <span className="badge badge-info">Teacher</span>;
    return <span className="badge badge-good">Student</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── SECTION 1: USER DIRECTORY ── */}
      <AccordionSection
        title="User Directory"
        subtitle={`(${sortedUsers.length} users)`}
        icon={<Users size={18} color="var(--purple)" />}
        iconBg="rgba(123,97,255,0.15)"
        defaultOpen={true}
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Filter size={14} color="var(--text-muted)" />
                <select className="form-input" value={universityFilter} onChange={e => setUniversityFilter(e.target.value)} style={{ width: "auto", padding: "7px 32px 7px 12px" }}>
                  <option value="all">All Universities</option>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <ArrowUpDown size={14} color="var(--text-muted)" />
                <select className="form-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: "auto", padding: "7px 32px 7px 12px" }}>
                  <option value="email">Sort by Email</option>
                  <option value="role">Sort by Role</option>
                  <option value="university">Sort by University</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead><tr><th>Email</th><th>Role</th><th>Institution</th><th>Dept / Sem / Sec</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {sortedUsers.map(u => (
                  <tr key={u.id}>
                    {editingId === u.id ? (
                      <>
                        <td><input type="email" className="form-input" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ padding: "6px 10px", marginBottom: 4 }} /><input type="password" className="form-input" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="New password (optional)" style={{ padding: "5px 10px", fontSize: 12 }} /></td>
                        <td><select className="form-input" value={editRole} onChange={e => setEditRole(e.target.value)} style={{ padding: "6px 10px" }}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Administrator</option></select></td>
                        <td><select className="form-input" value={editInst} onChange={e => setEditInst(e.target.value)} style={{ padding: "6px 10px" }}><option value="">None (Global Admin)</option>{institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></td>
                        <td>
                          {editRole === "student" && <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <select className="form-input" value={editDept} onChange={e => setEditDept(e.target.value)} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Dept</option>{editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                            <select className="form-input" value={editSem} onChange={e => setEditSem(e.target.value)} disabled={!editDept} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Sem</option>{editSems.map(s => <option key={s.id} value={s.id}>{s.number}</option>)}</select>
                            <select className="form-input" value={editSec} onChange={e => setEditSec(e.target.value)} disabled={!editSem} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Sec</option>{editSecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                          </div>}
                          {editRole === "teacher" && <select className="form-input" value={editDept} onChange={e => setEditDept(e.target.value)} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Dept</option>{editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
                          {editRole === "admin" && <span style={{ color: "var(--text-muted)" }}>—</span>}
                        </td>
                        <td><select className="form-input" value={editIsActive ? "active" : "disabled"} onChange={e => setEditIsActive(e.target.value === "active")} style={{ padding: "6px 10px" }}><option value="active">Active</option><option value="disabled">Disabled</option></select></td>
                        <td><div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => handleSaveEdit(u.id)} className="btn-primary" style={{ padding: "7px 10px" }}><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: "7px 10px" }}><X size={14} /></button>
                        </div></td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{u.email}</td>
                        <td>{roleBadge(u.role)}</td>
                        <td style={{ fontSize: 13 }}>{u.institution_name || <span style={{ color: "var(--text-muted)" }}>Global Admin</span>}</td>
                        <td>
                          {u.role === "student" ? <div style={{ fontSize: 12, color: "var(--text-secondary)" }}><div>Dept: {u.department_name || "—"}</div><div>Sem: {u.semester_number || "—"}</div><div>Sec: {u.section_name || "—"}</div></div>
                           : u.role === "teacher" ? <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Dept: {u.department_name || "—"}</div>
                           : <span style={{ color: "var(--text-muted)" }}>—</span>}
                        </td>
                        <td><span className={`badge ${u.is_active ? "badge-good" : "badge-defaulter"}`}>{u.is_active ? "Active" : "Disabled"}</span></td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setEditingId(u.id); setEditEmail(u.email); setEditRole(u.role); setEditInst(u.institution || ""); setEditDept(u.department || ""); setEditSem(u.semester || ""); setEditSec(u.section || ""); setEditIsActive(u.is_active); setEditPassword(""); }} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }}><Edit size={12} /> Edit</button>
                            <button onClick={() => handleDelete(u.id)} className="btn-danger" style={{ padding: "6px 12px", fontSize: 13 }}><Trash size={12} /> Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan="6" style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </AccordionSection>

      {/* ── SECTION 2: REGISTER NEW USER ACCOUNT ── */}
      <AccordionSection
        title="Register New User Account"
        icon={<UserPlus size={18} color="var(--emerald)" />}
        iconBg="rgba(57,217,138,0.15)"
        defaultOpen={false}
      >
        <div style={{ marginTop: 16 }}>
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>Email</label><input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@mit.edu" required /></div>
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
      </AccordionSection>

      {/* ── SECTION 3: BULK GENERATE STUDENTS ── */}
      <AccordionSection
        title="Bulk Generate Student Accounts"
        icon={<Plus size={18} color="var(--cyan)" />}
        iconBg="rgba(46,230,255,0.15)"
        defaultOpen={false}
      >
        <div style={{ marginTop: 16 }}>
          {bulkSuccessMsg && <div className="alert alert-success" style={{ marginBottom: 12 }}>{bulkSuccessMsg}</div>}
          {bulkError && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{bulkError}</div>}
          <form onSubmit={handleBulkGenerate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>Institution</label>
                <select className="form-input" value={bulkInst} onChange={e => setBulkInst(e.target.value)}>
                  <option value="">-- Select --</option>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div><label>Department</label>
                <select className="form-input" value={bulkDept} onChange={e => setBulkDept(e.target.value)} disabled={!bulkInst}>
                  <option value="">-- Select --</option>
                  {bulkDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>Semester</label>
                <select className="form-input" value={bulkSem} onChange={e => setBulkSem(e.target.value)} disabled={!bulkDept}>
                  <option value="">-- Select --</option>
                  {bulkSems.map(s => <option key={s.id} value={s.id}>{s.number}</option>)}
                </select>
              </div>
              <div><label>Section</label>
                <select className="form-input" value={bulkSec} onChange={e => setBulkSec(e.target.value)} disabled={!bulkSem}>
                  <option value="">-- Select --</option>
                  {bulkSecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>Username Prefix</label><input type="text" className="form-input" value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value)} placeholder="std_" required /></div>
              <div><label>Password (Optional)</label><input type="text" className="form-input" value={bulkPassword} onChange={e => setBulkPassword(e.target.value)} placeholder="Leave blank to auto-generate" /></div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>Auto-Enroll Course</label>
                <select className="form-input" value={bulkCourse} onChange={e => setBulkCourse(e.target.value)}>
                  <option value="">-- None --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div><label>Student Count</label><input type="number" className="form-input" min="1" max="100" value={bulkCount} onChange={e => setBulkCount(e.target.value)} required /></div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn-primary" disabled={bulkLoading || !bulkSec}>
                {bulkLoading ? "Generating…" : "Generate Accounts"}
              </button>
            </div>
          </form>

          {/* Generated credentials table */}
          {generatedAccounts.length > 0 && (
            <div style={{ marginTop: 20, padding: 20, background: "rgba(57,217,138,0.06)", border: "1px solid rgba(57,217,138,0.25)", borderRadius: 12 }}>
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
                  <thead><tr><th>Email</th><th>Password</th><th>Department</th><th>Semester</th><th>Section</th><th>Enrolled Course</th></tr></thead>
                  <tbody>
                    {generatedAccounts.map((acc, idx) => (
                      <tr key={idx}>
                        <td style={{ fontWeight: 600 }}>{acc.email}</td>
                        <td><code style={{ background: "rgba(57,217,138,0.08)", color: "var(--emerald)", padding: "2px 7px", borderRadius: 5, fontSize: 12, border: "1px solid rgba(57,217,138,0.2)" }}>{acc.password}</code></td>
                        <td>{acc.department_name}</td>
                        <td>{acc.semester_number}</td>
                        <td>{acc.section_name}</td>
                        <td>{acc.enrolled_course || "None"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </AccordionSection>

      {error && <div className="alert alert-danger">{error}</div>}
    </div>
  );
}
