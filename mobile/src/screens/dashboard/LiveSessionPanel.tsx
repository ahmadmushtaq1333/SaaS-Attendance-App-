import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Image, ActivityIndicator,
} from 'react-native';
import { Session, teacherApi } from '@/entities/session/api/teacher-api';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

interface LiveSessionPanelProps {
  session: Session;
  onBack: () => void;
  onStopSession: () => void;
}

export const LiveSessionPanel: React.FC<LiveSessionPanelProps> = ({ session, onBack, onStopSession }) => {
  const [report, setReport] = useState<any>(null);
  // qrData is the base64 PNG string returned by the backend serializer
  const [qrData, setQrData] = useState<string>(session.qr_code || '');
  const [timeLeft, setTimeLeft] = useState(10);
  const [loadingQR, setLoadingQR] = useState(!session.qr_code);
  const [togglingId, setTogglingId] = useState<number | null>(null);

  // Poll live roster every 5 seconds
  useEffect(() => {
    fetchReport();
    const interval = setInterval(fetchReport, 5000);
    return () => clearInterval(interval);
  }, [session.course]);

  // QR countdown — when it hits 0, fetch a fresh session to get a new token/image
  useEffect(() => {
    if (timeLeft <= 0) {
      refreshQR();
      return;
    }
    const timer = setTimeout(() => setTimeLeft(t => t - 1), 1000);
    return () => clearTimeout(timer);
  }, [timeLeft]);

  const fetchReport = async () => {
    try {
      const data = await teacherApi.getLiveReport(session.course);
      setReport(data);
    } catch (err) {
      console.log('Failed to fetch live report:', err);
    }
  };

  const refreshQR = async () => {
    setLoadingQR(true);
    try {
      // Re-fetch this specific session — the serializer auto-creates a new QRToken
      // and returns a fresh base64 PNG
      const sessions = await teacherApi.getSessions();
      const current = sessions.find(s => s.id === session.id);
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
    setTogglingId(studentId);
    try {
      await teacherApi.bulkOverride(session.id, [studentId], isPresent ? 'absent' : 'present');
      await fetchReport(); // Immediately refresh report to show updated status
    } catch (err) {
      console.error('Failed to toggle attendance manually:', err);
    } finally {
      setTogglingId(null);
    }
  };

  const students = report?.students || [];
  const enrolledCount = students.length;
  const presentCount = students.filter((s: any) => s.sessions && s.sessions[String(session.id)] === true).length;

  // Determine ring colour based on time remaining
  const ringColor = timeLeft <= 3 ? Colors.danger : Colors.emerald;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Live Session</Text>
        <TouchableOpacity onPress={onStopSession} style={styles.stopBtn}>
          <Text style={styles.stopBtnText}>End</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* QR Card */}
        <View style={styles.qrCard}>

          {/* Attendance counter */}
          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Attendance</Text>
              <Text style={[styles.statValue, { color: Colors.emerald }]}>
                {presentCount} / {enrolledCount}
              </Text>
            </View>
          </View>

          {/* QR Image — rendered as a plain Image using the base64 PNG */}
          <View style={[styles.qrRing, { borderColor: ringColor }]}>
            {loadingQR || !qrData ? (
              <View style={styles.qrPlaceholder}>
                <ActivityIndicator color={Colors.emerald} size="large" />
                <Text style={styles.qrPlaceholderText}>Generating QR…</Text>
              </View>
            ) : (
              <Image
                source={{ uri: qrData }}
                style={styles.qrImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Countdown */}
          <View style={styles.countdownRow}>
            <View style={[styles.countdownDot, { backgroundColor: ringColor }]} />
            <Text style={[styles.countdownText, { color: ringColor }]}>
              Refreshes in {timeLeft}s
            </Text>
          </View>
        </View>

        {/* Live Roster with Quick Override */}
        <View style={styles.rosterHeader}>
          <Text style={styles.rosterTitle}>Quick Attendance Override</Text>
          <Text style={styles.rosterHint}>Mark students manually during live session</Text>
        </View>

        <View style={styles.rosterList}>
          {students.map((student: any) => {
            const isPresent = student.sessions && student.sessions[String(session.id)] === true;
            return (
              <View key={student.id} style={styles.studentRow}>
                <Text style={styles.studentEmail} numberOfLines={1}>{student.email}</Text>
                
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

              </View>
            );
          })}
          {students.length === 0 && !report && (
            <ActivityIndicator color={Colors.emerald} style={{ marginTop: 24 }} />
          )}
        </View>
      </ScrollView>
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
  stopBtn: {
    backgroundColor: 'rgba(248,113,113,0.15)', paddingHorizontal: 12,
    paddingVertical: 6, borderRadius: Radius.full,
  },
  stopBtnText: { color: Colors.danger, fontWeight: '700', fontSize: FontSize.sm },

  content: { padding: 24, paddingBottom: 60 },

  qrCard: {
    backgroundColor: Colors.glassA, padding: 24, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', marginBottom: 32,
  },
  statsRow: { width: '100%', alignItems: 'center', marginBottom: 20 },
  statBox: {
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 28,
    paddingVertical: 12, borderRadius: Radius.md, alignItems: 'center',
  },
  statLabel: { color: Colors.textMuted, fontSize: FontSize.xs, textTransform: 'uppercase', marginBottom: 4 },
  statValue: { fontSize: 28, fontWeight: '800', letterSpacing: -1 },

  // Coloured border acts as the countdown ring
  qrRing: {
    borderWidth: 4, borderRadius: Radius.lg, padding: 12,
    backgroundColor: Colors.bgDeep, marginBottom: 16,
  },
  qrImage: { width: 200, height: 200, borderRadius: 8 },
  qrPlaceholder: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center', gap: 12 },
  qrPlaceholderText: { color: Colors.textMuted, fontSize: FontSize.sm },

  countdownRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  countdownDot: { width: 8, height: 8, borderRadius: 4 },
  countdownText: { fontSize: FontSize.sm, fontWeight: '600' },

  rosterHeader: { marginBottom: 12 },
  rosterTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700', marginBottom: 2 },
  rosterHint: { color: Colors.textMuted, fontSize: FontSize.xs },

  rosterList: { gap: 8 },
  studentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.glassA, padding: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  studentEmail: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '500', flex: 1, marginRight: 8 },
  
  toggleBtn: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.sm, minWidth: 90, alignItems: 'center' },
  btnPresent: { backgroundColor: Colors.emerald },
  btnAbsent: { backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: Colors.glassBorder },
  
  textBtnPresent: { color: Colors.white, fontSize: FontSize.xs, fontWeight: '700' },
  textBtnAbsent: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },
  toggleBtnText: { textTransform: 'uppercase', letterSpacing: 0.5 },
});
