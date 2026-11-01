import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  FlatList,
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
  Sliders,
  ChevronDown,
  ArrowRight,
  TrendingUp,
} from 'lucide-react-native';
import { Course, teacherApi } from '@/entities/session/api/teacher-api';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';
import { exportAttendanceReport } from '@/shared/lib/exportExcel';
import { DashboardActionCard } from '@/shared/ui';
import { haptic } from '@/shared/lib/haptics';
import { SessionBarChart } from '@/features/session-analytics';

interface ReportsPanelProps {
  courseId: number;
  courseName?: string;
  initialSessionId?: number;
  courses?: Course[];
  onSelectCourse?: (courseId: number) => void;
  onBack: () => void;
}

interface OverrideStudentRowProps {
  student: any;
  selectedSessionId: number | null;
  isSelected: boolean;
  isSelectionMode: boolean;
  isToggling: boolean;
  onToggleSelect: (id: number) => void;
  onToggleAttendance: (studentId: number, isPresent: boolean) => void;
  colors: ReturnType<typeof useAppColors>;
}

const OverrideStudentRow = React.memo<OverrideStudentRowProps>(({
  student,
  selectedSessionId,
  isSelected,
  isSelectionMode,
  isToggling,
  onToggleSelect,
  onToggleAttendance,
  colors,
}) => {
  const isPresent = selectedSessionId && student.sessions
    ? student.sessions[String(selectedSessionId)] === true
    : false;
  const regNo = student.registration_number || (student.email ? student.email.split('@')[0] : 'N/A');

  return (
    <View
      style={[
        styles.studentRow,
        { backgroundColor: colors.glassC, borderColor: colors.glassBorder },
        isSelected && { borderColor: colors.cyan, backgroundColor: `${colors.cyan}12` },
      ]}
    >
      <TouchableOpacity
        style={styles.studentInfoArea}
        onPress={() => {
          if (isSelectionMode) onToggleSelect(student.id);
        }}
        activeOpacity={isSelectionMode ? 0.7 : 1}
      >
        {isSelectionMode && (
          <View style={{ marginRight: 10 }}>
            {isSelected ? (
              <CheckSquare size={18} color={colors.cyan} />
            ) : (
              <Square size={18} color={colors.textMuted} />
            )}
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.studentName, { color: colors.textPrimary }]} numberOfLines={1}>
            {student.full_name || student.email}
          </Text>
          <Text style={[styles.studentSub, { color: colors.textMuted }]}>
            Reg: {regNo} · {student.attendance_pct ?? 0}% overall
          </Text>
        </View>
      </TouchableOpacity>

      <View style={styles.actionCol}>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isPresent ? 'rgba(79, 142, 247, 0.15)' : 'rgba(248, 113, 113, 0.15)',
              borderColor: isPresent ? `${colors.emerald}40` : `${colors.danger}40`,
            },
          ]}
        >
          {isPresent ? (
            <CheckCircle size={10} color={colors.emerald} />
          ) : (
            <XCircle size={10} color={colors.danger} />
          )}
          <Text
            style={[
              styles.statusBadgeText,
              { color: isPresent ? colors.emerald : colors.danger },
            ]}
          >
            {isPresent ? 'Present' : 'Absent'}
          </Text>
        </View>

        {!isSelectionMode && (
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              isPresent
                ? { backgroundColor: 'rgba(248, 113, 113, 0.12)', borderColor: `${colors.danger}50` }
                : { backgroundColor: 'rgba(79, 142, 247, 0.12)', borderColor: `${colors.emerald}50` },
            ]}
            onPress={() => onToggleAttendance(student.id, isPresent)}
            disabled={isToggling}
            activeOpacity={0.75}
          >
            {isToggling ? (
              <ActivityIndicator size="small" color={isPresent ? colors.danger : colors.emerald} />
            ) : (
              <Text
                style={[
                  styles.toggleBtnText,
                  { color: isPresent ? colors.danger : colors.emerald },
                ]}
              >
                {isPresent ? 'Mark Absent' : 'Mark Present'}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
});

OverrideStudentRow.displayName = 'OverrideStudentRow';

