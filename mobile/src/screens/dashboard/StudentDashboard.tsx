import React, { useState, useEffect, useCallback } from 'react';
import {
  View as RNView, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert,
} from 'react-native';
// Alias back so existing JSX can still use <View>
const View = RNView;
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';
import { studentApi, StudentCourse, CourseDetail } from '@/entities/session/api/student-api';
import { useAuthStore } from '@/entities/user';
import { QRScannerModal } from './QRScannerModal';

// ── Progress Ring (pure RN, no SVG lib needed) ──────────────────────────
const ProgressRing = ({ pct, size = 52, color = Colors.emerald }: { pct: number; size?: number; color?: string }) => (
  <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 4, borderColor: 'rgba(148,187,255,0.10)',
      position: 'absolute',
    }} />
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 4,
      borderColor: color,
      borderRightColor: 'transparent',
      borderBottomColor: pct > 50 ? color : 'transparent',
      position: 'absolute',
      transform: [{ rotate: `${(pct / 100) * 360 - 90}deg` }],
    }} />
    <Text style={{ fontSize: size > 48 ? 13 : 10, fontWeight: '700', color }}>{pct}%</Text>
  </View>
);

// ── Action Card (mirrors DashboardActionCard from web) ───────────────────
const ActionCard = ({ icon, color, title, description, onPress, buttonText }: any) => (
  <TouchableOpacity style={[styles.actionCard, { borderColor: Colors.glassBorder }]} onPress={onPress} activeOpacity={0.8}>
    <View style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: 50, backgroundColor: color, opacity: 0.05 }} />
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
      <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
        <Text style={{ fontSize: 22 }}>{icon}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardDesc}>{description}</Text>
      </View>
    </View>
    <View style={[styles.cardButton, { backgroundColor: color }]}>
      <Text style={styles.cardButtonText}>{buttonText} →</Text>
    </View>
  </TouchableOpacity>
);

type View = 'grid' | 'attendance' | 'detail';

