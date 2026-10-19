import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { ArrowLeft, Shield, AlertTriangle, RotateCcw } from 'lucide-react-native';
import { calculateSafetyMetrics, simulateFutureAttendance } from '@/shared/lib/attendanceCalculator';
import { StudentCourse } from '@/entities/session/api/student-api';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';
import { SafetyBadge } from './SafetyBadge';

interface AttendanceSafetyCalculatorProps {
  courses: StudentCourse[];
  onBack: () => void;
}

export const AttendanceSafetyCalculator: React.FC<AttendanceSafetyCalculatorProps> = ({
  courses,
  onBack,
}) => {
  const colors = useAppColors();
  const TARGET_PCT = 75;
  const [simulatorState, setSimulatorState] = useState<Record<number, { addAttended: number; addMissed: number }>>({});

  const atRiskCount = courses.filter((c) => {
    const m = calculateSafetyMetrics(c.attended_count, c.total_sessions, TARGET_PCT);
    return m.status === 'warning' || m.status === 'critical';
  }).length;

  const adjustSimulator = (courseId: number, field: 'addAttended' | 'addMissed', delta: number) => {
    setSimulatorState((prev) => {
      const current = prev[courseId] || { addAttended: 0, addMissed: 0 };
      const nextVal = Math.max(0, Math.min(20, current[field] + delta));
      return {
        ...prev,
        [courseId]: {
          ...current,
          [field]: nextVal,
        },
      };
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.bgDeep }]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.bgMid, borderBottomColor: colors.glassBorder }]}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn} activeOpacity={0.7}>
          <ArrowLeft size={16} color={colors.textSecondary} />
          <Text style={[styles.backText, { color: colors.textSecondary }]}>Back</Text>
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Attendance Safety</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Overall Status Banner */}
        <View
          style={[
            styles.summaryBanner,
            {
              backgroundColor: atRiskCount > 0 ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
              borderColor: atRiskCount > 0 ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)',
            },
          ]}
        >
          {atRiskCount > 0 ? (
            <AlertTriangle size={24} color={colors.danger} />
          ) : (
            <Shield size={24} color={colors.emerald} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.summaryTitle, { color: colors.textPrimary }]}>
              {atRiskCount > 0
                ? `${atRiskCount} course${atRiskCount > 1 ? 's' : ''} need attention`
                : 'All courses are in good standing'}
            </Text>
            <Text style={[styles.summarySub, { color: colors.textSecondary }]}>
              Minimum required attendance threshold is {TARGET_PCT}%.
            </Text>
          </View>
        </View>

        {courses.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>No enrolled courses found.</Text>
        ) : (
          courses.map((course) => {
            const metrics = calculateSafetyMetrics(course.attended_count, course.total_sessions, TARGET_PCT);
            const sim = simulatorState[course.course_id] || { addAttended: 0, addMissed: 0 };
            const isSimulating = sim.addAttended > 0 || sim.addMissed > 0;
            const simulatedPct = isSimulating
              ? simulateFutureAttendance(
                  course.attended_count,
                  course.total_sessions,
                  sim.addAttended,
                  sim.addMissed,
                )
              : metrics.currentPct;

            const pctColor =
              (isSimulating ? simulatedPct : metrics.currentPct) >= TARGET_PCT
                ? colors.emerald
                : (isSimulating ? simulatedPct : metrics.currentPct) >= 50
                ? colors.warning
                : colors.danger;

            return (
              <View key={course.course_id} style={[styles.card, { backgroundColor: colors.cardBg, borderColor: colors.glassBorder }]}>
                {/* Course Header */}
                <View style={styles.cardTop}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <Text style={[styles.courseName, { color: colors.textPrimary }]}>{course.course_name}</Text>
                    <Text style={[styles.sessionCount, { color: colors.textMuted }]}>
                      {course.total_sessions > 0
                        ? `${course.attended_count} of ${course.total_sessions} classes attended`
                        : 'No classes held yet'}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.pctNumber, { color: pctColor }]}>
                      {isSimulating ? `${simulatedPct}%` : `${metrics.currentPct}%`}
                    </Text>
                    {isSimulating && (
                      <Text style={[styles.simulatedLabel, { color: colors.purple }]}>Simulated</Text>
                    )}
                  </View>
                </View>

                {/* Progress bar */}
                <View style={[styles.progressTrack, { backgroundColor: 'rgba(255,255,255,0.06)' }]}>
                  <View
                    style={[
                      styles.progressBar,
                      {
                        width: `${Math.min(100, Math.max(0, isSimulating ? simulatedPct : metrics.currentPct))}%`,
                        backgroundColor: pctColor,
                      },
                    ]}
                  />
                  <View style={[styles.targetMarker, { left: '75%', backgroundColor: colors.warning }]} />
                </View>

                {/* Status Callout */}
                <View style={[styles.statusCallout, { borderColor: `${metrics.badgeColor}30`, backgroundColor: colors.glassC }]}>
                  <SafetyBadge attended={course.attended_count} total={course.total_sessions} target={TARGET_PCT} />
                  <Text style={[styles.calloutDesc, { color: colors.textSecondary }]}>{metrics.description}</Text>
                </View>

                {/* What-If Simulator Stepper */}
                <View style={styles.simulatorSection}>
                  <Text style={[styles.simulatorTitle, { color: colors.textPrimary }]}>What-if Attendance Simulator</Text>
                  <View style={styles.stepperRow}>
                    <View style={[styles.stepperBox, { backgroundColor: colors.glassC, borderColor: colors.glassBorder }]}>
                      <Text style={[styles.stepperLabel, { color: colors.textMuted }]}>Attend Next</Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.glassB }]}
                          onPress={() => adjustSimulator(course.course_id, 'addAttended', -1)}
                          disabled={sim.addAttended <= 0}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>−</Text>
                        </TouchableOpacity>
                        <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{sim.addAttended}</Text>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.glassB }]}
                          onPress={() => adjustSimulator(course.course_id, 'addAttended', 1)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={[styles.stepperBox, { backgroundColor: colors.glassC, borderColor: colors.glassBorder }]}>
                      <Text style={[styles.stepperLabel, { color: colors.textMuted }]}>Miss Next</Text>
                      <View style={styles.stepperControls}>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.glassB }]}
                          onPress={() => adjustSimulator(course.course_id, 'addMissed', -1)}
                          disabled={sim.addMissed <= 0}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>−</Text>
                        </TouchableOpacity>
                        <Text style={[styles.stepValue, { color: colors.textPrimary }]}>{sim.addMissed}</Text>
                        <TouchableOpacity
                          style={[styles.stepBtn, { backgroundColor: colors.glassB }]}
                          onPress={() => adjustSimulator(course.course_id, 'addMissed', 1)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.stepBtnText, { color: colors.textPrimary }]}>+</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>

                  {isSimulating && (
                    <TouchableOpacity
                      onPress={() =>
                        setSimulatorState((prev) => ({
                          ...prev,
                          [course.course_id]: { addAttended: 0, addMissed: 0 },
                        }))
                      }
                      style={[styles.resetBtn, { borderColor: colors.glassBorder }]}
                      activeOpacity={0.7}
                    >
                      <RotateCcw size={12} color={colors.textSecondary} />
                      <Text style={[styles.resetBtnText, { color: colors.textSecondary }]}>Reset Simulator</Text>
                    </TouchableOpacity>
                  )}
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
  summaryBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  summaryTitle: { fontSize: FontSize.md, fontWeight: '700' },
  summarySub: { fontSize: FontSize.xs, marginTop: 2 },
  emptyText: { textAlign: 'center', marginTop: 40 },
  card: {
    padding: 18,
    borderRadius: Radius.lg,
    borderWidth: 1,
    gap: 14,
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  courseName: { fontSize: FontSize.md, fontWeight: '700', marginBottom: 2 },
  sessionCount: { fontSize: FontSize.xs },
  pctNumber: { fontSize: 24, fontWeight: '800' },
  simulatedLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  progressTrack: { height: 8, borderRadius: 4, position: 'relative', overflow: 'hidden' },
  progressBar: { height: '100%', borderRadius: 4 },
  targetMarker: { position: 'absolute', top: 0, bottom: 0, width: 2, zIndex: 1 },
  statusCallout: { padding: 12, borderRadius: Radius.md, borderWidth: 1, gap: 6 },
  calloutDesc: { fontSize: FontSize.xs, lineHeight: 16 },
  simulatorSection: { gap: 10, paddingTop: 4 },
  simulatorTitle: { fontSize: FontSize.sm, fontWeight: '700' },
  stepperRow: { flexDirection: 'row', gap: 12 },
  stepperBox: { flex: 1, padding: 10, borderRadius: Radius.md, borderWidth: 1, alignItems: 'center', gap: 6 },
  stepperLabel: { fontSize: FontSize.xs, fontWeight: '600' },
  stepperControls: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  stepBtn: { width: 28, height: 28, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 16, fontWeight: '700' },
  stepValue: { fontSize: 16, fontWeight: '700', minWidth: 20, textAlign: 'center' },
  resetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: Radius.sm,
    borderWidth: 1,
    alignSelf: 'center',
    paddingHorizontal: 14,
    marginTop: 4,
  },
  resetBtnText: { fontSize: FontSize.xs, fontWeight: '600' },
});
