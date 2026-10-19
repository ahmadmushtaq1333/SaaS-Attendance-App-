import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, Clock, Calendar, ChevronRight } from 'lucide-react-native';
import { Session } from '@/entities/session/api/teacher-api';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';

interface HistoryPanelProps {
  sessions: Session[];
  onBack: () => void;
  onEditSession: (courseId: number, sessionId: number) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ sessions, onBack, onEditSession }) => {
  const colors = useAppColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDeep }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgMid, borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Session History</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.list}>
          {sessions.map((s) => {
            const isPast = new Date(s.expiry_time).getTime() < Date.now();
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}
                onPress={() => onEditSession(s.course, s.id)}
                activeOpacity={0.8}
              >
                <View style={styles.cardInfo}>
                  <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>Session {s.id}</Text>
                  <View style={styles.dateRow}>
                    <Calendar size={12} color={colors.textMuted} />
                    <Text style={[styles.sessionDate, { color: colors.textMuted }]}>
                      {new Date(s.start_time).toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Text>
                  </View>
                </View>

                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View
                    style={[
                      styles.badge,
                      isPast
                        ? { backgroundColor: 'rgba(255,255,255,0.06)' }
                        : { backgroundColor: `${colors.emerald}20` },
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        { color: isPast ? colors.textMuted : colors.emerald },
                      ]}
                    >
                      {isPast ? 'Ended' : 'Active'}
                    </Text>
                  </View>
                  <ChevronRight size={16} color={colors.textMuted} />
                </View>
              </TouchableOpacity>
            );
          })}

          {sessions.length === 0 && (
            <View style={styles.emptyContainer}>
              <Clock size={36} color={colors.textMuted} style={{ marginBottom: 12 }} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>No past sessions found.</Text>
            </View>
          )}
        </View>
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
  headerRight: { flex: 1 },
  content: { padding: 16, paddingBottom: 60 },
  list: { gap: 12 },
  card: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  cardInfo: { flex: 1 },
  sessionTitle: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessionDate: { fontSize: FontSize.xs },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48 },
  emptyText: { fontSize: FontSize.sm },
});
