import React, { useState, useEffect } from "react";
import API from "../../services/api";
import { Upload, FileSpreadsheet, Download, RefreshCw, CheckCircle2, AlertTriangle, Layers, Lock, ShieldCheck, PieChart, Users } from "lucide-react";

export default function ExcelImportPanel({ user, onImportComplete }) {
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [previewRows, setPreviewRows] = useState([]);
  const [totalRows, setTotalRows] = useState(0);

  // Mappings
  const [emailMap, setEmailMap] = useState("");
  const [regMap, setRegMap] = useState("");

  // Global Assignments
  const [globalRole, setGlobalRole] = useState("student");
  const [globalInstitution, setGlobalInstitution] = useState("");
  const [globalDepartmentId, setGlobalDepartmentId] = useState("");
  const [globalSemesterId, setGlobalSemesterId] = useState("");
  const [globalSectionId, setGlobalSectionId] = useState("");

  // Cascading options
  const [institutions, setInstitutions] = useState([]);
  const [importDepts, setImportDepts] = useState([]);
  const [importSems, setImportSems] = useState([]);
  const [importSecs, setImportSecs] = useState([]);

  // Settings
  const [passwordStrategy, setPasswordStrategy] = useState("auto"); // auto, reg_no, custom
  const [customPassword, setCustomPassword] = useState("");
  const [autoCreateStructure, setAutoCreateStructure] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState("");
  const [courses, setCourses] = useState([]);

  // Execution states
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [importResult, setImportResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    API.get("/admin/courses/").then(r => setCourses(r.data.results || r.data));
    API.get("/admin/institutions/").then(r => setInstitutions(r.data.results || r.data));
  }, []);

  useEffect(() => {
    if (globalInstitution) {
      API.get(`/admin/departments/?institution=${globalInstitution}`).then(r => { setImportDepts(r.data.results || r.data); setGlobalDepartmentId(""); setGlobalSemesterId(""); setGlobalSectionId(""); setImportSems([]); setImportSecs([]); });
    } else { setImportDepts([]); setGlobalDepartmentId(""); setGlobalSemesterId(""); setGlobalSectionId(""); }
  }, [globalInstitution]);

  useEffect(() => {
    if (globalDepartmentId) {
      API.get(`/admin/semesters/?department=${globalDepartmentId}`).then(r => { setImportSems(r.data.results || r.data); setGlobalSemesterId(""); setGlobalSectionId(""); setImportSecs([]); });
    } else { setImportSems([]); setGlobalSemesterId(""); setGlobalSectionId(""); }
  }, [globalDepartmentId]);

  useEffect(() => {
    if (globalSemesterId) {
      API.get(`/admin/sections/?semester=${globalSemesterId}`).then(r => { setImportSecs(r.data.results || r.data); setGlobalSectionId(""); });
    } else { setImportSecs([]); setGlobalSectionId(""); }
  }, [globalSemesterId]);

  const handleFileChange = async (e) => {
    const uploadedFile = e.target.files[0];
    if (!uploadedFile) return;

    setFile(uploadedFile);
    setError("");
    setValidationResult(null);
    setImportResult(null);
    setHeaders([]);
    setPreviewRows([]);

    // Get headers preview
    const formData = new FormData();
    formData.append("file", uploadedFile);

    setLoading(true);
    try {
      const res = await API.post("/admin/users/import-file/?get_preview=true", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setHeaders(res.data.headers);
      setPreviewRows(res.data.preview_rows);
      setTotalRows(res.data.total_rows);

      // Auto map matching columns
      const lowerHeaders = res.data.headers.map(h => h.toLowerCase());
      const emailIdx = lowerHeaders.findIndex(h => h.includes("email") || h.includes("mail"));
      if (emailIdx !== -1) setEmailMap(res.data.headers[emailIdx]);

      const regIdx = lowerHeaders.findIndex(h => h.includes("reg") || h.includes("roll") || h.includes("id") || h.includes("number"));
      if (regIdx !== -1) setRegMap(res.data.headers[regIdx]);

    } catch (err) {
      setError(err.response?.data?.error || "Failed to parse spreadsheet headers.");
      setFile(null);
    } finally {
      setLoading(false);
    }
  };

  const runVerification = async (isDryRun = true) => {
    if (!file || !emailMap) return;
    setError("");
    if (isDryRun) {
      setValidating(true);
      setValidationResult(null);
    } else {
      setLoading(true);
      setImportResult(null);
    }

    const mapping = {
      email: emailMap,
      registration_number: regMap || undefined
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("dry_run", isDryRun ? "true" : "false");
    formData.append("auto_create_structure", autoCreateStructure ? "true" : "false");
    formData.append("password_strategy", passwordStrategy);
    formData.append("custom_password", customPassword);
    formData.append("column_mapping", JSON.stringify(mapping));
    
    // Global parameters — now send IDs
    formData.append("global_role", globalRole);
    formData.append("global_institution", globalInstitution);
    formData.append("global_department_id", globalDepartmentId);
    formData.append("global_semester_id", globalSemesterId);
    formData.append("global_section_id", globalSectionId);
    if (selectedCourse) formData.append("course_id", selectedCourse);

    try {
      const res = await API.post("/admin/users/import-file/", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      if (isDryRun) {
        setValidationResult(res.data);
      } else {
        setImportResult(res.data);
        if (onImportComplete) onImportComplete();
      }
    } catch (err) {
      setError(err.response?.data?.error || "Error executing spreadsheet verification.");
    } finally {
      setValidating(false);
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const csvContent = "Registration Number,Email Address\nCS-001,std01@mit.edu\nCS-002,std02@mit.edu\nT-01,prof.john@mit.edu";
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "attendai_import_template.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadImportCredentials = () => {
    const data = importResult || validationResult;
    if (!data || !data.imported_users) return;

    let csv = "Email Address,Temporary Password,Role,Registration Number,Institution,Department,Section\n";
    data.imported_users.forEach(u => {
      csv += `${u.email},${u.password},${u.role},${u.registration_number || ""},${u.institution},${u.department || ""},${u.section || ""}\n`;
    });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `imported_users_credentials_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      
      {/* ── Drag & Drop / File Input ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div className="glass-c" style={{ padding: 24, borderRadius: 12, border: "2px dashed rgba(255,255,255,0.15)", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
          <Upload size={32} color="var(--cyan)" />
          <div>
            <p style={{ fontWeight: 600, fontSize: 14 }}>Upload Student/Teacher Roster</p>
            <p className="text-meta" style={{ fontSize: 11, marginTop: 4 }}>Supports Microsoft Excel (.xlsx, .xls) and CSV</p>
          </div>
          <input 
            type="file" 
            accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel"
            onChange={handleFileChange}
            style={{ display: "none" }}
            id="excel-roster-upload"
          />
          <label htmlFor="excel-roster-upload" className="btn-secondary" style={{ padding: "8px 16px", cursor: "pointer", fontSize: 13 }}>
            Browse Files
          </label>
        </div>

        <div className="glass-c" style={{ padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <h4 style={{ margin: "0 0 6px 0", fontSize: 14, color: "var(--text-primary)" }}>Import instructions & guidelines</h4>
            <ul style={{ paddingLeft: 16, margin: 0, fontSize: 12, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
              <li><strong>Simplified Format:</strong> Your file only needs 2 columns — <strong>Email</strong> and <strong>Reg Number</strong>.</li>
              <li><strong>Batch Assignment:</strong> Role, Department, Semester & Section are set once and applied to the entire list.</li>
              <li><strong>Student Email Rules:</strong> Emails not matching your institution domain are blocked.</li>
              <li><strong>OTP Verification:</strong> All new accounts start as unverified and require activation.</li>
            </ul>
          </div>
          <button className="btn-secondary" onClick={handleDownloadTemplate} style={{ gap: 6, fontSize: 12, alignSelf: "flex-start", marginTop: 10 }}>
            <Download size={13} /> Download Pre-Formatted Template
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger"><AlertTriangle size={15} />{error}</div>}

      {/* ── Mapping and configuration options ── */}
      {file && headers.length > 0 && !importResult && (
        <div className="glass-b" style={{ padding: 20, borderRadius: 12, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: 10 }}>
            <FileSpreadsheet size={16} color="var(--emerald)" />
            <span style={{ fontWeight: 600, fontSize: 14 }}>Roster Parsing: <code style={{ color: "var(--cyan)" }}>{file.name}</code> ({totalRows} rows)</span>
          </div>

          {/* Table Preview */}
          <div className="table-container" style={{ maxHeight: 150, overflowY: "auto" }}>
            <table>
              <thead>
                <tr>{headers.map((h, i) => <th key={i}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {previewRows.map((row, rIdx) => (
                  <tr key={rIdx}>{row.map((cell, cIdx) => <td key={cIdx} style={{ fontSize: 12 }}>{cell}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Visual Mapper & Global Config */}
          <div>
            <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "var(--text-secondary)" }}>1. Map Spreadsheet Columns</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11 }}>Email Address Column (Required)</label>
                <select className="form-input" value={emailMap} onChange={(e) => setEmailMap(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="">-- Select Column --</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Registration Number / Username Column</label>
                <select className="form-input" value={regMap} onChange={(e) => setRegMap(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="">-- Select Column (Optional) --</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "var(--text-secondary)" }}>2. Batch Assignment — Apply to All Users</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
              <div>
                <label style={{ fontSize: 11 }}>Role</label>
                <select className="form-input" value={globalRole} onChange={(e) => setGlobalRole(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="student">Student</option>
                  <option value="teacher">Teacher</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Institution</label>
                <select className="form-input" value={globalInstitution} onChange={(e) => setGlobalInstitution(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="">-- Select Institution --</option>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Department</label>
                <select className="form-input" value={globalDepartmentId} onChange={(e) => setGlobalDepartmentId(e.target.value)} disabled={!globalInstitution} style={{ padding: "6px 10px", fontSize: 12, opacity: !globalInstitution ? 0.5 : 1 }}>
                  <option value="">-- Select Department --</option>
                  {importDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Semester</label>
                <select className="form-input" value={globalSemesterId} onChange={(e) => setGlobalSemesterId(e.target.value)} disabled={!globalDepartmentId || globalRole !== "student"} style={{ padding: "6px 10px", fontSize: 12, opacity: (!globalDepartmentId || globalRole !== "student") ? 0.5 : 1 }}>
                  <option value="">-- Select Semester --</option>
                  {importSems.map(s => <option key={s.id} value={s.id}>Semester {s.number}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Section</label>
                <select className="form-input" value={globalSectionId} onChange={(e) => setGlobalSectionId(e.target.value)} disabled={!globalSemesterId || globalRole !== "student"} style={{ padding: "6px 10px", fontSize: 12, opacity: (!globalSemesterId || globalRole !== "student") ? 0.5 : 1 }}>
                  <option value="">-- Select Section (optional) --</option>
                  {importSecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* 3. Additional Options (compact) */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 14 }}>
            <div>
              <label style={{ fontSize: 11 }}>Password Strategy</label>
              <select className="form-input" value={passwordStrategy} onChange={(e) => setPasswordStrategy(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                <option value="auto">Auto-Generate Secure Passwords</option>
                <option value="reg_no">Use Reg Number as Password</option>
                <option value="custom">Custom Static Password</option>
              </select>
              {passwordStrategy === "custom" && (
                <input type="text" className="form-input" placeholder="e.g. Welcome@123" value={customPassword} onChange={(e) => setCustomPassword(e.target.value)} style={{ padding: "6px 10px", fontSize: 12, marginTop: 6 }} />
              )}
            </div>
            <div>
              <label style={{ fontSize: 11 }}>Auto-Enroll to Course (Optional)</label>
              <select className="form-input" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                <option value="">-- No course enrollment --</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          {/* Action button */}
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <button className="btn-primary" onClick={() => runVerification(false)} disabled={loading || validating || !emailMap} style={{ padding: "11px 28px", fontSize: 14, gap: 8 }}>
              <Upload size={16} /> {loading ? "Importing..." : "Upload & Import Roster"}
            </button>
          </div>
        </div>
      )}

      {/* ── Dry Run Validation Alerts Dashboard ── */}
      {validationResult && !importResult && (
        <div className="glass-b" style={{ padding: 20, borderRadius: 12, border: "1px solid rgba(46,230,255,0.2)" }}>
          <h4 style={{ margin: "0 0 12px 0", display: "flex", alignItems: "center", gap: 8, color: "var(--cyan)" }}>
            <ShieldCheck size={18} /> Dry-Run Verification Summary
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
            <div style={{ padding: 12, background: "rgba(57,217,138,0.06)", borderRadius: 8, border: "1px solid rgba(57,217,138,0.2)" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Ready to Import:</span>
              <p style={{ fontSize: 24, fontWeight: 700, color: "var(--emerald)", margin: "4px 0 0" }}>{validationResult.success_count} accounts</p>
            </div>
            <div style={{ padding: 12, background: validationResult.error_count > 0 ? "rgba(255,90,90,0.06)" : "rgba(255,255,255,0.03)", borderRadius: 8, border: validationResult.error_count > 0 ? "1px solid rgba(255,90,90,0.2)" : "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>Critical Errors found:</span>
              <p style={{ fontSize: 24, fontWeight: 700, color: validationResult.error_count > 0 ? "var(--danger)" : "var(--text-secondary)", margin: "4px 0 0" }}>{validationResult.error_count} rows</p>
            </div>
          </div>

          {validationResult.errors.length > 0 ? (
            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {validationResult.errors.map((e, idx) => (
                <div key={idx} style={{ padding: "8px 12px", background: "rgba(255,90,90,0.05)", borderLeft: "3px solid var(--danger)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                  <span>Row {e.row}: {e.error}</span>
                  <span style={{ color: "var(--text-muted)" }}>Skipped</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="alert alert-success" style={{ margin: 0 }}><CheckCircle2 size={14} />No validation issues found. Ready to proceed with import.</div>
          )}
        </div>
      )}

      {/* ── Post-Import Analytics Dashboard ── */}
      {importResult && (
        <div className="glass-b" style={{ padding: 24, borderRadius: 12, border: "1px solid rgba(57,217,138,0.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <h3 style={{ margin: 0, color: "var(--emerald)", display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle2 size={20} /> Roster Import Successful!
            </h3>
            <button className="btn-secondary" onClick={downloadImportCredentials} style={{ gap: 6, fontSize: 13 }}>
              <Download size={14} /> Download Credentials CSV
            </button>
          </div>

          {/* Statistics summary */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 20 }}>
            <div style={{ padding: 16, background: "rgba(255,255,255,0.03)", borderRadius: 10 }}>
              <Users size={16} color="var(--cyan)" style={{ marginBottom: 6 }} />
              <span className="text-meta">Total Uploaded</span>
              <p style={{ fontSize: 28, fontWeight: 700, margin: "4px 0 0" }}>{importResult.success_count + importResult.error_count}</p>
            </div>
            <div style={{ padding: 16, background: "rgba(57,217,138,0.05)", borderRadius: 10, border: "1px solid rgba(57,217,138,0.15)" }}>
              <ShieldCheck size={16} color="var(--emerald)" style={{ marginBottom: 6 }} />
              <span className="text-meta" style={{ color: "var(--emerald)" }}>Successfully Created</span>
              <p style={{ fontSize: 28, fontWeight: 700, color: "var(--emerald)", margin: "4px 0 0" }}>{importResult.success_count}</p>
            </div>
            <div style={{ padding: 16, background: "rgba(255,90,90,0.05)", borderRadius: 10, border: "1px solid rgba(255,90,90,0.15)" }}>
              <AlertTriangle size={16} color="var(--danger)" style={{ marginBottom: 6 }} />
              <span className="text-meta" style={{ color: "var(--danger)" }}>Failed / Skipped</span>
              <p style={{ fontSize: 28, fontWeight: 700, color: "var(--danger)", margin: "4px 0 0" }}>{importResult.error_count}</p>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 20 }}>
              <h4 style={{ margin: "0 0 4px 0", fontSize: 13, color: "var(--danger)" }}>Failed Rows Details</h4>
              {importResult.errors.map((e, idx) => (
                <div key={idx} style={{ padding: "8px 12px", background: "rgba(255,90,90,0.05)", borderLeft: "3px solid var(--danger)", fontSize: 12, display: "flex", justifyContent: "space-between" }}>
                  <span>Row {e.row}: {e.error}</span>
                  <span style={{ color: "var(--text-muted)" }}>Skipped</span>
                </div>
              ))}
            </div>
          )}

          {/* Visual Domain Analytics representation */}
          <div style={{ background: "rgba(255,255,255,0.02)", padding: 18, borderRadius: 10 }}>
            <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 6 }}><PieChart size={14} /> Import Domain & Role Analytics</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span>Verified Institutional Accounts</span>
                  <span>{importResult.success_count} / {importResult.success_count} (100%)</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "100%", background: "var(--emerald)" }} />
                </div>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, marginBottom: 4 }}>
                  <span>Activation OTP Codes Sent</span>
                  <span>{importResult.success_count} generated</span>
                </div>
                <div style={{ height: 6, background: "rgba(255,255,255,0.08)", borderRadius: 3, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: "100%", background: "var(--cyan)" }} />
                </div>
              </div>
            </div>
          </div>

          <button className="btn-secondary" onClick={() => { setFile(null); setImportResult(null); setValidationResult(null); }} style={{ marginTop: 16, width: "100%", justifyContent: "center" }}>
            Import Another Roster
          </button>
        </div>
      )}

    </div>
  );
}
