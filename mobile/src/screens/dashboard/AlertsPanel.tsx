import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Send,
  Bell,
} from 'lucide-react-native';
import { Course, teacherApi } from '@/entities/session/api/teacher-api';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';

interface AlertsPanelProps {
  courses: Course[];
  onBack: () => void;
}

const TIERS = [
  { key: 'CRITICAL', label: 'Critical', range: '< 25%', color: '#dc2626', bg: 'rgba(220,38,38,0.08)' },
  { key: 'SEVERE', label: 'Severe', range: '25% – 50%', color: '#ea580c', bg: 'rgba(234,88,12,0.08)' },
  { key: 'WARNING', label: 'Warning', range: '50% – 75%', color: '#ca8a04', bg: 'rgba(202,138,4,0.08)' },
];

export const AlertsPanel: React.FC<AlertsPanelProps> = ({ courses, onBack }) => {
  const colors = useAppColors();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    courses.length > 0 ? courses[0].id : null,
  );
  const [defaulters, setDefaulters] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [tierState, setTierState] = useState<Record<string, 'idle' | 'sending' | 'sent'>>({});
  const [notifyingStudentId, setNotifyingStudentId] = useState<number | null>(null);
  const [notifiedStudentIds, setNotifiedStudentIds] = useState<Set<number>>(new Set());

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

  const sendStudentNotice = async (studentId: number, email: string) => {
    if (!selectedCourseId) return;
    setNotifyingStudentId(studentId);
    try {
      await teacherApi.notifyStudent(selectedCourseId, studentId);
      setNotifiedStudentIds((prev) => new Set(prev).add(studentId));
      Alert.alert('Notice Sent', `Warning notice sent to ${email}`);
    } catch {
      Alert.alert('Error', `Failed to send notice to ${email}`);
    } finally {
      setNotifyingStudentId(null);
    }
  };

  const sendBulkNotice = async (tier: string) => {
    if (!selectedCourseId) return;
    setTierState((prev) => ({ ...prev, [tier]: 'sending' }));
    try {
      await teacherApi.sendBulkNotice(selectedCourseId, tier);
      setTierState((prev) => ({ ...prev, [tier]: 'sent' }));
    } catch {
      Alert.alert('Error', `Failed to send bulk notice for ${tier} tier.`);
      setTierState((prev) => ({ ...prev, [tier]: 'idle' }));
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDeep }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgMid, borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Attendance Alerts</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Panel title row */}
        <View style={styles.panelTitleRow}>
          <View style={[styles.iconBox, { backgroundColor: `${colors.danger}18` }]}>
            <AlertTriangle size={20} color={colors.danger} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.panelTitle, { color: colors.textPrimary }]}>Students At Risk</Text>
            <Text style={[styles.panelSub, { color: colors.textMuted }]}>
              Students below 75% attendance threshold
            </Text>
          </View>
        </View>

        {/* Course picker */}
        {courses.length > 0 && (
          <View style={styles.pickerRow}>
            <Text style={[styles.pickerLabel, { color: colors.textSecondary }]}>Course:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerTabs}>
              {courses.map((c) => (
                <TouchableOpacity
                  key={c.id}
                  style={[
                    styles.tab,
                    { backgroundColor: colors.glassC, borderColor: colors.glassBorder },
                    selectedCourseId === c.id && { backgroundColor: `${colors.danger}20`, borderColor: colors.danger },
                  ]}
                  onPress={() => setSelectedCourseId(c.id)}
                  activeOpacity={0.75}
                >
                  <Text
                    style={[
                      styles.tabText,
                      { color: colors.textSecondary },
                      selectedCourseId === c.id && { color: colors.danger, fontWeight: '700' },
                    ]}
                  >
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
            <ActivityIndicator color={colors.danger} />
            <Text style={[styles.loadingText, { color: colors.textMuted }]}>Fetching defaulters…</Text>
          </View>
        ) : defaulters === null ? (
          <Text style={[styles.metaText, { color: colors.textMuted }]}>Select a course above.</Text>
        ) : defaulters.length === 0 ? (
          <View style={styles.emptyState}>
            <CheckCircle size={36} color={colors.emerald} />
            <Text style={[styles.emptyTitle, { color: colors.emerald }]}>All Good!</Text>
            <Text style={[styles.emptySub, { color: colors.textMuted }]}>
              All students meet the 75% attendance threshold for this course.
            </Text>
          </View>
        ) : (
          TIERS.map(({ key, label, range, color, bg }) => {
            const students = defaulters.filter((s) => s.tier === key);
            if (students.length === 0) return null;
            const state = tierState[key] ?? 'idle';

            return (
              <View key={key} style={[styles.tierBlock, { backgroundColor: colors.cardBg, borderColor: color + '40' }]}>
                {/* Tier header */}
                <View style={styles.tierHeader}>
                  <View>
                    <Text style={[styles.tierLabel, { color }]}>{label}</Text>
                    <Text style={[styles.tierRange, { color: color + 'cc' }]}>
                      {range} — {students.length} student{students.length !== 1 ? 's' : ''}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.noticeBtn, { borderColor: color + '60', backgroundColor: `${color}15` }]}
                    onPress={() => sendBulkNotice(key)}
                    disabled={state !== 'idle'}
                    activeOpacity={0.7}
                  >
                    {state === 'sending' ? (
                      <ActivityIndicator size="small" color={color} />
                    ) : (
                      <View style={styles.noticeBtnInner}>
                        <Send size={11} color={color} />
                        <Text style={[styles.noticeBtnText, { color }]}>
                          {state === 'sent' ? 'Sent' : 'Notify All'}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Student rows */}
                <View style={styles.studentList}>
                  {students.map((std: any) => {
                    const regNo = std.registration_number || (std.email ? std.email.split('@')[0] : '—');
                    const isNotifying = notifyingStudentId === std.id;
                    const isNotified = notifiedStudentIds.has(std.id);

                    return (
                      <View key={std.id} style={[styles.studentRow, { backgroundColor: bg, borderColor: color + '30' }]}>
                        <View style={{ flex: 1, marginRight: 8 }}>
                          <Text style={[styles.studentName, { color: colors.textPrimary }]} numberOfLines={1}>
                            {std.full_name || std.email}
                          </Text>
                          <Text style={[styles.studentSub, { color: colors.textMuted }]}>Reg: {regNo}</Text>
                        </View>

                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={[styles.pctBadge, { backgroundColor: color + '22' }]}>
                            <Text style={[styles.pctText, { color }]}>
                              {typeof std.attendance_percentage === 'number'
                                ? std.attendance_percentage.toFixed(1)
                                : std.attendance_percentage}%
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[styles.miniNoticeBtn, { borderColor: color + '50' }]}
                            onPress={() => sendStudentNotice(std.id, std.email)}
                            disabled={isNotifying}
                            activeOpacity={0.7}
                          >
                            {isNotifying ? (
                              <ActivityIndicator size="small" color={color} />
                            ) : (
                              <View style={styles.miniNoticeInner}>
                                <Bell size={10} color={color} />
                                <Text style={[styles.miniNoticeText, { color }]}>
                                  {isNotified ? 'Sent' : 'Alert'}
                                </Text>
                              </View>
                            )}
                          </TouchableOpacity>
                        </View>
                      </View>
                    );
                  })}
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
  content: { padding: 16, paddingBottom: 60, gap: 16 },
  panelTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  panelSub: { fontSize: FontSize.xs, marginTop: 2 },
  pickerRow: { gap: 8 },
  pickerLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  pickerTabs: { flexDirection: 'row', gap: 8, paddingVertical: 4 },
  tab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: Radius.full,
    borderWidth: 1,
  },
  tabText: { fontSize: FontSize.sm, fontWeight: '600' },
  centered: { alignItems: 'center', paddingVertical: 32, gap: 12 },
  loadingText: { fontSize: FontSize.sm },
  metaText: { fontSize: FontSize.sm, textAlign: 'center', paddingVertical: 24 },
  emptyState: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: '700' },
  emptySub: { fontSize: FontSize.sm, textAlign: 'center', lineHeight: 20 },
  tierBlock: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  tierHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  tierLabel: { fontSize: FontSize.md, fontWeight: '700' },
  tierRange: { fontSize: FontSize.xs, marginTop: 2 },
  noticeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    minWidth: 90,
    alignItems: 'center',
  },
  noticeBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  noticeBtnText: { fontSize: FontSize.xs, fontWeight: '700' },
  studentList: { gap: 6 },
  studentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  studentName: { fontSize: FontSize.sm, fontWeight: '600' },
  studentSub: { fontSize: FontSize.xs, marginTop: 2 },
  pctBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: Radius.full },
  pctText: { fontSize: FontSize.xs, fontWeight: '700' },
  miniNoticeBtn: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: Radius.sm,
    borderWidth: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    minWidth: 64,
    alignItems: 'center',
  },
  miniNoticeInner: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniNoticeText: { fontSize: FontSize.xs, fontWeight: '700' },
});
