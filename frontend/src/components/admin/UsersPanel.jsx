import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, UserPlus, Edit, Trash, Check, X, ArrowUpDown, Filter, Download } from "lucide-react";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  const [courses, setCourses] = useState([]);

  // Form Registration State
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [selectedInst, setSelectedInst] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedSec, setSelectedSec] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("email");
  const [universityFilter, setUniversityFilter] = useState("all");

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("student");
  const [editInst, setEditInst] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editSem, setEditSem] = useState("");
  const [editSec, setEditSec] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

  // Editing cascades
  const [editDepts, setEditDepts] = useState([]);
  const [editSems, setEditSems] = useState([]);
  const [editSecs, setEditSecs] = useState([]);

  // Bulk generation state
  const [bulkInst, setBulkInst] = useState("");
  const [bulkDept, setBulkDept] = useState("");
  const [bulkSem, setBulkSem] = useState("");
  const [bulkSec, setBulkSec] = useState("");
  const [bulkCourse, setBulkCourse] = useState("");
  const [bulkCount, setBulkCount] = useState(10);
  const [bulkPrefix, setBulkPrefix] = useState("std_");
  const [bulkPassword, setBulkPassword] = useState("");
  const [bulkDepts, setBulkDepts] = useState([]);
  const [bulkSems, setBulkSems] = useState([]);
  const [bulkSecs, setBulkSecs] = useState([]);
  const [generatedAccounts, setGeneratedAccounts] = useState([]);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkError, setBulkError] = useState("");
  const [bulkSuccessMsg, setBulkSuccessMsg] = useState("");

  const fetchUsers = async () => {
    try {
      const res = await API.get("/admin/users/");
      setUsers(res.data.results || res.data);
    } catch (err) {
      setError("Failed to fetch users");
    }
  };

  const fetchInstitutions = async () => {
    try {
      const res = await API.get("/admin/institutions/");
      const data = res.data.results || res.data;
      setInstitutions(data);
      if (data.length > 0) {
        setSelectedInst(String(data[0].id));
        setBulkInst(String(data[0].id));
      }
    } catch (err) {
      setError("Failed to fetch institutions");
    }
  };

  const fetchCourses = async () => {
    try {
      const res = await API.get("/admin/courses/");
      setCourses(res.data.results || res.data);
    } catch (err) {
      console.error("Failed to fetch courses", err);
    }
  };

  // Fetch cascading dropdowns for Registration Form
  useEffect(() => {
    // Reset dependents whenever institution changes
    setSelectedDept("");
    setSelectedSem("");
    setSelectedSec("");
    setSemesters([]);
    setSections([]);
    if (!selectedInst || role === "admin") {
      setDepartments([]);
      return;
    }
    API.get(`/admin/departments/?institution=${selectedInst}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setDepartments(data);
        // Do NOT auto-select — let the user choose explicitly
      })
      .catch(() => setDepartments([]));
  }, [selectedInst, role]);

  useEffect(() => {
    setSelectedSem("");
    setSelectedSec("");
    setSections([]);
    if (!selectedDept || role !== "student") {
      setSemesters([]);
      return;
    }
    API.get(`/admin/semesters/?department=${selectedDept}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setSemesters(data);
      })
      .catch(() => setSemesters([]));
  }, [selectedDept, role]);

  useEffect(() => {
    setSelectedSec("");
    if (!selectedSem || role !== "student") {
      setSections([]);
      return;
    }
    API.get(`/admin/sections/?semester=${selectedSem}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setSections(data);
      })
      .catch(() => setSections([]));
  }, [selectedSem, role]);

  // Fetch cascading dropdowns for Editing Form
  useEffect(() => {
    if (!editInst || editRole === "admin") {
      setEditDepts([]);
      return;
    }
    API.get(`/admin/departments/?institution=${editInst}`)
      .then((res) => {
        setEditDepts(res.data.results || res.data);
      })
      .catch(() => setEditDepts([]));
  }, [editInst, editRole]);

  useEffect(() => {
    if (!editDept || editRole !== "student") {
      setEditSems([]);
      return;
    }
    API.get(`/admin/semesters/?department=${editDept}`)
      .then((res) => {
        setEditSems(res.data.results || res.data);
      })
      .catch(() => setEditSems([]));
  }, [editDept, editRole]);

  useEffect(() => {
    if (!editSem || editRole !== "student") {
      setEditSecs([]);
      return;
    }
    API.get(`/admin/sections/?semester=${editSem}`)
      .then((res) => {
        setEditSecs(res.data.results || res.data);
      })
      .catch(() => setEditSecs([]));
  }, [editSem, editRole]);

  // Fetch cascading dropdowns for Bulk Generation Form
  useEffect(() => {
    if (!bulkInst) {
      setBulkDepts([]);
      return;
    }
    API.get(`/admin/departments/?institution=${bulkInst}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setBulkDepts(data);
        if (data.length > 0) {
          setBulkDept(data[0].id);
        } else {
          setBulkDept("");
        }
      })
      .catch(() => setBulkDepts([]));
  }, [bulkInst]);

  useEffect(() => {
    if (!bulkDept) {
      setBulkSems([]);
      return;
    }
    API.get(`/admin/semesters/?department=${bulkDept}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setBulkSems(data);
        if (data.length > 0) {
          setBulkSem(data[0].id);
        } else {
          setBulkSem("");
        }
      })
      .catch(() => setBulkSems([]));
  }, [bulkDept]);

  useEffect(() => {
    if (!bulkSem) {
      setBulkSecs([]);
      return;
    }
    API.get(`/admin/sections/?semester=${bulkSem}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setBulkSecs(data);
        if (data.length > 0) {
          setBulkSec(data[0].id);
        } else {
          setBulkSec("");
        }
      })
      .catch(() => setBulkSecs([]));
  }, [bulkSem]);

  useEffect(() => {
    fetchUsers();
    fetchInstitutions();
    fetchCourses();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = {
        email,
        password,
        role,
        institution: role === "admin" ? null : selectedInst,
        department: role === "teacher" && selectedDept ? selectedDept : null,
        section: role === "student" && selectedSec ? selectedSec : null,
        is_active: true
      };
      await API.post("/admin/users/", payload);
      setEmail("");
      setPassword("");
      fetchUsers();
    } catch (err) {
      setError(err.response?.data?.email?.[0] || "Error creating user profile");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      const payload = {
        email: editEmail,
        role: editRole,
        institution: editRole === "admin" ? null : editInst,
        department: editRole === "teacher" && editDept ? editDept : null,
        section: editRole === "student" && editSec ? editSec : null,
        is_active: editIsActive
      };
      await API.put(`/admin/users/${id}/`, payload);
      setEditingId(null);
      fetchUsers();
    } catch (err) {
      alert("Error updating user details");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this user account?")) return;
    try {
      await API.delete(`/admin/users/${id}/`);
      fetchUsers();
    } catch (err) {
      alert("Error deleting user account");
    }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    setBulkError("");
    setBulkSuccessMsg("");
    setGeneratedAccounts([]);
    setBulkLoading(true);
    try {
      const payload = {
        section_id: bulkSec,
        count: parseInt(bulkCount),
        prefix: bulkPrefix,
        course_id: bulkCourse || null,
        password: bulkPassword || null
      };
      const res = await API.post("/admin/users/bulk-generate/", payload);
      setGeneratedAccounts(res.data.users || []);
      setBulkSuccessMsg(res.data.message || "Successfully generated student credentials.");
      setBulkPassword("");
      fetchUsers();
    } catch (err) {
      setBulkError(err.response?.data?.error || "Error generating student credentials.");
    } finally {
      setBulkLoading(false);
    }
  };

  const downloadCredentialsAsCSV = () => {
    if (generatedAccounts.length === 0) return;
    const headers = ["Email Address", "Password", "Role", "Section", "Semester", "Department", "Enrolled Course"];
    const rows = generatedAccounts.map(u => [
      u.email,
      u.password,
      u.role,
      u.section_name,
      u.semester_number,
      u.department_name,
      u.enrolled_course || "None"
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `student_credentials_section_${bulkSec}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter users by University
  const filteredUsers = users.filter((u) => {
    if (universityFilter === "all") return true;
    return u.institution === parseInt(universityFilter) || (u.role === "student" && u.institution_name === institutions.find(i => i.id === parseInt(universityFilter))?.name);
  });

  // Sort users
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    if (sortBy === "email") return a.email.localeCompare(b.email);
    if (sortBy === "role") return a.role.localeCompare(b.role);
    if (sortBy === "university") {
      const uA = a.institution_name || "";
      const uB = b.institution_name || "";
      return uA.localeCompare(uB);
    }
    if (sortBy === "status") return (a.is_active === b.is_active) ? 0 : a.is_active ? -1 : 1;
    return 0;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Registration Panel */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <UserPlus size={20} color="#6366f1" /> Add User Account
          </h3>
          {error && <div style={{ color: "#f87171", marginBottom: "12px", fontSize: "0.9rem" }}>{error}</div>}
          <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Email Address</label>
                <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@mit.edu" required />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Password</label>
                <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password123" required />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>System Role</label>
                <select className="form-input" value={role} onChange={(e) => setRole(e.target.value)} style={{ appearance: "auto" }}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Institution (Tenant)</label>
                <select className="form-input" value={selectedInst} onChange={(e) => setSelectedInst(e.target.value)} disabled={role === "admin"} style={{ appearance: "auto" }}>
                  <option value="">-- Select Institution --</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={String(inst.id)}>{inst.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Cascading dropdown hierarchy parameters (only display for student/teacher) */}
            {role === "student" && (
              <div className="animate-fade-in" style={{ display: "flex", flexDirection: "column", gap: "12px", background: "rgba(255,255,255,0.01)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                {selectedInst && departments.length === 0 && (
                  <div style={{ padding: "10px 14px", background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.25)", borderRadius: "8px", color: "#fbbf24", fontSize: "0.83rem" }}>
                    ⚠️ This institution has no departments set up yet. Go to the <strong>Institutions</strong> tab and expand this institution to add departments → semesters → sections first.
                  </div>
                )}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Department</label>
                    <select className="form-input" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} disabled={departments.length === 0} style={{ appearance: "auto" }}>
                      <option value="">-- Select --</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={String(dept.id)}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Semester</label>
                    <select className="form-input" value={selectedSem} onChange={(e) => setSelectedSem(e.target.value)} disabled={!selectedDept || semesters.length === 0} style={{ appearance: "auto" }}>
                      <option value="">-- Select --</option>
                      {semesters.map((sem) => (
                        <option key={sem.id} value={String(sem.id)}>Semester {sem.number}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Section</label>
                    <select className="form-input" value={selectedSec} onChange={(e) => setSelectedSec(e.target.value)} disabled={!selectedSem || sections.length === 0} style={{ appearance: "auto" }}>
                      <option value="">-- Select --</option>
                      {sections.map((sec) => (
                        <option key={sec.id} value={String(sec.id)}>{sec.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {role === "teacher" && (
              <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr", gap: "12px", background: "rgba(255,255,255,0.01)", padding: "12px", borderRadius: "10px", border: "1px solid rgba(255,255,255,0.05)" }}>
                <div>
                  <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Department</label>
                  <select className="form-input" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ appearance: "auto" }}>
                    <option value="">-- Select Department --</option>
                    {departments.map((dept) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }} disabled={loading}>
                <Plus size={16} /> Register User
              </button>
            </div>
          </form>
        </div>

        {/* Bulk User Generation Panel */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <UserPlus size={20} color="#10b981" /> Bulk Generate Students
          </h3>
          {bulkSuccessMsg && <div style={{ color: "#34d399", marginBottom: "12px", fontSize: "0.9rem" }}>{bulkSuccessMsg}</div>}
          {bulkError && <div style={{ color: "#f87171", marginBottom: "12px", fontSize: "0.9rem" }}>{bulkError}</div>}
          
          <form onSubmit={handleBulkGenerate} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Institution</label>
                <select className="form-input" value={bulkInst} onChange={(e) => setBulkInst(e.target.value)} style={{ appearance: "auto" }}>
                  <option value="">-- Select Institution --</option>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Department</label>
                <select className="form-input" value={bulkDept} onChange={(e) => setBulkDept(e.target.value)} disabled={!bulkInst} style={{ appearance: "auto" }}>
                  <option value="">-- Select Department --</option>
                  {bulkDepts.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Semester</label>
                <select className="form-input" value={bulkSem} onChange={(e) => setBulkSem(e.target.value)} disabled={!bulkDept} style={{ appearance: "auto" }}>
                  <option value="">-- Select Semester --</option>
                  {bulkSems.map((s) => (
                    <option key={s.id} value={s.id}>{s.number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Section</label>
                <select className="form-input" value={bulkSec} onChange={(e) => setBulkSec(e.target.value)} disabled={!bulkSem} style={{ appearance: "auto" }}>
                  <option value="">-- Select Section --</option>
                  {bulkSecs.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Username Prefix</label>
                <input type="text" className="form-input" value={bulkPrefix} onChange={(e) => setBulkPrefix(e.target.value)} placeholder="std_" required />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Common Password (Optional)</label>
                <input type="text" className="form-input" value={bulkPassword} onChange={(e) => setBulkPassword(e.target.value)} placeholder="Leave blank to auto-generate" />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Auto-Enroll to Course (Optional)</label>
                <select className="form-input" value={bulkCourse} onChange={(e) => setBulkCourse(e.target.value)} style={{ appearance: "auto" }}>
                  <option value="">-- None (No Auto-Enrollment) --</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Student Count</label>
                <input type="number" className="form-input" min="1" max="100" value={bulkCount} onChange={(e) => setBulkCount(e.target.value)} required />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
              <button type="submit" className="btn-primary" style={{ background: "#10b981", borderColor: "#10b981", display: "flex", alignItems: "center", gap: "6px" }} disabled={bulkLoading || !bulkSec}>
                {bulkLoading ? "Generating..." : "Generate Accounts"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Generated Accounts Carried over */}
      {generatedAccounts.length > 0 && (
        <div className="glass-panel" style={{ padding: "24px", borderColor: "rgba(16,185,129,0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h4 style={{ margin: 0, color: "#34d399", display: "flex", alignItems: "center", gap: "8px" }}>
              <Check size={18} /> Generated Student Credentials ({generatedAccounts.length})
            </h4>
            <button className="btn-primary" style={{ background: "#10b981", borderColor: "#10b981", padding: "6px 12px", display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }} onClick={downloadCredentialsAsCSV}>
              <Download size={14} /> Download Credentials CSV
            </button>
          </div>
          <div className="table-container" style={{ maxHeight: "250px", overflowY: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Email Address</th>
                  <th>Generated Password</th>
                  <th>Department</th>
                  <th>Semester</th>
                  <th>Section</th>
                  <th>Auto-Enrolled Course</th>
                </tr>
              </thead>
              <tbody>
                {generatedAccounts.map((acc, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: "600" }}>{acc.email}</td>
                    <td><code style={{ background: "rgba(255,255,255,0.08)", padding: "2px 6px", borderRadius: "4px", color: "#34d399" }}>{acc.password}</code></td>
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

      {/* Directory listing */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
          <h3 style={{ margin: 0 }}>User Directory</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            {/* University Filter Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Filter size={16} color="#9ca3af" />
              <select className="form-input" value={universityFilter} onChange={(e) => setUniversityFilter(e.target.value)} style={{ padding: "6px 12px", width: "auto", appearance: "auto" }}>
                <option value="all">All Universities</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>

            {/* Sorting options */}
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <ArrowUpDown size={16} color="#9ca3af" />
              <select className="form-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "6px 12px", width: "auto", appearance: "auto" }}>
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
            <thead>
              <tr>
                <th>Email Address</th>
                <th>Role</th>
                <th>Tenant University</th>
                <th>Department / Sem / Sec</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedUsers.map((u) => (
                <tr key={u.id}>
                  {editingId === u.id ? (
                    <>
                      <td>
                        <input type="email" className="form-input" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ padding: "6px 12px" }} />
                      </td>
                      <td>
                        <select className="form-input" value={editRole} onChange={(e) => setEditRole(e.target.value)} style={{ padding: "6px 12px", appearance: "auto" }}>
                          <option value="student">Student</option>
                          <option value="teacher">Teacher</option>
                          <option value="admin">Administrator</option>
                        </select>
                      </td>
                      <td>
                        <select className="form-input" value={editInst} onChange={(e) => setEditInst(e.target.value)} disabled={editRole === "admin"} style={{ padding: "6px 12px", appearance: "auto" }}>
                          <option value="">None (Admin Only)</option>
                          {institutions.map((inst) => (
                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                          ))}
                        </select>
                      </td>
                      <td>
                        {editRole === "student" && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <select className="form-input" value={editDept} onChange={(e) => setEditDept(e.target.value)} style={{ padding: "4px 8px", fontSize: "0.85rem", appearance: "auto" }}>
                              <option value="">Select Dept</option>
                              {editDepts.map((d) => (
                                <option key={d.id} value={d.id}>{d.name}</option>
                              ))}
                            </select>
                            <select className="form-input" value={editSem} onChange={(e) => setEditSem(e.target.value)} disabled={!editDept} style={{ padding: "4px 8px", fontSize: "0.85rem", appearance: "auto" }}>
                              <option value="">Select Sem</option>
                              {editSems.map((s) => (
                                <option key={s.id} value={s.id}>{s.number}</option>
                              ))}
                            </select>
                            <select className="form-input" value={editSec} onChange={(e) => setEditSec(e.target.value)} disabled={!editSem} style={{ padding: "4px 8px", fontSize: "0.85rem", appearance: "auto" }}>
                              <option value="">Select Sec</option>
                              {editSecs.map((sc) => (
                                <option key={sc.id} value={sc.id}>{sc.name}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {editRole === "teacher" && (
                          <select className="form-input" value={editDept} onChange={(e) => setEditDept(e.target.value)} style={{ padding: "4px 8px", fontSize: "0.85rem", appearance: "auto" }}>
                            <option value="">Select Dept</option>
                            {editDepts.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        )}
                        {editRole === "admin" && (
                          <span style={{ color: "#9ca3af" }}>N/A</span>
                        )}
                      </td>
                      <td>
                        <select className="form-input" value={editIsActive ? "active" : "disabled"} onChange={(e) => setEditIsActive(e.target.value === "active")} style={{ padding: "6px 12px", appearance: "auto" }}>
                          <option value="active">Active</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => handleSaveEdit(u.id)} className="btn-primary" style={{ padding: "6px 10px", background: "#22c55e" }}><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: "6px 10px" }}><X size={14} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: "600" }}>{u.email}</td>
                      <td><code style={{ textTransform: "capitalize" }}>{u.role}</code></td>
                      <td>{u.institution_name || "Global Admin"}</td>
                      <td>
                        {u.role === "student" ? (
                          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                            <div><strong>Dept:</strong> {u.department_name || "None"}</div>
                            <div><strong>Sem:</strong> {u.semester_number || "None"}</div>
                            <div><strong>Sec:</strong> {u.section_name || "None"}</div>
                          </div>
                        ) : u.role === "teacher" ? (
                          <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                            <div><strong>Dept:</strong> {u.department_name || "None"}</div>
                          </div>
                        ) : (
                          <span style={{ color: "#4b5563" }}>—</span>
                        )}
                      </td>
                      <td>
                        {u.is_active ? (
                          <span className="badge-good">Active</span>
                        ) : (
                          <span className="badge-defaulter">Disabled</span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => {
                            setEditingId(u.id);
                            setEditEmail(u.email);
                            setEditRole(u.role);
                            setEditInst(u.institution || "");
                            setEditDept(u.department || "");
                            setEditSem(u.semester || "");
                            setEditSec(u.section || "");
                            setEditIsActive(u.is_active);
                          }} className="btn-secondary" style={{ padding: "6px 10px", display: "flex", gap: "4px", alignItems: "center" }}>
                            <Edit size={12} /> Edit
                          </button>
                          <button onClick={() => handleDelete(u.id)} className="btn-secondary" style={{ padding: "6px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)", display: "flex", gap: "4px", alignItems: "center" }}>
                            <Trash size={12} /> Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
