import React, { useState, useEffect, useCallback } from "react";
import API from "../../services/api";
import { Plus, School, Edit, Trash, Check, X, ChevronDown, ChevronRight, BookOpen, Layers, Layout, AlertTriangle } from "lucide-react";

/* ── Inline editor ── */
function InlineEdit({ value, onChange, onSave, onCancel, placeholder }) {
  return (
    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
      <input type="text" className="form-input" value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder} style={{ padding: "5px 10px", fontSize: 13 }} autoFocus />
      <button onClick={onSave} className="btn-primary" style={{ padding: "5px 9px" }}><Check size={13} /></button>
      <button onClick={onCancel} className="btn-secondary" style={{ padding: "5px 9px" }}><X size={13} /></button>
    </div>
  );
}

/* ── Section row ── */
function SectionRow({ section, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(section.name);
  const save = async () => { await onEdit(section.id, val); setEditing(false); };

  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "8px 12px", background: "rgba(255,255,255,0.04)",
      borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)",
    }}>
      {editing
        ? <InlineEdit value={val} onChange={setVal} onSave={save} onCancel={() => { setVal(section.name); setEditing(false); }} placeholder="Section name" />
        : <span style={{ fontSize: 13, color: "var(--text-primary)" }}>{section.name}</span>
      }
      {!editing && (
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: "4px 8px", fontSize: 12 }}><Edit size={11} /></button>
          <button onClick={() => onDelete(section.id)} className="btn-danger" style={{ padding: "4px 8px" }}><Trash size={11} /></button>
        </div>
      )}
    </div>
  );
}