interface SummaryStudentRowProps {
  student: any;
  totalSessions: number;
  colors: ReturnType<typeof useAppColors>;
}

const SummaryStudentRow = React.memo<SummaryStudentRowProps>(({
  student,
  totalSessions,
  colors,
}) => {
  const regNo = student.registration_number || (student.email ? student.email.split('@')[0] : 'N/A');
  const pct = student.attendance_pct ?? 0;
  const risk = pct >= 80
    ? { label: 'Good', color: colors.emerald }
    : pct >= 75
    ? { label: 'Watch', color: colors.warning }
    : { label: 'At Risk', color: colors.danger };

  return (
    <View
      style={[
        styles.summaryRow,
        { backgroundColor: colors.glassC, borderColor: colors.glassBorder },
      ]}
    >
      <View style={styles.summaryTopRow}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.studentName, { color: colors.textPrimary }]} numberOfLines={1}>
            {student.full_name || student.email}
          </Text>
          <Text style={[styles.studentSub, { color: colors.textMuted }]}>
            Reg: {regNo} · {student.attended_count ?? 0}/{totalSessions} sessions
          </Text>
        </View>

        <View style={styles.summaryBadgeCol}>
          <Text style={[styles.summaryPctText, { color: risk.color }]}>
            {pct}%
          </Text>
          <View style={[styles.riskPill, { backgroundColor: `${risk.color}18`, borderColor: `${risk.color}40` }]}>
            <Text style={[styles.riskPillText, { color: risk.color }]}>{risk.label}</Text>
          </View>
        </View>
      </View>

      <View style={[styles.progressBarTrack, { backgroundColor: colors.glassBorder }]}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${Math.min(100, Math.max(0, pct))}%`,
              backgroundColor: risk.color,
            },
          ]}
        />
      </View>
    </View>
  );
});

SummaryStudentRow.displayName = 'SummaryStudentRow';

export const ReportsPanel: React.FC<ReportsPanelProps> = ({
  courseId,
  courseName,
  initialSessionId,
  courses,
  onSelectCourse,
  onBack,
}) => {
  const colors = useAppColors();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  // View state: 'grid' (2 cards) | 'override' (session override) | 'summary' (student attendance summary)
  const [activeReportView, setActiveReportView] = useState<'grid' | 'override' | 'summary'>('grid');

  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(initialSessionId || null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [coursePickerVisible, setCoursePickerVisible] = useState(false);

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
      } else {
        setSelectedSessionId(null);
      }
    } catch (err) {
      console.error('Failed to fetch report', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleStudent = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (!report?.students) return;
    haptic.light();
    setSelectedIds((prev) => {
      if (prev.size === report.students.length) {
        return new Set();
      } else {
        return new Set(report.students.map((s: any) => s.id));
      }
    });
  }, [report?.students]);

  const submitBulk = useCallback(async (action: 'present' | 'absent') => {
    if (selectedIds.size === 0 || !selectedSessionId) return;
    haptic.medium();
    setIsSubmitting(true);
    try {
      await teacherApi.bulkOverride(selectedSessionId, Array.from(selectedIds), action);
      await fetchReport();
      setIsSelectionMode(false);
      setSelectedIds(new Set());
      haptic.success();
    } catch (err) {
      haptic.error();
      Alert.alert('Error', 'Failed to update attendance');
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedIds, selectedSessionId]);

  const toggleAttendance = useCallback(async (studentId: number, isPresent: boolean) => {
    if (!selectedSessionId) return;
    haptic.medium();
    setTogglingId(studentId);
    try {
      await teacherApi.bulkOverride(selectedSessionId, [studentId], isPresent ? 'absent' : 'present');
      await fetchReport();
    } catch (err) {
      haptic.error();
      console.error('Failed to toggle attendance manually:', err);
    } finally {
      setTogglingId(null);
    }
  }, [selectedSessionId]);

  const handleDeleteSession = useCallback(() => {
    if (!selectedSessionId) return;
    haptic.warning();
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
              haptic.success();
            } catch (err) {
              haptic.error();
              Alert.alert('Error', 'Failed to delete session.');
            }
          },
        },
      ]
    );
  }, [selectedSessionId]);

  const handleExportExcel = useCallback(async () => {
    if (!report) return;
    haptic.light();
    setExporting(true);
    try {
      await exportAttendanceReport(report, courseName || `Course_${courseId}`);
      haptic.success();
    } catch (err: any) {
      haptic.error();
      Alert.alert('Export Failed', err.message || 'Could not export Excel report.');
    } finally {
      setExporting(false);
    }
  }, [report, courseName, courseId]);

  const students = report?.students || [];
  const sessions = report?.session_list || [];
  const defaulters = report?.defaulters_list || [];
  const selectedSession = sessions.find((s: any) => s.id === selectedSessionId);

  // Present and absent counts for selected session
  const selectedPresentCount = selectedSessionId
    ? students.filter((s: any) => s.sessions && s.sessions[String(selectedSessionId)] === true).length
    : 0;
  const selectedAbsentCount = students.length - selectedPresentCount;

  // Sorted students list
  const sortedStudents = useMemo(() => {
    return [...students].sort((a: any, b: any) => {
      const regA = a.registration_number ? String(a.registration_number) : (a.email ? a.email.split('@')[0] : '');
      const regB = b.registration_number ? String(b.registration_number) : (b.email ? b.email.split('@')[0] : '');
      return regA.localeCompare(regB, undefined, { numeric: true, sensitivity: 'base' });
    });
  }, [students]);

  // Session analytics chart data points
  const chartData = useMemo(() => {
    if (!sessions.length || !students.length) return [];
    return sessions.map((s: any, idx: number) => {
      const presentCount = students.filter(
        (std: any) => std.sessions && std.sessions[String(s.id)] === true
      ).length;
      return {
        session_number: s.session_number || idx + 1,
        present_count: presentCount,
        total_count: students.length,
      };
    });
  }, [sessions, students]);

  const getRiskBadge = (pct: number) => {
    if (pct >= 80) return { label: 'Good', color: colors.emerald };
    if (pct >= 75) return { label: 'Watch', color: colors.warning };
    return { label: 'At Risk', color: colors.danger };
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.emerald} />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Loading course metrics…
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* ── Top Bar Header ── */}
      <View style={[styles.header, { backgroundColor: colors.bgMid, borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity
          onPress={() => {
            if (activeReportView !== 'grid') {
              setActiveReportView('grid');
            } else {
              onBack();
            }
          }}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ArrowLeft size={16} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>
            {activeReportView !== 'grid' ? 'Reports' : 'Back'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerTitleContainer}
          onPress={() => courses && courses.length > 1 && setCoursePickerVisible(true)}
          activeOpacity={courses && courses.length > 1 ? 0.7 : 1}
        >
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
            {courseName || 'Course Reports'}
          </Text>
          {courses && courses.length > 1 && (
            <ChevronDown size={14} color={colors.textMuted} />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleExportExcel}
          style={[styles.exportBtn, { borderColor: `${colors.emerald}50`, backgroundColor: `${colors.emerald}15` }]}
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
        {/* ── 3 Top KPI Cards (Web Parity) ── */}
        <View style={styles.kpiGrid}>
          {/* Card 1: Sessions */}
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.cardBg,
                borderTopColor: colors.cyan,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <View style={styles.kpiHeaderRow}>
              <Clock size={12} color={colors.cyan} />
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>SESSIONS HELD</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.cyan }]}>
              {report?.total_sessions || 0}
            </Text>
          </View>

          {/* Card 2: Enrolled */}
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.cardBg,
                borderTopColor: colors.emerald,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <View style={styles.kpiHeaderRow}>
              <Users size={12} color={colors.emerald} />
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>ENROLLED</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.emerald }]}>
              {students.length}
            </Text>
          </View>

          {/* Card 3: At Risk */}
          <View
            style={[
              styles.kpiCard,
              {
                backgroundColor: colors.cardBg,
                borderTopColor: colors.danger,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <View style={styles.kpiHeaderRow}>
              <AlertTriangle size={12} color={colors.danger} />
              <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>AT RISK (&lt;75%)</Text>
            </View>
            <Text style={[styles.kpiValue, { color: colors.danger }]}>
              {defaulters.length}
            </Text>
          </View>
        </View>

        {/* ── Attendance Risk Alert Banner ── */}
        {defaulters.length > 0 && (
          <View
            style={[
              styles.alertBanner,
              {
                backgroundColor: 'rgba(248, 113, 113, 0.12)',
                borderColor: 'rgba(248, 113, 113, 0.28)',
              },
            ]}
          >
            <AlertTriangle size={18} color={colors.danger} style={{ flexShrink: 0 }} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.alertTitle, { color: colors.danger }]}>Attendance Risk Alert</Text>
              <Text style={[styles.alertSub, { color: colors.textSecondary }]}>
                {defaulters.length} student{defaulters.length > 1 ? 's are' : ' is'} below the 75% attendance threshold.
              </Text>
            </View>
          </View>
        )}

        {/* ── Subview Back Button (when inside Override or Summary) ── */}
        {activeReportView !== 'grid' && (
          <TouchableOpacity
            style={[styles.subviewBackBtn, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
            onPress={() => setActiveReportView('grid')}
            activeOpacity={0.7}
          >
            <ArrowLeft size={13} color={colors.textSecondary} />
            <Text style={[styles.subviewBackText, { color: colors.textSecondary }]}>
              Back to Reports Overview
            </Text>
          </TouchableOpacity>
        )}

        {/* ── VIEW 1: Action Grid (Two Cards — Matches Web App) + Analytics ── */}
        {activeReportView === 'grid' && (
          <View style={styles.actionGrid}>
            {/* Session Attendance Analytics Bar Chart */}
            {chartData.length > 0 && (
              <View
                style={[
                  styles.chartCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.glassBorder,
                  },
                ]}
              >
                <View style={styles.chartHeader}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TrendingUp size={16} color={colors.emerald} />
                    <Text style={[styles.chartTitle, { color: colors.textPrimary }]}>
                      Attendance Trend Across Sessions
                    </Text>
                  </View>
                  <Text style={[styles.chartSub, { color: colors.textMuted }]}>
                    Dashed line = 75% target
                  </Text>
                </View>
                <SessionBarChart
                  sessions={chartData}
                  presentColor={colors.emerald}
                  warningColor={colors.warning}
                  dangerColor={colors.danger}
                  targetPct={75}
                />
              </View>
            )}

            <DashboardActionCard
              icon={Sliders}
              color={colors.purple}
              title="Session Override Panel"
              description="Review attendance for specific sessions, delete sessions, or modify student presence statuses."
              stats={[
                { label: 'Sessions', value: sessions.length, color: colors.purple },
                {
                  label: 'Selected',
                  value: selectedSession ? `Session ${selectedSession.session_number || selectedSession.id}` : (sessions.length > 0 ? 'Ready' : 'None'),
                  color: colors.textPrimary,
                },
              ]}
              buttonText="Open Override Panel"
              onPress={() => setActiveReportView('override')}
            />

            <DashboardActionCard
              icon={Users}
              color={colors.emerald}
              title="Students Attendance Summary"
              description="Inspect the full class roster, individual attendance rates, progress bars, and risk indicators."
              stats={[
                { label: 'Enrolled', value: students.length, color: colors.emerald },
                {
                  label: 'At Risk',
                  value: defaulters.length,
                  color: defaulters.length > 0 ? colors.danger : colors.emerald,
                },
              ]}
              buttonText="View Attendance Summary"
              onPress={() => setActiveReportView('summary')}
            />
          </View>
        )}

        {/* ── VIEW 2: Session Override View ── */}
        {activeReportView === 'override' && (
          sessions.length > 0 ? (
            <View style={[styles.panel, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
              {/* Session Selector Header */}
              <View style={[styles.sessionSelectContainer, { borderBottomColor: colors.glassBorder }]}>
                <View style={styles.sessionHeaderTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Sliders size={16} color={colors.purple} />
                    <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>
                      Session Override
                    </Text>
                  </View>
                  {selectedSession && (
                    <TouchableOpacity onPress={handleDeleteSession} style={styles.deleteSessionBtn} activeOpacity={0.7}>
                      <Trash2 size={12} color={colors.danger} />
                      <Text style={[styles.deleteSessionText, { color: colors.danger }]}>Delete Session</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Session Scroll Pills */}
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

                {/* Session Status Summary Bar */}
                {selectedSession && (
                  <View style={[styles.sessionStatsBar, { backgroundColor: `${colors.purple}12`, borderColor: `${colors.purple}25` }]}>
                    <View style={styles.statMetric}>
                      <Text style={[styles.statMetricLabel, { color: colors.textMuted }]}>PRESENT</Text>
                      <Text style={[styles.statMetricVal, { color: colors.emerald }]}>{selectedPresentCount}</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
                    <View style={styles.statMetric}>
                      <Text style={[styles.statMetricLabel, { color: colors.textMuted }]}>ABSENT</Text>
                      <Text style={[styles.statMetricVal, { color: colors.danger }]}>{selectedAbsentCount}</Text>
                    </View>
                    <View style={[styles.statDivider, { backgroundColor: colors.glassBorder }]} />
                    <View style={styles.statMetric}>
                      <Text style={[styles.statMetricLabel, { color: colors.textMuted }]}>TOTAL</Text>
                      <Text style={[styles.statMetricVal, { color: colors.textPrimary }]}>{students.length}</Text>
                    </View>
                  </View>
                )}
              </View>

              {/* Roster Controls Row */}
              <View style={styles.rosterHeader}>
                <Text style={{ color: colors.textSecondary, fontWeight: '700', fontSize: 13 }}>
                  Class Roster ({students.length})
                </Text>
                <TouchableOpacity
                  style={[styles.modeBtn, { backgroundColor: `${colors.purple}15`, borderColor: `${colors.purple}35` }]}
                  onPress={() => {
                    setIsSelectionMode(!isSelectionMode);
                    setSelectedIds(new Set());
                  }}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.modeBtnText, { color: colors.purple }]}>
                    {isSelectionMode ? 'Cancel Selection' : 'Bulk Edit'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Select All Row */}
              {isSelectionMode && (
                <TouchableOpacity
                  style={[styles.selectAllRow, { borderColor: colors.glassBorder, backgroundColor: colors.glassC }]}
                  onPress={selectAll}
                  activeOpacity={0.7}
                >
                  {selectedIds.size === students.length ? (
                    <CheckSquare size={16} color={colors.cyan} />
                  ) : (
                    <Square size={16} color={colors.textMuted} />
                  )}
                  <Text style={[styles.selectAllText, { color: colors.textPrimary }]}>
                    Select All ({selectedIds.size}/{students.length} selected)
                  </Text>
                </TouchableOpacity>
              )}

              {/* Virtualized Student Rows with Memoized OverrideStudentRow */}
              <View style={styles.studentList}>
                <FlatList
                  data={sortedStudents}
                  keyExtractor={(item) => String(item.id)}
                  scrollEnabled={false}
                  removeClippedSubviews={false}
                  initialNumToRender={10}
                  maxToRenderPerBatch={15}
                  renderItem={({ item: student }) => (
                    <OverrideStudentRow
                      student={student}
                      selectedSessionId={selectedSessionId}
                      isSelected={selectedIds.has(student.id)}
                      isSelectionMode={isSelectionMode}
                      isToggling={togglingId === student.id}
                      onToggleSelect={toggleStudent}
                      onToggleAttendance={toggleAttendance}
                      colors={colors}
                    />
                  )}
                />
              </View>
            </View>
          ) : (
            <View style={[styles.panel, styles.center, { paddingVertical: 40, backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
              <BookOpen size={40} color={colors.purple} style={{ marginBottom: 12 }} />
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>No Sessions Held Yet</Text>
              <Text style={{ color: colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', marginTop: 4, maxWidth: 300 }}>
                Start an attendance session from your course list to begin taking attendance.
              </Text>
            </View>
          )
        )}

        {/* ── VIEW 3: Students Attendance Summary View ── */}
        {activeReportView === 'summary' && (
          <View style={[styles.panel, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
            <View style={[styles.summaryHeader, { borderBottomColor: colors.glassBorder }]}>
              <Users size={16} color={colors.emerald} />
              <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>
                Students Attendance Summary ({students.length})
              </Text>
            </View>

            <View style={styles.studentList}>
              <FlatList
                data={sortedStudents}
                keyExtractor={(item) => String(item.id)}
                scrollEnabled={false}
                removeClippedSubviews={false}
                initialNumToRender={10}
                maxToRenderPerBatch={15}
                renderItem={({ item: student }) => (
                  <SummaryStudentRow
                    student={student}
                    totalSessions={report?.total_sessions || 0}
                    colors={colors}
                  />
                )}
              />
            </View>
          </View>
        )}
      </ScrollView>

      {/* ── Floating Bulk Action Bar ── */}
      {isSelectionMode && selectedIds.size > 0 && (
        <View style={[styles.bulkActionBar, { backgroundColor: colors.cardBgSolid, borderTopColor: colors.glassBorder }]}>
          {isSubmitting ? (
            <ActivityIndicator color={colors.emerald} />
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

      {/* ── Course Picker Modal ── */}
      {courses && courses.length > 1 && (
        <Modal
          visible={coursePickerVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setCoursePickerVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setCoursePickerVisible(false)}
          >
            <View style={[styles.modalCard, { backgroundColor: colors.cardBgSolid, borderColor: colors.glassBorder }]}>
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Select Course</Text>
              <ScrollView style={{ maxHeight: 300 }}>
                {courses.map((c) => {
                  const isCurrent = c.id === courseId;
                  return (
                    <TouchableOpacity
                      key={c.id}
                      style={[
                        styles.courseOption,
                        { borderColor: colors.glassBorder },
                        isCurrent && { backgroundColor: `${colors.emerald}18`, borderColor: colors.emerald },
                      ]}
                      onPress={() => {
                        setCoursePickerVisible(false);
                        if (onSelectCourse) onSelectCourse(c.id);
                      }}
                    >
                      <Text
                        style={[
                          styles.courseOptionText,
                          { color: colors.textPrimary },
                          isCurrent && { color: colors.emerald, fontWeight: '700' },
                        ]}
                      >
                        {c.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 13,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingRight: 8,
  },
  backText: {
    fontSize: 13,
    fontWeight: '600',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  exportBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  exportBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  exportBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 14,
    paddingBottom: 110,
  },
  kpiGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  kpiCard: {
    flex: 1,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderTopWidth: 2.5,
    padding: 12,
    gap: 4,
    shadowColor: '#07111F',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  kpiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  kpiLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
  },
  alertTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  alertSub: {
    fontSize: 12,
    marginTop: 2,
  },
  subviewBackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  subviewBackText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionGrid: {
    gap: 14,
  },
  panel: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    shadowColor: '#07111F',
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 1,
  },
  sessionSelectContainer: {
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  sessionHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  panelTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  deleteSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 3,
  },
  deleteSessionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sessionPillsRow: {
    gap: 8,
    paddingVertical: 2,
  },
  sessionPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  sessionPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  sessionStatsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    marginTop: 4,
  },
  statMetric: {
    flex: 1,
    alignItems: 'center',
  },
  statMetricLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  statMetricVal: {
    fontSize: 16,
    fontWeight: '800',
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 24,
  },
  rosterHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modeBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  modeBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  selectAllRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  selectAllText: {
    fontSize: 12,
    fontWeight: '600',
  },
  studentList: {
    gap: 8,
  },
  studentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  studentInfoArea: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingRight: 8,
  },
  studentName: {
    fontSize: 13,
    fontWeight: '700',
  },
  studentSub: {
    fontSize: 11,
    marginTop: 2,
  },
  actionCol: {
    alignItems: 'flex-end',
    gap: 5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  toggleBtnText: {
    fontSize: 11,
    fontWeight: '700',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  summaryRow: {
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 8,
  },
  summaryTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryBadgeCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  summaryPctText: {
    fontSize: 15,
    fontWeight: '800',
  },
  riskPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
  },
  riskPillText: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  progressBarTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  bulkActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderTopWidth: 1,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
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
  bulkBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 18,
    gap: 12,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  courseOption: {
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
    marginBottom: 8,
  },
  courseOptionText: {
    fontSize: 14,
    fontWeight: '600',
  },
  chartCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6,
  },
  chartTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  chartSub: {
    fontSize: 11,
  },
});
