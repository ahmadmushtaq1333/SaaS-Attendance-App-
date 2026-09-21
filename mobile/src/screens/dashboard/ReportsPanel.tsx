import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { Course, teacherApi } from '@/entities/session/api/teacher-api';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

interface ReportsPanelProps {
  courseId: number;
  initialSessionId?: number;
  onBack: () => void;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({ courseId, initialSessionId, onBack }) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Selection for which session to override
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(initialSessionId || null);

  // Bulk Override State
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  useEffect(() => {
    fetchReport();
  }, [courseId]);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const data = await teacherApi.getLiveReport(courseId);
      setReport(data);
      // Auto-select initial if provided, else latest session
      if (data.session_list && data.session_list.length > 0) {
        if (!initialSessionId) {
          setSelectedSessionId(data.session_list[data.session_list.length - 1].id);
        } else {
          setSelectedSessionId(initialSessionId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch report');
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const selectAll = () => {
    if (!report?.students) return;
    if (selectedIds.size === report.students.length) {
      setSelectedIds(new Set()); // Deselect all
    } else {
      setSelectedIds(new Set(report.students.map((s: any) => s.id)));
    }
  };

  const submitBulk = async (action: 'present' | 'absent') => {
    if (selectedIds.size === 0 || !selectedSessionId) return;
    setIsSubmitting(true);
    try {
      await teacherApi.bulkOverride(selectedSessionId, Array.from(selectedIds), action);
      await fetchReport(); // refresh data
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } catch (err) {
      alert('Failed to update attendance');
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleAttendance = async (studentId: number, isPresent: boolean) => {
    if (!selectedSessionId) return;
    setTogglingId(studentId);
    try {
      await teacherApi.bulkOverride(selectedSessionId, [studentId], isPresent ? 'absent' : 'present');
      await fetchReport(); 
    } catch (err) {
      console.error('Failed to toggle attendance manually:', err);
    } finally {
      setTogglingId(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.purple} />
      </View>
    );
  }

  const students = report?.students || [];
  const sessions = report?.session_list || [];
  const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Course Reports</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Sessions Held</Text>
            <Text style={[styles.kpiValue, { color: Colors.cyan }]}>{report?.total_sessions || 0}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Enrolled</Text>
            <Text style={[styles.kpiValue, { color: Colors.emerald }]}>{students.length}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>At Risk</Text>
            <Text style={[styles.kpiValue, { color: Colors.danger }]}>{report?.defaulters_list?.length || 0}</Text>
          </View>
        </View>

        {sessions.length > 0 && (
          <View style={styles.panel}>
            <Text style={styles.panelTitle}>Session Override Panel</Text>
            
            <View style={styles.sessionSelectRow}>
              <Text style={styles.label}>Editing Session:</Text>
              <Text style={styles.valueText}>Session {selectedSession?.session_number || selectedSessionId}</Text>
            </View>

            <View style={styles.rosterHeader}>
              <Text style={{ color: Colors.textSecondary, fontWeight: '600' }}>Students</Text>
              <TouchableOpacity 
                style={styles.modeBtn}
                onPress={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedIds(new Set());
                }}
              >
                <Text style={styles.modeBtnText}>{isSelectionMode ? 'Cancel Edit' : 'Bulk Edit'}</Text>
              </TouchableOpacity>
            </View>

            {isSelectionMode && (
              <TouchableOpacity style={styles.selectAllRow} onPress={selectAll}>
                <View style={[styles.checkbox, selectedIds.size === students.length && styles.checkboxChecked]} />
                <Text style={styles.selectAllText}>
                  {selectedIds.size === students.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.rosterList}>
              {students.map((student: any) => {
                const isPresent = student.sessions && student.sessions[String(selectedSessionId)] === true;
                const isSelected = selectedIds.has(student.id);

                return (
                  <TouchableOpacity 
                    key={student.id} 
                    style={[
                      styles.studentRow, 
                      isSelectionMode && isSelected && styles.studentRowSelected
                    ]}
                    disabled={!isSelectionMode}
                    onPress={() => toggleStudent(student.id)}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {isSelectionMode && (
                        <View style={[styles.checkbox, isSelected && styles.checkboxChecked]} />
                      )}
                      <Text style={styles.studentEmail}>{student.email}</Text>
                    </View>

                    {isSelectionMode ? (
                      <View style={[styles.statusBadge, isPresent ? styles.statusPresent : styles.statusAbsent]}>
                        <Text style={[styles.statusText, isPresent ? styles.textPresent : styles.textAbsent]}>
                          {isPresent ? 'Present' : 'Absent'}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity 
                        style={[styles.toggleBtn, isPresent ? styles.btnAbsent : styles.btnPresent]}
                        onPress={() => toggleAttendance(student.id, isPresent)}
                        disabled={togglingId === student.id}
                      >
                        {togglingId === student.id ? (
                          <ActivityIndicator size="small" color={isPresent ? Colors.danger : Colors.white} />
                        ) : (
                          <Text style={[styles.toggleBtnText, isPresent ? styles.textBtnAbsent : styles.textBtnPresent]}>
                            {isPresent ? 'Mark Absent' : 'Mark Present'}
                          </Text>
                        )}
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

      </ScrollView>

      {/* Floating Bulk Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <View style={styles.bulkActionBar}>
          {isSubmitting ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <>
              <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: Colors.emerald }]} onPress={() => submitBulk('present')}>
                <Text style={styles.bulkBtnText}>Mark Present ({selectedIds.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.bulkBtn, { backgroundColor: Colors.danger }]} onPress={() => submitBulk('absent')}>
                <Text style={styles.bulkBtnText}>Mark Absent ({selectedIds.size})</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDeep },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: 60, paddingBottom: 16, paddingHorizontal: 20,
    backgroundColor: Colors.bgDeep, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder,
  },
  backBtn: { padding: 8, marginLeft: -8, flex: 1, alignItems: 'flex-start' },
  backText: { color: Colors.textSecondary, fontSize: FontSize.md, fontWeight: '600' },
  headerTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700', flex: 2, textAlign: 'center' },
  headerRight: { flex: 1, alignItems: 'flex-end' },
  
  content: { padding: 24, paddingBottom: 120 },
  
  kpiGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  kpiCard: { flex: 1, backgroundColor: Colors.glassA, padding: 16, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.glassBorder },
  kpiLabel: { color: Colors.textMuted, fontSize: FontSize.xs, marginBottom: 4 },
  kpiValue: { fontSize: 24, fontWeight: '800' },

  panel: { backgroundColor: Colors.glassA, padding: 20, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.glassBorder },
  panelTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', marginBottom: 16 },
  
  sessionSelectRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 20, backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: Radius.md },
  label: { color: Colors.textSecondary, fontSize: FontSize.sm },
  valueText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },

  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modeBtn: { backgroundColor: 'rgba(167,139,250,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.md },
  modeBtnText: { color: Colors.purple, fontWeight: '700', fontSize: FontSize.sm },
  
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12, paddingHorizontal: 16 },
  selectAllText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  
  rosterList: { gap: 8 },
  studentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)', padding: 16, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  studentRowSelected: { borderColor: Colors.purple, backgroundColor: 'rgba(167,139,250,0.08)' },
  studentEmail: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '500' },
  
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  statusPresent: { backgroundColor: Colors.emeraldDim },
  statusAbsent: { backgroundColor: 'rgba(255,255,255,0.08)' },
  statusText: { fontSize: FontSize.xs, fontWeight: '700' as const },
  textPresent: { color: Colors.emerald, fontSize: FontSize.xs, fontWeight: '700' as const },
  textAbsent: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' as const },
  
  checkbox: { width: 20, height: 20, borderRadius: 4, borderWidth: 2, borderColor: Colors.textMuted },
  checkboxChecked: { backgroundColor: Colors.purple, borderColor: Colors.purple },
  
  bulkActionBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: Colors.bgDeep, padding: 20, paddingBottom: 40,
    borderTopWidth: 1, borderTopColor: Colors.glassBorder,
    flexDirection: 'row', gap: 12, justifyContent: 'center',
  },
  bulkBtn: { flex: 1, paddingVertical: 14, borderRadius: Radius.md, alignItems: 'center' },
  bulkBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },

  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, minWidth: 90, alignItems: 'center' },
  btnPresent: { backgroundColor: Colors.emerald },
  btnAbsent: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: Colors.glassBorder },
  
  textBtnPresent: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  textBtnAbsent: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },
  toggleBtnText: { textTransform: 'uppercase', letterSpacing: 0.5 },
});
