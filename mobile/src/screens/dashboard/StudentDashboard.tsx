import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ScanLine,
  BookOpen,
  Shield,
  Wifi,
  WifiOff,
  TrendingDown,
  CheckCircle2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Info,
  ArrowLeft,
  ChevronRight,
  Clock,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '@/entities/user';
import { studentApi, StudentCourse, CourseDetail } from '@/entities/session/api/student-api';
import { QRScannerModal } from './QRScannerModal';
import NetInfo from '@react-native-community/netinfo';
import { offlineSync } from '@/shared/offline/offlineSync';
import { AttendanceSafetyCalculator, SafetyBadge } from '@/features/calculate-safety';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';
import { AppBackground, GlassNavBar, DashboardActionCard, ProgressRing } from '@/shared/ui';

type ViewMode = 'grid' | 'attendance' | 'detail' | 'safety';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const colors = useAppColors();

  const [activeView, setActiveView] = useState<ViewMode>('grid');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<StudentCourse | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'risk'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);

  const displayName = user?.full_name || (user?.email ? user.email.split('@')[0] : 'Student');

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

  const triggerSync = async () => {
    const count = await offlineSync.getPendingScansCount();
    if (count > 0) {
      setStatusMsg({ text: 'Syncing offline records...', type: 'info' });
      try {
        const res = await offlineSync.syncOfflineScans();
        setStatusMsg({ text: `Successfully synced ${res.success_count} scans!`, type: 'success' });
        setOfflineCount(0);
        fetchSummary();
      } catch {
        setStatusMsg({ text: 'Sync failed. Will retry later.', type: 'error' });
      }
      setTimeout(() => setStatusMsg(null), 4000);
    }
  };

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      setIsOnline(online);
      if (online) {
        triggerSync();
      }
    });
    return unsubscribe;
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSummary();
    setRefreshing(false);
  }, [fetchSummary]);

  useEffect(() => {
    fetchSummary();
  }, [fetchSummary]);

  useEffect(() => {
    offlineSync.getPendingScansCount().then(setOfflineCount);
  }, []);

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

    if (!isOnline) {
      await offlineSync.saveScanOffline(tokenUuid);
      setOfflineCount((prev) => prev + 1);
      setStatusMsg({ text: 'Offline: Scan saved. Will sync when connected.', type: 'info' });
      setTimeout(() => setStatusMsg(null), 4000);
      return;
    }

    setStatusMsg({ text: 'Processing attendance scan…', type: 'info' });
    try {
      const res: any = await studentApi.markAttendance(tokenUuid);
      if (res?.already_recorded) {
        setStatusMsg({ text: "You're already marked present for this session ✓", type: 'success' });
      } else {
        setStatusMsg({ text: 'Attendance marked successfully! ✓', type: 'success' });
      }
      fetchSummary();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Error marking attendance';
      setStatusMsg({ text: msg, type: 'error' });
    }
    setTimeout(() => setStatusMsg(null), 4000);
  };

  let totalAttended = 0;
  let totalSessions = 0;
  courses.forEach((c) => {
    totalAttended += c.attended_count || 0;
    totalSessions += c.total_sessions || 0;
  });
  const overallPct = totalSessions > 0
    ? Math.round((totalAttended / totalSessions) * 100)
    : 100;
  const atRiskCount = courses.filter((c) => c.is_at_risk).length;
  const filteredCourses = courses.filter((c) => (attendanceFilter === 'risk' ? c.is_at_risk : true));

  const pctColor = (pct: number) =>
    pct >= 75 ? colors.emerald : pct >= 50 ? colors.warning : colors.danger;

  if (activeView === 'safety') {
    return (
      <AppBackground>
        <SafeAreaView style={styles.safeArea}>
          <GlassNavBar />
          <AttendanceSafetyCalculator courses={courses} onBack={() => setActiveView('grid')} />
        </SafeAreaView>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Unified Quorum Glass Navbar */}
        <GlassNavBar />

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* ── Interactive Welcome Hero (matches web Scanner.jsx) ── */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <View style={styles.heroTopRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroGreeting, { color: colors.textPrimary }]}>
                  Hello, {displayName} 👋
                </Text>
                <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                  Here's your quick attendance overview.
                </Text>
              </View>

              {/* Online/Offline status pill */}
              <View style={styles.statusPillsRow}>
                <View
                  style={[
                    styles.onlineBadge,
                    {
                      backgroundColor: isOnline ? 'rgba(79, 142, 247, 0.12)' : 'rgba(248, 113, 113, 0.12)',
                      borderColor: isOnline ? 'rgba(79, 142, 247, 0.25)' : 'rgba(248, 113, 113, 0.25)',
                    },
                  ]}
                >
                  {isOnline ? (
                    <Wifi size={12} color={colors.emerald} />
                  ) : (
                    <WifiOff size={12} color={colors.danger} />
                  )}
                  <Text
                    style={[
                      styles.onlineBadgeText,
                      { color: isOnline ? colors.emerald : colors.danger },
                    ]}
                  >
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>

                {offlineCount > 0 && (
                  <View style={[styles.queuedBadge, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                    <Text style={[styles.queuedText, { color: colors.warning }]}>
                      {offlineCount} queued
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Quick Filter Action Cards (Overall & At Risk) */}
            <View style={styles.quickCardsRow}>
              {/* Overall Standing Card */}
              <TouchableOpacity
                style={[
                  styles.quickCard,
                  {
                    backgroundColor: colors.glassC,
                    borderColor: colors.glassBorder,
                  },
                ]}
                onPress={() => {
                  setAttendanceFilter('all');
                  setActiveView('attendance');
                }}
                activeOpacity={0.8}
              >
                <ProgressRing
                  pct={totalSessions === 0 ? 100 : overallPct}
                  size={46}
                  color={totalSessions === 0 ? colors.textMuted : overallPct >= 75 ? colors.emerald : colors.warning}
                />
                <View style={styles.quickCardText}>
                  <Text style={[styles.quickCardLabel, { color: colors.textMuted }]}>
                    Overall Standing
                  </Text>
                  <Text
                    style={[
                      styles.quickCardVal,
                      {
                        color: totalSessions === 0 ? colors.textPrimary : overallPct >= 75 ? colors.emerald : colors.warning,
                      },
                    ]}
                  >
                    {totalSessions === 0 ? '—' : `${overallPct}%`}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Courses at Risk Card */}
              <TouchableOpacity
                style={[
                  styles.quickCard,
                  {
                    backgroundColor: colors.glassC,
                    borderColor: colors.glassBorder,
                    opacity: atRiskCount === 0 ? 0.75 : 1,
                  },
                ]}
                onPress={() => {
                  if (atRiskCount > 0) {
                    setAttendanceFilter('risk');
                    setActiveView('attendance');
                  }
                }}
                activeOpacity={atRiskCount > 0 ? 0.8 : 1}
              >
                <View
                  style={[
                    styles.riskIconBox,
                    {
                      backgroundColor: atRiskCount > 0 ? 'rgba(248,113,113,0.15)' : 'rgba(79,142,247,0.12)',
                    },
                  ]}
                >
                  {atRiskCount > 0 ? (
                    <TrendingDown size={22} color={colors.danger} />
                  ) : (
                    <CheckCircle2 size={22} color={colors.emerald} />
                  )}
                </View>
                <View style={styles.quickCardText}>
                  <Text style={[styles.quickCardLabel, { color: colors.textMuted }]}>
                    Courses at Risk
                  </Text>
                  <Text
                    style={[
                      styles.quickCardVal,
                      { color: atRiskCount > 0 ? colors.danger : colors.emerald },
                    ]}
                  >
                    {atRiskCount}{' '}
                    {atRiskCount === 0 && (
                      <Text style={{ fontSize: 11, fontWeight: 'normal' }}>Safe</Text>
                    )}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Status Message Alert ── */}
          {statusMsg && (
            <View
              style={[
                styles.statusBanner,
                {
                  backgroundColor:
                    statusMsg.type === 'success'
                      ? 'rgba(79, 142, 247, 0.12)'
                      : statusMsg.type === 'error'
                      ? 'rgba(248, 113, 113, 0.12)'
                      : 'rgba(167, 139, 250, 0.12)',
                  borderColor:
                    statusMsg.type === 'success'
                      ? colors.emerald
                      : statusMsg.type === 'error'
                      ? colors.danger
                      : colors.purple,
                },
              ]}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle size={16} color={colors.emerald} style={{ flexShrink: 0 }} />
              ) : statusMsg.type === 'error' ? (
                <AlertCircle size={16} color={colors.danger} style={{ flexShrink: 0 }} />
              ) : (
                <Info size={16} color={colors.purple} style={{ flexShrink: 0 }} />
              )}
              <Text
                style={[
                  styles.statusText,
                  {
                    color:
                      statusMsg.type === 'success'
                        ? colors.emerald
                        : statusMsg.type === 'error'
                        ? colors.danger
                        : colors.purple,
                  },
                ]}
              >
                {statusMsg.text}
              </Text>
            </View>
          )}

          {/* ── Back button (when in subviews) ── */}
          {activeView !== 'grid' && (
            <TouchableOpacity
              style={[
                styles.backBtn,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.glassBorder,
                },
              ]}
              onPress={() => {
                setActiveView('grid');
                setSelectedCourse(null);
                setCourseDetail(null);
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={14} color={colors.textSecondary} />
              <Text style={[styles.backBtnText, { color: colors.textSecondary }]}>
                Back to Dashboard
              </Text>
            </TouchableOpacity>
          )}

          {/* ── Main View: Action Cards ── */}
          {activeView === 'grid' && (
            <View style={styles.actionGrid}>
              <DashboardActionCard
                icon={ScanLine}
                color={colors.emerald}
                title="Scan QR Code"
                description="Tap here to instantly open your camera and mark your attendance."
                buttonText="Open Scanner"
                onPress={() => setScannerVisible(true)}
              />
              <DashboardActionCard
                icon={BookOpen}
                color={colors.purple}
                title="Course Details"
                description="View your attendance history for all enrolled subjects."
                buttonText="View Details"
                onPress={() => {
                  setAttendanceFilter('all');
                  setActiveView('attendance');
                }}
              />
              <DashboardActionCard
                icon={Shield}
                color={colors.cyan}
                title="Attendance Safety"
                description="See how many classes you can safely miss or need to attend."
                buttonText="Check Safety"
                onPress={() => setActiveView('safety')}
              />
            </View>
          )}

          {/* ── Course Details List View ── */}
          {activeView === 'attendance' && (
            <View
              style={[
                styles.panel,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              <View style={styles.panelHeader}>
                <View style={[styles.panelIconBox, { backgroundColor: `${colors.purple}20` }]}>
                  <BookOpen size={20} color={colors.purple} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>
                    Course Details
                  </Text>
                  <Text style={[styles.panelSub, { color: colors.textMuted }]}>
                    Select a course to view history
                  </Text>
                </View>
              </View>

              {/* Filter Toggles */}
              <View style={[styles.filterRow, { borderColor: colors.glassBorder }]}>
                <TouchableOpacity
                  style={[
                    styles.filterBtn,
                    attendanceFilter === 'all' && { backgroundColor: colors.purple },
                  ]}
                  onPress={() => setAttendanceFilter('all')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterBtnText,
                      { color: attendanceFilter === 'all' ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    All Courses
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.filterBtn,
                    attendanceFilter === 'risk' && { backgroundColor: colors.danger },
                  ]}
                  onPress={() => setAttendanceFilter('risk')}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.filterBtnText,
                      { color: attendanceFilter === 'risk' ? '#FFFFFF' : colors.textSecondary },
                    ]}
                  >
                    At Risk
                  </Text>
                </TouchableOpacity>
              </View>

              {coursesLoading ? (
                <ActivityIndicator color={colors.emerald} style={{ padding: 32 }} />
              ) : filteredCourses.length === 0 ? (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No courses found in this category.
                </Text>
              ) : (
                filteredCourses.map((course) => (
                  <TouchableOpacity
                    key={course.course_id}
                    style={[
                      styles.courseRow,
                      {
                        backgroundColor: colors.glassC,
                        borderColor: course.is_at_risk ? 'rgba(248,113,113,0.3)' : colors.glassBorder,
                      },
                    ]}
                    onPress={() => {
                      setSelectedCourse(course);
                      setActiveView('detail');
                      fetchCourseDetail(course.course_id);
                    }}
                    activeOpacity={0.75}
                  >
                    <ProgressRing
                      pct={course.attendance_percentage}
                      size={48}
                      color={pctColor(course.attendance_percentage)}
                    />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.courseName, { color: colors.textPrimary }]}>
                        {course.course_name}
                      </Text>
                      <Text style={[styles.courseInst, { color: colors.textMuted }]}>
                        {course.institution_name || '—'}
                      </Text>
                      <Text style={[styles.courseSessions, { color: colors.textSecondary }]}>
                        {course.attended_count}/{course.total_sessions} sessions
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end', gap: 4 }}>
                      <Text style={[styles.coursePct, { color: pctColor(course.attendance_percentage) }]}>
                        {course.attendance_percentage}%
                      </Text>
                      {course.is_at_risk && (
                        <Text style={[styles.atRiskLabel, { color: colors.danger }]}>
                          At Risk
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={18} color={colors.textMuted} />
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}

          {/* ── Course Detail View with Session History ── */}
          {activeView === 'detail' && selectedCourse && (
            <View
              style={[
                styles.panel,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              <View style={styles.detailHeaderRow}>
                <ProgressRing
                  pct={selectedCourse.attendance_percentage}
                  size={52}
                  color={pctColor(selectedCourse.attendance_percentage)}
                />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>
                    {selectedCourse.course_name}
                  </Text>
                  <Text style={[styles.panelSub, { color: colors.textMuted }]}>
                    {selectedCourse.institution_name}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.detailPct, { color: pctColor(selectedCourse.attendance_percentage) }]}>
                    {selectedCourse.attendance_percentage}%
                  </Text>
                  <Text style={[styles.courseSessions, { color: colors.textSecondary }]}>
                    {selectedCourse.attended_count}/{selectedCourse.total_sessions} sessions
                  </Text>
                </View>
              </View>

              <View style={{ marginVertical: 6 }}>
                <SafetyBadge attended={selectedCourse.attended_count} total={selectedCourse.total_sessions} />
              </View>

              {selectedCourse.is_at_risk && (
                <View style={[styles.alertDanger, { borderColor: `${colors.danger}40` }]}>
                  <AlertCircle size={16} color={colors.danger} style={{ flexShrink: 0, marginTop: 2 }} />
                  <Text style={[styles.alertText, { color: colors.danger }]}>
                    Your attendance is below 75%. You may be at risk of academic action. Contact your instructor.
                  </Text>
                </View>
              )}

              <Text style={[styles.sectionHeading, { color: colors.textPrimary }]}>
                Session History
              </Text>

              {detailLoading ? (
                <ActivityIndicator color={colors.emerald} style={{ padding: 24 }} />
              ) : courseDetail?.session_log?.length ? (
                courseDetail.session_log.map((s) => (
                  <View
                    key={s.session_id}
                    style={[
                      styles.sessionRow,
                      {
                        backgroundColor: s.present ? 'rgba(79, 142, 247, 0.06)' : 'rgba(248, 113, 113, 0.05)',
                        borderColor: s.present ? 'rgba(79, 142, 247, 0.20)' : 'rgba(248, 113, 113, 0.15)',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.sessionIconBox,
                        {
                          backgroundColor: s.present ? 'rgba(79, 142, 247, 0.15)' : 'rgba(248, 113, 113, 0.12)',
                        },
                      ]}
                    >
                      {s.present ? (
                        <CheckCircle size={16} color={colors.emerald} />
                      ) : (
                        <XCircle size={16} color={colors.danger} />
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>
                        Session {s.session_number ?? s.session_id}
                      </Text>
                      <View style={styles.sessionMetaRow}>
                        <Clock size={11} color={colors.textMuted} />
                        <Text style={[styles.sessionDate, { color: colors.textMuted }]}>
                          {s.date} at {s.time}
                        </Text>
                      </View>
                    </View>
                    <Text
                      style={[
                        styles.sessionStatus,
                        { color: s.present ? colors.emerald : colors.danger },
                      ]}
                    >
                      {s.present ? 'Present' : 'Absent'}
                    </Text>
                  </View>
                ))
              ) : (
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No sessions have been conducted for this course yet.
                </Text>
              )}
            </View>
          )}
        </ScrollView>

        {/* ── QR Scanner Modal ── */}
        <QRScannerModal
          visible={scannerVisible}
          onClose={() => setScannerVisible(false)}
          onScanned={handleQRScanned}
        />
      </SafeAreaView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 18,
    gap: 16,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  heroGreeting: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 13,
    marginTop: 2,
  },
  statusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  onlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  queuedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  queuedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  quickCardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  quickCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.md,
    padding: 12,
    borderWidth: 1,
    gap: 10,
  },
  quickCardText: {
    flex: 1,
  },
  quickCardLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  quickCardVal: {
    fontSize: 18,
    fontWeight: '800',
    marginTop: 1,
  },
  riskIconBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statusBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
  },
  statusText: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  backBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  actionGrid: {
    gap: 14,
  },
  panel: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 18,
    gap: 14,
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  panelIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: {
    fontSize: FontSize.lg,
    fontWeight: '700',
  },
  panelSub: {
    fontSize: FontSize.xs,
    marginTop: 1,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    padding: 4,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: Radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  courseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  courseName: {
    fontSize: FontSize.md,
    fontWeight: '600',
  },
  courseInst: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  courseSessions: {
    fontSize: 11,
    marginTop: 3,
  },
  coursePct: {
    fontSize: 18,
    fontWeight: '800',
  },
  atRiskLabel: {
    fontSize: 10,
    fontWeight: '700',
  },
  detailHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailPct: {
    fontSize: 22,
    fontWeight: '800',
  },
  alertDanger: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderRadius: Radius.md,
    borderWidth: 1,
    padding: 12,
  },
  alertText: {
    fontSize: 12,
    lineHeight: 16,
    flex: 1,
  },
  sectionHeading: {
    fontSize: FontSize.md,
    fontWeight: '700',
    marginTop: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    gap: 12,
  },
  sessionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  sessionMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  sessionDate: {
    fontSize: 11,
  },
  sessionStatus: {
    fontSize: 12,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    padding: 24,
    fontSize: 13,
  },
});
