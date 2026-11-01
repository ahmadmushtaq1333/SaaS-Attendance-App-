import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  AppState,
  AppStateStatus,
} from 'react-native';
import {
  ArrowLeft,
  Maximize2,
  RefreshCw,
  X,
  Square,
  Users,
  CheckCircle,
  XCircle,
  Zap,
} from 'lucide-react-native';
import { Session, LinkedCourse, teacherApi } from '@/entities/session/api/teacher-api';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';
import { ReplicateAttendanceButton } from '@/features/replicate-attendance';
import { haptic } from '@/shared/lib/haptics';

interface LiveSessionPanelProps {
  session: Session | null;
  linkedCourses: LinkedCourse[];
  onBack: () => void;
  onStopSession: () => void;
  onGoToCourses?: () => void;
}

export const LiveSessionPanel: React.FC<LiveSessionPanelProps> = ({
  session,
  linkedCourses,
  onBack,
  onStopSession,
  onGoToCourses,
}) => {
  const colors = useAppColors();
  const [report, setReport] = useState<any>(null);
  const [qrData, setQrData] = useState<string>(session?.qr_code || '');
  const [timeLeft, setTimeLeft] = useState(10);
  const [loadingQR, setLoadingQR] = useState(Boolean(session && !session.qr_code));
  const [togglingId, setTogglingId] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  useEffect(() => {
    if (session?.qr_code) {
      setQrData(session.qr_code);
    }
  }, [session?.qr_code]);

  // Poll live roster every 5 seconds only when session exists and app is active
  useEffect(() => {
    if (!session?.course) return;

    fetchReport();

    let interval: ReturnType<typeof setInterval> | null = setInterval(fetchReport, 5000);

    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        if (!interval) {
          fetchReport();
          interval = setInterval(fetchReport, 5000);
        }
      } else {
        if (interval) {
          clearInterval(interval);
          interval = null;
        }
      }
    };

    const sub = AppState.addEventListener('change', handleAppState);

    return () => {
      if (interval) clearInterval(interval);
      sub.remove();
    };
  }, [session?.course]);

  // QR countdown only if session exists
  useEffect(() => {
    if (!session) return;
    if (timeLeft <= 0) {
      refreshQR();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, session]);

  const fetchReport = async () => {
    if (!session?.course) return;
    try {
      const data = await teacherApi.getLiveReport(session.course);
      setReport(data);
    } catch (err) {
      console.log('Failed to fetch live report:', err);
    }
  };

  const refreshQR = async () => {
    if (!session?.id) return;
    haptic.light();
    setLoadingQR(true);
    try {
      const sessions = await teacherApi.getSessions();
      const current = sessions.find((s) => s.id === session.id);
      if (current?.qr_code) {
        setQrData(current.qr_code);
      }
    } catch (err) {
      console.log('Failed to refresh QR:', err);
    } finally {
      setLoadingQR(false);
      setTimeLeft(10);
    }
  };

  const toggleAttendance = async (studentId: number, isPresent: boolean) => {
    if (!session?.id) return;
    haptic.medium();
    setTogglingId(studentId);
    try {
      await teacherApi.bulkOverride(session.id, [studentId], isPresent ? 'absent' : 'present');
      await fetchReport();
    } catch (err) {
      haptic.error();
      console.error('Failed to toggle attendance manually:', err);
    } finally {
      setTogglingId(null);
    }
  };

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: 'transparent' }]}>
        <View style={[styles.header, { backgroundColor: colors.bgMid, borderBottomColor: colors.glassBorder }]}>
          <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={16} color={colors.textSecondary} />
            <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Live Session</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.emptyContainer}>
          <View
            style={[
              styles.emptyCard,
              {
                backgroundColor: colors.cardBg,
                borderColor: colors.glassBorder,
              },
            ]}
          >
            <View style={[styles.emptyIconBox, { backgroundColor: `${colors.emerald}20` }]}>
              <Zap size={30} color={colors.emerald} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
              No Active Live Session
            </Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              You don't have an active session running right now. Choose a course from your assigned subjects to launch a dynamic rotating QR session.
            </Text>
            <TouchableOpacity
              style={[styles.emptyActionBtn, { backgroundColor: colors.emerald }]}
              onPress={onGoToCourses || onBack}
              activeOpacity={0.85}
            >
              <Text style={styles.emptyActionText}>Start Session from Courses</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  const students = report?.students || [];
  const enrolledCount = students.length;
  const presentCount = students.filter(
    (s: any) => s.sessions && s.sessions[String(session.id)] === true,
  ).length;

  const ringColor = timeLeft <= 3 ? colors.danger : colors.emerald;

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDeep }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgMid, borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Live Session</Text>
        <TouchableOpacity onPress={onStopSession} style={styles.stopBtn} activeOpacity={0.8}>
          <Square size={11} color="#F87171" fill="#F87171" />
          <Text style={styles.stopBtnText}>End</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* QR Card */}
        <View style={[styles.qrCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          {/* Attendance counter */}
          <View style={styles.statsRow}>
            <View style={[styles.statBox, { backgroundColor: colors.glassC, borderColor: colors.glassBorder }]}>
              <View style={styles.statLabelRow}>
                <Users size={13} color={colors.textMuted} />
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Attendance</Text>
              </View>
              <Text style={[styles.statValue, { color: colors.emerald }]}>
                {presentCount} / {enrolledCount}
              </Text>
            </View>
          </View>

          {/* QR Image */}
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={() => setIsZoomed(true)}
            style={[styles.qrRing, { borderColor: ringColor }]}
          >
            {loadingQR || !qrData ? (
              <View style={styles.qrPlaceholder}>
                <ActivityIndicator color={colors.emerald} size="large" />
                <Text style={[styles.qrPlaceholderText, { color: colors.textMuted }]}>
                  Generating QR…
                </Text>
              </View>
            ) : (
              <>
                <Image source={{ uri: qrData }} style={styles.qrImage} resizeMode="contain" />
                <View style={styles.tapToZoomPill}>
                  <Maximize2 size={12} color="#FFFFFF" />
                  <Text style={styles.tapToZoomText}>Tap to Enlarge</Text>
                </View>
              </>
            )}
          </TouchableOpacity>

          {/* Fullscreen Projection Modal */}
          <Modal visible={isZoomed} transparent animationType="fade" onRequestClose={() => setIsZoomed(false)}>
            <View style={styles.modalBackdrop}>
              <View style={[styles.modalContent, { backgroundColor: colors.bgDeep, borderColor: colors.glassBorder }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Classroom Projection QR</Text>
                  <TouchableOpacity onPress={() => setIsZoomed(false)} style={styles.modalCloseBtn}>
                    <X size={20} color={colors.textPrimary} />
                  </TouchableOpacity>
                </View>

                {qrData ? (
                  <View style={[styles.modalQrRing, { borderColor: ringColor }]}>
                    <Image source={{ uri: qrData }} style={styles.modalQrImage} resizeMode="contain" />
                  </View>
                ) : null}

                <View style={styles.countdownRow}>
                  <View style={[styles.countdownDot, { backgroundColor: ringColor }]} />
                  <Text style={[styles.countdownText, { color: ringColor }]}>
                    Auto-refreshes in {timeLeft}s (Anti-proxy token)
                  </Text>
                </View>

                <TouchableOpacity onPress={() => setIsZoomed(false)} style={styles.modalDismissBtn}>
                  <Text style={[styles.modalDismissText, { color: colors.textPrimary }]}>Close Fullscreen</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>

          {/* Countdown & Force Rotate */}
          <View style={styles.countdownRow}>
            <View style={[styles.countdownDot, { backgroundColor: ringColor }]} />
            <Text style={[styles.countdownText, { color: ringColor, flex: 1 }]}>
              Refreshes in {timeLeft}s
            </Text>
            <TouchableOpacity
              onPress={refreshQR}
              style={[styles.forceBtn, { borderColor: colors.glassBorder }]}
              disabled={loadingQR}
              activeOpacity={0.7}
            >
              <RefreshCw size={11} color={colors.textSecondary} />
              <Text style={[styles.forceBtnText, { color: colors.textSecondary }]}>Force Rotate</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Live Roster */}
        <View style={styles.rosterHeader}>
          <Text style={[styles.rosterTitle, { color: colors.textPrimary }]}>Quick Attendance Override</Text>
          <Text style={[styles.rosterHint, { color: colors.textMuted }]}>Mark students manually during live session</Text>
        </View>

        <View style={styles.rosterList}>
          {students.map((student: any) => {
            const isPresent = student.sessions && student.sessions[String(session.id)] === true;
            return (
              <View
                key={student.id}
                style={[
                  styles.studentRow,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: isPresent ? 'rgba(79, 142, 247, 0.25)' : colors.glassBorder,
                  },
                ]}
              >
                <Text style={[styles.studentEmail, { color: colors.textPrimary }]} numberOfLines={1}>
                  {student.email}
                </Text>

                <TouchableOpacity
                  style={[
                    styles.toggleBtn,
                    isPresent ? { backgroundColor: 'rgba(248, 113, 113, 0.15)', borderColor: 'rgba(248, 113, 113, 0.3)' } : { backgroundColor: colors.emerald },
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
                          <XCircle size={13} color={colors.danger} />
                          <Text style={[styles.toggleBtnText, { color: colors.danger }]}>Mark Absent</Text>
                        </>
                      ) : (
                        <>
                          <CheckCircle size={13} color="#FFFFFF" />
                          <Text style={[styles.toggleBtnText, { color: '#FFFFFF' }]}>Mark Present</Text>
                        </>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
          {students.length === 0 && !report && (
            <ActivityIndicator color={colors.emerald} style={{ marginTop: 24 }} />
          )}
        </View>

        {/* Replicate Attendance */}
        <ReplicateAttendanceButton
          sourceSessionId={session.id}
          linkedCourses={linkedCourses}
          onSuccess={(result, targetCourseName) => {
            Alert.alert(
              'Attendance Replicated',
              `${result.records_cloned} student(s) marked present in ${targetCourseName}.`,
              [{ text: 'OK' }],
            );
          }}
        />
      </ScrollView>
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
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(248,113,113,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(248,113,113,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  stopBtnText: { color: '#F87171', fontWeight: '700', fontSize: FontSize.sm },
  content: { padding: 16, paddingBottom: 60 },
  qrCard: {
    padding: 20,
    borderRadius: Radius.xl,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 24,
  },
  statsRow: { width: '100%', alignItems: 'center', marginBottom: 16 },
  statBox: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    borderWidth: 1,
  },
  statLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 4 },
  statLabel: { fontSize: FontSize.xs, textTransform: 'uppercase', fontWeight: '600', letterSpacing: 0.5 },
  statValue: { fontSize: 26, fontWeight: '800', letterSpacing: -0.5 },
  qrRing: {
    borderWidth: 4,
    borderRadius: Radius.lg,
    padding: 12,
    backgroundColor: '#060B18',
    marginBottom: 16,
  },
  qrImage: { width: 200, height: 200, borderRadius: 8 },
  qrPlaceholder: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', gap: 12 },
  qrPlaceholderText: { fontSize: FontSize.sm },
  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countdownDot: { width: 8, height: 8, borderRadius: 4 },
  countdownText: { fontSize: FontSize.sm, fontWeight: '600' },
  forceBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  forceBtnText: { fontSize: FontSize.xs, fontWeight: '600' },
  rosterHeader: { marginBottom: 10 },
  rosterTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  rosterHint: { fontSize: FontSize.xs },
  rosterList: { gap: 8, marginBottom: 20 },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  studentEmail: { fontSize: FontSize.sm, fontWeight: '500', flex: 1, marginRight: 8 },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
    minWidth: 105,
    alignItems: 'center',
  },
  toggleBtnInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  toggleBtnText: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.3 },
  tapToZoomPill: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: Radius.full,
    alignSelf: 'center',
  },
  tapToZoomText: {
    color: '#FFFFFF',
    fontSize: FontSize.xs,
    fontWeight: '600',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.92)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.xl,
    padding: 20,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  modalTitle: {
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalQrRing: {
    borderWidth: 6,
    borderRadius: Radius.xl,
    padding: 16,
    backgroundColor: '#ffffff',
  },
  modalQrImage: {
    width: 250,
    height: 250,
  },
  modalDismissBtn: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  modalDismissText: {
    fontSize: FontSize.sm,
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 14,
    shadowColor: '#07111F',
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 1,
  },
  emptyIconBox: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptySub: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  emptyActionBtn: {
    width: '100%',
    paddingVertical: 14,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 8,
  },
  emptyActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