export const StudentDashboard = () => {
  const { user, logout } = useAuthStore();
  const [activeView, setActiveView] = useState<View>('grid');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<StudentCourse | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'risk'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const displayName = user?.first_name
    ? user.first_name.charAt(0).toUpperCase() + user.first_name.slice(1)
    : user?.email?.split('@')[0] ?? 'Student';

  const fetchSummary = useCallback(async () => {
    setCoursesLoading(true);
    try {
      const data = await studentApi.getAttendanceSummary();
      setCourses(data.courses || []);
    } catch {
      setStatusMsg({ text: 'Failed to load attendance data.', type: 'error' });
    } finally {
      setCoursesLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  }, [fetchSummary]);

  useEffect(() => { fetchSummary(); }, [fetchSummary]);

  const fetchCourseDetail = async (courseId: number) => {
    setDetailLoading(true);
    try {
      const data = await studentApi.getCourseDetail(courseId);
      setCourseDetail(data);
    } catch {
      setStatusMsg({ text: 'Failed to load session history.', type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  };

  const handleQRScanned = async (tokenUuid: string) => {
    setScannerVisible(false);
    setStatusMsg({ text: 'Processing attendance scan…', type: 'info' });
    try {
      await studentApi.markAttendance(tokenUuid);
      setStatusMsg({ text: '✓ Attendance marked successfully!', type: 'success' });
      fetchSummary();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error marking attendance';
      setStatusMsg({ text: msg, type: 'error' });
    }
    setTimeout(() => setStatusMsg(null), 4000);
  };

  const overallPct = courses.length > 0
    ? Math.round(courses.reduce((s, c) => s + c.attendance_percentage, 0) / courses.length)
    : 0;
  const atRiskCount = courses.filter(c => c.is_at_risk).length;
  const filteredCourses = courses.filter(c => attendanceFilter === 'risk' ? c.is_at_risk : true);

  const pctColor = (pct: number) =>
    pct >= 75 ? Colors.emerald : pct >= 50 ? Colors.warning : Colors.danger;

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.emerald} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Welcome Hero ──────────────────────────────────── */}
        <View style={styles.heroCard}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View>
              <Text style={styles.heroGreeting}>Hello, {displayName} 👋</Text>
              <Text style={styles.heroSub}>Here's your quick attendance overview.</Text>
            </View>
            <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
              <Text style={styles.logoutBtnText}>Log Out</Text>
            </TouchableOpacity>
          </View>

          {/* Stats row */}
          <View style={styles.statsRow}>
            {/* Overall */}
            <TouchableOpacity
              style={styles.statCard}
              onPress={() => { setAttendanceFilter('all'); setActiveView('attendance'); }}
              activeOpacity={0.8}
            >
              <ProgressRing pct={overallPct} size={46} color={overallPct >= 75 ? Colors.emerald : Colors.warning} />
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.statLabel}>Overall</Text>
                <Text style={[styles.statValue, { color: overallPct >= 75 ? Colors.emerald : Colors.warning }]}>
                  {overallPct}%
                </Text>
              </View>
            </TouchableOpacity>

            {/* At Risk */}
            <TouchableOpacity
              style={[styles.statCard, { opacity: atRiskCount === 0 ? 0.7 : 1 }]}
              onPress={() => { if (atRiskCount > 0) { setAttendanceFilter('risk'); setActiveView('attendance'); } }}
              activeOpacity={atRiskCount > 0 ? 0.8 : 1}
            >
              <View style={[styles.atRiskIcon, { backgroundColor: atRiskCount > 0 ? 'rgba(248,113,113,0.15)' : 'rgba(79,142,247,0.12)' }]}>
                <Text style={{ fontSize: 20 }}>{atRiskCount > 0 ? '📉' : '✅'}</Text>
              </View>
              <View style={{ marginLeft: 12 }}>
                <Text style={styles.statLabel}>At Risk</Text>
                <Text style={[styles.statValue, { color: atRiskCount > 0 ? Colors.danger : Colors.emerald }]}>
                  {atRiskCount === 0 ? 'Safe' : `${atRiskCount} courses`}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Status Message ─────────────────────────────────── */}
        {statusMsg && (
          <View style={[styles.statusBanner, {
            backgroundColor: statusMsg.type === 'success' ? 'rgba(79,142,247,0.15)' :
              statusMsg.type === 'error' ? 'rgba(248,113,113,0.15)' : 'rgba(167,139,250,0.15)',
            borderColor: statusMsg.type === 'success' ? Colors.emerald :
              statusMsg.type === 'error' ? Colors.danger : Colors.purple,
          }]}>
            <Text style={[styles.statusText, {
              color: statusMsg.type === 'success' ? Colors.emerald :
                statusMsg.type === 'error' ? Colors.danger : Colors.purple,
            }]}>{statusMsg.text}</Text>
          </View>
        )}

        {/* ── Back button ────────────────────────────────────── */}
        {activeView !== 'grid' && (
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => { setActiveView('grid'); setSelectedCourse(null); setCourseDetail(null); }}
          >
            <Text style={styles.backBtnText}>← Back to Dashboard</Text>
          </TouchableOpacity>
        )}

        {/* ── Grid View: Action Cards ─────────────────────────── */}
        {activeView === 'grid' && (
          <View style={styles.actionGrid}>
            <ActionCard
              icon="📷" color={Colors.emerald}
              title="Scan QR Code"
              description="Tap to open your camera and mark your attendance instantly."
              buttonText="Open Scanner"
              onPress={() => setScannerVisible(true)}
            />
            <ActionCard
              icon="📚" color={Colors.purple}
              title="Course Details"
              description="View your attendance history for all enrolled subjects."
              buttonText="View Details"
              onPress={() => { setAttendanceFilter('all'); setActiveView('attendance'); }}
            />
          </View>
        )}

        {/* ── Attendance List View ────────────────────────────── */}
        {activeView === 'attendance' && (
          <View style={styles.panel}>
            <View style={styles.panelHeader}>
              <View style={[styles.iconBox, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
                <Text style={{ fontSize: 22 }}>📚</Text>
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.panelTitle}>Course Details</Text>
                <Text style={styles.panelSub}>Select a course to view history</Text>
              </View>
            </View>

            {/* Filter Toggles */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[styles.filterBtn, attendanceFilter === 'all' && { backgroundColor: Colors.purple }]}
                onPress={() => setAttendanceFilter('all')}
              >
                <Text style={[styles.filterBtnText, attendanceFilter === 'all' && { color: Colors.white }]}>All Courses</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.filterBtn, attendanceFilter === 'risk' && { backgroundColor: Colors.danger }]}
                onPress={() => setAttendanceFilter('risk')}
              >
                <Text style={[styles.filterBtnText, attendanceFilter === 'risk' && { color: Colors.white }]}>At Risk</Text>
              </TouchableOpacity>
            </View>

            {coursesLoading ? (
              <ActivityIndicator color={Colors.emerald} style={{ padding: 32 }} />
            ) : filteredCourses.length === 0 ? (
              <Text style={styles.emptyText}>No courses found in this category.</Text>
            ) : (
              filteredCourses.map(course => (
                <TouchableOpacity
                  key={course.course_id}
                  style={[styles.courseRow, { borderColor: course.is_at_risk ? 'rgba(248,113,113,0.25)' : 'rgba(148,187,255,0.08)' }]}
                  onPress={() => { setSelectedCourse(course); setActiveView('detail'); fetchCourseDetail(course.course_id); }}
                  activeOpacity={0.75}
                >
                  <ProgressRing pct={course.attendance_percentage} size={48} color={pctColor(course.attendance_percentage)} />
                  <View style={{ flex: 1, marginLeft: 14 }}>
                    <Text style={styles.courseName}>{course.course_name}</Text>
                    <Text style={styles.courseInst}>{course.institution_name || '—'}</Text>
                    <Text style={styles.courseSessions}>{course.attended_count}/{course.total_sessions} sessions</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.coursePct, { color: pctColor(course.attendance_percentage) }]}>
                      {course.attendance_percentage}%
                    </Text>
                    {course.is_at_risk && <Text style={styles.atRiskLabel}>📉 At Risk</Text>}
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </TouchableOpacity>
              ))
            )}
          </View>
        )}

        {/* ── Course Detail View ────────────────────────────── */}
        {activeView === 'detail' && selectedCourse && (
          <View style={styles.panel}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 8 }}>
              <ProgressRing pct={selectedCourse.attendance_percentage} size={48}
                color={pctColor(selectedCourse.attendance_percentage)} />
              <View style={{ flex: 1, minWidth: 140 }}>
                <Text style={styles.panelTitle}>{selectedCourse.course_name}</Text>
                <Text style={styles.panelSub}>{selectedCourse.institution_name}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.detailPct, { color: pctColor(selectedCourse.attendance_percentage) }]}>
                  {selectedCourse.attendance_percentage}%
                </Text>
                <Text style={styles.courseSessions}>{selectedCourse.attended_count}/{selectedCourse.total_sessions} sessions</Text>
              </View>
            </View>

            {selectedCourse.is_at_risk && (
              <View style={styles.alertDanger}>
                <Text style={styles.alertText}>📉 Your attendance is below 75%. You may be at risk of academic action. Contact your instructor.</Text>
              </View>
            )}

            <Text style={styles.sectionHeading}>Session History</Text>

            {detailLoading ? (
              <ActivityIndicator color={Colors.emerald} style={{ padding: 24 }} />
            ) : courseDetail?.session_log?.length ? (
              courseDetail.session_log.map(s => (
                <View
                  key={s.session_id}
                  style={[styles.sessionRow, {
                    backgroundColor: s.present ? 'rgba(79,142,247,0.06)' : 'rgba(248,113,113,0.05)',
                    borderColor: s.present ? 'rgba(79,142,247,0.20)' : 'rgba(248,113,113,0.15)',
                  }]}
                >
                  <View style={[styles.sessionIcon, { backgroundColor: s.present ? 'rgba(79,142,247,0.15)' : 'rgba(248,113,113,0.12)' }]}>
                    <Text style={{ fontSize: 16 }}>{s.present ? '✅' : '❌'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionTitle}>Session {s.session_number ?? s.session_id}</Text>
                    <Text style={styles.sessionDate}>🕐 {s.date} at {s.time}</Text>
                  </View>
                  <Text style={[styles.sessionStatus, { color: s.present ? Colors.emerald : Colors.danger }]}>
                    {s.present ? 'Present' : 'Absent'}
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>No sessions have been conducted for this course yet.</Text>
            )}
          </View>
        )}

      </ScrollView>

      {/* ── QR Scanner Modal ─────────────────────────────────── */}
      <QRScannerModal
        visible={scannerVisible}
        onClose={() => setScannerVisible(false)}
        onScanned={handleQRScanned}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgDeep },
  scroll: { flex: 1 },
  scrollContent: { padding: 16, gap: 16, paddingBottom: 40 },

  // Hero
  heroCard: {
    backgroundColor: Colors.glassA, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.glassBorder, padding: 20, gap: 16,
  },
  heroGreeting: { fontSize: FontSize.xl, fontWeight: '800', color: Colors.textPrimary },
  heroSub: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  logoutBtn: { backgroundColor: 'rgba(248,113,113,0.15)', paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm },
  logoutBtnText: { color: Colors.danger, fontSize: 12, fontWeight: '600' },

  // Stats
  statsRow: { flexDirection: 'row', gap: 12 },
  statCard: {
    flex: 1, flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.glassC, borderRadius: Radius.md, padding: 12,
    borderWidth: 1, borderColor: 'rgba(148,187,255,0.05)',
  },
  statLabel: { fontSize: FontSize.xs, color: Colors.textMuted, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 20, fontWeight: '700', marginTop: 2 },
  atRiskIcon: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },

  // Status
  statusBanner: { borderRadius: Radius.md, borderWidth: 1, padding: 12 },
  statusText: { fontSize: FontSize.sm, fontWeight: '500' },

  // Back
  backBtn: { alignSelf: 'flex-start', backgroundColor: Colors.glassA, paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.sm, borderWidth: 1, borderColor: Colors.glassBorder },
  backBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },

  // Action Grid
  actionGrid: { gap: 14 },
  actionCard: {
    backgroundColor: Colors.glassA, borderRadius: Radius.lg,
    borderWidth: 1, padding: 20, gap: 16, overflow: 'hidden',
  },
  iconBox: { width: 44, height: 44, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  cardDesc: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  cardButton: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: Radius.sm, alignItems: 'center' },
  cardButtonText: { color: Colors.white, fontWeight: '600', fontSize: FontSize.sm },

  // Panel
  panel: {
    backgroundColor: Colors.glassB, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.glassBorder, padding: 20, gap: 12,
  },
  panelHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  panelTitle: { fontSize: FontSize.lg, fontWeight: '700', color: Colors.textPrimary },
  panelSub: { fontSize: FontSize.sm, color: Colors.textMuted, marginTop: 2 },

  // Filters
  filterRow: { flexDirection: 'row', gap: 8, backgroundColor: 'rgba(255,255,255,0.03)', padding: 4, borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  filterBtn: { flex: 1, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 6, alignItems: 'center' },
  filterBtnText: { fontSize: FontSize.sm, fontWeight: '600', color: Colors.textSecondary },

  // Course Row
  courseRow: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: Radius.md,
    borderWidth: 1, gap: 8,
  },
  courseName: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary },
  courseInst: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  courseSessions: { fontSize: 12, color: Colors.textMuted, marginTop: 4 },
  coursePct: { fontSize: 20, fontWeight: '700' },
  atRiskLabel: { fontSize: 11, color: Colors.danger, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.textMuted },

  // Detail
  detailPct: { fontSize: 24, fontWeight: '700' },
  alertDanger: { backgroundColor: 'rgba(248,113,113,0.12)', borderRadius: Radius.md, borderWidth: 1, borderColor: 'rgba(248,113,113,0.25)', padding: 12 },
  alertText: { color: Colors.danger, fontSize: FontSize.sm, lineHeight: 18 },
  sectionHeading: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textSecondary, marginTop: 8 },

  // Session Row
  sessionRow: { flexDirection: 'row', alignItems: 'center', padding: 10, borderRadius: Radius.md, borderWidth: 1, gap: 12 },
  sessionIcon: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  sessionTitle: { fontSize: FontSize.sm, fontWeight: '500', color: Colors.textPrimary },
  sessionDate: { fontSize: FontSize.xs, color: Colors.textMuted, marginTop: 2 },
  sessionStatus: { fontSize: 12, fontWeight: '600' },

  emptyText: { textAlign: 'center', color: Colors.textMuted, padding: 32 },
});
