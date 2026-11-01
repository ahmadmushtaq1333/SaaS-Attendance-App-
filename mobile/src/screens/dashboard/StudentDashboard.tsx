import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  BackHandler,
  FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Home,
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
  AlertTriangle,
  Info,
  ArrowLeft,
  ChevronRight,
  Clock,
  Sparkles,
  Share2,
} from 'lucide-react-native';
import { useAuthStore } from '@/entities/user';
import { studentApi, StudentCourse, CourseDetail } from '@/entities/session/api/student-api';
import { QRScannerModal } from './QRScannerModal';
import NetInfo from '@react-native-community/netinfo';
import { offlineSync } from '@/shared/offline/offlineSync';
import { AttendanceSafetyCalculator, SafetyBadge } from '@/features/calculate-safety';
import { useAppColors, useThemeStore, Radius, FontSize } from '@/shared/constants/theme';
import { AppBackground, GlassNavBar, DashboardActionCard, BottomTabBar, TabItem, ProgressRing } from '@/shared/ui';
import { haptic } from '@/shared/lib/haptics';
import { shareAttendanceSummary } from '@/shared/lib/exportAttendanceCard';

interface CourseRowProps {
  course: StudentCourse;
  onPress: (course: StudentCourse) => void;
  colors: ReturnType<typeof useAppColors>;
}

const CourseRow = React.memo<CourseRowProps>(({ course, onPress, colors }) => {
  const pct = course.attendance_percentage;
  const pctCol = pct >= 75 ? colors.emerald : pct >= 50 ? colors.warning : colors.danger;

  return (
    <TouchableOpacity
      style={[
        styles.courseRow,
        {
          backgroundColor: colors.glassC,
          borderColor: course.is_at_risk ? 'rgba(248,113,113,0.3)' : colors.glassBorder,
        },
      ]}
      onPress={() => onPress(course)}
      activeOpacity={0.75}
    >
      <View
        style={[
          styles.courseIconBox,
          { backgroundColor: `${pctCol}18` },
        ]}
      >
        <BookOpen size={20} color={pctCol} />
      </View>
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
        <Text style={[styles.coursePct, { color: pctCol }]}>
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
  );
});

CourseRow.displayName = 'CourseRow';

interface SessionLogRowProps {
  session: { session_id: number; session_number?: number; date: string; time: string; present: boolean };
  colors: ReturnType<typeof useAppColors>;
}

const SessionLogRow = React.memo<SessionLogRowProps>(({ session: s, colors }) => {
  return (
    <View
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
  );
});

SessionLogRow.displayName = 'SessionLogRow';

type ViewMode = 'grid' | 'attendance' | 'detail' | 'safety';

