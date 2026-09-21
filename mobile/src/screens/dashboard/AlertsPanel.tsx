import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, Alert,
} from 'react-native';
import { Course, teacherApi } from '@/entities/session/api/teacher-api';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

interface AlertsPanelProps {
  courses: Course[];
  onBack: () => void;
}

// Matches the web app's three tiers exactly
const TIERS = [
  { key: 'CRITICAL', label: '🔴 Critical',  range: '< 25%',     color: '#dc2626', bg: 'rgba(220,38,38,0.08)'  },
  { key: 'SEVERE',   label: '🟠 Severe',    range: '25% – 50%', color: '#ea580c', bg: 'rgba(234,88,12,0.08)'  },
  { key: 'WARNING',  label: '🟡 Warning',   range: '50% – 75%', color: '#ca8a04', bg: 'rgba(202,138,4,0.08)'  },
];

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ courses, onBack }) => {
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    courses.length > 0 ? courses[0].id : null
  );
  const [defaulters, setDefaulters]   = useState<any[] | null>(null);
  const [loading, setLoading]          = useState(false);

  // Per-tier send state: { CRITICAL: 'idle' | 'sending' | 'sent' }
  const [tierState, setTierState] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({});

  useEffect(() => {
    if (selectedCourseId) fetchDefaulters(selectedCourseId);
  }, [selectedCourseId]);

  const fetchDefaulters = async (courseId: number) => {
    setLoading(true);
    setDefaulters(null);
    setTierState({});
    try {
      const data = await teacherApi.getDefaulters(courseId);
      setDefaulters(data.defaulters_list ?? []);
    } catch {
      setDefaulters([]);
    } finally {
      setLoading(false);
    }
  };

  const sendBulkNotice = async (tier: string) => {
    if (!selectedCourseId) return;
    setTierState(prev => ({ ...prev, [tier]: 'sending' }));
    try {
      await teacherApi.sendBulkNotice(selectedCourseId, tier);
      setTierState(prev => ({ ...prev, [tier]: 'sent' }));
    } catch {
      Alert.alert('Error', `Failed to send bulk notice for ${tier} tier.`);
      setTierState(prev => ({ ...prev, [tier]: 'idle' }));
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Attendance Alerts</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>

        {/* Panel title row */}
        <View style={styles.panelTitleRow}>
          <View style={styles.iconBox}>
            <Text style={{ fontSize: 20 }}>⚠️</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>Students At Risk</Text>
            <Text style={styles.panelSub}>Students below 75% attendance threshold</Text>
          </View>
        </View>

        {/* Course picker */}
        {courses.length > 0 && (
          <View style={styles.pickerRow}>
            <Text style={styles.pickerLabel}>Course:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerTabs}>
              {courses.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.tab, selectedCourseId === c.id && styles.tabActive]}
                  onPress={() => setSelectedCourseId(c.id)}
                >
                  <Text style={[styles.tabText, selectedCourseId === c.id && styles.tabTextActive]}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator color={Colors.danger} />
            <Text style={styles.loadingText}>Fetching defaulters…</Text>
          </View>
        ) : defaulters === null ? (
          <Text style={styles.metaText}>Select a course above.</Text>
        ) : defaulters.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyTitle}>All Good!</Text>
            <Text style={styles.emptySub}>All students meet the 75% attendance threshold for this course.</Text>
          </View>
        ) : (
          TIERS.map(({ key, label, range, color, bg }) => {
            const students = defaulters.filter(s => s.tier === key);
            if (students.length === 0) return null;
            const state = tierState[key] ?? 'idle';

            return (
              <View key={key} style={[styles.tierBlock, { borderColor: color + '30' }]}>
                {/* Tier header */}
                <View style={styles.tierHeader}>
                  <View>
                    <Text style={[styles.tierLabel, { color }]}>{label}</Text>
                    <Text style={[styles.tierRange, { color: color + 'cc' }]}>{range} — {students.length} student{students.length !== 1 ? 's' : ''}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.noticeBtn, { borderColor: color + '50' }]}
                    onPress={() => sendBulkNotice(key)}
                    disabled={state !== 'idle'}
                  >
                    {state === 'sending' ? (
                      <ActivityIndicator size="small" color={color} />
                    ) : (
                      <Text style={[styles.noticeBtnText, { color }]}>
                        {state === 'sent' ? '✓ Sent' : '📨 Notify All'}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Student rows */}
                <View style={styles.studentList}>
                  {students.map((std: any) => (
                    <View key={std.id} style={[styles.studentRow, { backgroundColor: bg, borderColor: color + '20' }]}>
                      <Text style={styles.studentEmail} numberOfLines={1}>{std.email}</Text>
                      <View style={[styles.pctBadge, { backgroundColor: color + '18' }]}>
                        <Text style={[styles.pctText, { color }]}>
                          {typeof std.attendance_percentage === 'number'
                            ? std.attendance_percentage.toFixed(1)
                            : std.attendance_percentage}%
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            );
          })
        )}

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

  content: { padding: 20, paddingBottom: 60, gap: 20 },

  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(248,113,113,0.12)',
    alignItems: 'center', justifyContent: 'center',
  },
  panelTitle: { color: Colors.textPrimary, fontSize: FontSize.lg, fontWeight: '700' },
  panelSub:   { color: Colors.textMuted,    fontSize: FontSize.xs, marginTop: 2 },

  pickerRow: { gap: 8 },
  pickerLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  pickerTabs: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  tab: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: Radius.full,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: Colors.glassBorder,
  },
  tabActive: { backgroundColor: 'rgba(248,113,113,0.15)', borderColor: 'rgba(248,113,113,0.4)' },
  tabText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  tabTextActive: { color: Colors.danger, fontWeight: '700' },

  centered: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  loadingText: { color: Colors.textMuted, fontSize: FontSize.sm },
  metaText: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', paddingVertical: 24 },

  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyIcon: { fontSize: 36 },
  emptyTitle: { color: Colors.emerald, fontSize: FontSize.lg, fontWeight: '700' },
  emptySub: { color: Colors.textMuted, fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },

  tierBlock: {
    backgroundColor: Colors.glassA, borderRadius: Radius.lg,
    borderWidth: 1, padding: 16, gap: 12,
  },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierLabel: { fontSize: FontSize.md, fontWeight: '700' },
  tierRange: { fontSize: FontSize.xs, marginTop: 2 },

  noticeBtn: {
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: Radius.sm,
    borderWidth: 1, backgroundColor: 'transparent', minWidth: 90, alignItems: 'center',
  },
  noticeBtnText: { fontSize: FontSize.xs, fontWeight: '700' },

  studentList: { gap: 6 },
  studentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    padding: 12, borderRadius: Radius.md, borderWidth: 1,
  },
  studentEmail: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600', flex: 1, marginRight: 8 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  pctText: { fontSize: FontSize.xs, fontWeight: '700' },
});
