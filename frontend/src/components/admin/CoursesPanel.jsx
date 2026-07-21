import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, BookOpen, UserCheck, Edit, Trash, Check, X, ArrowUpDown } from "lucide-react";

export default function CoursesPanel() {
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
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState("");
  const [editDepts, setEditDepts] = useState([]);
  const [editSems, setEditSems] = useState([]);
  const [editSecs, setEditSecs] = useState([]);

  const [sortBy, setSortBy] = useState("name");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => { fetchCourses(); fetchInstitutions(); }, []);

  // Creation cascades (auto-selecting first item to ensure default option is pre-populated)
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

  const fetchCourses = async () => {
    try {
      const res = await API.get("/admin/courses/");
      const data = res.data.results || res.data;
      setCourses(data);
      if (data.length > 0) setEnrollCourse(String(data[0].id));
    } catch { setError("Failed to fetch courses"); }
  };

  const fetchInstitutions = async () => {
    try {
      const res = await API.get("/admin/institutions/");
      const insts = res.data.results || res.data;
      setInstitutions(insts);
      if (insts.length > 0) setSelectedInst(String(insts[0].id));

      const usersRes = await API.get("/admin/users/");
      const all = usersRes.data.results || usersRes.data;
      const tList = all.filter(u => u.role === "teacher");
      const sList = all.filter(u => u.role === "student");
      setTeachers(tList);
      setStudents(sList);
      if (tList.length > 0) setSelectedTeacherId(String(tList[0].id));
      if (sList.length > 0) setSelectedStudentId(String(sList[0].id));
    } catch { setError("Failed to fetch user directory"); }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      const payload = {
        name,
        institution: parseInt(selectedInst),
        department: selectedDept ? parseInt(selectedDept) : null,
        section: selectedSec ? parseInt(selectedSec) : null,
        teacher_ids: selectedTeacherId ? [parseInt(selectedTeacherId)] : []
      };
      await API.post("/admin/courses/", payload);
      setName("");
      fetchCourses();
    } catch (err) { setError(err.response?.data?.error || err.response?.data?.detail || "Error creating academic course"); }
    finally { setLoading(false); }
  };

  const handleManualEnroll = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try {
      await API.post("/admin/enrollments/", {
        course: parseInt(enrollCourse),
        student: parseInt(selectedStudentId)
      });
      fetchCourses();
      alert("Student enrolled successfully!");
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0] || err.response?.data?.detail || "Failed to enroll student";
      setError(msg.includes("unique set") ? "Student is already enrolled in this course." : msg);
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
      if (editTeacherId) {
        payload.teacher_ids = [parseInt(editTeacherId)];
      }
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Forms */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 20 }}>

        {/* Create course */}
        <div className="glass-b" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 18px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={18} color="var(--emerald)" /> Create Academic Course
          </h3>
          <form onSubmit={handleCreateCourse} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div><label>Course Title</label><input type="text" className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder="CS101 - Programming" required /></div>
              <div><label>Institution</label>
                <select className="form-input" value={selectedInst} onChange={e => setSelectedInst(e.target.value)}>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
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

        {/* Manual Enroll */}
        <div className="glass-b" style={{ padding: 24 }}>
          <h3 style={{ margin: "0 0 18px 0", display: "flex", alignItems: "center", gap: 8 }}>
            <UserCheck size={18} color="var(--cyan)" /> Manual Enrollment
          </h3>
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
            <button type="submit" className="btn-primary" style={{ justifyContent: "center", marginTop: 16 }} disabled={loading}><UserCheck size={15} /> Enroll Student</button>
          </form>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      {/* Course List */}
      <div className="glass-b" style={{ padding: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 18 }}>
          <h3 style={{ margin: 0 }}>Course List &amp; Enrollments</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <ArrowUpDown size={15} color="var(--text-muted)" />
            <select className="form-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: "auto", padding: "7px 28px 7px 12px" }}>
              <option value="name">Sort by Name</option>
              <option value="enrollments">Sort by Enrollment Count</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead><tr><th>Course Name</th><th>Hierarchy Scope</th><th>Instructor(s)</th><th>Enrolled Students</th><th>Actions</th></tr></thead>
            <tbody>
              {sortedCourses.map(c => (
                <tr key={c.id}>
                  {editingId === c.id ? (
                    <>
                      <td><input type="text" className="form-input" value={editName} onChange={e => setEditName(e.target.value)} style={{ padding: "6px 10px" }} /></td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                          <select className="form-input" value={editInst} onChange={e => setEditInst(e.target.value)} style={{ padding: "5px 10px", fontSize: 12 }}>{institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select>
                          <select className="form-input" value={editDept} onChange={e => setEditDept(e.target.value)} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Select Dept</option>{editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                          <select className="form-input" value={editSem} onChange={e => setEditSem(e.target.value)} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Select Sem</option>{editSems.map(s => <option key={s.id} value={s.id}>{s.number}</option>)}</select>
                          <select className="form-input" value={editSec} onChange={e => setEditSec(e.target.value)} disabled={!editSem} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Select Sec</option>{editSecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                        </div>
                      </td>
                      <td>
                        <select className="form-input" value={editTeacherId} onChange={e => setEditTeacherId(e.target.value)} style={{ padding: "6px 10px" }}>
                          <option value="">No Instructor</option>
                          {teachers.map(t => <option key={t.id} value={t.id}>{t.email}</option>)}
                        </select>
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 160, overflowY: "auto", paddingRight: 4 }}>
                          {(c.enrolled_students || []).map(st => (
                            <div key={st.student_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.04)", padding: "4px 8px", borderRadius: 6, border: "1px solid rgba(255,255,255,0.07)", fontSize: 12 }}>
                              <span title={st.email} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>{st.email}</span>
                              <button type="button" onClick={async () => { if (window.confirm(`Unenroll ${st.email}?`)) { try { await API.delete(`/admin/enrollments/${st.enrollment_id}/`); fetchCourses(); } catch { alert("Failed to unenroll"); } } }} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", fontWeight: "bold", fontSize: 16, lineHeight: 1, padding: "0 2px" }}>×</button>
                            </div>
                          ))}
                          {(!c.enrolled_students || !c.enrolled_students.length) && <span style={{ color: "var(--text-muted)", fontSize: 12 }}>No students enrolled</span>}
                        </div>
                        <div style={{ display: "flex", gap: 5, marginTop: 8 }}>
                          <select className="form-input" value={selectedStudentToEnroll} onChange={e => setSelectedStudentToEnroll(e.target.value)} style={{ padding: "5px 8px", fontSize: 12, flex: 1 }}>
                            <option value="">Enroll student...</option>
                            {students.filter(s => !(c.enrolled_students || []).some(es => es.student_id === s.id)).map(s => <option key={s.id} value={s.id}>{s.email}</option>)}
                          </select>
                          <button type="button" className="btn-primary" style={{ padding: "5px 10px", fontSize: 13 }}
                            onClick={async () => {
                              if (!selectedStudentToEnroll) return;
                              try { await API.post("/admin/enrollments/", { student: parseInt(selectedStudentToEnroll), course: c.id }); setSelectedStudentToEnroll(""); fetchCourses(); }
                              catch (err) { const msg = err.response?.data?.non_field_errors?.[0] || ""; alert(msg.includes("unique set") ? "Already enrolled." : "Failed to enroll: " + (msg || "Unknown")); }
                            }}>+</button>
                        </div>
                      </td>
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
                      <td>
                        <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          <div>Uni: {c.institution?.name}</div>
                          <div>Dept: {c.department?.name || "None"}</div>
                          {c.section && <div>Sec: {c.section?.name}</div>}
                        </div>
                      </td>
                      <td>
                        {c.instructors && c.instructors.length > 0
                          ? c.instructors.map((ins, idx) => (
                            <div key={idx} style={{ fontSize: 13 }}>
                              {ins.email} {ins.is_primary && <span className="badge badge-good" style={{ fontSize: 10, padding: "1px 6px" }}>Primary</span>}
                            </div>
                          ))
                          : <span style={{ color: "var(--danger)" }}>No instructor</span>
                        }
                      </td>
                      <td><span className="badge badge-info">{c.enrollment_count} student{c.enrollment_count !== 1 ? "s" : ""}</span></td>
                      <td>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button onClick={() => { setEditingId(c.id); setEditName(c.name); setEditInst(c.institution?.id); setEditDept(c.department?.id || ""); setEditSec(c.section?.id || ""); const ms = editSecs.find(s => s.id === c.section?.id); setEditSem(ms ? ms.semester : ""); setEditTeacherId(c.instructors?.length ? String(c.instructors[0].id) : ""); setSelectedStudentToEnroll(""); }} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }}><Edit size={12} /> Edit</button>
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
    </div>
  );
}
