import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, BookOpen, UserCheck, Edit, Trash, Check, X, ArrowUpDown, ArrowLeft, ArrowRight } from "lucide-react";
import AccordionSection from "../AccordionSection";


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

export default function CoursesPanel({ user }) {
  const [activeView, setActiveView] = React.useState("grid");
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);

  // Create form
  const [name, setName] = useState("");
  const [selectedInst, setSelectedInst] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedSec, setSelectedSec] = useState("");
  const [selectedTeacherId, setSelectedTeacherId] = useState("");

  // Manual enroll
  const [enrollCourse, setEnrollCourse] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Edit
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editInst, setEditInst] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editSem, setEditSem] = useState("");
  const [editSec, setEditSec] = useState("");
  const [editTeacherId, setEditTeacherId] = useState("");
  const [editDepts, setEditDepts] = useState([]);
  const [editSems, setEditSems] = useState([]);
  const [editSecs, setEditSecs] = useState([]);

  const [sortField, setSortField] = useState("name");
  const [sortDesc, setSortDesc] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchCourses(); fetchInitialData(); }, []);

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

  // Edit cascades
  useEffect(() => { if (editInst) { API.get(`/admin/departments/?institution=${editInst}`).then(r => setEditDepts(r.data.results || r.data)); } else setEditDepts([]); }, [editInst]);
  useEffect(() => { if (editDept) { API.get(`/admin/semesters/?department=${editDept}`).then(r => setEditSems(r.data.results || r.data)); } else setEditSems([]); }, [editDept]);
  useEffect(() => { if (editSem) { API.get(`/admin/sections/?semester=${editSem}`).then(r => setEditSecs(r.data.results || r.data)); } else setEditSecs([]); }, [editSem]);

  const fetchInitialData = async () => {
    try {
      const ri = await API.get("/admin/institutions/");
      const insts = ri.data.results || ri.data;
      setInstitutions(insts);
      if (insts.length > 0) {
        if (!user?.is_superuser && user?.institution) {
          setSelectedInst(String(user.institution));
        } else {
          setSelectedInst(String(insts[0].id));
        }
      }
      const rt = await API.get("/admin/users/?role=teacher");
      setTeachers(rt.data.results || rt.data);
      const rs = await API.get("/admin/users/?role=student");
      setStudents(rs.data.results || rs.data);
    } catch { setError("Failed to load users list"); }
  };

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const res = await API.get("/admin/courses/");
      const data = res.data.results || res.data;
      setCourses(data);
      if (data.length > 0) setEnrollCourse(String(data[0].id));
    } catch { setError("Failed to fetch courses list"); }
    finally { setLoading(false); }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const payload = {
        name,
        institution: parseInt(selectedInst),
        department: selectedDept ? parseInt(selectedDept) : null,
        section: selectedSec ? parseInt(selectedSec) : null
      };
      if (selectedTeacherId) payload.teacher_ids = [parseInt(selectedTeacherId)];
      await API.post("/admin/courses/", payload);
      setName(""); setSelectedTeacherId("");
      fetchCourses();
    } catch (err) { setError(err.response?.data?.error || "Error creating course"); }
    finally { setLoading(false); }
  };

  const handleManualEnroll = async (e) => {
    e.preventDefault(); if (!enrollCourse || !selectedStudentId) return;
    setError(""); setLoading(true);
    try {
      await API.post("/admin/enrollments/", {
        student: parseInt(selectedStudentId),
        course: parseInt(enrollCourse)
      });
      setSelectedStudentId("");
      fetchCourses();
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0] || "";
      setError(msg.includes("unique set") ? "Student already enrolled in this course." : "Failed to enroll: " + (msg || "Unknown error"));
    } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this course and all associated enrollments/attendance?")) return;
    try { await API.delete(`/admin/courses/${id}/`); fetchCourses(); }
    catch { setError("Failed to delete course"); }
  };

  const handleSaveEdit = async (id) => {
    setError(""); setLoading(true);
    try {
      const payload = {
        name: editName,
        institution: parseInt(editInst),
        department: editDept ? parseInt(editDept) : null,
        section: editSec ? parseInt(editSec) : null
      };
      if (editTeacherId) payload.teacher_ids = [parseInt(editTeacherId)];
      await API.put(`/admin/courses/${id}/`, payload);
      setEditingId(null); fetchCourses();
    } catch (err) { setError(err.response?.data?.error || "Failed to save course changes"); }
    finally { setLoading(false); }
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDesc(!sortDesc);
    } else {
      setSortField(field);
      setSortDesc(false);
    }
  };

  const sortedCourses = [...courses].sort((a, b) => {
    if (sortField === "institution") {
      const instA = a.institution?.name || "";
      const instB = b.institution?.name || "";
      let cmp = instA.localeCompare(instB);
      if (cmp === 0) {
        const deptA = a.department?.name || "";
        const deptB = b.department?.name || "";
        cmp = deptA.localeCompare(deptB);
        if (cmp === 0) {
          const semA = String(a.section?.semester_number ?? "");
          const semB = String(b.section?.semester_number ?? "");
          cmp = semA.localeCompare(semB);
          if (cmp === 0) {
            const secA = a.section?.name || "";
            const secB = b.section?.name || "";
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
    else if (valA < valB) cmp = -1;
    else if (valA > valB) cmp = 1;
    
    return sortDesc ? -cmp : cmp;
  });

  const SortIndicator = ({ field }) => {
    if (sortField !== field) return null;
    return <span style={{ marginLeft: 4 }}>{sortDesc ? "↓" : "↑"}</span>;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {activeView === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <DashboardActionCard 
            icon={BookOpen} 
            color="var(--purple)" 
            title="Manage Courses" 
            description="View, edit, and organize all academic courses."
            stats={[
              { label: "Total Courses", value: courses.length }
            ]}
            buttonText="View Courses"
            onClick={() => setActiveView("directory")}
          />
          <DashboardActionCard 
            icon={UserCheck} 
            color="var(--emerald)" 
            title="Course Tools" 
            description="Create new courses and manage manual student enrollments."
            buttonText="Open Tools"
            onClick={() => setActiveView("tools")}
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
              <BookOpen size={20} color="var(--purple)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Course List & Enrollments</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{sortedCourses.length} courses total</p>
            </div>
          </div>
          
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort("name")} style={{ cursor: "pointer", userSelect: "none" }}>Course Title <SortIndicator field="name" /></th>
                  <th onClick={() => handleSort("institution")} style={{ cursor: "pointer", userSelect: "none" }}>Inst / Dept / Sem / Sec <SortIndicator field="institution" /></th>
                  <th>Instructors</th>
                  <th onClick={() => handleSort("enrollment_count")} style={{ cursor: "pointer", userSelect: "none" }}>Enrolled <SortIndicator field="enrollment_count" /></th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {sortedCourses.map(c => (
                  <tr key={c.id}>
                    {editingId === c.id ? (
                      <>
                        <td><input type="text" className="form-input" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: "6px 10px" }} /></td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <select className="form-input" value={editInst} onChange={e => { setEditInst(e.target.value); setEditDept(""); setEditSem(""); setEditSec(""); }} disabled={!user?.is_superuser} style={{ padding: "5px 10px", fontSize: 12 }}>
                              <option value="">Inst</option>
                              {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                            </select>
                            <select className="form-input" value={editDept} onChange={e => { setEditDept(e.target.value); setEditSem(""); setEditSec(""); }} disabled={!editInst} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Dept</option>{editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                            <select className="form-input" value={editSem} onChange={e => { setEditSem(e.target.value); setEditSec(""); }} disabled={!editDept} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Sem</option>{editSems.map(s => <option key={s.id} value={s.id}>{s.number}</option>)}</select>
                            <select className="form-input" value={editSec} onChange={e => setEditSec(e.target.value)} disabled={!editSem} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Sec</option>{editSecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                          </div>
                        </td>
                        <td>
                          <select className="form-input" value={editTeacherId} onChange={e => setEditTeacherId(e.target.value)} style={{ padding: "6px 10px" }}>
                            <option value="">No Instructor</option>
                            {teachers.map(t => <option key={t.id} value={String(t.id)}>{t.email}</option>)}
                          </select>
                        </td>
                        <td>{c.enrollment_count} studs</td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => handleSaveEdit(c.id)} className="btn-primary" style={{ padding: "7px 10px" }}><Check size={14} /></button>
                            <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: "7px 10px" }}><X size={14} /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={{ fontWeight: 600 }}>{c.name}</td>
                        <td style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          <div>Inst: {c.institution?.name}</div>
                          <div>Dept: {c.department?.name || "—"}</div>
                          <div>Sem: {c.section?.semester_number || "—"} | Sec: {c.section?.name || "—"}</div>
                        </td>
                        <td>
                          {c.instructors && c.instructors.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                              {c.instructors.map(ins => (
                                <span key={ins.id} style={{ fontSize: 12, color: "var(--cyan)", fontWeight: 500 }}>{ins.email}</span>
                              ))}
                            </div>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: 12 }}>Unassigned</span>
                          )}
                        </td>
                        <td>
                          <span className="badge badge-good" style={{ padding: "4px 8px" }}>
                            {c.enrollment_count} Enrolled
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setEditingId(c.id); setEditName(c.name); setEditInst(c.institution?.id ? String(c.institution.id) : ""); setEditDept(c.department?.id ? String(c.department.id) : ""); setEditSem(c.section?.semester ? String(c.section.semester) : ""); setEditSec(c.section?.id ? String(c.section.id) : ""); setEditTeacherId(c.instructors?.[0]?.id ? String(c.instructors[0].id) : ""); }} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }}><Edit size={12} /> Edit</button>
                            <button onClick={() => handleDelete(c.id)} className="btn-danger" style={{ padding: "6px 12px", fontSize: 13 }}><Trash size={12} /> Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {courses.length === 0 && <tr><td colSpan="5" style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>No courses found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === "tools" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* CREATE COURSE */}
          <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(79,142,247,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Plus size={20} color="var(--emerald)" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Create New Academic Course</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Set up a new course in the hierarchy</p>
              </div>
            </div>
            
            <form onSubmit={handleCreateCourse} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label>Course Title</label><input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="CS101 - Programming" required /></div>
                <div><label>Institution</label>
                  <select className="form-input" value={selectedInst} onChange={e => setSelectedInst(e.target.value)} disabled={!user?.is_superuser}>
                    {user?.is_superuser ? (
                      institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                    ) : (
                      institutions.filter(i => i.id === user?.institution).map(i => <option key={i.id} value={i.id}>{i.name}</option>)
                    )}
                  </select>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, background: "rgba(255,255,255,0.04)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                <div><label>Dept</label>
                  <select className="form-input" value={selectedDept} onChange={e => setSelectedDept(e.target.value)} required>
                    <option value="">Select</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div><label>Semester</label>
                  <select className="form-input" value={selectedSem} onChange={e => setSelectedSem(e.target.value)} disabled={!selectedDept}>
                    <option value="">Select</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>{s.number}</option>)}
                  </select>
                </div>
                <div><label>Section</label>
                  <select className="form-input" value={selectedSec} onChange={e => setSelectedSec(e.target.value)} disabled={!selectedSem}>
                    <option value="">Select</option>
                    {sections.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div><label>Assign Teacher</label>
                <select className="form-input" value={selectedTeacherId} onChange={e => setSelectedTeacherId(e.target.value)}>
                  <option value="">-- Select Instructor --</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.email}</option>)}
                </select>
              </div>
              <button type="submit" className="btn-primary" style={{ justifyContent: "center" }} disabled={loading}><Plus size={15} /> Create Course</button>
            </form>
          </div>

          {/* MANUAL ENROLLMENT */}
          <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(129,140,248,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserCheck size={20} color="var(--cyan)" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Manual Student Enrollment</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Add students to existing courses</p>
              </div>
            </div>
            
            <form onSubmit={handleManualEnroll} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label>Target Course</label>
                  <select className="form-input" value={enrollCourse} onChange={e => setEnrollCourse(e.target.value)}>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><label>Select Student</label>
                  <select className="form-input" value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} required>
                    <option value="">-- Select Student --</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.email}</option>)}
                  </select>
                </div>
              </div>
              <button type="submit" className="btn-primary" style={{ justifyContent: "center", marginTop: 4 }} disabled={loading}><UserCheck size={15} /> Enroll Student</button>
            </form>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger" style={{ marginTop: 16 }}>{error}</div>}
    </div>
  );
}
