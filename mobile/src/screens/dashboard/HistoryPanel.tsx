import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Session } from '@/entities/session/api/teacher-api';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

interface HistoryPanelProps {
  sessions: Session[];
  onBack: () => void;
  onEditSession: (courseId: number, sessionId: number) => void;
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ sessions, onBack, onEditSession }) => {
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Session History</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.list}>
          {sessions.map((s) => {
            const isPast = new Date(s.expiry_time).getTime() < Date.now();
            return (
              <TouchableOpacity 
                key={s.id} 
                style={styles.card}
                onPress={() => onEditSession(s.course, s.id)}
              >
                <View style={styles.cardInfo}>
                  <Text style={styles.sessionTitle}>Session {s.id}</Text>
                  <Text style={styles.sessionDate}>
                    {new Date(s.start_time).toLocaleDateString(undefined, {
                      weekday: 'short', month: 'short', day: 'numeric',
                      hour: 'numeric', minute: '2-digit'
                    })}
                  </Text>
                </View>
                <View style={[styles.badge, isPast ? styles.badgeEnded : styles.badgeActive]}>
                  <Text style={[styles.badgeText, isPast ? styles.textEnded : styles.textActive]}>
                    {isPast ? 'Ended' : 'Active'}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
          {sessions.length === 0 && (
            <Text style={styles.emptyText}>No past sessions found.</Text>
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
  
  content: { padding: 24, paddingBottom: 60 },
  
  list: { gap: 12 },
  card: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.glassA, padding: 16, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  cardInfo: { flex: 1 },
  sessionTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', marginBottom: 4 },
  sessionDate: { color: Colors.textMuted, fontSize: FontSize.xs },
  
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  badgeActive: { backgroundColor: Colors.emeraldDim },
  badgeEnded: { backgroundColor: 'rgba(255,255,255,0.08)' },
  badgeText: { fontSize: FontSize.xs, fontWeight: '700' as const },
  textActive: { color: Colors.emerald, fontSize: FontSize.xs, fontWeight: '700' as const },
  textEnded: { color: Colors.textMuted, fontSize: FontSize.xs, fontWeight: '600' as const },
  
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
});
