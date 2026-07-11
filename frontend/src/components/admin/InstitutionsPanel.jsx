import React, { useState, useEffect, useCallback } from "react";
import API from "../../services/api";
import { Plus, School, Edit, Trash, Check, X, ChevronDown, ChevronRight, BookOpen, Layers, Layout } from "lucide-react";

// ─── Reusable inline editor ────────────────────────────────────────────────
function InlineEdit({ value, onChange, onSave, onCancel, placeholder }) {
  return (
    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
      <input
        type="text"
        className="form-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ padding: "5px 10px", fontSize: "0.85rem" }}
        autoFocus
      />
      <button onClick={onSave} className="btn-primary" style={{ padding: "5px 9px" }}>
        <Check size={13} />
      </button>
      <button onClick={onCancel} className="btn-secondary" style={{ padding: "5px 9px" }}>
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Section row ─────────────────────────────────────────────────────────────
function SectionRow({ section, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(section.name);

  const save = async () => {
    await onEdit(section.id, val);
    setEditing(false);
  };

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 12px", background: "rgba(255,255,255,0.02)", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.04)" }}>
      {editing ? (
        <InlineEdit value={val} onChange={setVal} onSave={save} onCancel={() => { setVal(section.name); setEditing(false); }} placeholder="Section name" />
      ) : (
        <span style={{ fontSize: "0.85rem", color: "#d1d5db" }}>{section.name}</span>
      )}
      {!editing && (
        <div style={{ display: "flex", gap: "4px" }}>
          <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: "4px 8px", fontSize: "0.75rem" }}>
            <Edit size={11} />
          </button>
          <button onClick={() => onDelete(section.id)} className="btn-secondary" style={{ padding: "4px 8px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>
            <Trash size={11} />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Semester block ───────────────────────────────────────────────────────────
function SemesterBlock({ semester, onDeleteSemester, onEditSemester }) {
  const [open, setOpen] = useState(false);
  const [sections, setSections] = useState([]);
  const [newSectionName, setNewSectionName] = useState("");
  const [addingSection, setAddingSection] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(String(semester.number));

  const loadSections = useCallback(async () => {
    const res = await API.get(`/admin/sections/?semester=${semester.id}`);
    setSections(res.data.results || res.data);
  }, [semester.id]);

  useEffect(() => {
    if (open) loadSections();
  }, [open, loadSections]);

  const addSection = async () => {
    if (!newSectionName.trim()) return;
    await API.post("/admin/sections/", { name: newSectionName.trim(), semester: semester.id });
    setNewSectionName("");
    setAddingSection(false);
    loadSections();
  };

  const deleteSection = async (id) => {
    if (!window.confirm("Delete this section and all its students/attendance?")) return;
    await API.delete(`/admin/sections/${id}/`);
    loadSections();
  };

  const editSection = async (id, name) => {
    await API.patch(`/admin/sections/${id}/`, { name });
    loadSections();
  };

  const saveSemesterEdit = async () => {
    await onEditSemester(semester.id, parseInt(editVal));
    setEditing(false);
  };

  return (
    <div style={{ marginBottom: "8px", border: "1px solid rgba(99,102,241,0.15)", borderRadius: "10px", overflow: "hidden" }}>
      {/* Semester header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(99,102,241,0.08)", cursor: "pointer" }} onClick={() => !editing && setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {open ? <ChevronDown size={14} color="#6366f1" /> : <ChevronRight size={14} color="#6366f1" />}
          {editing ? (
            <InlineEdit
              value={editVal}
              onChange={setEditVal}
              onSave={saveSemesterEdit}
              onCancel={() => { setEditVal(String(semester.number)); setEditing(false); }}
              placeholder="Semester number"
            />
          ) : (
            <span style={{ fontWeight: "600", fontSize: "0.85rem", color: "#a5b4fc" }}>
              Semester {semester.number}
            </span>
          )}
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: "3px 7px", fontSize: "0.75rem" }}>
              <Edit size={11} />
            </button>
            <button onClick={() => onDeleteSemester(semester.id)} className="btn-secondary" style={{ padding: "3px 7px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>
              <Trash size={11} />
            </button>
          </div>
        )}
      </div>

      {/* Sections */}
      {open && (
        <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "6px", background: "rgba(0,0,0,0.15)" }}>
          {sections.length === 0 && !addingSection && (
            <p style={{ color: "#6b7280", fontSize: "0.8rem", margin: "0 0 6px 0" }}>No sections yet.</p>
          )}
          {sections.map((sec) => (
            <SectionRow key={sec.id} section={sec} onDelete={deleteSection} onEdit={editSection} />
          ))}

          {addingSection ? (
            <div style={{ display: "flex", gap: "6px", marginTop: "4px" }}>
              <input
                className="form-input"
                value={newSectionName}
                onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSection()}
                placeholder="e.g. Section A"
                style={{ padding: "6px 10px", fontSize: "0.82rem" }}
                autoFocus
              />
              <button onClick={addSection} className="btn-primary" style={{ padding: "5px 10px", whiteSpace: "nowrap", fontSize: "0.8rem" }}>Add</button>
              <button onClick={() => { setAddingSection(false); setNewSectionName(""); }} className="btn-secondary" style={{ padding: "5px 9px" }}><X size={13} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingSection(true)} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "5px", padding: "5px 10px", fontSize: "0.78rem", alignSelf: "flex-start", marginTop: "4px" }}>
              <Plus size={12} /> Add Section
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Department block ─────────────────────────────────────────────────────────
function DepartmentBlock({ dept, onDeleteDept, onEditDept }) {
  const [open, setOpen] = useState(false);
  const [semesters, setSemesters] = useState([]);
  const [addingSem, setAddingSem] = useState(false);
  const [newSemNum, setNewSemNum] = useState("");
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(dept.name);

  const loadSemesters = useCallback(async () => {
    const res = await API.get(`/admin/semesters/?department=${dept.id}`);
    setSemesters(res.data.results || res.data);
  }, [dept.id]);

  useEffect(() => {
    if (open) loadSemesters();
  }, [open, loadSemesters]);

  const addSemester = async () => {
    const num = parseInt(newSemNum);
    if (!num || num < 1) return;
    await API.post("/admin/semesters/", { number: num, department: dept.id });
    setNewSemNum("");
    setAddingSem(false);
    loadSemesters();
  };

  const deleteSemester = async (id) => {
    if (!window.confirm("Delete this semester and all its sections?")) return;
    await API.delete(`/admin/semesters/${id}/`);
    loadSemesters();
  };

  const editSemester = async (id, number) => {
    await API.patch(`/admin/semesters/${id}/`, { number });
    loadSemesters();
  };

  const saveDeptEdit = async () => {
    await onEditDept(dept.id, editVal);
    setEditing(false);
  };

  return (
    <div style={{ marginBottom: "10px", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "12px", overflow: "hidden" }}>
      {/* Department header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(16,185,129,0.08)", cursor: "pointer" }} onClick={() => !editing && setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {open ? <ChevronDown size={15} color="#10b981" /> : <ChevronRight size={15} color="#10b981" />}
          <BookOpen size={14} color="#10b981" />
          {editing ? (
            <InlineEdit
              value={editVal}
              onChange={setEditVal}
              onSave={saveDeptEdit}
              onCancel={() => { setEditVal(dept.name); setEditing(false); }}
              placeholder="Department name"
            />
          ) : (
            <span style={{ fontWeight: "600", fontSize: "0.9rem" }}>{dept.name}</span>
          )}
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: "4px" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: "4px 8px" }}>
              <Edit size={12} />
            </button>
            <button onClick={() => onDeleteDept(dept.id)} className="btn-secondary" style={{ padding: "4px 8px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)" }}>
              <Trash size={12} />
            </button>
          </div>
        )}
      </div>

      {/* Semesters */}
      {open && (
        <div style={{ padding: "14px", background: "rgba(0,0,0,0.1)" }}>
          {semesters.length === 0 && !addingSem && (
            <p style={{ color: "#6b7280", fontSize: "0.82rem", margin: "0 0 8px 0" }}>No semesters yet. Add one below.</p>
          )}
          {semesters.map((sem) => (
            <SemesterBlock key={sem.id} semester={sem} onDeleteSemester={deleteSemester} onEditSemester={editSemester} />
          ))}

          {addingSem ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
              <input
                type="number"
                className="form-input"
                value={newSemNum}
                onChange={(e) => setNewSemNum(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSemester()}
                placeholder="Semester number (e.g. 1)"
                style={{ padding: "7px 12px", fontSize: "0.85rem", maxWidth: "200px" }}
                autoFocus
                min={1}
              />
              <button onClick={addSemester} className="btn-primary" style={{ padding: "6px 12px", fontSize: "0.85rem" }}>Add</button>
              <button onClick={() => { setAddingSem(false); setNewSemNum(""); }} className="btn-secondary" style={{ padding: "6px 9px" }}><X size={13} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingSem(true)} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "6px 12px", fontSize: "0.82rem", marginTop: "8px" }}>
              <Plus size={13} /> Add Semester
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Institution block ────────────────────────────────────────────────────────
function InstitutionBlock({ inst, onDelete, onEdit, onRefresh }) {
  const [open, setOpen] = useState(false);
  const [depts, setDepts] = useState([]);
  const [addingDept, setAddingDept] = useState(false);
  const [newDeptName, setNewDeptName] = useState("");
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(inst.name);
  const [editSlug, setEditSlug] = useState(inst.slug);

  const loadDepts = useCallback(async () => {
    const res = await API.get(`/admin/departments/?institution=${inst.id}`);
    setDepts(res.data.results || res.data);
  }, [inst.id]);

  useEffect(() => {
    if (open) loadDepts();
  }, [open, loadDepts]);

  const addDept = async () => {
    if (!newDeptName.trim()) return;
    await API.post("/admin/departments/", { name: newDeptName.trim(), institution: inst.id });
    setNewDeptName("");
    setAddingDept(false);
    loadDepts();
  };

  const deleteDept = async (id) => {
    if (!window.confirm("Delete this department and all its semesters/sections?")) return;
    await API.delete(`/admin/departments/${id}/`);
    loadDepts();
  };

  const editDept = async (id, name) => {
    await API.patch(`/admin/departments/${id}/`, { name });
    loadDepts();
  };

  const saveInstEdit = async () => {
    await onEdit(inst.id, editName, editSlug);
    setEditing(false);
  };

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.1)", borderRadius: "14px", overflow: "hidden", marginBottom: "16px" }}>
      {/* Institution header */}
      <div
        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "rgba(255,255,255,0.04)", cursor: "pointer" }}
        onClick={() => !editing && setOpen(!open)}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {open ? <ChevronDown size={17} color="#6366f1" /> : <ChevronRight size={17} color="#6366f1" />}
          <School size={18} color="#6366f1" />
          {editing ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
              <input
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Institution name"
                style={{ padding: "6px 12px", width: "220px" }}
                autoFocus
              />
              <input
                className="form-input"
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                placeholder="slug"
                style={{ padding: "6px 12px", width: "120px" }}
              />
              <button onClick={saveInstEdit} className="btn-primary" style={{ padding: "6px 10px" }}><Check size={14} /></button>
              <button onClick={() => { setEditing(false); setEditName(inst.name); setEditSlug(inst.slug); }} className="btn-secondary" style={{ padding: "6px 10px" }}><X size={14} /></button>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: "700", fontSize: "1rem" }}>{inst.name}</div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>
                <code>{inst.slug}</code> · {inst.user_count} users · {inst.course_count} courses
              </div>
            </div>
          )}
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: "6px 10px", display: "flex", gap: "4px", alignItems: "center", fontSize: "0.82rem" }}>
              <Edit size={13} /> Edit
            </button>
            <button onClick={() => onDelete(inst.id)} className="btn-secondary" style={{ padding: "6px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)", display: "flex", gap: "4px", alignItems: "center", fontSize: "0.82rem" }}>
              <Trash size={13} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Departments */}
      {open && (
        <div style={{ padding: "16px 18px", background: "rgba(0,0,0,0.2)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
            <Layers size={14} color="#10b981" />
            <span style={{ fontSize: "0.82rem", color: "#9ca3af", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" }}>Departments</span>
          </div>

          {depts.length === 0 && !addingDept && (
            <div style={{ padding: "16px", background: "rgba(255,165,0,0.05)", border: "1px solid rgba(255,165,0,0.2)", borderRadius: "10px", marginBottom: "12px" }}>
              <p style={{ color: "#fbbf24", margin: 0, fontSize: "0.85rem" }}>
                ⚠️ No departments yet. Students cannot be registered until you add at least one department → semester → section.
              </p>
            </div>
          )}

          {depts.map((dept) => (
            <DepartmentBlock key={dept.id} dept={dept} onDeleteDept={deleteDept} onEditDept={editDept} />
          ))}

          {addingDept ? (
            <div style={{ display: "flex", gap: "8px", alignItems: "center", marginTop: "8px" }}>
              <input
                className="form-input"
                value={newDeptName}
                onChange={(e) => setNewDeptName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDept()}
                placeholder="e.g. Computer Science"
                style={{ padding: "8px 12px", fontSize: "0.88rem" }}
                autoFocus
              />
              <button onClick={addDept} className="btn-primary" style={{ padding: "7px 14px" }}>Add</button>
              <button onClick={() => { setAddingDept(false); setNewDeptName(""); }} className="btn-secondary" style={{ padding: "7px 10px" }}><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingDept(true)} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", padding: "7px 14px", fontSize: "0.85rem", marginTop: "4px" }}>
              <Plus size={14} /> Add Department
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main panel ───────────────────────────────────────────────────────────────
export default function InstitutionsPanel() {
  const [institutions, setInstitutions] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const fetchInstitutions = async () => {
    try {
      const res = await API.get("/admin/institutions/");
      const data = res.data.results || res.data;
      setInstitutions(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch {
      setError("Failed to fetch institutions");
    }
  };

  useEffect(() => { fetchInstitutions(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await API.post("/admin/institutions/", { name, slug: slug.toLowerCase() });
      setName(""); setSlug("");
      fetchInstitutions();
    } catch (err) {
      setError(err.response?.data?.slug?.[0] || err.response?.data?.name?.[0] || "Error creating institution");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id, newName, newSlug) => {
    await API.put(`/admin/institutions/${id}/`, { name: newName, slug: newSlug.toLowerCase() });
    fetchInstitutions();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Warning: Deleting this institution will delete all associated departments, courses and users. Proceed?")) return;
    try {
      await API.delete(`/admin/institutions/${id}/`);
      fetchInstitutions();
    } catch {
      alert("Error deleting institution");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Create form */}
      <div className="glass-panel" style={{ padding: "24px", maxWidth: "540px" }}>
        <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
          <School size={20} color="#6366f1" /> Create New Institution
        </h3>
        {error && <div style={{ color: "#f87171", marginBottom: "12px", fontSize: "0.9rem" }}>{error}</div>}
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", marginBottom: "6px", color: "#d1d5db", fontSize: "0.88rem", fontWeight: "500" }}>
              Institution Name
            </label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-")); }}
              placeholder="e.g. COMSATS University"
              required
            />
          </div>
          <div>
            <label style={{ display: "block", marginBottom: "6px", color: "#d1d5db", fontSize: "0.88rem", fontWeight: "500" }}>
              Slug Identifier <span style={{ color: "#6b7280", fontWeight: "400" }}>(auto-generated, used for email domains)</span>
            </label>
            <input
              type="text"
              className="form-input"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. comsats"
              required
            />
          </div>
          <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", padding: "12px" }} disabled={loading}>
            <Plus size={17} /> {loading ? "Creating..." : "Add Institution"}
          </button>
        </form>
      </div>

      {/* Institution list with hierarchy */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "20px" }}>
          <Layout size={18} color="#6366f1" />
          <h3 style={{ margin: 0 }}>Institutions & Academic Hierarchy</h3>
          <span style={{ fontSize: "0.8rem", color: "#6b7280", marginLeft: "auto" }}>Click an institution to expand and manage its departments → semesters → sections</span>
        </div>

        {institutions.length === 0 ? (
          <div style={{ textAlign: "center", color: "#6b7280", padding: "32px" }}>
            No institutions yet. Create one above.
          </div>
        ) : (
          institutions.map((inst) => (
            <InstitutionBlock
              key={inst.id}
              inst={inst}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onRefresh={fetchInstitutions}
            />
          ))
        )}
      </div>
    </div>
  );
}
