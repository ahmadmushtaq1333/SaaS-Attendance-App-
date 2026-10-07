import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Modal, ActivityIndicator, ScrollView,
} from 'react-native';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';
import { useReplication } from '../model/useReplication';
import { ReplicationResult, ConflictStrategy } from '../api/replication-api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LinkedCourse {
  id: number;
  name: string;
}

interface ReplicateAttendanceButtonProps {
  sourceSessionId: number;
  /** Provided by the parent — no internal data fetching. Renders null if empty. */
  linkedCourses: LinkedCourse[];
  onSuccess: (result: ReplicationResult, targetCourseName: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Self-contained button + bottom-sheet flow for replicating attendance.
 *
 * Lifecycle:
 *  1. Teacher taps the button  → course picker sheet opens.
 *  2. Teacher selects a course → conflict modal may appear (if backend says skipped).
 *  3. Confirm  → calls useReplication → calls backend → notifies parent via onSuccess.
 *
 * Renders nothing when linkedCourses is empty (feature is invisible to teachers
 * who have no paired courses).
 */
export const ReplicateAttendanceButton: React.FC<ReplicateAttendanceButtonProps> = ({
  sourceSessionId,
  linkedCourses,
  onSuccess,
}) => {
  const [pickerVisible,   setPickerVisible]   = useState(false);
  const [conflictVisible, setConflictVisible] = useState(false);
  const [selectedCourse,  setSelectedCourse]  = useState<LinkedCourse | null>(null);

  const { loading, error, replicate, reset } = useReplication();

  // Feature is invisible when no links are configured
  if (linkedCourses.length === 0) return null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const openPicker = () => {
    reset();
    setSelectedCourse(null);
    setPickerVisible(true);
  };

  const handleReplicate = async (strategy: ConflictStrategy = 'replace') => {
    if (!selectedCourse) return;
    const result = await replicate(sourceSessionId, selectedCourse.id, strategy);
    if (!result) return; // error is shown inline

    if (result.status === 'skipped') {
      // A session already exists — ask the teacher how to proceed
      setConflictVisible(true);
    } else {
      setPickerVisible(false);
      setConflictVisible(false);
      onSuccess(result, selectedCourse.name);
    }
  };

  const handleConflictChoice = async (strategy: ConflictStrategy) => {
    setConflictVisible(false);
    await handleReplicate(strategy);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger button — shown inside the LiveSession panel */}
      <TouchableOpacity style={styles.triggerBtn} onPress={openPicker}>
        <Text style={styles.triggerBtnText}>🔁  Replicate Attendance</Text>
      </TouchableOpacity>

      {/* ── Course Picker Sheet ──────────────────────────────────────────── */}
      <Modal visible={pickerVisible} transparent animationType="slide" onRequestClose={() => setPickerVisible(false)}>
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => !loading && setPickerVisible(false)}
        >
          <TouchableOpacity activeOpacity={1} style={styles.sheet}>
            <View style={styles.handle} />

            <Text style={styles.sheetTitle}>Replicate Attendance To</Text>
            <Text style={styles.sheetSub}>
              Select the linked course. All present students will be copied.
            </Text>

            <ScrollView style={styles.courseList} showsVerticalScrollIndicator={false}>
              {linkedCourses.map(course => (
                <TouchableOpacity
                  key={course.id}
                  style={[
                    styles.courseRow,
                    selectedCourse?.id === course.id && styles.courseRowSelected,
                  ]}
                  onPress={() => setSelectedCourse(course)}
                  disabled={loading}
                >
                  <View style={styles.courseRowInner}>
                    <View style={[
                      styles.radioOuter,
                      selectedCourse?.id === course.id && styles.radioOuterActive,
                    ]}>
                      {selectedCourse?.id === course.id && <View style={styles.radioInner} />}
                    </View>
                    <Text style={styles.courseName}>{course.name}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Inline error */}
            {error ? <Text style={styles.errorText}>⚠ {error}</Text> : null}

            {/* Actions */}
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setPickerVisible(false)}
                disabled={loading}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  (!selectedCourse || loading) && styles.btnDisabled,
                ]}
                onPress={() => handleReplicate('replace')}
                disabled={!selectedCourse || loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.confirmText}>Replicate</Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ── Conflict Resolution Modal ────────────────────────────────────── */}
      <Modal visible={conflictVisible} transparent animationType="fade" onRequestClose={() => setConflictVisible(false)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, styles.conflictSheet]}>
            <Text style={styles.conflictIcon}>⚠️</Text>
            <Text style={styles.sheetTitle}>Session Already Exists</Text>
            <Text style={styles.sheetSub}>
              {selectedCourse?.name} already has an attendance session today. What would you like to do?
            </Text>

            <TouchableOpacity style={styles.conflictOption} onPress={() => handleConflictChoice('replace')}>
              <Text style={styles.conflictOptionTitle}>Replace</Text>
              <Text style={styles.conflictOptionDesc}>Delete the existing session and copy fresh attendance.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.conflictOption} onPress={() => handleConflictChoice('merge')}>
              <Text style={styles.conflictOptionTitle}>Merge</Text>
              <Text style={styles.conflictOptionDesc}>Keep existing records, only add students not yet marked.</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.cancelBtn, { alignSelf: 'stretch', marginTop: 8 }]} onPress={() => setConflictVisible(false)}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  triggerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingVertical: 13,
    paddingHorizontal: 20,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.purple,
    backgroundColor: 'rgba(167,139,250,0.10)',
  },
  triggerBtnText: {
    color: Colors.purple,
    fontWeight: '700',
    fontSize: FontSize.sm,
    letterSpacing: 0.3,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.bgDeep,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 48,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 16,
  },
  conflictSheet: {
    borderRadius: 20,
    marginHorizontal: 20,
    marginBottom: 'auto',
    marginTop: 'auto',
    paddingBottom: 28,
    alignItems: 'center',
  },
  handle: {
    width: 40, height: 4,
    backgroundColor: Colors.glassBorder,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 8,
  },

  sheetTitle: {
    color: Colors.textPrimary,
    fontSize: FontSize.xl,
    fontWeight: '700',
  },
  sheetSub: {
    color: Colors.textMuted,
    fontSize: FontSize.sm,
    lineHeight: 20,
  },

  courseList: { maxHeight: 240 },
  courseRow: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.03)',
    marginBottom: 8,
  },
  courseRowSelected: {
    borderColor: Colors.purple,
    backgroundColor: 'rgba(167,139,250,0.10)',
  },
  courseRowInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  radioOuter: {
    width: 20, height: 20, borderRadius: 10,
    borderWidth: 2, borderColor: Colors.glassBorder,
    alignItems: 'center', justifyContent: 'center',
  },
  radioOuterActive: { borderColor: Colors.purple },
  radioInner: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: Colors.purple,
  },
  courseName: {
    color: Colors.textPrimary,
    fontSize: FontSize.md,
    fontWeight: '600',
    flex: 1,
  },

  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },

  actionRow: { flexDirection: 'row', gap: 12 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
  },
  cancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.md },
  confirmBtn: {
    flex: 2, paddingVertical: 14, borderRadius: Radius.md,
    backgroundColor: Colors.purple, alignItems: 'center',
  },
  confirmText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.md },
  btnDisabled: { opacity: 0.45 },

  conflictIcon: { fontSize: 36, marginTop: 8 },
  conflictOption: {
    width: '100%',
    padding: 16, borderRadius: Radius.md,
    borderWidth: 1, borderColor: Colors.glassBorder,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 4,
  },
  conflictOptionTitle: { color: Colors.textPrimary, fontWeight: '700', fontSize: FontSize.md },
  conflictOptionDesc:  { color: Colors.textMuted, fontSize: FontSize.xs, lineHeight: 18 },
});
