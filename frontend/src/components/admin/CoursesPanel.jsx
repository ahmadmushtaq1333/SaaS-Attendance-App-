import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Plus, BookOpen, UserCheck, Edit, Trash, Check, X, ArrowUpDown } from "lucide-react";

export default function CoursesPanel() {
  const [courses, setCourses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [name, setName] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [selectedInst, setSelectedInst] = useState("");
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

  const fetchCourses = async () => {
    try {
      const res = await API.get("/admin/courses/");
      setCourses(res.data.results || res.data);
    } catch (err) {
      setError("Failed to fetch courses");
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
      if (data.length > 0) setSelectedInst(data[0].id);
    } catch (err) {
      setError("Failed to fetch institutions");
    }
  };

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
        teacher: matchingTeacher.id
      };
      await API.post("/admin/courses/", payload);
      setName("");
      setTeacherEmail("");
      fetchCourses();
      alert("Course created successfully!");
    } catch (err) {
      setError("Error creating course");
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
        teacher: matchingTeacher.id
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
      setError(err.response?.data?.non_field_errors?.[0] || "Student is already enrolled in this course");
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
            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Course Title</label>
              <input type="text" className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="CS101 - Introduction to Coding" required />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: "6px", color: "#9ca3af", fontSize: "0.85rem" }}>Institution (Tenant)</label>
              <select className="form-input" value={selectedInst} onChange={(e) => setSelectedInst(e.target.value)} style={{ appearance: "auto" }}>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>{inst.name}</option>
                ))}
              </select>
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
            <button type="submit" className="btn-primary" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginTop: "42px", background: "linear-gradient(135deg, #a855f7 0%, #6366f1 100%)" }} disabled={loading}>
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
                <th>Assigned Teacher</th>
                <th>Enrolled Students</th>
                <th>Tenant ID</th>
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
                        <input type="email" className="form-input" value={editTeacherEmail} onChange={(e) => setEditTeacherEmail(e.target.value)} style={{ padding: "6px 12px" }} />
                      </td>
                      <td>{c.enrollment_count} student(s)</td>
                      <td>
                        <select className="form-input" value={editInst} onChange={(e) => setEditInst(e.target.value)} style={{ padding: "6px 12px", appearance: "auto" }}>
                          {institutions.map((inst) => (
                            <option key={inst.id} value={inst.id}>{inst.name}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ display: "flex", gap: "8px" }}>
                        <button onClick={() => handleSaveEdit(c.id)} className="btn-primary" style={{ padding: "6px 10px", background: "#22c55e" }}><Check size={14} /></button>
                        <button onClick={() => setEditingId(null)} className="btn-secondary" style={{ padding: "6px 10px" }}><X size={14} /></button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ fontWeight: "600" }}>{c.name}</td>
                      <td>{c.teacher_email || `ID: ${c.teacher}`}</td>
                      <td>{c.enrollment_count} student(s)</td>
                      <td>Institution #{c.institution}</td>
                      <td>
                        <div style={{ display: "flex", gap: "8px" }}>
                          <button onClick={() => {
                            setEditingId(c.id);
                            setEditName(c.name);
                            setEditTeacherEmail(c.teacher_email || "");
                            setEditInst(c.institution);
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