export const StudentDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const colors = useAppColors();
  const isLightMode = useThemeStore((s) => s.isLightMode);

  const [activeView, setActiveView] = useState<ViewMode>('grid');
  const [scannerVisible, setScannerVisible] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' | 'warning' } | null>(null);
  const [courses, setCourses] = useState<StudentCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<StudentCourse | null>(null);
  const [courseDetail, setCourseDetail] = useState<CourseDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'risk'>('all');
  const [refreshing, setRefreshing] = useState(false);

  const [isOnline, setIsOnline] = useState(true);
  const [offlineCount, setOfflineCount] = useState(0);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeView === 'detail') {
        setActiveView('attendance');
        setSelectedCourse(null);
        setCourseDetail(null);
        return true;
      }
      if (activeView !== 'grid') {
        setActiveView('grid');
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [activeView]);

  // Exact matching displayName logic from web Scanner.jsx line 35-36:
  const fallbackName = user?.email?.split('@')[0]?.split('.')[0];
  const displayName = user?.full_name || (fallbackName ? fallbackName.charAt(0).toUpperCase() + fallbackName.slice(1) : 'Student');

  const isProcessingScanRef = useRef(false);

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

  const triggerSync = useCallback(async () => {
    const count = await offlineSync.getPendingScansCount();
    if (count > 0) {
      setStatusMsg({ text: 'Syncing offline records...', type: 'info' });
      try {
        const res = await offlineSync.syncOfflineScans();
        if (res.expired_count && res.expired_count > 0) {
          haptic.warning();
          setStatusMsg({
            text: `Synced ${res.success_count} scan(s). ${res.expired_count} expired while offline.`,
            type: 'warning',
          });
        } else {
          haptic.success();
          setStatusMsg({ text: `Successfully synced ${res.success_count} scans!`, type: 'success' });
        }
        setOfflineCount(0);
        fetchSummary();
      } catch {
        haptic.error();
        setStatusMsg({ text: 'Sync failed. Will retry later.', type: 'error' });
      }
      setTimeout(() => setStatusMsg(null), 4000);
    }
  }, [fetchSummary]);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      const online = !!state.isConnected;
      setIsOnline(online);
      if (online) {
        triggerSync();
      }
    });
    return unsubscribe;
  }, [triggerSync]);

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

  const fetchCourseDetail = useCallback(async (courseId: number) => {
    setDetailLoading(true);
    try {
      const data = await studentApi.getCourseDetail(courseId);
      setCourseDetail(data);
    } catch {
      setStatusMsg({ text: 'Failed to load session history.', type: 'error' });
    } finally {
      setDetailLoading(false);
    }
  }, []);

  const handleQRScanned = useCallback(async (tokenUuid: string) => {
    if (isProcessingScanRef.current) return;
    isProcessingScanRef.current = true;
    setScannerVisible(false);

    if (!isOnline) {
      await offlineSync.saveScanOffline(tokenUuid);
      setOfflineCount((prev) => prev + 1);
      haptic.medium();
      setStatusMsg({ text: 'Offline: Scan saved. Will sync when connected.', type: 'info' });
      setTimeout(() => setStatusMsg(null), 4000);
      isProcessingScanRef.current = false;
      return;
    }

    setStatusMsg({ text: 'Processing attendance scan…', type: 'info' });
    try {
      const res = await studentApi.markAttendance(tokenUuid);
      if (res?.already_recorded) {
        haptic.warning();
        setStatusMsg({
          text: res?.message || 'Already Recorded: You cannot mark attendance more than once for this session.',
          type: 'warning',
        });
      } else {
        haptic.success();
        setStatusMsg({ text: 'Attendance marked successfully! ✓', type: 'success' });
      }
      fetchSummary();
    } catch (err: any) {
      haptic.error();
      const msg = err.response?.data?.error || 'Error marking attendance';
      setStatusMsg({ text: msg, type: 'error' });
    } finally {
      isProcessingScanRef.current = false;
    }
    setTimeout(() => setStatusMsg(null), 4000);
  }, [isOnline, fetchSummary]);

  const handleShareSummary = useCallback(async () => {
    if (courses.length === 0) return;
    haptic.light();
    try {
      await shareAttendanceSummary(courses, displayName);
      haptic.success();
    } catch (err: any) {
      haptic.error();
      setStatusMsg({ text: err.message || 'Could not share attendance report.', type: 'error' });
    }
  }, [courses, displayName]);

  const { totalAttended, totalSessions, overallPct, atRiskCount } = useMemo(() => {
    let att = 0;
    let tot = 0;
    courses.forEach((c) => {
      att += c.attended_count || 0;
      tot += c.total_sessions || 0;
    });
    return {
      totalAttended: att,
      totalSessions: tot,
      overallPct: tot > 0 ? Math.round((att / tot) * 100) : 100,
      atRiskCount: courses.filter((c) => c.is_at_risk).length,
    };
  }, [courses]);
  const filteredCourses = useMemo(
    () => courses.filter((c) => (attendanceFilter === 'risk' ? c.is_at_risk : true)),
    [courses, attendanceFilter]
  );

  const bottomTabs = useMemo<TabItem[]>(() => [
    { id: 'grid', label: 'Overview', icon: Home },
    { id: 'scan', label: 'Scan QR', icon: ScanLine },
    { id: 'attendance', label: 'Courses', icon: BookOpen, badge: atRiskCount > 0 ? `${atRiskCount}` : undefined },
    { id: 'safety', label: 'Safety', icon: Shield },
  ], [atRiskCount]);

  const handleTabPress = useCallback((id: string) => {
    if (id === 'scan') {
      setScannerVisible(true);
      return;
    }
    if (id === 'grid') {
      setSelectedCourse(null);
      setCourseDetail(null);
      setActiveView('grid');
      return;
    }
    if (id === 'attendance') {
      setAttendanceFilter('all');
      setSelectedCourse(null);
      setCourseDetail(null);
      setActiveView('attendance');
      return;
    }
    if (id === 'safety') {
      setActiveView('safety');
      return;
    }
  }, []);

  const pctColor = useCallback(
    (pct: number) => (pct >= 75 ? colors.emerald : pct >= 50 ? colors.warning : colors.danger),
    [colors.emerald, colors.warning, colors.danger]
  );

  if (activeView === 'safety') {
    return (
      <AppBackground>
        <SafeAreaView style={styles.safeArea}>
          <GlassNavBar />
          <View style={{ flex: 1 }}>
            <AttendanceSafetyCalculator courses={courses} onBack={() => setActiveView('grid')} />
          </View>
          <BottomTabBar
            tabs={bottomTabs}
            activeTab="safety"
            onSelectTab={handleTabPress}
          />
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
          {/* ── Interactive Welcome Hero (matches web Scanner.jsx lines 208-252) ── */}
          <View
            style={[
              styles.heroCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.glassBorder,
                shadowOpacity: isLightMode ? 0.04 : 0.2,
              },
            ]}
          >
            {/* Title & Subtitle */}
            <Text style={[styles.heroGreeting, { color: colors.textPrimary }]}>
              Hello, {displayName} 👋
            </Text>
            <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
              Here's your quick attendance overview.
            </Text>

            {/* Online/Offline status pill */}
            <View style={styles.statusPillsRow}>
              <View
                style={[
                  styles.onlineBadge,
                  {
                    backgroundColor: isOnline
                      ? isLightMode
                        ? 'rgba(37, 99, 235, 0.08)'
                        : 'rgba(79, 142, 247, 0.12)'
                      : isLightMode
                      ? 'rgba(220, 38, 38, 0.08)'
                      : 'rgba(248, 113, 113, 0.12)',
                    borderColor: isOnline
                      ? isLightMode
                        ? 'rgba(37, 99, 235, 0.20)'
                        : 'rgba(79, 142, 247, 0.25)'
                      : isLightMode
                      ? 'rgba(220, 38, 38, 0.20)'
                      : 'rgba(248, 113, 113, 0.25)',
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
                <View
                  style={[
                    styles.queuedBadge,
                    {
                      backgroundColor: isLightMode ? 'rgba(217, 119, 6, 0.12)' : 'rgba(251, 191, 36, 0.15)',
                      borderColor: isLightMode ? 'rgba(217, 119, 6, 0.25)' : 'rgba(251, 191, 36, 0.3)',
                    },
                  ]}
                >
                  <Text style={[styles.queuedText, { color: colors.warning }]}>
                    {offlineCount} queued
                  </Text>
                </View>
              )}
            </View>

            {/* Clickable Quick Filters / KPI Cards matching web Scanner.jsx lines 225-251 */}
            <View style={styles.kpiRow}>
              {/* Overall Standing Card */}
              <TouchableOpacity
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: isLightMode ? '#F8FAFC' : colors.glassC,
                    borderColor: isLightMode ? '#E2E8F0' : colors.glassBorder,
                  },
                ]}
                onPress={() => {
                  setAttendanceFilter('all');
                  setActiveView('attendance');
                }}
                activeOpacity={0.75}
              >
                <ProgressRing
                  pct={totalSessions === 0 ? 0 : overallPct}
                  size={46}
                  stroke={4}
                  color={
                    totalSessions === 0
                      ? colors.textMuted
                      : overallPct >= 75
                      ? colors.emerald
                      : colors.warning
                  }
                  trackColor={isLightMode ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.08)'}
                />
                <View style={styles.kpiTextContainer}>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
                    Overall Standing
                  </Text>
                  <Text
                    style={[
                      styles.kpiValue,
                      {
                        color:
                          totalSessions === 0
                            ? colors.textPrimary
                            : overallPct >= 75
                            ? colors.emerald
                            : colors.warning,
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
                  styles.kpiCard,
                  {
                    backgroundColor: isLightMode ? '#F8FAFC' : colors.glassC,
                    borderColor: isLightMode ? '#E2E8F0' : colors.glassBorder,
                    opacity: atRiskCount === 0 ? 0.9 : 1,
                  },
                ]}
                onPress={() => {
                  if (atRiskCount > 0) {
                    setAttendanceFilter('risk');
                    setActiveView('attendance');
                  }
                }}
                activeOpacity={atRiskCount > 0 ? 0.75 : 1}
              >
                <View
                  style={[
                    styles.riskIconCircle,
                    {
                      backgroundColor:
                        atRiskCount > 0
                          ? isLightMode
                            ? 'rgba(220, 38, 38, 0.12)'
                            : 'rgba(248, 113, 113, 0.15)'
                          : isLightMode
                          ? 'rgba(37, 99, 235, 0.08)'
                          : 'rgba(79, 142, 247, 0.12)',
                    },
                  ]}
                >
                  {atRiskCount > 0 ? (
                    <TrendingDown size={22} color={colors.danger} />
                  ) : (
                    <CheckCircle2 size={22} color={colors.emerald} />
                  )}
                </View>
                <View style={styles.kpiTextContainer}>
                  <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>
                    Courses at Risk
                  </Text>
                  <View style={styles.riskValueRow}>
                    <Text
                      style={[
                        styles.kpiValue,
                        { color: atRiskCount > 0 ? colors.danger : colors.emerald },
                      ]}
                    >
                      {atRiskCount}
                    </Text>
                    {atRiskCount === 0 && (
                      <Text style={[styles.safeTag, { color: colors.emerald }]}>
                        Safe
                      </Text>
                    )}
                  </View>
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
                      : statusMsg.type === 'warning'
                      ? isLightMode ? 'rgba(217, 119, 6, 0.12)' : 'rgba(251, 191, 36, 0.15)'
                      : 'rgba(167, 139, 250, 0.12)',
                  borderColor:
                    statusMsg.type === 'success'
                      ? colors.emerald
                      : statusMsg.type === 'error'
                      ? colors.danger
                      : statusMsg.type === 'warning'
                      ? colors.warning
                      : colors.purple,
                },
              ]}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle size={16} color={colors.emerald} style={{ flexShrink: 0 }} />
              ) : statusMsg.type === 'error' ? (
                <AlertCircle size={16} color={colors.danger} style={{ flexShrink: 0 }} />
              ) : statusMsg.type === 'warning' ? (
                <AlertTriangle size={16} color={colors.warning} style={{ flexShrink: 0 }} />
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
                        : statusMsg.type === 'warning'
                        ? colors.warning
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
                {/* B6: Share Attendance Report button */}
                <TouchableOpacity
                  style={[
                    styles.shareReportBtn,
                    {
                      borderColor: colors.glassBorder,
                      backgroundColor: colors.glassC,
                    },
                  ]}
                  onPress={handleShareSummary}
                  disabled={courses.length === 0}
                  activeOpacity={0.7}
                  accessibilityLabel="Share attendance report"
                >
                  <Share2 size={14} color={colors.purple} />
                  <Text style={[styles.shareReportText, { color: colors.purple }]}>Share</Text>
                </TouchableOpacity>
              </View>

              {/* Filter Toggles */}
              <View style={[styles.filterRow, { backgroundColor: colors.glassC, borderColor: colors.glassBorder }]}>
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
                /* Virtualized Courses List with Memoized CourseRow */
                <FlatList
                  data={filteredCourses}
                  keyExtractor={(item) => String(item.course_id)}
                  scrollEnabled={false}
                  removeClippedSubviews={false}
                  initialNumToRender={8}
                  maxToRenderPerBatch={10}
                  ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
                  renderItem={({ item: course }) => (
                    <CourseRow
                      course={course}
                      onPress={(c) => {
                        setSelectedCourse(c);
                        setActiveView('detail');
                        fetchCourseDetail(c.course_id);
                      }}
                      colors={colors}
                    />
                  )}
                />
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
                <View
                  style={[
                    styles.courseIconBox,
                    { width: 44, height: 44, backgroundColor: `${pctColor(selectedCourse.attendance_percentage)}18` },
                  ]}
                >
                  <BookOpen size={22} color={pctColor(selectedCourse.attendance_percentage)} />
                </View>
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
                <FlatList
                  data={courseDetail.session_log}
                  keyExtractor={(item) => String(item.session_id)}
                  scrollEnabled={false}
                  removeClippedSubviews={false}
                  initialNumToRender={10}
                  maxToRenderPerBatch={15}
                  ItemSeparatorComponent={() => <View style={{ height: 6 }} />}
                  renderItem={({ item: s }) => (
                    <SessionLogRow session={s} colors={colors} />
                  )}
                />
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

        {/* Floating Bottom Tab Navigation */}
        <BottomTabBar
          tabs={bottomTabs}
          activeTab={activeView === 'detail' ? 'attendance' : activeView}
          onSelectTab={handleTabPress}
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
    paddingBottom: 110,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 4,
    shadowColor: '#0B1340',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 2,
  },
  heroGreeting: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
    lineHeight: 32,
  },
  heroSub: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  statusPillsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  onlineBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  queuedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
    borderWidth: 1,
  },
  queuedText: {
    fontSize: 11,
    fontWeight: '700',
  },
  kpiRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  kpiCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  kpiTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 14,
  },
  kpiValue: {
    fontSize: 20,
    fontWeight: '700',
    marginTop: 2,
    lineHeight: 24,
  },
  riskIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  riskValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  safeTag: {
    fontSize: 11,
    fontWeight: '500',
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
  courseIconBox: {
    width: 40,
    height: 40,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
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
  shareReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
  },
  shareReportText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
