import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, UserPlus, Edit, Trash, Check, X, ArrowUpDown } from "lucide-react";

export default function UsersPanel() {
  const [users, setUsers] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [selectedInst, setSelectedInst] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("email");

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("student");
  const [editInst, setEditInst] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);

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
      if (data.length > 0) setSelectedInst(data[0].id);
    } catch (err) {
      setError("Failed to fetch institutions");
    }
  };

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

  const sortedUsers = [...users].sort((a, b) => {
    if (sortBy === "email") return a.email.localeCompare(b.email);
    if (sortBy === "role") return a.role.localeCompare(b.role);
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
        <form onSubmit={handleRegister} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr auto", gap: "16px", alignItems: "end" }}>
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
          <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px" }} disabled={loading}>
            <Plus size={16} /> Register
          </button>
        </form>
      </div>

      {/* Directory listing */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>User Directory</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ArrowUpDown size={16} color="#9ca3af" />
            <select className="form-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "6px 12px", width: "auto", appearance: "auto" }}>
              <option value="email">Sort by Email</option>
              <option value="role">Sort by Role</option>
              <option value="status">Sort by Status</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Email Address</th>
                <th>System Role</th>
                <th>Linked Tenant</th>
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
                        <select className="form-input" value={editIsActive ? "active" : "disabled"} onChange={(e) => setEditIsActive(e.target.value === "active")} style={{ padding: "6px 12px", appearance: "auto" }}>
                          <option value="active">Active</option>
                          <option value="disabled">Disabled</option>
                        </select>
                      </td>
                      <td style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => handleSaveEdit(u.id)} className="btn-primary" style={{ padding: "6px 10px", background: "#22c55e" }}><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: "6px 10px" }}><X size={14} /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: "600" }}>{u.email}</td>
                      <td><code style={{ textTransform: "capitalize" }}>{u.role}</code></td>
                      <td>
                        {u.institution ? (
                          institutions.find(i => i.id === u.institution)?.name || `ID: ${u.institution}`
                        ) : (
                          "Global Admin"
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
