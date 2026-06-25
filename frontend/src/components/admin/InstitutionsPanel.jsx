import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, School, Edit, Trash, Check, X, ArrowUpDown } from "lucide-react";

export default function InstitutionsPanel() {
  const [institutions, setInstitutions] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name");

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");

  const fetchInstitutions = async () => {
    try {
      const res = await API.get("/admin/institutions/");
      setInstitutions(res.data.results || res.data);
    } catch (err) {
      setError("Failed to fetch institutions");
    }
  };

  useEffect(() => {
    fetchInstitutions();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const payload = { name, slug: slug.toLowerCase() };
      await API.post("/admin/institutions/", payload);
      setName("");
      setSlug("");
      fetchInstitutions();
    } catch (err) {
      setError(err.response?.data?.slug?.[0] || "Error creating institution");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id) => {
    try {
      await API.put(`/admin/institutions/${id}/`, {
        name: editName,
        slug: editSlug.toLowerCase()
      });
      setEditingId(null);
      fetchInstitutions();
    } catch (err) {
      alert("Error updating institution info");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Warning: Deleting this institution will delete all associated courses and users. Proceed?")) return;
    try {
      await API.delete(`/admin/institutions/${id}/`);
      fetchInstitutions();
    } catch (err) {
      alert("Error deleting institution");
    }
  };

  const sortedInstitutions = [...institutions].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "slug") return a.slug.localeCompare(b.slug);
    if (sortBy === "users") return b.user_count - a.user_count;
    return 0;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Create form */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
          <School size={20} color="#6366f1" /> Create Institution
        </h3>
        {error && <div style={{ color: "#f87171", marginBottom: "12px", fontSize: "0.9rem" }}>{error}</div>}
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "20px", maxWidth: "500px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#d1d5db", fontSize: "0.9rem", fontWeight: "500" }}>
              Institution Name
            </label>
            <input 
              type="text" 
              className="form-input" 
              value={name} 
              onChange={(e) => {
                setName(e.target.value);
                setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-"));
              }} 
              placeholder="e.g. Massachusetts Institute of Technology" 
              required 
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: "8px", color: "#d1d5db", fontSize: "0.9rem", fontWeight: "500" }}>
              Slug Identifier (Auto-generated)
            </label>
            <input 
              type="text" 
              className="form-input" 
              value={slug} 
              onChange={(e) => setSlug(e.target.value)} 
              placeholder="e.g. mit" 
              required 
            />
          </div>

          <button 
            type="submit" 
            className="btn-primary" 
            style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", width: "100%", marginTop: "8px", padding: "14px" }} 
            disabled={loading}
          >
            <Plus size={18} /> Add New Institution
          </button>
        </form>
      </div>

      {/* Directory listing */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>Active Universities & Tenant Groups</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ArrowUpDown size={16} color="#9ca3af" />
            <select className="form-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "6px 12px", width: "auto", appearance: "auto" }}>
              <option value="name">Sort by Name</option>
              <option value="slug">Sort by Slug</option>
              <option value="users">Sort by User Count</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Institution Name</th>
                <th>Slug Identifier</th>
                <th>Users</th>
                <th>Courses</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedInstitutions.map((inst) => (
                <tr key={inst.id}>
                  {editingId === inst.id ? (
                    <>
                      <td>
                        <input type="text" className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ padding: "6px 12px" }} />
                      </td>
                      <td>
                        <input type="text" className="form-input" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} style={{ padding: "6px 12px" }} />
                      </td>
                      <td>{inst.user_count}</td>
                      <td>{inst.course_count}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => handleSaveEdit(inst.id)} className="btn-primary" style={{ padding: "6px 10px", background: "#22c55e" }}><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: "6px 10px" }}><X size={14} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: "600" }}>{inst.name}</td>
                      <td><code>{inst.slug}</code></td>
                      <td>{inst.user_count}</td>
                      <td>{inst.course_count}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => {
                            setEditingId(inst.id);
                            setEditName(inst.name);
                            setEditSlug(inst.slug);
                          }} className="btn-secondary" style={{ padding: "6px 10px", display: "flex", gap: "4px", alignItems: "center" }}>
                            <Edit size={12} /> Edit
                          </button>
                          <button onClick={() => handleDelete(inst.id)} className="btn-secondary" style={{ padding: "6px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)", display: "flex", gap: "4px", alignItems: "center" }}>
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
