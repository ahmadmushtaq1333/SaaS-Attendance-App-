import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, BookOpen, UserCheck, Edit, Trash, Check, X, ArrowUpDown } from "lucide-react";
import AccordionSection from "../AccordionSection";

export default function CoursesPanel({ user }) {
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

  const [sortBy, setSortBy] = useState("name");
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

  const sortedCourses = [...courses].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "enrollments") return b.enrollment_count - a.enrollment_count;
    return 0;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

      {/* ── SECTION 1: COURSE LIST ── */}
      <AccordionSection
        title="Course List & Enrollments"
        subtitle={`(${sortedCourses.length} courses)`}
        icon={<BookOpen size={18} color="var(--purple)" />}
        iconBg="rgba(123,97,255,0.15)"
        defaultOpen={true}
      >
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center", gap: 12, marginBottom: 18 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <ArrowUpDown size={14} color="var(--text-muted)" />
              <select className="form-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: "auto", padding: "7px 32px 7px 12px" }}>
                <option value="name">Sort by Name</option>
                <option value="enrollments">Sort by Enrollments</option>
              </select>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Course Title</th>
                  <th>Institution / Dept / Sec</th>
                  <th>Instructors</th>
                  <th>Enrolled</th>
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
                            <select className="form-input" value={editDept} onChange={e => setEditDept(e.target.value)} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Dept</option>{editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                            <select className="form-input" value={editSem} onChange={e => setEditSem(e.target.value)} disabled={!editDept} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Sem</option>{editSems.map(s => <option key={s.id} value={s.id}>{s.number}</option>)}</select>
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
                          <div>Inst: {c.institution_name}</div>
                          <div>Dept: {c.department_name || "—"}</div>
                          <div>Sec: {c.section_name || "—"}</div>
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
                            <button onClick={() => { setEditingId(c.id); setEditName(c.name); setEditInst(c.institution || ""); setEditDept(c.department || ""); setEditSem(c.semester || ""); setEditSec(c.section || ""); setEditTeacherId(c.instructors?.[0]?.id || ""); }} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }}><Edit size={12} /> Edit</button>
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
      </AccordionSection>

      {/* ── SECTION 2: CREATE ACADEMIC COURSE ── */}
      <AccordionSection
        title="Create New Academic Course"
        icon={<Plus size={18} color="var(--emerald)" />}
        iconBg="rgba(57,217,138,0.15)"
        defaultOpen={false}
      >
        <div style={{ marginTop: 16 }}>
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
      </AccordionSection>

      {/* ── SECTION 3: MANUAL STUDENT ENROLLMENT ── */}
      <AccordionSection
        title="Manual Student Enrollment"
        icon={<UserCheck size={18} color="var(--cyan)" />}
        iconBg="rgba(46,230,255,0.15)"
        defaultOpen={false}
      >
        <div style={{ marginTop: 16 }}>
          <form onSubmit={handleManualEnroll} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
            <button type="submit" className="btn-primary" style={{ justifyContent: "center", marginTop: 4 }} disabled={loading}><UserCheck size={15} /> Enroll Student</button>
          </form>
        </div>
      </AccordionSection>

      {error && <div className="alert alert-danger">{error}</div>}
    </div>
  );
}
