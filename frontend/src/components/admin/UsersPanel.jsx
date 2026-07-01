import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, UserPlus, Edit, Trash, Check, X, ArrowUpDown, Filter } from "lucide-react";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);

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
        setSelectedInst(data[0].id);
      }
    } catch (err) {
      setError("Failed to fetch institutions");
    }
  };

  // Fetch cascading dropdowns for Registration Form
  useEffect(() => {
    if (!selectedInst || role === "admin") {
      setDepartments([]);
      return;
    }
    API.get(`/admin/departments/?institution=${selectedInst}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setDepartments(data);
        if (data.length > 0) {
          setSelectedDept(data[0].id);
        } else {
          setSelectedDept("");
        }
      })
      .catch(() => setDepartments([]));
  }, [selectedInst, role]);

  useEffect(() => {
    if (!selectedDept || role !== "student") {
      setSemesters([]);
      return;
    }
    API.get(`/admin/semesters/?department=${selectedDept}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setSemesters(data);
        if (data.length > 0) {
          setSelectedSem(data[0].id);
        } else {
          setSelectedSem("");
        }
      })
      .catch(() => setSemesters([]));
  }, [selectedDept, role]);

  useEffect(() => {
    if (!selectedSem || role !== "student") {
      setSections([]);
      return;
    }
    API.get(`/admin/sections/?semester=${selectedSem}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setSections(data);
        if (data.length > 0) {
          setSelectedSec(data[0].id);
        } else {
          setSelectedSec("");
        }
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

  useEffect(() => {
    fetchUsers();
    fetchInstitutions();
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
        department: role === "student" && selectedDept ? selectedDept : null,
        semester: role === "student" && selectedSem ? selectedSem : null,
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
        department: editRole === "student" && editDept ? editDept : null,
        semester: editRole === "student" && editSem ? editSem : null,
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

  // Filter users by University
  const filteredUsers = users.filter((u) => {
    if (universityFilter === "all") return true;
    return u.institution === parseInt(universityFilter);
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
      {/* Registration Panel */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
          <UserPlus size={20} color="#6366f1" /> Add User Account
        </h3>
        {error && <div style={{ color: "#f87171", marginBottom: "12px", fontSize: "0.9rem" }}>{error}</div>}
        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "20px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Email Address</label>
              <input type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@mit.edu" required />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Password</label>
              <input type="password" className="form-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password123" required />
            </div>
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
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Cascading dropdown hierarchy parameters (only display for students) */}
          {role === "student" && (
            <div className="animate-fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "20px", background: "rgba(255,255,255,0.01)", padding: "16px", borderRadius: "12px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Department</label>
                <select className="form-input" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} style={{ appearance: "auto" }}>
                  <option value="">-- Select Department --</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Semester</label>
                <select className="form-input" value={selectedSem} onChange={(e) => setSelectedSem(e.target.value)} disabled={!selectedDept} style={{ appearance: "auto" }}>
                  <option value="">-- Select Semester --</option>
                  {semesters.map((sem) => (
                    <option key={sem.id} value={sem.id}>{sem.number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Section</label>
                <select className="form-input" value={selectedSec} onChange={(e) => setSelectedSec(e.target.value)} disabled={!selectedSem} style={{ appearance: "auto" }}>
                  <option value="">-- Select Section --</option>
                  {sections.map((sec) => (
                    <option key={sec.id} value={sec.id}>{sec.name}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }} disabled={loading}>
              <Plus size={16} /> Register
            </button>
          </div>
        </form>
      </div>

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
                        {editRole === "student" ? (
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
                        ) : (
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
