import React, { useState, useEffect } from 'react';
import { BarChart2, Trash2, CheckCircle, XCircle, CheckSquare, Square, MinusSquare } from 'lucide-react';
import { formatLocalDate } from '../utils/date';

export default function SessionOverridePanel({
  sessions,
  selectedSessionId,
  onSessionChange,
  onDeleteSession,
  sessionAttendance,
  onToggle,
  onBulkOverride,
  bulkLoading,
  bulkError
}) {
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set());

  // Clear selections when session changes
  useEffect(() => {
    setSelectedStudentIds(new Set());
  }, [selectedSessionId]);

  if (!sessions || sessions.length === 0) return null;

  const handleSelectAll = () => {
    if (selectedStudentIds.size === sessionAttendance.length) {
      setSelectedStudentIds(new Set());
    } else {
      setSelectedStudentIds(new Set(sessionAttendance.map(s => s.id)));
    }
  };

  const handleSelectOne = (id) => {
    const next = new Set(selectedStudentIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudentIds(next);
  };

  const handleBulkAction = async (action) => {
    if (selectedStudentIds.size === 0) return;
    await onBulkOverride(Array.from(selectedStudentIds), action);
    setSelectedStudentIds(new Set());
  };

  const isAllSelected = sessionAttendance.length > 0 && selectedStudentIds.size === sessionAttendance.length;
  const isSomeSelected = selectedStudentIds.size > 0 && selectedStudentIds.size < sessionAttendance.length;

  return (
    <div className="glass-b panel-pad">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <h3 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 16 }}>
          <BarChart2 size={17} color="var(--purple)" />
          Session Override Panel
        </h3>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <label htmlFor="session-select" className="text-meta" style={{ whiteSpace: "nowrap" }}>Session:</label>
          <select
            id="session-select"
            className="form-input"
            value={selectedSessionId}
            onChange={(e) => onSessionChange(parseInt(e.target.value))}
            style={{ width: "auto", minWidth: 140, maxWidth: "100%", padding: "7px 32px 7px 12px" }}
          >
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                Session {s.session_number ?? s.id} · {formatLocalDate(s.start_time, false)}
              </option>
            ))}
          </select>
          <button onClick={onDeleteSession} className="btn-danger" style={{ padding: "8px 10px" }} title="Delete Session">
            <Trash2 size={15} />
          </button>
        </div>
      </div>

      {bulkError && <div className="alert alert-danger" style={{ marginBottom: 12 }}>{bulkError}</div>}

      {/* Bulk Action Toolbar */}
      {selectedStudentIds.size > 0 && (
        <div style={{ 
          display: 'flex', alignItems: 'center', gap: 12, padding: '10px 16px', 
          background: 'var(--glass-a)', border: '1px solid var(--glass-border)', 
          borderRadius: 8, marginBottom: 16 
        }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>
            {selectedStudentIds.size} selected
          </span>
          <div style={{ height: 20, width: 1, background: 'var(--glass-inner)' }} />
          <button 
            onClick={() => handleBulkAction('present')} 
            disabled={bulkLoading}
            className="btn-secondary" 
            style={{ padding: '6px 12px', fontSize: 12, color: 'var(--emerald)', borderColor: 'rgba(52,211,153,0.3)' }}
          >
            Mark Present
          </button>
          <button 
            onClick={() => handleBulkAction('absent')} 
            disabled={bulkLoading}
            className="btn-secondary" 
            style={{ padding: '6px 12px', fontSize: 12, color: 'var(--danger)', borderColor: 'rgba(248,113,113,0.3)' }}
          >
            Mark Absent
          </button>
          <button 
            onClick={() => setSelectedStudentIds(new Set())}
            style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 12, marginLeft: 'auto', cursor: 'pointer' }}
          >
            Clear selection
          </button>
        </div>
      )}

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th style={{ width: 40, textAlign: 'center' }}>
                <button 
                  onClick={handleSelectAll} 
                  style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {isAllSelected ? <CheckSquare size={16} color="var(--cyan)" /> : isSomeSelected ? <MinusSquare size={16} color="var(--cyan)" /> : <Square size={16} />}
                </button>
              </th>
              <th>Student</th>
              <th>Status</th>
              <th>Override</th>
            </tr>
          </thead>
          <tbody>
            {sessionAttendance.map(student => (
              <tr key={student.id} style={{ background: selectedStudentIds.has(student.id) ? 'var(--glass-a)' : 'transparent' }}>
                <td style={{ textAlign: 'center' }}>
                  <button 
                    onClick={() => handleSelectOne(student.id)} 
                    style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    {selectedStudentIds.has(student.id) ? <CheckSquare size={16} color="var(--cyan)" /> : <Square size={16} />}
                  </button>
                </td>
                <td style={{ fontWeight: 500 }}>{student.email}</td>
                <td>
                  <span className={`badge ${student.isPresent ? "badge-good" : "badge-defaulter"}`}>
                    {student.isPresent ? <CheckCircle size={11} /> : <XCircle size={11} />}
                    {student.isPresent ? "Present" : "Absent"}
                  </span>
                </td>
                <td>
                  <button
                    onClick={() => onToggle(student.id, student.isPresent)}
                    className={student.isPresent ? "btn-danger" : "btn-secondary"}
                    style={{ padding: "6px 14px", fontSize: 12 }}
                  >
                    {student.isPresent ? "Mark Absent" : "Mark Present"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
