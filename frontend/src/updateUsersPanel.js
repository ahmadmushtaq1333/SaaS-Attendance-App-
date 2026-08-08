const fs = require('fs');
const path = './src/components/admin/UsersPanel.jsx';
let content = fs.readFileSync(path, 'utf8');

content = content.replace(
  'import { Plus, UserPlus',
  'import { Plus, UserPlus, ArrowLeft, ArrowRight'
);

const cardCode = `
function DashboardActionCard({ icon: Icon, color, title, description, stats, onClick, buttonText }) {
  const [hover, React_useState] = React.useState(false);
  return (
    <div
      onMouseEnter={() => React_useState(true)}
      onMouseLeave={() => React_useState(false)}
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
        <div style={{ width: 44, height: 44, borderRadius: 12, background: \`\${color}15\`, display: "flex", alignItems: "center", justifyContent: "center", color: color, transition: "transform 0.2s ease", transform: hover ? "scale(1.05)" : "none" }}>
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
          boxShadow: \`0 4px 12px \${color}40\`, opacity: hover ? 1 : 0.9,
          display: "flex", justifyContent: "center", alignItems: "center", gap: 6
        }}
      >
        {buttonText} <ArrowRight size={14} />
      </button>
    </div>
  );
}

export default function UsersPanel({ user }) {
  const [activeView, setActiveView] = React.useState("grid");
`;
content = content.replace('export default function UsersPanel({ user }) {', cardCode);

const returnIdx = content.indexOf('  return (\n    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>\n\n      {/* ── SECTION 1: USER DIRECTORY ── */}');
if (returnIdx === -1) {
  console.error("Return statement not found");
  process.exit(1);
}

const preReturn = content.substring(0, returnIdx);

