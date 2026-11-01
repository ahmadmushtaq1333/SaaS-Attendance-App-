import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Zap,
  BookOpen,
  AlertTriangle,
  Clock,
  Home,
  BarChart2,
  ChevronRight,
  ArrowRight,
  Sparkles,
} from 'lucide-react-native';
import { useAuthStore } from '@/entities/user';
import { teacherApi, Course, Session } from '@/entities/session/api/teacher-api';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';
import { AppBackground, GlassNavBar, BottomTabBar, TabItem } from '@/shared/ui';
import { haptic } from '@/shared/lib/haptics';
import { LiveSessionPanel } from './LiveSessionPanel';
import { CoursesPanel } from './CoursesPanel';
import { ReportsPanel } from './ReportsPanel';
import { HistoryPanel } from './HistoryPanel';
import { AlertsPanel } from './AlertsPanel';

type ViewMode = 'grid' | 'live' | 'courses' | 'alerts' | 'history' | 'reports';

export const TeacherDashboard: React.FC = () => {
  const { user, logout } = useAuthStore();
  const colors = useAppColors();

  const [activeView, setActiveView] = useState<ViewMode>('grid');
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeSession, setActiveSession] = useState<Session | null>(null);
  const [recentSessions, setRecentSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<number | null>(null);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeView !== 'grid') {
        setActiveView('grid');
        return true;
      }
      return false;
    });
    return () => backHandler.remove();
  }, [activeView]);

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [coursesData, sessionsData] = await Promise.all([
        teacherApi.getCourses(),
        teacherApi.getSessions(),
      ]);
      setCourses(coursesData);
      setRecentSessions(sessionsData);

      if (sessionsData.length > 0) {
        const latest = sessionsData[0];
        const expiry = new Date(latest.expiry_time).getTime();
        if (expiry > Date.now()) {
          setActiveSession(latest);
        }
      }
    } catch (err) {
      console.error('Failed to fetch teacher data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = useCallback(async (courseId: number, durationMins: number) => {
    try {
      haptic.medium();
      const session = await teacherApi.startSession(courseId, durationMins);
      setActiveSession(session);
      setActiveView('live');
      haptic.success();
    } catch (err) {
      haptic.error();
      alert('Failed to start session');
    }
  }, []);

  const handleStopSession = useCallback(async () => {
    if (!activeSession) return;
    try {
      haptic.warning();
      await teacherApi.stopSession(activeSession.id);
      setActiveSession(null);
      setActiveView('grid');
      fetchInitialData();
      haptic.success();
    } catch (err) {
      haptic.error();
      alert('Failed to stop session');
    }
  }, [activeSession]);

  const handleSelectBottomTab = useCallback((tabId: string) => {
    haptic.light();
    if (tabId === 'reports') {
      if (courses.length > 0) {
        if (!selectedCourseId) {
          setSelectedCourseId(courses[0].id);
        }
        setActiveView('reports');
      } else {
        alert('No assigned courses found.');
      }
    } else {
      setActiveView(tabId as ViewMode);
    }
  }, [courses, selectedCourseId]);

  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Teacher';

  const bottomTabs = useMemo<TabItem[]>(() => [
    { id: 'grid', label: 'Overview', icon: Home },
    { id: 'live', label: 'Live QR', icon: Zap, badge: activeSession ? '•' : undefined },
    { id: 'courses', label: 'Courses', icon: BookOpen, badge: courses.length > 0 ? courses.length : undefined },
    { id: 'reports', label: 'Reports', icon: BarChart2 },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle },
  ], [activeSession, courses.length]);

  if (loading) {
    return (
      <AppBackground>
        <SafeAreaView style={styles.safeArea}>
          <GlassNavBar />
          <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
            <ActivityIndicator size="large" color={colors.emerald} />
          </View>
        </SafeAreaView>
      </AppBackground>
    );
  }

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <GlassNavBar />

        {/* --- VIEW CONTENT --- */}
        {activeView === 'live' && (
          <LiveSessionPanel
            session={activeSession}
            linkedCourses={courses.find((c) => c.id === activeSession?.course)?.linked_courses ?? []}
            onBack={() => setActiveView('grid')}
            onStopSession={handleStopSession}
            onGoToCourses={() => setActiveView('courses')}
          />
        )}

        {activeView === 'courses' && (
          <CoursesPanel
            courses={courses}
            onBack={() => setActiveView('grid')}
            onStartSession={handleStartSession}
            onViewReports={(courseId) => {
              setSelectedCourseId(courseId);
              setSelectedSessionId(null);
              setActiveView('reports');
            }}
          />
        )}

        {activeView === 'reports' && selectedCourseId && (
          <ReportsPanel
            courseId={selectedCourseId}
            courseName={courses.find((c) => c.id === selectedCourseId)?.name}
            initialSessionId={selectedSessionId || undefined}
            courses={courses}
            onSelectCourse={(id) => {
              setSelectedCourseId(id);
              setSelectedSessionId(null);
            }}
            onBack={() => {
              setSelectedSessionId(null);
              setActiveView('grid');
            }}
          />
        )}

        {activeView === 'alerts' && (
          <AlertsPanel
            courses={courses}
            onBack={() => setActiveView('grid')}
          />
        )}

        {activeView === 'history' && (
          <HistoryPanel
            sessions={recentSessions}
            onBack={() => setActiveView('grid')}
            onEditSession={(courseId, sessionId) => {
              setSelectedCourseId(courseId);
              setSelectedSessionId(sessionId);
              setActiveView('reports');
            }}
          />
        )}

        {activeView === 'grid' && (
          <ScrollView
            style={styles.container}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Hero Header Card */}
            <View
              style={[
                styles.heroCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              <View style={styles.heroTop}>
                <View style={styles.greetingRow}>
                  <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                    {timeGreeting}, {displayName} 👋
                  </Text>
                  {activeSession ? (
                    <View style={[styles.activeLivePill, { backgroundColor: `${colors.emerald}20`, borderColor: colors.emerald }]}>
                      <View style={[styles.liveDot, { backgroundColor: colors.emerald }]} />
                      <Text style={[styles.activeLiveText, { color: colors.emerald }]}>SESSION ACTIVE</Text>
                    </View>
                  ) : (
                    <View style={[styles.activeLivePill, { backgroundColor: colors.glassC, borderColor: colors.glassBorder }]}>
                      <View style={[styles.liveDot, { backgroundColor: colors.textMuted }]} />
                      <Text style={[styles.activeLiveText, { color: colors.textMuted }]}>IDLE</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                  {activeSession
                    ? 'A live attendance session is active. Tap below to present QR or view roster.'
                    : 'All systems ready. Pick a course to launch a dynamic QR attendance session.'}
                </Text>
              </View>
            </View>

            {/* Action Cards Grid with Perfect Symmetry */}
            <View style={styles.cardsGrid}>
              {/* Live Session Card */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: activeSession ? colors.emerald : colors.glassBorder,
                  },
                ]}
                onPress={() => {
                  if (activeSession) setActiveView('live');
                  else {
                    setActiveView('courses');
                  }
                }}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: `${colors.emerald}20` }]}>
                  <Zap size={22} color={colors.emerald} />
                </View>
                <View style={styles.cardContent}>
                  <View style={styles.cardTitleRow}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                      Live Session
                    </Text>
                    {activeSession && (
                      <View style={[styles.liveBadge, { backgroundColor: `${colors.emerald}25` }]}>
                        <View style={[styles.liveDot, { backgroundColor: colors.emerald }]} />
                        <Text style={[styles.liveText, { color: colors.emerald }]}>LIVE</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    {activeSession ? 'Present rotating QR & roster' : 'Start a new session from courses'}
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* My Courses Card */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.glassBorder,
                  },
                ]}
                onPress={() => setActiveView('courses')}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: `${colors.purple}20` }]}>
                  <BookOpen size={22} color={colors.purple} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    My Courses
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    View assigned courses &amp; launch sessions
                  </Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: `${colors.purple}20` }]}>
                  <Text style={[styles.countText, { color: colors.purple }]}>
                    {courses.length}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Attendance Alerts Card */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.glassBorder,
                  },
                ]}
                onPress={() => setActiveView('alerts')}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: `${colors.danger}20` }]}>
                  <AlertTriangle size={22} color={colors.danger} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    Attendance Alerts
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    Students below the 75% threshold
                  </Text>
                </View>
                <ChevronRight size={18} color={colors.textMuted} />
              </TouchableOpacity>

              {/* Session History Card */}
              <TouchableOpacity
                style={[
                  styles.actionCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: colors.glassBorder,
                  },
                ]}
                onPress={() => setActiveView('history')}
                activeOpacity={0.8}
              >
                <View style={[styles.iconBox, { backgroundColor: `${colors.cyan}20` }]}>
                  <Clock size={22} color={colors.cyan} />
                </View>
                <View style={styles.cardContent}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                    Session History
                  </Text>
                  <Text style={[styles.cardDesc, { color: colors.textSecondary }]} numberOfLines={1}>
                    Review past attendance logs
                  </Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: `${colors.cyan}20` }]}>
                  <Text style={[styles.countText, { color: colors.cyan }]}>
                    {recentSessions.length}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* Floating Frosted Glass Bottom Navigation Bar */}
        <BottomTabBar
          tabs={bottomTabs}
          activeTab={activeView === 'history' ? 'grid' : activeView}
          onSelectTab={handleSelectBottomTab}
        />
      </SafeAreaView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 110,
  },
  heroCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#07111F',
    shadowOpacity: 0.04,
    shadowRadius: 16,
    elevation: 1,
  },
  heroTop: {
    gap: 8,
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  activeLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  activeLiveText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  heroSub: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardsGrid: {
    gap: 12,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 14,
    minHeight: 84,
    shadowColor: '#07111F',
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 1,
  },
  iconBox: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  cardDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: Radius.sm,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  countBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  countText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
