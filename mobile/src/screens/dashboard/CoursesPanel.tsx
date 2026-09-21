import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Course } from '@/entities/session/api/teacher-api';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

interface CoursesPanelProps {
  courses: Course[];
  onBack: () => void;
  onStartSession: (courseId: number, durationMins: number) => void;
  onViewReports: (courseId: number) => void;
}

export const CoursesPanel: React.FC<CoursesPanelProps> = ({ courses, onBack, onStartSession, onViewReports }) => {
  const [duration, setDuration] = useState(60);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Courses</Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Settings Bar */}
        <View style={styles.settingsBar}>
          <Text style={styles.settingsLabel}>Session Duration:</Text>
          <View style={styles.durationRow}>
            {[30, 60, 90, 120].map(mins => (
              <TouchableOpacity 
                key={mins}
                style={[styles.durBtn, duration === mins && styles.durBtnActive]}
                onPress={() => setDuration(mins)}
              >
                <Text style={[styles.durText, duration === mins && styles.durTextActive]}>
                  {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Course List */}
        <View style={styles.list}>
          {courses.map((course, i) => (
            <View key={course.id} style={styles.courseCard}>
              <View style={styles.courseInfo}>
                <View style={styles.courseAvatar}>
                  <Text style={styles.avatarText}>{course.name.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseName}>{course.name}</Text>
                  <Text style={styles.courseMeta}>{course.institution}</Text>
                </View>
              </View>
              
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.reportBtn} onPress={() => onViewReports(course.id)}>
                  <Text style={styles.reportBtnText}>📊 Reports</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.startBtn} onPress={() => onStartSession(course.id, duration)}>
                  <Text style={styles.startBtnText}>▶ Start Session</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
          
          {courses.length === 0 && (
            <Text style={styles.emptyText}>No courses assigned to your account.</Text>
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
  
  settingsBar: {
    backgroundColor: Colors.glassA, padding: 16, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.glassBorder, marginBottom: 24,
  },
  settingsLabel: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600', marginBottom: 12 },
  durationRow: { flexDirection: 'row', gap: 8 },
  durBtn: {
    flex: 1, paddingVertical: 10, borderRadius: Radius.md,
    backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center',
  },
  durBtnActive: { backgroundColor: Colors.emerald },
  durText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  durTextActive: { color: Colors.white, fontWeight: '700' },
  
  list: { gap: 12 },
  courseCard: {
    backgroundColor: Colors.glassA, padding: 16, borderRadius: Radius.lg,
    borderWidth: 1, borderColor: Colors.glassBorder,
    flexDirection: 'column', gap: 16,
  },
  courseInfo: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  courseAvatar: {
    width: 44, height: 44, borderRadius: 12,
    backgroundColor: 'rgba(167,139,250,0.15)', alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.purple, fontSize: 18, fontWeight: '700' },
  courseName: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '600', marginBottom: 4 },
  courseMeta: { color: Colors.textMuted, fontSize: FontSize.xs },
  
  cardActions: { flexDirection: 'row', gap: 12 },
  
  reportBtn: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.05)', paddingHorizontal: 12, paddingVertical: 12,
    borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.glassBorder,
    alignItems: 'center',
  },
  reportBtnText: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },

  startBtn: {
    flex: 1.5,
    backgroundColor: Colors.emerald, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: Radius.md, alignItems: 'center',
  },
  startBtnText: { color: Colors.white, fontSize: FontSize.sm, fontWeight: '700' },
  
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },
});
