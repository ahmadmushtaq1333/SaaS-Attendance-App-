import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  FileSpreadsheet,
  ArrowLeft,
  Trash2,
  BookOpen,
  CheckSquare,
  Square,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  AlertTriangle,
} from 'lucide-react-native';
import { teacherApi } from '@/entities/session/api/teacher-api';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';
import { exportAttendanceReport } from '@/shared/lib/exportExcel';

interface ReportsPanelProps {
  courseId: number;
  courseName?: string;
  initialSessionId?: number;
  onBack: () => void;
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({
  courseId,
  courseName,
  initialSessionId,
  onBack,
}) => {
  const colors = useAppColors();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(initialSessionId || null);
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
      if (data.session_list && data.session_list.length > 0) {
        if (!initialSessionId || !data.session_list.some((s: any) => s.id === initialSessionId)) {
          setSelectedSessionId(data.session_list[data.session_list.length - 1].id);
        } else {
          setSelectedSessionId(initialSessionId);
        }
      }
    } catch (err) {
      console.error('Failed to fetch report', err);
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
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(report.students.map((s: any) => s.id)));
    }
  };

  const submitBulk = async (action: 'present' | 'absent') => {
    if (selectedIds.size === 0 || !selectedSessionId) return;
    setIsSubmitting(true);
    try {
      await teacherApi.bulkOverride(selectedSessionId, Array.from(selectedIds), action);
      await fetchReport();
      setIsSelectionMode(false);
      setSelectedIds(new Set());
    } catch (err) {
      Alert.alert('Error', 'Failed to update attendance');
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

  const handleDeleteSession = () => {
    if (!selectedSessionId) return;
    Alert.alert(
      'Delete Session',
      'Are you sure you want to permanently delete this attendance session? All student marks recorded for this session will be removed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await teacherApi.deleteSession(selectedSessionId);
              setSelectedSessionId(null);
              fetchReport();
            } catch (err) {
              Alert.alert('Error', 'Failed to delete session.');
            }
          },
        },
      ]
    );
  };

  const handleExportExcel = async () => {
    if (!report) return;
    setExporting(true);
    try {
      await exportAttendanceReport(report, courseName || `Course_${courseId}`);
    } catch (err: any) {
      Alert.alert('Export Failed', err.message || 'Could not export Excel report.');
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', backgroundColor: colors.bgDeep }]}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  const students = report?.students || [];
  const sessions = report?.session_list || [];
  const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDeep }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgMid, borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
          {courseName || 'Course Reports'}
        </Text>
        <TouchableOpacity
          onPress={handleExportExcel}
          style={[styles.exportBtn, { borderColor: `${colors.emerald}50` }]}
          disabled={exporting || !report}
          activeOpacity={0.75}
        >
          {exporting ? (
            <ActivityIndicator size="small" color={colors.emerald} />
          ) : (
            <View style={styles.exportBtnInner}>
              <FileSpreadsheet size={13} color={colors.emerald} />
              <Text style={[styles.exportBtnText, { color: colors.emerald }]}>Export</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* KPI Cards */}
        <View style={styles.kpiGrid}>
          <View style={[styles.kpiCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.kpiHeaderRow}>
              <Clock size={12} color={colors.cyan} />
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Sessions</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.cyan }]}>{report?.total_sessions || 0}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.kpiHeaderRow}>
              <Users size={12} color={colors.emerald} />
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>Enrolled</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.emerald }]}>{students.length}</Text>
          </View>
          <View style={[styles.kpiCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={styles.kpiHeaderRow}>
              <AlertTriangle size={12} color={colors.danger} />
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>At Risk</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>{report?.defaulters_list?.length || 0}</Text>
          </View>
        </View>

        {sessions.length > 0 ? (
          <View style={[styles.panel, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            {/* Session selector row */}
            <View style={[styles.sessionSelectContainer, { borderBottomColor: colors.glassBorder }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Session Attendance</Text>
                {selectedSession && (
                  <TouchableOpacity onPress={handleDeleteSession} style={styles.deleteSessionBtn} activeOpacity={0.7}>
                    <Trash2 size={12} color="#F87171" />
                    <Text style={[styles.deleteSessionText, { color: colors.danger }]}>Delete Session</Text>
                  </TouchableOpacity>
                )}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sessionPillsRow}>
                {sessions.map((s: any, idx: number) => {
                  const isSelected = s.id === selectedSessionId;
                  return (
                    <TouchableOpacity
                      key={s.id}
                      style={[
                        styles.sessionPill,
                        { backgroundColor: colors.glassC, borderColor: colors.glassBorder },
                        isSelected && { backgroundColor: `${colors.purple}25`, borderColor: colors.purple },
                      ]}
                      onPress={() => setSelectedSessionId(s.id)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.sessionPillText,
                          { color: colors.textSecondary },
                          isSelected && { color: colors.purple, fontWeight: '700' },
                        ]}
                      >
                        Session {s.session_number || idx + 1}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            <View style={styles.rosterHeader}>
              <Text style={{ color: colors.textSecondary, fontWeight: '600' }}>
                Students ({students.length})
              </Text>
              <TouchableOpacity
                style={[styles.modeBtn, { backgroundColor: `${colors.purple}18`, borderColor: `${colors.purple}40` }]}
                onPress={() => {
                  setIsSelectionMode(!isSelectionMode);
                  if (isSelectionMode) setSelectedIds(new Set());
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modeBtnText, { color: colors.purple }]}>
                  {isSelectionMode ? 'Cancel Edit' : 'Bulk Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {isSelectionMode && (
              <TouchableOpacity style={styles.selectAllRow} onPress={selectAll} activeOpacity={0.7}>
                {selectedIds.size === students.length ? (
                  <CheckSquare size={18} color={colors.purple} />
                ) : (
                  <Square size={18} color={colors.textMuted} />
                )}
                <Text style={[styles.selectAllText, { color: colors.textSecondary }]}>
                  {selectedIds.size === students.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            )}

            <View style={styles.rosterList}>
              {students.map((student: any) => {
                const isPresent = student.sessions && student.sessions[String(selectedSessionId)] === true;
                const isSelected = selectedIds.has(student.id);
                const regNo = student.registration_number || (student.email ? student.email.split('@')[0] : '—');
                const pct = student.attendance_percentage ?? 0;

                return (
                  <TouchableOpacity
                    key={student.id}
                    style={[
                      styles.studentRow,
                      { backgroundColor: colors.glassC, borderColor: colors.glassBorder },
                      isSelectionMode && isSelected && { borderColor: colors.purple, backgroundColor: `${colors.purple}12` },
                    ]}
                    disabled={!isSelectionMode}
                    onPress={() => toggleStudent(student.id)}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1, marginRight: 12 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        {isSelectionMode && (
                          isSelected ? (
                            <CheckSquare size={18} color={colors.purple} />
                          ) : (
                            <Square size={18} color={colors.textMuted} />
                          )
                        )}
                        <View>
                          <Text style={[styles.studentName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {student.full_name || student.email}
                          </Text>
                          <Text style={[styles.studentSub, { color: colors.textMuted }]}>
                            Reg: {regNo} · {pct}% Attendance
                          </Text>
                        </View>
                      </View>
                    </View>

                    {isSelectionMode ? (
                      <View
                        style={[
                          styles.statusBadge,
                          {
                            backgroundColor: isPresent ? `${colors.emerald}18` : 'rgba(255,255,255,0.06)',
                            borderColor: isPresent ? `${colors.emerald}40` : colors.glassBorder,
                          },
                        ]}
                      >
                        <Text style={{ color: isPresent ? colors.emerald : colors.textMuted, fontSize: 11, fontWeight: '700' }}>
                          {isPresent ? 'Present' : 'Absent'}
                        </Text>
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={[
                          styles.toggleBtn,
                          isPresent
                            ? { backgroundColor: 'rgba(248, 113, 113, 0.15)', borderColor: 'rgba(248, 113, 113, 0.3)' }
                            : { backgroundColor: colors.emerald },
                        ]}
                        onPress={() => toggleAttendance(student.id, isPresent)}
                        disabled={togglingId === student.id}
                        activeOpacity={0.8}
                      >
                        {togglingId === student.id ? (
                          <ActivityIndicator size="small" color={isPresent ? colors.danger : '#FFFFFF'} />
                        ) : (
                          <View style={styles.toggleBtnInner}>
                            {isPresent ? (
                              <>
                                <XCircle size={12} color={colors.danger} />
                                <Text style={[styles.toggleBtnText, { color: colors.danger }]}>Absent</Text>
                              </>
                            ) : (
                              <>
                                <CheckCircle size={12} color="#FFFFFF" />
                                <Text style={[styles.toggleBtnText, { color: '#FFFFFF' }]}>Present</Text>
                              </>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ) : (
          <View style={[styles.panel, { alignItems: 'center', paddingVertical: 40, backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <BookOpen size={40} color={colors.purple} style={{ marginBottom: 12 }} />
            <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>No Sessions Held Yet</Text>
            <Text style={{ color: colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', marginTop: 4 }}>
              Start an attendance session from your course list to begin taking attendance.
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Floating Bulk Action Bar */}
      {isSelectionMode && selectedIds.size > 0 && (
        <View style={[styles.bulkActionBar, { backgroundColor: colors.bgDeep, borderTopColor: colors.glassBorder }]}>
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <TouchableOpacity
                style={[styles.bulkBtn, { backgroundColor: colors.emerald }]}
                onPress={() => submitBulk('present')}
                activeOpacity={0.85}
              >
                <CheckCircle size={14} color="#FFFFFF" />
                <Text style={styles.bulkBtnText}>Mark Present ({selectedIds.size})</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.bulkBtn, { backgroundColor: colors.danger }]}
                onPress={() => submitBulk('absent')}
                activeOpacity={0.85}
              >
                <XCircle size={14} color="#FFFFFF" />
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
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 16,
    paddingBottom: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 6,
    flex: 1,
  },
  backText: { fontSize: FontSize.md, fontWeight: '600' },
  headerTitle: { fontSize: FontSize.lg, fontWeight: '700', flex: 2, textAlign: 'center' },
  exportBtn: {
    flex: 1,
    alignItems: 'flex-end',
  },
  exportBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(79, 142, 247, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(79, 142, 247, 0.25)',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: Radius.sm,
  },
  exportBtnText: { fontSize: FontSize.sm, fontWeight: '700' },
  content: { padding: 16, paddingBottom: 120 },
  kpiGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  kpiCard: { flex: 1, padding: 12, borderRadius: Radius.lg, borderWidth: 1, gap: 4 },
  kpiHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  kpiLabel: { fontSize: FontSize.xs, fontWeight: '600', textTransform: 'uppercase' },
  kpiValue: { fontSize: 20, fontWeight: '800' },
  panel: { padding: 16, borderRadius: Radius.lg, borderWidth: 1 },
  panelTitle: { fontSize: FontSize.md, fontWeight: '700' },
  sessionSelectContainer: { marginBottom: 14, paddingBottom: 12, borderBottomWidth: 1 },
  sessionPillsRow: { gap: 8, paddingVertical: 4 },
  sessionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  sessionPillText: { fontSize: FontSize.xs, fontWeight: '600' },
  deleteSessionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 3 },
  deleteSessionText: { fontSize: FontSize.xs, fontWeight: '600' },
  rosterHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modeBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: Radius.sm, borderWidth: 1 },
  modeBtnText: { fontWeight: '700', fontSize: FontSize.xs },
  selectAllRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, paddingHorizontal: 4 },
  selectAllText: { fontSize: FontSize.sm, fontWeight: '600' },
  rosterList: { gap: 8 },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  studentName: { fontSize: FontSize.sm, fontWeight: '600' },
  studentSub: { fontSize: FontSize.xs, marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.full, borderWidth: 1 },
  bulkActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'center',
  },
  bulkBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: Radius.md,
  },
  bulkBtnText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '700' },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 80,
    alignItems: 'center',
  },
  toggleBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  toggleBtnText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase' },
});
