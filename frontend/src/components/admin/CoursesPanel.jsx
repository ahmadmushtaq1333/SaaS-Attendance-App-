import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, BookOpen, UserCheck, Edit, Trash, Check, X, ArrowUpDown } from "lucide-react";

export default function CoursesPanel() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  
  // Hierarchy states for course creation
  const [departments, setDepartments] = useState([]);
  const [semesters, setSemesters] = useState([]);
  const [sections, setSections] = useState([]);
  
  const [name, setName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [selectedInst, setSelectedInst] = useState("");
  const [selectedDept, setSelectedDept] = useState("");
  const [selectedSem, setSelectedSem] = useState("");
  const [selectedSec, setSelectedSec] = useState("");
  
  const [enrollStudentEmail, setEnrollStudentEmail] = useState("");
  const [enrollCourse, setEnrollCourse] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState("name");

  // Editing state
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState("");
  const [editTeacherEmail, setEditTeacherEmail] = useState("");
  const [editInst, setEditInst] = useState("");
  const [editDept, setEditDept] = useState("");
  const [editSec, setEditSec] = useState("");
  const [editSem, setEditSem] = useState("");
  
  const [editDepts, setEditDepts] = useState([]);
  const [editSems, setEditSems] = useState([]);
  const [editSecs, setEditSecs] = useState([]);
  const [selectedStudentToEnroll, setSelectedStudentToEnroll] = useState("");

  const fetchCourses = async () => {
    setError('');
    try {
      const res = await API.get("/admin/courses/");
      setCourses(res.data.results || res.data);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail || err.message || "Unknown error";
      setError(`Failed to fetch courses (${status || 'Network Error'}: ${detail})`);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await API.get("/admin/users/");
      const data = res.data.results || res.data;
      setTeachers(data.filter((u) => u.role === "teacher"));
      setStudents(data.filter((u) => u.role === "student"));
    } catch (err) {
      setError("Failed to fetch user lists");
    }
  };

  const fetchInstitutions = async () => {
    try {
      const res = await API.get("/admin/institutions/");
      const data = res.data.results || res.data;
      setInstitutions(data);
      if (data.length > 0) {
        setSelectedInst(data[0].id);
        setEditInst(data[0].id);
      }
    } catch (err) {
      setError("Failed to fetch institutions");
    }
  };

  // Cascading dropdowns for creation
  useEffect(() => {
    if (!selectedInst) {
      setDepartments([]);
      return;
    }
    API.get(`/admin/departments/?institution=${selectedInst}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setDepartments(data);
        if (data.length > 0) setSelectedDept(data[0].id);
        else setSelectedDept("");
      })
      .catch(() => setDepartments([]));
  }, [selectedInst]);

  useEffect(() => {
    if (!selectedDept) {
      setSemesters([]);
      return;
    }
    API.get(`/admin/semesters/?department=${selectedDept}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setSemesters(data);
        if (data.length > 0) setSelectedSem(data[0].id);
        else setSelectedSem("");
      })
      .catch(() => setSemesters([]));
  }, [selectedDept]);

  useEffect(() => {
    if (!selectedSem) {
      setSections([]);
      return;
    }
    API.get(`/admin/sections/?semester=${selectedSem}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setSections(data);
        if (data.length > 0) setSelectedSec(data[0].id);
        else setSelectedSec("");
      })
      .catch(() => setSections([]));
  }, [selectedSem]);

  // Cascading dropdowns for editing
  useEffect(() => {
    if (!editInst) {
      setEditDepts([]);
      return;
    }
    API.get(`/admin/departments/?institution=${editInst}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setEditDepts(data);
      })
      .catch(() => setEditDepts([]));
  }, [editInst]);

  useEffect(() => {
    if (!editDept) {
      setEditSems([]);
      return;
    }
    API.get(`/admin/semesters/?department=${editDept}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setEditSems(data);
      })
      .catch(() => setEditSems([]));
  }, [editDept]);

  useEffect(() => {
    if (!editSem) {
      setEditSecs([]);
      return;
    }
    API.get(`/admin/sections/?semester=${editSem}`)
      .then((res) => {
        const data = res.data.results || res.data;
        setEditSecs(data);
      })
      .catch(() => setEditSecs([]));
  }, [editSem]);

  useEffect(() => {
    fetchCourses();
    fetchUsers();
    fetchInstitutions();
  }, []);

  useEffect(() => {
    if (courses.length > 0) setEnrollCourse(courses[0].id);
  }, [courses]);

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const matchingTeacher = teachers.find(t => t.email.toLowerCase() === teacherEmail.trim().toLowerCase());
    if (!matchingTeacher) {
      setError(`No teacher account found with the email: "${teacherEmail}"`);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        name,
        institution: selectedInst,
        department: selectedDept,
        section: selectedSec || null,
        teacher_ids: [matchingTeacher.id]
      };
      await API.post("/admin/courses/", payload);
      setName("");
      setTeacherEmail("");
      fetchCourses();
      alert("Course created successfully!");
    } catch (err) {
      setError("Error creating course: " + (err.response?.data?.detail || "Unknown schema error"));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEdit = async (id) => {
    const matchingTeacher = teachers.find(t => t.email.toLowerCase() === editTeacherEmail.trim().toLowerCase());
    if (!matchingTeacher) {
      alert(`No teacher account found with the email: "${editTeacherEmail}"`);
      return;
    }

    try {
      const payload = {
        name: editName,
        institution: editInst,
        department: editDept,
        section: editSec || null,
        teacher_ids: [matchingTeacher.id]
      };
      await API.put(`/admin/courses/${id}/`, payload);
      setEditingId(null);
      fetchCourses();
    } catch (err) {
      alert("Error updating course details");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this course? All enrollments and sessions will be deleted.")) return;
    try {
      await API.delete(`/admin/courses/${id}/`);
      fetchCourses();
    } catch (err) {
      alert("Error deleting course");
    }
  };

  const handleManualEnroll = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const matchingStudent = students.find(s => s.email.toLowerCase() === enrollStudentEmail.trim().toLowerCase());
    if (!matchingStudent) {
      setError(`No student account found with the email: "${enrollStudentEmail}"`);
      setLoading(false);
      return;
    }

    try {
      const payload = {
        student: matchingStudent.id,
        course: enrollCourse
      };
      await API.post("/admin/enrollments/", payload);
      setEnrollStudentEmail("");
      fetchCourses();
      alert("Student enrolled successfully!");
    } catch (err) {
      const msg = err.response?.data?.non_field_errors?.[0] || "";
      if (msg.includes("unique set") || msg.includes("already exists")) {
        setError("This student is already enrolled in this course.");
      } else {
        setError(msg || "Student is already enrolled in this course");
      }
    } finally {
      setLoading(false);
    }
  };

  const sortedCourses = [...courses].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "enrollments") return b.enrollment_count - a.enrollment_count;
    return 0;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* Create Course and Manual Enrollment Forms in two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))", gap: "24px" }}>
        
        {/* Create Course */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <BookOpen size={20} color="#6366f1" /> Create Academic Course
          </h3>
          <form onSubmit={handleCreateCourse} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Course Title</label>
                <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="CS101 - Coding" required />
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Institution</label>
                <select className="form-input" value={selectedInst} onChange={(e) => setSelectedInst(e.target.value)} style={{ appearance: "auto" }}>
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>{inst.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", background: "rgba(255,255,255,0.01)", padding: "10px", borderRadius: "8px", border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <label style={{ display: "block", marginBottom: "4px", color: "#9ca3af", fontSize: "0.8rem" }}>Dept</label>
                <select className="form-input" value={selectedDept} onChange={(e) => setSelectedDept(e.target.value)} required style={{ appearance: "auto" }}>
                  <option value="">Select Dept</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", color: "#9ca3af", fontSize: "0.8rem" }}>Sem</label>
                <select className="form-input" value={selectedSem} onChange={(e) => setSelectedSem(e.target.value)} disabled={!selectedDept} style={{ appearance: "auto" }}>
                  <option value="">Select Sem</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>{s.number}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", marginBottom: "4px", color: "#9ca3af", fontSize: "0.8rem" }}>Sec</label>
                <select className="form-input" value={selectedSec} onChange={(e) => setSelectedSec(e.target.value)} disabled={!selectedSem} style={{ appearance: "auto" }}>
                  <option value="">Select Sec</option>
                  {sections.map((sc) => (
                    <option key={sc.id} value={sc.id}>{sc.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Teacher Email</label>
              <input type="email" className="form-input" value={teacherEmail} onChange={(e) => setTeacherEmail(e.target.value)} placeholder="teacher@mit.edu" required />
            </div>
            
            <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "8px" }} disabled={loading}>
              <Plus size={16} /> Create Course
            </button>
          </form>
        </div>

        {/* Manual Enrollment */}
        <div className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ margin: "0 0 16px 0", display: "flex", alignItems: "center", gap: "8px" }}>
            <UserCheck size={20} color="#a855f7" /> Manual Enrollment
          </h3>
          <form onSubmit={handleManualEnroll} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Select Target Course</label>
              <select className="form-input" value={enrollCourse} onChange={(e) => setEnrollCourse(e.target.value)} style={{ appearance: "auto" }}>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Student Email</label>
              <input type="email" className="form-input" value={enrollStudentEmail} onChange={(e) => setEnrollStudentEmail(e.target.value)} placeholder="student@mit.edu" required />
            </div>
            <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "54px", background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)" }} disabled={loading}>
              <UserCheck size={16} /> Enroll Student
            </button>
          </form>
        </div>
      </div>

      {error && <div style={{ color: "#f87171", fontSize: "0.9rem" }}>{error}</div>}

      {/* Directory listing */}
      <div className="glass-panel" style={{ padding: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>Course List & Enrollments</h3>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <ArrowUpDown size={16} color="#9ca3af" />
            <select className="form-input" value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "6px 12px", width: "auto", appearance: "auto" }}>
              <option value="name">Sort by Name</option>
              <option value="enrollments">Sort by Enrollment Count</option>
            </select>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Course Name</th>
                <th>Hierarchy Scope</th>
                <th>Assigned Instructors</th>
                <th>Enrolled Students</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedCourses.map((c) => (
                <tr key={c.id}>
                  {editingId === c.id ? (
                    <>
                      <td>
                        <input type="text" className="form-input" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ padding: "6px 12px" }} />
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                          <select className="form-input" value={editInst} onChange={(e) => setEditInst(e.target.value)} style={{ padding: "4px 8px", appearance: "auto" }}>
                            {institutions.map((inst) => (
                              <option key={inst.id} value={inst.id}>{inst.name}</option>
                            ))}
                          </select>
                          <select className="form-input" value={editDept} onChange={(e) => setEditDept(e.target.value)} style={{ padding: "4px 8px", appearance: "auto" }}>
                            <option value="">Select Dept</option>
                            {editDepts.map((d) => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                          <select className="form-input" value={editSem} onChange={(e) => setEditSem(e.target.value)} style={{ padding: "4px 8px", appearance: "auto" }}>
                            <option value="">Select Sem</option>
                            {editSems.map((s) => (
                              <option key={s.id} value={s.id}>{s.number}</option>
                            ))}
                          </select>
                          <select className="form-input" value={editSec} onChange={(e) => setEditSec(e.target.value)} disabled={!editSem} style={{ padding: "4px 8px", appearance: "auto" }}>
                            <option value="">Select Sec</option>
                            {editSecs.map((sc) => (
                              <option key={sc.id} value={sc.id}>{sc.name}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td>
                        <input type="email" className="form-input" value={editTeacherEmail} onChange={(e) => setEditTeacherEmail(e.target.value)} style={{ padding: "6px 12px" }} />
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto", padding: "4px" }}>
                          {c.enrolled_students && c.enrolled_students.length > 0 ? (
                            c.enrolled_students.map((stud) => (
                              <div key={stud.student_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px", background: "rgba(255,255,255,0.04)", padding: "4px 8px", borderRadius: "6px", fontSize: "0.8rem" }}>
                                <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap", maxWidth: "120px" }} title={stud.email}>
                                  {stud.email}
                                </span>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm(`Unenroll ${stud.email}?`)) {
                                      try {
                                        await API.delete(`/admin/enrollments/${stud.enrollment_id}/`);
                                        fetchCourses();
                                      } catch (err) {
                                        alert("Failed to unenroll student");
                                      }
                                    }
                                  }}
                                  style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", padding: "0 2px", fontWeight: "bold" }}
                                >
                                  ×
                                </button>
                              </div>
                            ))
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>No students enrolled</span>
                          )}
                        </div>
                        <div style={{ marginTop: "8px", display: "flex", gap: "4px" }}>
                          <select
                            className="form-input"
                            value={selectedStudentToEnroll}
                            onChange={(e) => setSelectedStudentToEnroll(e.target.value)}
                            style={{ padding: "4px 8px", fontSize: "0.8rem", appearance: "auto", flex: 1 }}
                          >
                            <option value="">Enroll student...</option>
                            {students
                              .filter(s => !(c.enrolled_students || []).some(es => es.student_id === s.id))
                              .map((s) => (
                                <option key={s.id} value={s.id}>
                                  {s.email}
                                </option>
                              ))}
                          </select>
                          <button
                            type="button"
                            onClick={async () => {
                              if (!selectedStudentToEnroll) return;
                              try {
                                await API.post("/admin/enrollments/", {
                                  student: parseInt(selectedStudentToEnroll),
                                  course: c.id
                                });
                                setSelectedStudentToEnroll("");
                                fetchCourses();
                              } catch (err) {
                                const msg = err.response?.data?.non_field_errors?.[0] || "";
                                if (msg.includes("unique set")) {
                                  alert("This student is already enrolled in this course.");
                                } else {
                                  alert("Failed to enroll student: " + (msg || "Unknown error"));
                                }
                              }
                            }}
                            className="btn-primary"
                            style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                          >
                            +
                          </button>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => handleSaveEdit(c.id)} className="btn-primary" style={{ padding: "6px 10px", background: "#22c55e" }}><Check size={14} /></button>
                          <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: "6px 10px" }}><X size={14} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: "600" }}>{c.name}</td>
                      <td>
                        <div style={{ fontSize: "0.85rem", color: "#9ca3af" }}>
                          <div><strong>Uni:</strong> {c.institution?.name}</div>
                          <div><strong>Dept:</strong> {c.department?.name || "None"}</div>
                          {c.section && <div><strong>Sec:</strong> {c.section?.name}</div>}
                        </div>
                      </td>
                      <td>
                        {c.instructors && c.instructors.length > 0 ? (
                          c.instructors.map((ins, idx) => (
                            <div key={idx} style={{ fontSize: "0.9rem" }}>
                              {ins.email} {ins.is_primary && <span style={{ color: "#6366f1", fontSize: "0.75rem", fontWeight: "bold" }}>(Primary)</span>}
                            </div>
                          ))
                        ) : (
                          <span style={{ color: "#f87171" }}>No instructor assigned</span>
                        )}
                      </td>
                      <td>{c.enrollment_count} student(s)</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => {
                            setEditingId(c.id);
                            setEditName(c.name);
                            setEditInst(c.institution?.id);
                            setEditDept(c.department?.id || "");
                            setEditSec(c.section?.id || "");
                            // Find semester matching current section if possible
                            const matchedSec = editSecs.find(s => s.id === c.section?.id);
                            setEditSem(matchedSec ? matchedSec.semester : "");
                            setEditTeacherEmail(c.instructors && c.instructors.length > 0 ? c.instructors[0].email : "");
                            setSelectedStudentToEnroll("");
                          }} className="btn-secondary" style={{ padding: "6px 10px", display: "flex", gap: "4px", alignItems: "center" }}>
                            <Edit size={12} /> Edit
                          </button>
                          <button onClick={() => handleDelete(c.id)} className="btn-secondary" style={{ padding: "6px 10px", color: "#f87171", borderColor: "rgba(248,113,113,0.2)", display: "flex", gap: "4px", alignItems: "center" }}>
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