/* ── Semester block ── */
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

  useEffect(() => { if (open) loadSections(); }, [open, loadSections]);

  const addSection = async () => {
    if (!newSectionName.trim()) return;
    await API.post("/admin/sections/", { name: newSectionName.trim(), semester: semester.id });
    setNewSectionName(""); setAddingSection(false); loadSections();
  };
  const deleteSection = async (id) => {
    if (!window.confirm("Delete this section?")) return;
    await API.delete(`/admin/sections/${id}/`); loadSections();
  };
  const editSection = async (id, name) => { await API.patch(`/admin/sections/${id}/`, { name }); loadSections(); };
  const saveSemesterEdit = async () => { await onEditSemester(semester.id, parseInt(editVal)); setEditing(false); };

  return (
    <div style={{ marginBottom: 8, border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", background: "rgba(255,255,255,0.05)", cursor: "pointer" }}
        onClick={() => !editing && setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {open ? <ChevronDown size={14} color="var(--emerald)" /> : <ChevronRight size={14} color="var(--emerald)" />}
          {editing
            ? <InlineEdit value={editVal} onChange={setEditVal} onSave={saveSemesterEdit} onCancel={() => { setEditVal(String(semester.number)); setEditing(false); }} placeholder="Semester number" />
            : <span style={{ fontWeight: 600, fontSize: 13 }}>Semester {semester.number}</span>
          }
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: "3px 7px" }}><Edit size={11} /></button>
            <button onClick={() => onDeleteSemester(semester.id)} className="btn-danger" style={{ padding: "3px 7px" }}><Trash size={11} /></button>
          </div>
        )}
      </div>

      {open && (
        <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 6, background: "rgba(255,255,255,0.02)" }}>
          {sections.length === 0 && !addingSection && <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "0 0 6px 0" }}>No sections yet.</p>}
          {sections.map(sec => <SectionRow key={sec.id} section={sec} onDelete={deleteSection} onEdit={editSection} />)}
          {addingSection ? (
            <div style={{ display: "flex", gap: 6, marginTop: 4 }}>
              <input className="form-input" value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSection()} placeholder="e.g. Section A" style={{ padding: "6px 10px", fontSize: 13 }} autoFocus />
              <button onClick={addSection} className="btn-primary" style={{ padding: "5px 10px", fontSize: 13 }}>Add</button>
              <button onClick={() => { setAddingSection(false); setNewSectionName(""); }} className="btn-secondary" style={{ padding: "5px 9px" }}><X size={13} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingSection(true)} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", fontSize: 12, alignSelf: "flex-start", marginTop: 4 }}>
              <Plus size={12} /> Add Section
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Department block ── */
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

  useEffect(() => { if (open) loadSemesters(); }, [open, loadSemesters]);

  const addSemester = async () => {
    const num = parseInt(newSemNum);
    if (!num || num < 1) return;
    await API.post("/admin/semesters/", { number: num, department: dept.id });
    setNewSemNum(""); setAddingSem(false); loadSemesters();
  };
  const deleteSemester = async (id) => {
    if (!window.confirm("Delete this semester and all its sections?")) return;
    await API.delete(`/admin/semesters/${id}/`); loadSemesters();
  };
  const editSemester = async (id, number) => { await API.patch(`/admin/semesters/${id}/`, { number }); loadSemesters(); };
  const saveDeptEdit = async () => { await onEditDept(dept.id, editVal); setEditing(false); };

  return (
    <div style={{ marginBottom: 10, border: "1px solid rgba(255,255,255,0.10)", borderRadius: 12, overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", background: "rgba(255,255,255,0.06)", cursor: "pointer" }}
        onClick={() => !editing && setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {open ? <ChevronDown size={15} color="var(--cyan)" /> : <ChevronRight size={15} color="var(--cyan)" />}
          <BookOpen size={14} color="var(--cyan)" />
          {editing
            ? <InlineEdit value={editVal} onChange={setEditVal} onSave={saveDeptEdit} onCancel={() => { setEditVal(dept.name); setEditing(false); }} placeholder="Department name" />
            : <span style={{ fontWeight: 600, fontSize: 14 }}>{dept.name}</span>
          }
        </div>
        {!editing && (
          <div style={{ display: "flex", gap: 4 }} onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: "4px 8px" }}><Edit size={12} /></button>
            <button onClick={() => onDeleteDept(dept.id)} className="btn-danger" style={{ padding: "4px 8px" }}><Trash size={12} /></button>
          </div>
        )}
      </div>

      {open && (
        <div style={{ padding: 14, background: "rgba(255,255,255,0.02)" }}>
          {semesters.length === 0 && !addingSem && <p style={{ color: "var(--text-muted)", fontSize: 12, margin: "0 0 8px 0" }}>No semesters yet. Add one below.</p>}
          {semesters.map(sem => <SemesterBlock key={sem.id} semester={sem} onDeleteSemester={deleteSemester} onEditSemester={editSemester} />)}
          {addingSem ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input type="number" className="form-input" value={newSemNum} onChange={(e) => setNewSemNum(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addSemester()} placeholder="Semester number" style={{ padding: "7px 12px", fontSize: 13, maxWidth: 200 }} autoFocus min={1} />
              <button onClick={addSemester} className="btn-primary" style={{ padding: "6px 12px", fontSize: 13 }}>Add</button>
              <button onClick={() => { setAddingSem(false); setNewSemNum(""); }} className="btn-secondary" style={{ padding: "6px 9px" }}><X size={13} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingSem(true)} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", fontSize: 12, marginTop: 8 }}>
              <Plus size={13} /> Add Semester
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Institution block ── */
function InstitutionBlock({ inst, onDelete, onEdit }) {
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

  useEffect(() => { if (open) loadDepts(); }, [open, loadDepts]);

  const addDept = async () => {
    if (!newDeptName.trim()) return;
    await API.post("/admin/departments/", { name: newDeptName.trim(), institution: inst.id });
    setNewDeptName(""); setAddingDept(false); loadDepts();
  };
  const deleteDept = async (id) => {
    if (!window.confirm("Delete this department?")) return;
    await API.delete(`/admin/departments/${id}/`); loadDepts();
  };
  const editDept = async (id, name) => { await API.patch(`/admin/departments/${id}/`, { name }); loadDepts(); };
  const saveInstEdit = async () => { await onEdit(inst.id, editName, editSlug); setEditing(false); };

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 14, overflow: "hidden", marginBottom: 16 }}>
      {/* Institution header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "rgba(255,255,255,0.07)", cursor: "pointer" }}
        onClick={() => !editing && setOpen(!open)}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {open ? <ChevronDown size={17} color="var(--emerald)" /> : <ChevronRight size={17} color="var(--emerald)" />}
          <School size={18} color="var(--emerald)" />
          {editing ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }} onClick={(e) => e.stopPropagation()}>
              <input className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Institution name" style={{ padding: "6px 12px", width: 220 }} autoFocus />
              <input className="form-input" value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder="slug" style={{ padding: "6px 12px", width: 120 }} />
              <button onClick={saveInstEdit} className="btn-primary" style={{ padding: "6px 10px" }}><Check size={14} /></button>
              <button onClick={() => { setEditing(false); setEditName(inst.name); setEditSlug(inst.slug); }} className="btn-secondary" style={{ padding: "6px 10px" }}><X size={14} /></button>
            </div>
          ) : (
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{inst.name}</div>
              <div style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                <code style={{ color: "var(--cyan)", fontSize: 11 }}>{inst.slug}</code> · {inst.user_count} users · {inst.course_count} courses
              </div>
            </div>
          )}
        </div>
        {!editing && (onEdit || onDelete) && (
          <div style={{ display: "flex", gap: 6 }} onClick={(e) => e.stopPropagation()}>
            {onEdit && <button onClick={() => setEditing(true)} className="btn-secondary" style={{ padding: "6px 10px", fontSize: 12 }}><Edit size={13} /> Edit</button>}
            {onDelete && <button onClick={() => onDelete(inst.id)} className="btn-danger" style={{ padding: "6px 10px", fontSize: 12 }}><Trash size={13} /> Delete</button>}
          </div>
        )}
      </div>

      {/* Departments */}
      {open && (
        <div style={{ padding: "16px 18px", background: "rgba(255,255,255,0.02)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Layers size={14} color="var(--cyan)" />
            <span style={{ fontSize: 11, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Departments</span>
          </div>

          {depts.length === 0 && !addingDept && (
            <div className="alert alert-warning" style={{ marginBottom: 12 }}>
              <AlertTriangle size={15} />
              No departments yet. Students cannot be registered until you add at least one department → semester → section.
            </div>
          )}

          {depts.map(dept => <DepartmentBlock key={dept.id} dept={dept} onDeleteDept={deleteDept} onEditDept={editDept} />)}

          {addingDept ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
              <input className="form-input" value={newDeptName} onChange={(e) => setNewDeptName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addDept()} placeholder="e.g. Computer Science" style={{ padding: "8px 12px", fontSize: 13 }} autoFocus />
              <button onClick={addDept} className="btn-primary" style={{ padding: "7px 14px" }}>Add</button>
              <button onClick={() => { setAddingDept(false); setNewDeptName(""); }} className="btn-secondary" style={{ padding: "7px 10px" }}><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setAddingDept(true)} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", fontSize: 13, marginTop: 4 }}>
              <Plus size={14} /> Add Department
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main panel ── */
export default function InstitutionsPanel({ user }) {
  const [institutions, setInstitutions] = useState([]);
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isSuper = user?.is_superuser;

  const fetchInstitutions = useCallback(async () => {
    try {
      const res = await API.get("/admin/institutions/");
      const data = res.data.results || res.data;
      setInstitutions(data.sort((a, b) => a.name.localeCompare(b.name)));
    } catch { setError("Failed to fetch institutions"); }
  }, []);

  useEffect(() => { fetchInstitutions(); }, [fetchInstitutions]);

  const handleCreate = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await API.post("/admin/institutions/", { name, slug: slug.toLowerCase() });
      setName(""); setSlug(""); fetchInstitutions();
    } catch (err) {
      setError(err.response?.data?.slug?.[0] || err.response?.data?.name?.[0] || "Error creating institution");
    } finally { setLoading(false); }
  };

  const handleEdit = async (id, newName, newSlug) => {
    await API.put(`/admin/institutions/${id}/`, { name: newName, slug: newSlug.toLowerCase() });
    fetchInstitutions();
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Warning: Deleting this institution will delete all associated departments, courses, and users. Proceed?")) return;
    try { await API.delete(`/admin/institutions/${id}/`); fetchInstitutions(); }
    catch { alert("Error deleting institution"); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Create form */}
      {isSuper && (
        <div className="glass-b" style={{ padding: 24, maxWidth: 560 }}>
          <h3 style={{ margin: "0 0 18px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <School size={18} color="var(--emerald)" /> Create New Institution
          </h3>
          {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
          <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label>Institution Name</label>
              <input type="text" className="form-input" value={name}
                onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-")); }}
                placeholder="e.g. COMSATS University" required />
            </div>
            <div>
              <label>Slug Identifier <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>(auto-generated)</span></label>
              <input type="text" className="form-input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="e.g. comsats" required />
            </div>
            <button type="submit" className="btn-primary" style={{ justifyContent: "center" }} disabled={loading}>
              <Plus size={16} /> {loading ? "Creating…" : "Add Institution"}
            </button>
          </form>
        </div>
      )}

      {/* Institution list */}
      <div className="glass-b" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <Layout size={18} color="var(--purple)" />
          <h3 style={{ margin: 0 }}>Institutions &amp; Academic Hierarchy</h3>
          <span style={{ fontSize: 12, color: "var(--text-muted)", marginLeft: "auto" }}>Click to expand departments</span>
        </div>

        {institutions.length === 0 ? (
          <p className="text-meta" style={{ textAlign: "center", padding: "32px 0" }}>No institutions yet. Create one above.</p>
        ) : (
          institutions.map(inst => (
            <InstitutionBlock 
              key={inst.id} 
              inst={inst} 
              onDelete={isSuper ? handleDelete : null} 
              onEdit={isSuper ? handleEdit : null} 
            />
          ))
        )}
      </div>
    </div>
  );
}
