import React, { useState, useEffect } from 'react';
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
} from 'lucide-react-native';
import { useAuthStore } from '@/entities/user';
import { teacherApi, Course, Session } from '@/entities/session/api/teacher-api';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';
import { AppBackground, GlassNavBar } from '@/shared/ui';
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

  const handleStartSession = async (courseId: number, durationMins: number) => {
    try {
      const session = await teacherApi.startSession(courseId, durationMins);
      setActiveSession(session);
      setActiveView('live');
    } catch (err) {
      alert('Failed to start session');
    }
  };

  const handleStopSession = async () => {
    if (!activeSession) return;
    try {
      await teacherApi.stopSession(activeSession.id);
      setActiveSession(null);
      setActiveView('grid');
      fetchInitialData();
    } catch (err) {
      alert('Failed to stop session');
    }
  };

  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Teacher';

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

  // --- SUB-PANEL RENDERING ---
  if (activeView === 'live') {
    const activeCourseMeta = courses.find((c) => c.id === activeSession?.course);
    return (
      <AppBackground>
        <SafeAreaView style={styles.safeArea}>
          <GlassNavBar />
          <LiveSessionPanel
            session={activeSession!}
            linkedCourses={activeCourseMeta?.linked_courses ?? []}
            onBack={() => setActiveView('grid')}
            onStopSession={handleStopSession}
          />
        </SafeAreaView>
      </AppBackground>
    );
  }

  if (activeView === 'courses') {
    return (
      <AppBackground>
        <SafeAreaView style={styles.safeArea}>
          <GlassNavBar />
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
        </SafeAreaView>
      </AppBackground>
    );
  }

  if (activeView === 'reports' && selectedCourseId) {
    return (
      <AppBackground>
        <SafeAreaView style={styles.safeArea}>
          <GlassNavBar />
          <ReportsPanel
            courseId={selectedCourseId}
            courseName={courses.find((c) => c.id === selectedCourseId)?.name}
            initialSessionId={selectedSessionId || undefined}
            onBack={() => {
              setSelectedSessionId(null);
              setActiveView('grid');
            }}
          />
        </SafeAreaView>
      </AppBackground>
    );
  }

  if (activeView === 'alerts') {
    return (
      <AppBackground>
        <SafeAreaView style={styles.safeArea}>
          <GlassNavBar />
          <AlertsPanel
            courses={courses}
            onBack={() => setActiveView('grid')}
          />
        </SafeAreaView>
      </AppBackground>
    );
  }

  if (activeView === 'history') {
    return (
      <AppBackground>
        <SafeAreaView style={styles.safeArea}>
          <GlassNavBar />
          <HistoryPanel
            sessions={recentSessions}
            onBack={() => setActiveView('grid')}
            onEditSession={(courseId, sessionId) => {
              setSelectedCourseId(courseId);
              setSelectedSessionId(sessionId);
              setActiveView('reports');
            }}
          />
        </SafeAreaView>
      </AppBackground>
    );
  }

  // --- MAIN GRID OVERVIEW ---
  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <GlassNavBar
          tabs={[
            { id: 'grid', label: 'Overview', icon: Home },
            { id: 'reports', label: 'Reports', icon: BarChart2 },
          ]}
          activeTab={activeView === 'reports' ? 'reports' : 'grid'}
          onSelectTab={(tabId) => {
            if (tabId === 'reports') {
              if (courses.length > 0) {
                setSelectedCourseId(courses[0].id);
                setActiveView('reports');
              } else {
                alert('No assigned courses found.');
              }
            } else {
              setActiveView('grid');
            }
          }}
        />

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
              <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                Hello, {displayName} 👋
              </Text>
              <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                {activeSession
                  ? '⚡ A live attendance session is currently running.'
                  : 'No active session — pick a course and start one.'}
              </Text>
            </View>
          </View>

          {/* Action Cards Grid */}
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
                else alert('No active session. Please start one from My Courses.');
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.iconBox, { backgroundColor: `${colors.emerald}20` }]}>
                <Zap size={22} color={colors.emerald} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTitleRow}>
                  <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                    Live Session
                  </Text>
                  {activeSession && (
                    <View style={[styles.liveBadge, { backgroundColor: `${colors.emerald}25` }]}>
                      <View style={[styles.liveDot, { backgroundColor: colors.emerald }]} />
                      <Text style={[styles.liveText, { color: colors.emerald }]}>LIVE</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  Present QR code and monitor attendance
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
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  My Courses
                </Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  View assigned courses, start sessions &amp; reports
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
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Attendance Alerts
                </Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  Students below the 75% requirement threshold
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
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
                  Session History
                </Text>
                <Text style={[styles.cardDesc, { color: colors.textSecondary }]}>
                  Review recent attendance records
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
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 3,
  },
  heroTop: {
    gap: 4,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
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
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
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
