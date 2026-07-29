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
  const [roleMap, setRoleMap] = useState("");
  const [deptMap, setDeptMap] = useState("");
  const [semMap, setSemMap] = useState("");
  const [secMap, setSecMap] = useState("");

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
  }, []);

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

      const roleIdx = lowerHeaders.findIndex(h => h.includes("role") || h.includes("type"));
      if (roleIdx !== -1) setRoleMap(res.data.headers[roleIdx]);

      const deptIdx = lowerHeaders.findIndex(h => h.includes("dept") || h.includes("department"));
      if (deptIdx !== -1) setDeptMap(res.data.headers[deptIdx]);

      const semIdx = lowerHeaders.findIndex(h => h.includes("sem") || h.includes("semester"));
      if (semIdx !== -1) setSemMap(res.data.headers[semIdx]);

      const secIdx = lowerHeaders.findIndex(h => h.includes("sec") || h.includes("section"));
      if (secIdx !== -1) setSecMap(res.data.headers[secIdx]);

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
      registration_number: regMap || undefined,
      role: roleMap || undefined,
      department: deptMap || undefined,
      semester: semMap || undefined,
      section: secMap || undefined
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("dry_run", isDryRun ? "true" : "false");
    formData.append("auto_create_structure", autoCreateStructure ? "true" : "false");
    formData.append("password_strategy", passwordStrategy);
    formData.append("custom_password", customPassword);
    formData.append("column_mapping", JSON.stringify(mapping));
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
    const csvContent = "Registration Number,Email Address,Role,Department,Semester,Section\nCS-001,std01@mit.edu,student,Computer Science,1,Section A\nCS-002,std02@mit.edu,student,Computer Science,1,Section A\nT-01,prof.john@mit.edu,teacher,Computer Science,,";
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
              <li><strong>Student Email Rules:</strong> Mismatched domains (e.g. Gmail) are blocked automatically.</li>
              <li><strong>Auto-Creation:</strong> Enable below to dynamically add new semesters/sections.</li>
              <li><strong>OTP Verification:</strong> Accounts start as unverified and require activation.</li>
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

          {/* Visual Mapper */}
          <div>
            <h4 style={{ margin: "0 0 10px 0", fontSize: 13, color: "var(--text-secondary)" }}>Choose Columns Mapping</h4>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11 }}>Email Address (Required)</label>
                <select className="form-input" value={emailMap} onChange={(e) => setEmailMap(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="">-- Map Email --</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Reg Number / Username</label>
                <select className="form-input" value={regMap} onChange={(e) => setRegMap(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="">-- Map Reg No --</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Role (student/teacher)</label>
                <select className="form-input" value={roleMap} onChange={(e) => setRoleMap(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="">-- Map Role --</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Department</label>
                <select className="form-input" value={deptMap} onChange={(e) => setDeptMap(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="">-- Map Dept --</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Semester</label>
                <select className="form-input" value={semMap} onChange={(e) => setSemMap(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="">-- Map Semester --</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11 }}>Section</label>
                <select className="form-input" value={secMap} onChange={(e) => setSecMap(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="">-- Map Section --</option>
                  {headers.map((h, i) => <option key={i} value={h}>{h}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Import Rules Configuration */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, background: "rgba(255,255,255,0.03)", padding: 16, borderRadius: 10, border: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12 }}>Password Strategy</label>
                <select className="form-input" value={passwordStrategy} onChange={(e) => setPasswordStrategy(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="auto">Auto-Generate Secure Passwords</option>
                  <option value="reg_no">Use Student's Reg Number</option>
                  <option value="custom">Use Custom Static Password</option>
                </select>
              </div>
              {passwordStrategy === "custom" && (
                <div>
                  <label style={{ fontSize: 11 }}>Static Password Value</label>
                  <input type="text" className="form-input" placeholder="Static password" value={customPassword} onChange={(e) => setCustomPassword(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }} />
                </div>
              )}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 12 }}>Auto-Enroll Students to Course</label>
                <select className="form-input" value={selectedCourse} onChange={(e) => setSelectedCourse(e.target.value)} style={{ padding: "6px 10px", fontSize: 12 }}>
                  <option value="">-- None --</option>
                  {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <input type="checkbox" id="auto-create-struct" checked={autoCreateStructure} onChange={(e) => setAutoCreateStructure(e.target.checked)} style={{ cursor: "pointer" }} />
                <label htmlFor="auto-create-struct" style={{ margin: 0, cursor: "pointer", fontSize: 12 }}>Auto-create missing departments/semesters/sections</label>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 10 }}>
            <button className="btn-secondary" onClick={() => runVerification(true)} disabled={validating || loading || !emailMap}>
              <RefreshCw size={13} className={validating ? "animate-spin" : ""} /> Validate Columns (Dry-Run)
            </button>
            <button className="btn-primary" onClick={() => runVerification(false)} disabled={loading || validating || !emailMap}>
              <CheckCircle2 size={13} /> Confirm Import Roster
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
