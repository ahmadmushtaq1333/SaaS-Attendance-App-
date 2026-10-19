import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { ArrowLeft, BarChart2, Play, Clock } from 'lucide-react-native';
import { Course } from '@/entities/session/api/teacher-api';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';

interface CoursesPanelProps {
  courses: Course[];
  onBack: () => void;
  onStartSession: (courseId: number, durationMins: number) => void;
  onViewReports: (courseId: number) => void;
}

export const CoursesPanel: React.FC<CoursesPanelProps> = ({ courses, onBack, onStartSession, onViewReports }) => {
  const colors = useAppColors();
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState('');

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDeep }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgMid, borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>My Courses</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Settings Bar */}
        <View style={[styles.settingsBar, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
          <View style={styles.settingsLabelRow}>
            <Clock size={14} color={colors.emerald} />
            <Text style={[styles.settingsLabel, { color: colors.textSecondary }]}>Session Duration:</Text>
          </View>
          <View style={styles.durationRow}>
            {[30, 60, 90, 120].map((mins) => (
              <TouchableOpacity
                key={mins}
                style={[
                  styles.durBtn,
                  { borderColor: colors.glassBorder },
                  duration === mins && { backgroundColor: colors.emerald, borderColor: colors.emerald },
                ]}
                onPress={() => {
                  setDuration(mins);
                  setCustomDuration('');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.durText, { color: colors.textSecondary }, duration === mins && { color: '#FFFFFF', fontWeight: '700' }]}>
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.customDurationRow}>
            <Text style={[styles.customDurationLabel, { color: colors.textMuted }]}>Or custom (mins):</Text>
            <TextInput
              style={[styles.customDurationInput, { backgroundColor: colors.glassC, borderColor: colors.glassBorder, color: colors.textPrimary }]}
              value={customDuration}
              onChangeText={(val) => {
                const numeric = val.replace(/[^0-9]/g, '');
                setCustomDuration(numeric);
                const parsed = parseInt(numeric, 10);
                if (!isNaN(parsed) && parsed > 0) {
                  setDuration(parsed);
                }
              }}
              placeholder="e.g. 45"
              placeholderTextColor={colors.textMuted}
              keyboardType="number-pad"
              maxLength={3}
            />
            <Text style={[styles.currentDurationSummary, { color: colors.emerald }]}>
              Active: {duration} min{duration > 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Course List */}
        <View style={styles.list}>
          {courses.map((course) => (
            <View key={course.id} style={[styles.courseCard, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
              <View style={styles.courseInfo}>
                <View style={[styles.courseAvatar, { backgroundColor: `${colors.purple}20` }]}>
                  <Text style={[styles.avatarText, { color: colors.purple }]}>{course.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.courseName, { color: colors.textPrimary }]}>{course.name}</Text>
                  <Text style={[styles.courseMeta, { color: colors.textMuted }]}>{course.institution}</Text>
                </View>
              </View>

              <View style={styles.cardActions}>
                <TouchableOpacity
                  style={[styles.reportBtn, { borderColor: colors.glassBorder }]}
                  onPress={() => onViewReports(course.id)}
                  activeOpacity={0.7}
                >
                  <BarChart2 size={14} color={colors.cyan} />
                  <Text style={[styles.reportBtnText, { color: colors.textPrimary }]}>Reports</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.startBtn, { backgroundColor: colors.emerald }]}
                  onPress={() => onStartSession(course.id, duration)}
                  activeOpacity={0.85}
                >
                  <Play size={14} color="#FFFFFF" fill="#FFFFFF" />
                  <Text style={styles.startBtnText}>Start Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}

          {courses.length === 0 && (
            <Text style={[styles.emptyText, { color: colors.textMuted }]}>No courses assigned to your account.</Text>
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
  settingsBar: {
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    marginBottom: 20,
  },
  settingsLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  settingsLabel: { fontSize: FontSize.sm, fontWeight: '600' },
  durationRow: { flexDirection: 'row', gap: 8 },
  durBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    alignItems: 'center',
  },
  durText: { fontSize: FontSize.sm, fontWeight: '600' },
  customDurationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 10,
  },
  customDurationLabel: { fontSize: FontSize.xs },
  customDurationInput: {
    borderRadius: Radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: FontSize.sm,
    fontWeight: '600',
    minWidth: 64,
    borderWidth: 1,
    textAlign: 'center',
  },
  currentDurationSummary: { fontSize: FontSize.xs, fontWeight: '600', marginLeft: 'auto' },
  list: { gap: 12 },
  courseCard: {
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 14,
  },
  courseInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseAvatar: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 18, fontWeight: '700' },
  courseName: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  courseMeta: { fontSize: FontSize.xs },
  cardActions: { flexDirection: 'row', gap: 12 },
  reportBtn: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnText: { fontSize: FontSize.sm, fontWeight: '600' },
  startBtn: {
    flex: 1.4,
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  startBtnText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '700' },
  emptyText: { textAlign: 'center', marginTop: 40 },
});
