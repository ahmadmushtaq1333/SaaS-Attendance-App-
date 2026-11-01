import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { adminApi, AdminSession } from '@/entities/admin';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';

export const AdminSessionsPanel: React.FC = () => {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [sessions, setSessions] = useState<AdminSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [resettingId, setResettingId] = useState<number | null>(null);

  const loadSessions = useCallback(async () => {
    try {
      const data = await adminApi.getSessions();
      setSessions(data);
    } catch {
      Alert.alert('Error', 'Failed to load live sessions');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSessions();
  };

  const handleResetSession = (session: AdminSession) => {
    Alert.alert(
      'Emergency Session Reset',
      `Are you sure you want to reset Session #${session.id} for "${session.course_name || 'Course'}"?\n\nThis will immediately invalidate active QR codes and clear session attendance records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Session',
          style: 'destructive',
          onPress: async () => {
            setResettingId(session.id);
            try {
              const res = await adminApi.resetSession(session.id);
              Alert.alert('Success', res.message || 'Session reset successfully');
              loadSessions();
            } catch (err: any) {
              Alert.alert('Error', err?.response?.data?.error || 'Failed to reset session');
            } finally {
              setResettingId(null);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.warning} />
      </View>
    );
  }

  const activeCount = sessions.filter((s) => s.is_active).length;

  return (
    <View style={styles.container}>
      <View style={styles.headerBar}>
        <View>
          <Text style={styles.headerTitle}>Active Attendance Sessions</Text>
          <Text style={styles.headerSub}>
            {activeCount} live session{activeCount !== 1 ? 's' : ''} currently taking attendance
          </Text>
        </View>
        <TouchableOpacity style={styles.refreshBtn} onPress={handleRefresh}>
          <Text style={styles.refreshBtnText}>🔄 Refresh</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={colors.warning}
          />
        }
      >
        {sessions.map((s) => {
          const isResetting = resettingId === s.id;
          const startTimeStr = s.start_time
            ? new Date(s.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            : '—';

          return (
            <View key={s.id} style={styles.sessionCard}>
              <View style={styles.cardTop}>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.statusPill,
                      s.is_active ? styles.statusActive : styles.statusExpired,
                    ]}
                  >
                    <View
                      style={[
                        styles.dot,
                        { backgroundColor: s.is_active ? colors.emerald : colors.textMuted },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: s.is_active ? colors.emerald : colors.textMuted },
                      ]}
                    >
                      {s.is_active ? 'LIVE' : 'EXPIRED'}
                    </Text>
                  </View>
                  <Text style={styles.sessionId}>ID #{s.id}</Text>
                </View>

                <Text style={styles.courseName}>{s.course_name || `Course #${s.course}`}</Text>
                {s.teacher_name && (
                  <Text style={styles.teacherName}>Instructor: {s.teacher_name}</Text>
                )}
              </View>

              <View style={styles.metricsRow}>
                <View style={styles.metricItem}>
                  <Text style={styles.metricVal}>{startTimeStr}</Text>
                  <Text style={styles.metricLabel}>Started</Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={[styles.metricVal, { color: colors.cyan }]}>
                    {s.records_count ?? 0}
                  </Text>
                  <Text style={styles.metricLabel}>Attended</Text>
                </View>

                {s.is_active && (
                  <TouchableOpacity
                    style={styles.resetBtn}
                    onPress={() => handleResetSession(s)}
                    disabled={isResetting}
                  >
                    {isResetting ? (
                      <ActivityIndicator size="small" color={colors.danger} />
                    ) : (
                      <Text style={styles.resetBtnText}>⚠️ Emergency Reset</Text>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          );
        })}

        {sessions.length === 0 && (
          <Text style={styles.emptyText}>No active or recent attendance sessions.</Text>
        )}
      </ScrollView>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useAppColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    headerBar: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
    },
    headerTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
    headerSub: { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
    refreshBtn: {
      backgroundColor: colors.glassA,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    refreshBtnText: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600' },

    list: { padding: 14, gap: 12, paddingBottom: 60 },
    sessionCard: {
      backgroundColor: colors.cardBg,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 16,
      gap: 12,
    },
    cardTop: { gap: 4 },
    badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusPill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: Radius.full,
    },
    statusActive: { backgroundColor: `${colors.emerald}15` },
    statusExpired: { backgroundColor: colors.glassA },
    dot: { width: 6, height: 6, borderRadius: 3 },
    statusText: { fontSize: 10, fontWeight: '800' },
    sessionId: { color: colors.textMuted, fontSize: 11 },

    courseName: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', marginTop: 4 },
    teacherName: { color: colors.textSecondary, fontSize: FontSize.xs },

    metricsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
    },
    metricItem: { alignItems: 'flex-start' },
    metricVal: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
    metricLabel: { color: colors.textMuted, fontSize: 10 },

    resetBtn: {
      backgroundColor: 'rgba(248,113,113,0.12)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: 'rgba(248,113,113,0.3)',
    },
    resetBtnText: { color: colors.danger, fontSize: FontSize.xs, fontWeight: '700' },
    emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },
  });
