import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import {
  adminApi,
  AdminCourse,
  Institution,
  Department,
  Section,
  AdminUser,
} from '@/entities/admin';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';

export const AdminCoursesPanel: React.FC = () => {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [courses, setCourses] = useState<AdminCourse[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Create Course Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [courseName, setCourseName] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [selectedInstId, setSelectedInstId] = useState<number | null>(null);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [selectedSecId, setSelectedSecId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);

  // Enrollment Modal
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [activeCourse, setActiveCourse] = useState<AdminCourse | null>(null);
  const [students, setStudents] = useState<AdminUser[]>([]);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [coursesData, instsData] = await Promise.all([
        adminApi.getCourses(),
        adminApi.getInstitutions(),
      ]);
      setCourses(coursesData);
      setInstitutions(instsData);
    } catch {
      Alert.alert('Error', 'Failed to load courses');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreateModal = () => {
    setCourseName('');
    setCourseCode('');
    setSelectedInstId(institutions[0]?.id || null);
    setSelectedDeptId(null);
    setSelectedSecId(null);
    setCreateModalVisible(true);
  };

  const handleSelectInst = async (instId: number) => {
    setSelectedInstId(instId);
    setSelectedDeptId(null);
    setSelectedSecId(null);
    try {
      const depts = await adminApi.getDepartments(instId);
      setDepartments(depts);
    } catch {
      console.error('Failed to load depts');
    }
  };

  const handleSelectDept = async (deptId: number) => {
    setSelectedDeptId(deptId);
    setSelectedSecId(null);
    try {
      const sems = await adminApi.getSemesters(deptId);
      if (sems.length > 0) {
        const secs = await adminApi.getSections(sems[0].id);
        setSections(secs);
      }
    } catch {
      console.error('Failed to load sections');
    }
  };

  const handleCreateCourse = async () => {
    if (!courseName.trim()) {
      Alert.alert('Validation', 'Course name is required');
      return;
    }
    if (!selectedInstId) {
      Alert.alert('Validation', 'Please select an institution');
      return;
    }
    setCreating(true);
    try {
      await adminApi.createCourse({
        name: courseName.trim(),
        institution: selectedInstId,
        department: selectedDeptId || undefined,
        section: selectedSecId || undefined,
      });
      setCreateModalVisible(false);
      Alert.alert('Success', 'Course created successfully');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.name?.[0] || 'Failed to create course');
    } finally {
      setCreating(false);
    }
  };

  const handleDeleteCourse = (course: AdminCourse) => {
    Alert.alert(
      'Delete Course',
      `Permanently delete "${course.name}"? Attendance records and enrollments will be affected.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await adminApi.deleteCourse(course.id);
              Alert.alert('Deleted', 'Course removed');
              loadData();
            } catch {
              Alert.alert('Error', 'Failed to delete course');
            }
          },
        },
      ]
    );
  };

  const openEnrollModal = async (course: AdminCourse) => {
    setActiveCourse(course);
    setEnrollModalVisible(true);
    setLoadingStudents(true);
    setSelectedStudentIds([]);
    try {
      const res = await adminApi.getUsers({
        role: 'student',
        all: true,
      });
      setStudents(res.results);
    } catch {
      Alert.alert('Error', 'Failed to load students');
    } finally {
      setLoadingStudents(false);
    }
  };

  const toggleStudentSelection = (studentId: number) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId)
        ? prev.filter((id) => id !== studentId)
        : [...prev, studentId]
    );
  };

  const handleBulkAssign = async () => {
    if (!activeCourse) return;
    if (selectedStudentIds.length === 0) {
      Alert.alert('Select Students', 'Please select at least one student to enroll.');
      return;
    }
    setAssigning(true);
    try {
      const res = await adminApi.bulkAssignEnrollments(activeCourse.id, selectedStudentIds);
      Alert.alert('Success', res.message || 'Students enrolled successfully');
      setEnrollModalVisible(false);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to assign students');
    } finally {
      setAssigning(false);
    }
  };

  const filteredCourses = courses.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      c.name.toLowerCase().includes(q) ||
      (c.code && c.code.toLowerCase().includes(q)) ||
      (c.department_name && c.department_name.toLowerCase().includes(q))
    );
  });

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.purple} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search courses by name or code..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity style={styles.addBtn} onPress={handleOpenCreateModal}>
          <Text style={styles.addBtnText}>+ Course</Text>
        </TouchableOpacity>
      </View>

      {/* Courses List */}
      <ScrollView contentContainerStyle={styles.list}>
        {filteredCourses.map((c) => {
          const deptName = typeof c.department === 'object' && c.department ? c.department.name : c.department_name;
          const secName = typeof c.section === 'object' && c.section ? c.section.name : c.section_name;
          const displayCode = c.code || c.name.slice(0, 3).toUpperCase();

          return (
            <View key={c.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.badgeCode}>
                  <Text style={styles.codeText}>{displayCode}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courseName}>{c.name}</Text>
                  <Text style={styles.metaText}>
                    {deptName ? `${deptName} · ` : ''}
                    {secName ? `Sec ${secName}` : 'General'}
                  </Text>
                </View>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteCourse(c)}
              >
                <Text style={styles.deleteText}>✕</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.footerRow}>
              <View style={styles.enrollmentStat}>
                <Text style={styles.enrollmentNumber}>{c.enrollment_count ?? 0}</Text>
                <Text style={styles.enrollmentLabel}>Students Enrolled</Text>
              </View>

              <TouchableOpacity
                style={styles.enrollBtn}
                onPress={() => openEnrollModal(c)}
              >
                <Text style={styles.enrollBtnText}>+ Enroll Students</Text>
              </TouchableOpacity>
            </View>
          </View>
          );
        })}

        {filteredCourses.length === 0 && (
          <Text style={styles.emptyText}>No courses found.</Text>
        )}
      </ScrollView>

      {/* Create Course Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Course</Text>

            <Text style={styles.label}>Course Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Data Structures & Algorithms"
              placeholderTextColor={colors.textMuted}
              value={courseName}
              onChangeText={setCourseName}
            />

            <Text style={styles.label}>Course Code (Optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. CS201"
              placeholderTextColor={colors.textMuted}
              value={courseCode}
              onChangeText={setCourseCode}
              autoCapitalize="characters"
            />

            <Text style={styles.label}>University *</Text>
            <TouchableOpacity
              style={styles.pickerTrigger}
              onPress={() => {
                Alert.alert(
                  'Select University',
                  'Choose institution:',
                  institutions.map((i) => ({
                    text: i.name,
                    onPress: () => handleSelectInst(i.id),
                  }))
                );
              }}
            >
              <Text style={styles.pickerTriggerText}>
                {selectedInstId
                  ? institutions.find((i) => i.id === selectedInstId)?.name
                  : 'Select Institution'}
              </Text>
            </TouchableOpacity>

            {departments.length > 0 && (
              <>
                <Text style={styles.label}>Department (Optional)</Text>
                <TouchableOpacity
                  style={styles.pickerTrigger}
                  onPress={() => {
                    Alert.alert(
                      'Select Department',
                      'Choose department:',
                      [
                        { text: 'None / General', onPress: () => setSelectedDeptId(null) },
                        ...departments.map((d) => ({
                          text: d.name,
                          onPress: () => handleSelectDept(d.id),
                        })),
                      ]
                    );
                  }}
                >
                  <Text style={styles.pickerTriggerText}>
                    {selectedDeptId
                      ? departments.find((d) => d.id === selectedDeptId)?.name
                      : 'None / General'}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreateModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleCreateCourse}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Course</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enroll Students Modal */}
      <Modal visible={enrollModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: '80%' }]}>
            <Text style={styles.modalTitle}>
              Enroll Students: {activeCourse?.name}
            </Text>
            <Text style={styles.subTitle}>
              Select students from directory to assign to this course:
            </Text>

            {loadingStudents ? (
              <ActivityIndicator color={colors.purple} style={{ marginVertical: 30 }} />
            ) : (
              <ScrollView style={{ maxHeight: 350, marginVertical: 10 }}>
                {students.map((std) => {
                  const isChecked = selectedStudentIds.includes(std.id);
                  return (
                    <TouchableOpacity
                      key={std.id}
                      style={[styles.stdRow, isChecked && styles.stdRowSelected]}
                      onPress={() => toggleStudentSelection(std.id)}
                    >
                      <View style={[styles.checkbox, isChecked && styles.checkboxActive]}>
                        {isChecked && <Text style={styles.checkMark}>✓</Text>}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.stdName}>{std.full_name || std.email.split('@')[0]}</Text>
                        <Text style={styles.stdEmail}>{std.email}</Text>
                      </View>
                      {std.registration_number ? (
                        <Text style={styles.stdReg}>{std.registration_number}</Text>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEnrollModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.purple }]}
                onPress={handleBulkAssign}
                disabled={assigning}
              >
                {assigning ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>
                    Enroll ({selectedStudentIds.length})
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (colors: ReturnType<typeof useAppColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    topBar: {
      flexDirection: 'row',
      padding: 14,
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
      alignItems: 'center',
    },
    searchInput: {
      flex: 1,
      backgroundColor: colors.inputBg,
      borderRadius: Radius.md,
      paddingHorizontal: 14,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontSize: FontSize.sm,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    addBtn: {
      backgroundColor: colors.purple,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderRadius: Radius.md,
    },
    addBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: FontSize.xs },

    list: { padding: 14, gap: 12, paddingBottom: 60 },
    card: {
      backgroundColor: colors.cardBg,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 16,
      gap: 14,
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    badgeCode: {
      width: 44,
      height: 44,
      borderRadius: 12,
      backgroundColor: `${colors.purple}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    codeText: { color: colors.purple, fontSize: 13, fontWeight: '800' },
    courseName: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
    metaText: { color: colors.textMuted, fontSize: FontSize.xs, marginTop: 2 },
    deleteBtn: { padding: 6 },
    deleteText: { color: colors.danger, fontSize: 14, fontWeight: '700' },

    footerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
    },
    enrollmentStat: { flexDirection: 'column' },
    enrollmentNumber: { color: colors.cyan, fontSize: FontSize.md, fontWeight: '700' },
    enrollmentLabel: { color: colors.textMuted, fontSize: 10 },
    enrollBtn: {
      backgroundColor: colors.glassA,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    enrollBtnText: { color: colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },
    emptyText: { color: colors.textMuted, textAlign: 'center', marginTop: 40 },

    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.65)',
      justifyContent: 'center',
      padding: 20,
    },
    modalContent: {
      backgroundColor: colors.cardBgSolid,
      borderRadius: Radius.lg,
      padding: 20,
      borderWidth: 1,
      borderColor: colors.glassBorder,
    },
    modalTitle: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: '700', marginBottom: 4 },
    subTitle: { color: colors.textSecondary, fontSize: FontSize.xs, marginBottom: 10 },
    label: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', marginTop: 10, marginBottom: 4 },
    input: {
      backgroundColor: colors.inputBg,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      paddingVertical: 10,
      color: colors.textPrimary,
      fontSize: FontSize.sm,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    pickerTrigger: {
      backgroundColor: colors.inputBg,
      borderRadius: Radius.md,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    pickerTriggerText: { color: colors.textPrimary, fontSize: FontSize.sm },
    btnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 18 },
    cancelBtn: { paddingHorizontal: 16, paddingVertical: 10 },
    cancelBtnText: { color: colors.textSecondary, fontSize: FontSize.sm },
    saveBtn: {
      backgroundColor: colors.cyan,
      paddingHorizontal: 20,
      paddingVertical: 10,
      borderRadius: Radius.md,
    },
    saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: FontSize.sm },

    stdRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 10,
      borderRadius: Radius.sm,
      borderBottomWidth: 1,
      borderBottomColor: colors.glassBorder,
      gap: 10,
    },
    stdRowSelected: { backgroundColor: `${colors.purple}15` },
    checkbox: {
      width: 20,
      height: 20,
      borderRadius: 4,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkboxActive: { backgroundColor: colors.purple, borderColor: colors.purple },
    checkMark: { color: '#FFFFFF', fontSize: 12, fontWeight: '700' },
    stdName: { color: colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },
    stdEmail: { color: colors.textMuted, fontSize: 10 },
    stdReg: { color: colors.cyan, fontSize: 10, fontWeight: '600' },
  });
