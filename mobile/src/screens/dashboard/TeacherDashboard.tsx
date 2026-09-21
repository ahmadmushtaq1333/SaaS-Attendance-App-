import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, BackHandler,
} from 'react-native';
import { useAuthStore } from '@/entities/user';
import { teacherApi, Course, Session } from '@/entities/session/api/teacher-api';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';
import { LiveSessionPanel } from './LiveSessionPanel';
import { CoursesPanel } from './CoursesPanel';
import { ReportsPanel } from './ReportsPanel';
import { HistoryPanel } from './HistoryPanel';
import { AlertsPanel } from './AlertsPanel';

type ViewMode = 'grid' | 'live' | 'courses' | 'alerts' | 'history' | 'reports';

export const TeacherDashboard = () => {
  const { user, logout } = useAuthStore();
  
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
      fetchInitialData(); // Refresh history
    } catch (err) {
      alert('Failed to stop session');
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.emerald} />
      </View>
    );
  }

  // --- SUB-PANEL RENDERING ---
  
  if (activeView === 'live') {
    return (
      <LiveSessionPanel
        session={activeSession!}
        onBack={() => setActiveView('grid')}
        onStopSession={handleStopSession}
      />
    );
  }

  if (activeView === 'courses') {
    return (
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
    );
  }

  if (activeView === 'reports' && selectedCourseId) {
    return (
      <ReportsPanel
        courseId={selectedCourseId}
        initialSessionId={selectedSessionId || undefined}
        onBack={() => {
          setSelectedSessionId(null);
          setActiveView('grid'); // Default back to grid, since it can come from courses OR history
        }}
      />
    );
  }

  if (activeView === 'alerts') {
    return (
      <AlertsPanel
        courses={courses}
        onBack={() => setActiveView('grid')}
      />
    );
  }

  if (activeView === 'history') {
    return (
      <HistoryPanel
        sessions={recentSessions}
        onBack={() => setActiveView('grid')}
        onEditSession={(courseId, sessionId) => {
          setSelectedCourseId(courseId);
          setSelectedSessionId(sessionId);
          setActiveView('reports');
        }}
      />
    );
  }

  // --- MAIN GRID VIEW ---
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 24, paddingBottom: 60 }}>
      {/* Hero Header */}
      <View style={styles.hero}>
        <View style={styles.heroHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.heroTitle}>Hello, {user?.first_name || 'Teacher'} 👋</Text>
            <Text style={styles.heroSub}>
              {activeSession
                ? 'A live attendance session is currently running.'
                : 'No active session — pick a course and start one.'}
            </Text>
          </View>
          <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Grid Menu */}
      <View style={styles.grid}>
        
        {/* Live Session Card */}
        <TouchableOpacity style={styles.card} onPress={() => {
          if (activeSession) setActiveView('live');
          else alert('No active session. Please start one from My Courses.');
        }}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(79,142,247,0.15)' }]}>
            <Text style={{ fontSize: 24 }}>⚡</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Live Session</Text>
            <Text style={styles.cardDesc}>Present QR code and monitor attendance</Text>
          </View>
          {activeSession && (
            <View style={styles.badge}>
              <View style={styles.dot} />
              <Text style={styles.badgeText}>Live</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* My Courses Card */}
        <TouchableOpacity style={styles.card} onPress={() => setActiveView('courses')}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(167,139,250,0.15)' }]}>
            <Text style={{ fontSize: 24 }}>📚</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>My Courses</Text>
            <Text style={styles.cardDesc}>View your courses and reports</Text>
          </View>
          <Text style={styles.statsText}>{courses.length} Courses</Text>
        </TouchableOpacity>

        {/* Alerts Card */}
        <TouchableOpacity style={styles.card} onPress={() => setActiveView('alerts')}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(248,113,113,0.15)' }]}>
            <Text style={{ fontSize: 24 }}>⚠️</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Attendance Alerts</Text>
            <Text style={styles.cardDesc}>Students below 75% threshold</Text>
          </View>
        </TouchableOpacity>

        {/* History Card */}
        <TouchableOpacity style={styles.card} onPress={() => setActiveView('history')}>
          <View style={[styles.iconBox, { backgroundColor: 'rgba(34,211,238,0.15)' }]}>
            <Text style={{ fontSize: 24 }}>🕒</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>Session History</Text>
            <Text style={styles.cardDesc}>Review recent sessions</Text>
          </View>
          <Text style={[styles.statsText, { color: Colors.cyan }]}>{recentSessions.length}</Text>
        </TouchableOpacity>

      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDeep },
  hero: {
    backgroundColor: Colors.glassA, padding: 24, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 24,
    marginTop: 40,
  },
  heroHeaderRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  heroTitle: { fontSize: 24, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  heroSub: { fontSize: FontSize.sm, color: Colors.textSecondary },
  
  logoutBtn: { backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: Radius.md, marginLeft: 12 },
  logoutText: { color: Colors.danger, fontWeight: '600', fontSize: FontSize.xs },
  
  grid: { gap: 16 },
  card: {
    backgroundColor: Colors.glassA, padding: 20, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.glassBorder,
    flexDirection: 'row', alignItems: 'center', gap: 16,
  },
  iconBox: {
    width: 52, height: 52, borderRadius: Radius.md,
    alignItems: 'center', justifyContent: 'center',
  },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: FontSize.md, fontWeight: '600', color: Colors.textPrimary, marginBottom: 4 },
  cardDesc: { fontSize: FontSize.xs, color: Colors.textMuted },
  statsText: { fontSize: FontSize.sm, fontWeight: '700', color: Colors.purple },
  
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(79,142,247,0.15)', paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: Radius.full,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.emerald },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700', color: Colors.emerald },
});