const newReturn = \`  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {activeView === "grid" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <DashboardActionCard 
            icon={Users} 
            color="var(--purple)" 
            title="Manage User Directory" 
            description="View, filter, edit, or delete existing users."
            stats={[
              { label: "Total Users", value: users.length },
              { label: "Active", value: users.filter(u => u.is_active).length }
            ]}
            buttonText="View Directory"
            onClick={() => setActiveView("directory")}
          />
          <DashboardActionCard 
            icon={UserPlus} 
            color="var(--emerald)" 
            title="User Onboarding" 
            description="Register new accounts or perform bulk imports via Excel/CSV."
            stats={[
              { label: "Pending OTP", value: users.filter(u => !u.is_email_verified).length },
              { label: "Teachers", value: users.filter(u => u.role === "teacher").length }
            ]}
            buttonText="Open Onboarding"
            onClick={() => setActiveView("onboarding")}
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
            <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(123,97,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Users size={20} color="var(--purple)" />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>User Directory</h2>
              <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>{sortedUsers.length} users matching filters</p>
            </div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <Filter size={14} color="var(--text-muted)" />
                <select className="form-input" value={universityFilter} onChange={e => setUniversityFilter(e.target.value)} style={{ width: "auto", padding: "7px 32px 7px 12px" }}>
                  <option value="all">All Universities</option>
                  {institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <ArrowUpDown size={14} color="var(--text-muted)" />
                <select className="form-input" value={sortBy} onChange={e => setSortBy(e.target.value)} style={{ width: "auto", padding: "7px 32px 7px 12px" }}>
                  <option value="email">Sort by Email</option>
                  <option value="role">Sort by Role</option>
                  <option value="university">Sort by University</option>
                  <option value="status">Sort by Status</option>
                </select>
              </div>
            </div>
          </div>

          <div className="table-container">
            <table>
              <thead><tr><th>Email / Reg No</th><th>Role</th><th>Institution</th><th>Dept / Sem / Sec</th><th>Status</th><th>Verification</th><th>Actions</th></tr></thead>
              <tbody>
                {sortedUsers.map(u => (
                  <tr key={u.id}>
                    {editingId === u.id ? (
                      <>
                        <td>
                          <input type="email" className="form-input" value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ padding: "6px 10px", marginBottom: 4 }} />
                          <input type="text" className="form-input" value={editRegNum} onChange={e => setEditRegNum(e.target.value)} placeholder="Reg Number" style={{ padding: "5px 10px", fontSize: 12, marginBottom: 4 }} />
                          <input type="password" className="form-input" value={editPassword} onChange={e => setEditPassword(e.target.value)} placeholder="New password (optional)" style={{ padding: "5px 10px", fontSize: 12 }} />
                        </td>
                        <td><select className="form-input" value={editRole} onChange={e => setEditRole(e.target.value)} style={{ padding: "6px 10px" }}><option value="student">Student</option><option value="teacher">Teacher</option><option value="admin">Administrator</option></select></td>
                        <td><select className="form-input" value={editInst} onChange={e => setEditInst(e.target.value)} style={{ padding: "6px 10px" }}><option value="">None (Global Admin)</option>{institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></td>
                        <td>
                          {editRole === "student" && <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                            <select className="form-input" value={editDept} onChange={e => setEditDept(e.target.value)} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Dept</option>{editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                            <select className="form-input" value={editSem} onChange={e => setEditSem(e.target.value)} disabled={!editDept} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Sem</option>{editSems.map(s => <option key={s.id} value={s.id}>{s.number}</option>)}</select>
                            <select className="form-input" value={editSec} onChange={e => setEditSec(e.target.value)} disabled={!editSem} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Sec</option>{editSecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
                          </div>}
                          {editRole === "teacher" && <select className="form-input" value={editDept} onChange={e => setEditDept(e.target.value)} style={{ padding: "5px 10px", fontSize: 12 }}><option value="">Dept</option>{editDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}
                          {editRole === "admin" && <span style={{ color: "var(--text-muted)" }}>—</span>}
                        </td>
                        <td><select className="form-input" value={editIsActive ? "active" : "disabled"} onChange={e => setEditIsActive(e.target.value === "active")} style={{ padding: "6px 10px" }}><option value="active">Active</option><option value="disabled">Disabled</option></select></td>
                        <td><select className="form-input" value={editIsEmailVerified ? "verified" : "pending"} onChange={e => setEditIsEmailVerified(e.target.value === "verified")} style={{ padding: "6px 10px" }}><option value="verified">Verified</option><option value="pending">Pending OTP</option></select></td>
                        <td><div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 120 }}>
                          <button onClick={() => handleSaveEdit(u.id)} disabled={loading} className="btn-primary" style={{ padding: "6px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }} title="Confirm Changes">
                            <Check size={13} /> {loading ? "Saving…" : "Confirm Changes"}
                          </button>
                          <button onClick={() => setEditingId(null)} disabled={loading} className="btn-secondary" style={{ padding: "5px 10px", fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 4 }} title="Cancel">
                            <X size={13} /> Cancel
                          </button>
                        </div></td>
                      </>
                    ) : (
                      <>
                        <td>
                          <div style={{ fontWeight: 600 }}>{u.email}</div>
                          {u.registration_number && (
                            <div style={{ fontSize: 11, color: "var(--cyan)", marginTop: 2, fontFamily: "monospace" }}>
                              Reg: {u.registration_number}
                            </div>
                          )}
                        </td>
                        <td>{roleBadge(u.role)}</td>
                        <td style={{ fontSize: 13 }}>{u.institution_name || <span style={{ color: "var(--text-muted)" }}>Global Admin</span>}</td>
                        <td>
                          {u.role === "student" ? <div style={{ fontSize: 12, color: "var(--text-secondary)" }}><div>Dept: {u.department_name || "—"}</div><div>Sem: {u.semester_number || "—"}</div><div>Sec: {u.section_name || "—"}</div></div>
                           : u.role === "teacher" ? <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>Dept: {u.department_name || "—"}</div>
                           : <span style={{ color: "var(--text-muted)" }}>—</span>}
                        </td>
                        <td><span className={`badge \${u.is_active ? "badge-good" : "badge-defaulter"}`}>{u.is_active ? "Active" : "Disabled"}</span></td>
                        <td>
                          <span className={`badge \${u.is_email_verified ? "badge-good" : "badge-defaulter"}`}>
                            {u.is_email_verified ? "Verified" : "Pending OTP"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => {
                              setEditingId(u.id);
                              setEditEmail(u.email);
                              setEditRole(u.role);
                              const instId = u.institution || u.computed_institution || "";
                              const deptId = u.department || u.computed_department || "";
                              const semId = u.semester || u.computed_semester || "";
                              const secId = u.section || "";
                              setEditInst(instId ? String(instId) : "");
                              setEditDept(deptId ? String(deptId) : "");
                              setEditSem(semId ? String(semId) : "");
                              setEditSec(secId ? String(secId) : "");
                              setEditIsActive(u.is_active);
                              setEditPassword("");
                              setEditRegNum(u.registration_number || "");
                              setEditIsEmailVerified(u.is_email_verified);
                            }} className="btn-secondary" style={{ padding: "6px 12px", fontSize: 13 }}><Edit size={12} /> Edit</button>
                            <button onClick={() => handleDelete(u.id)} className="btn-danger" style={{ padding: "6px 12px", fontSize: 13 }}><Trash size={12} /> Delete</button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
                {users.length === 0 && <tr><td colSpan="7" style={{ textAlign: "center", padding: "30px 0", color: "var(--text-muted)" }}>No users found.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeView === "onboarding" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* REGISTER NEW USER */}
          <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(57,217,138,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <UserPlus size={20} color="var(--emerald)" />
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Register Individual User</h2>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Create an account directly</p>
              </div>
            </div>
            
            <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div><label>Email</label><input type="email" className="form-input" value={email} onChange={e => setEmail(e.target.value)} placeholder="user@mit.edu" required /></div>
                <div><label>Registration Number</label><input type="text" className="form-input" value={registrationNumber} onChange={e => setRegistrationNumber(e.target.value)} placeholder="e.g. CS-2026-105" /></div>
                <div><label>Password</label><input type="password" className="form-input" value={password} onChange={e => setPassword(e.target.value)} placeholder="password123" required /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div><label>Role</label>
                  <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div><label>Institution</label>
                  <select className="form-input" value={selectedInst} onChange={e => setSelectedInst(e.target.value)} disabled={!user?.is_superuser}>
                    {user?.is_superuser ? (
                      <>
                        <option value="">-- Global (No Institution) --</option>
                        {institutions.map(i => <option key={i.id} value={String(i.id)}>{i.name}</option>)}
                      </>
                    ) : (
                      institutions.filter(i => i.id === user.institution).map(i => (
                        <option key={i.id} value={String(i.id)}>{i.name}</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              {role === "student" && (
                <div style={{ background: "rgba(255,255,255,0.04)", padding: 12, borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)" }}>
                  {selectedInst && departments.length === 0 && (
                    <div className="alert alert-warning" style={{ marginBottom: 10 }}><AlertTriangle size={14} />No departments yet. Set up hierarchy first.</div>
                  )}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                    <div><label>Dept</label>
                      <select className="form-input" value={selectedDept} onChange={e => setSelectedDept(e.target.value)} disabled={!departments.length}>
                        <option value="">Select</option>
                        {departments.map(d => <option key={d.id} value={String(d.id)}>{d.name}</option>)}
                      </select>
                    </div>
                    <div><label>Semester</label>
                      <select className="form-input" value={selectedSem} onChange={e => setSelectedSem(e.target.value)} disabled={!selectedDept || !semesters.length}>
                        <option value="">Select</option>
                        {semesters.map(s => <option key={s.id} value={String(s.id)}>Sem {s.number}</option>)}
                      </select>
                    </div>
                    <div><label>Section</label>
                      <select className="form-input" value={selectedSec} onChange={e => setSelectedSec(e.target.value)} disabled={!selectedSem || !sections.length}>
                        <option value="">Select</option>
                        {sections.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
              )}
              {role === "teacher" && (
                <div><label>Department</label>
                  <select className="form-input" value={selectedDept} onChange={e => setSelectedDept(e.target.value)}>
                    <option value="">-- Select Department --</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button type="submit" className="btn-primary" disabled={loading}><Plus size={15} /> Register User</button>
              </div>
            </form>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {/* BULK GENERATE */}
            <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(46,230,255,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Plus size={20} color="var(--cyan)" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Bulk Generator</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Auto-create student accounts</p>
                </div>
              </div>
              
              {bulkSuccessMsg && <div className="alert alert-success" style={{ marginBottom: 12 }}>{bulkSuccessMsg}</div>}
              {bulkError && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{bulkError}</div>}
              
              <form onSubmit={handleBulkGenerate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label>Inst</label><select className="form-input" value={bulkInst} onChange={e => setBulkInst(e.target.value)}><option value="">--</option>{institutions.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}</select></div>
                  <div><label>Dept</label><select className="form-input" value={bulkDept} onChange={e => setBulkDept(e.target.value)} disabled={!bulkInst}><option value="">--</option>{bulkDepts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label>Sem</label><select className="form-input" value={bulkSem} onChange={e => setBulkSem(e.target.value)} disabled={!bulkDept}><option value="">--</option>{bulkSems.map(s => <option key={s.id} value={s.id}>{s.number}</option>)}</select></div>
                  <div><label>Sec</label><select className="form-input" value={bulkSec} onChange={e => setBulkSec(e.target.value)} disabled={!bulkSem}><option value="">--</option>{bulkSecs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div><label>Prefix</label><input type="text" className="form-input" value={bulkPrefix} onChange={e => setBulkPrefix(e.target.value)} placeholder="std_" required /></div>
                  <div><label>Count</label><input type="number" className="form-input" min="1" max="100" value={bulkCount} onChange={e => setBulkCount(e.target.value)} required /></div>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
                  <button type="submit" className="btn-primary" disabled={bulkLoading || !bulkSec}>{bulkLoading ? "Generating…" : "Generate"}</button>
                </div>
              </form>

              {generatedAccounts.length > 0 && (
                <div style={{ marginTop: 20, padding: 20, background: "rgba(57,217,138,0.06)", border: "1px solid rgba(57,217,138,0.25)", borderRadius: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h4 style={{ margin: 0, color: "var(--emerald)", display: "flex", alignItems: "center", gap: 8 }}>
                      <Check size={18} /> Generated Credentials ({generatedAccounts.length})
                    </h4>
                    <button className="btn-secondary" style={{ padding: "7px 14px", fontSize: 13 }} onClick={downloadCredentialsAsCSV}>
                      <Download size={14} /> Download CSV
                    </button>
                  </div>
                  <div className="table-container" style={{ maxHeight: 260, overflowY: "auto" }}>
                    <table>
                      <thead><tr><th>Email</th><th>Password</th></tr></thead>
                      <tbody>
                        {generatedAccounts.map((acc, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 600 }}>{acc.email}</td>
                            <td><code style={{ background: "rgba(57,217,138,0.08)", color: "var(--emerald)", padding: "2px 7px", borderRadius: 5, fontSize: 12 }}>{acc.password}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* BATCH IMPORT EXCEL */}
            <div style={{ background: "var(--glass-b)", border: "1px solid var(--glass-border)", borderRadius: 16, padding: "20px 24px", backdropFilter: "blur(12px)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: "rgba(57,217,138,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <FileSpreadsheet size={20} color="var(--emerald)" />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>Excel / CSV Import</h2>
                  <p style={{ margin: 0, fontSize: 13, color: "var(--text-muted)" }}>Import accounts from file</p>
                </div>
              </div>
              <ExcelImportPanel user={user} onImportComplete={fetchUsers} />
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger" style={{ marginTop: 16 }}>{error}</div>}
    </div>
  );
}
\`;

fs.writeFileSync(path, preReturn + newReturn);
