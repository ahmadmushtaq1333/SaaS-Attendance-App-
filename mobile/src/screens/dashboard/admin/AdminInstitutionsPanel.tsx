import React, { useState, useEffect, useCallback } from 'react';
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
  Institution,
  Department,
  Semester,
  Section,
} from '@/entities/admin';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

export const AdminInstitutionsPanel: React.FC = () => {
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInsts, setExpandedInsts] = useState<Record<number, boolean>>({});
  const [departmentsByInst, setDepartmentsByInst] = useState<Record<number, Department[]>>({});
  const [expandedDepts, setExpandedDepts] = useState<Record<number, boolean>>({});
  const [semestersByDept, setSemestersByDept] = useState<Record<number, Semester[]>>({});
  const [expandedSems, setExpandedSems] = useState<Record<number, boolean>>({});
  const [sectionsBySem, setSectionsBySem] = useState<Record<number, Section[]>>({});

  // Modal State for Create / Edit
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'inst' | 'dept' | 'sem' | 'sec'>('inst');
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [targetId, setTargetId] = useState<number | null>(null);
  const [parentId, setParentId] = useState<number | null>(null);
  const [inputName, setInputName] = useState('');
  const [inputDomain, setInputDomain] = useState('');
  const [saving, setSaving] = useState(false);

  const loadInstitutions = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.getInstitutions();
      setInstitutions(data);
    } catch {
      Alert.alert('Error', 'Failed to load institutions');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInstitutions();
  }, [loadInstitutions]);

  const toggleInst = async (instId: number) => {
    const next = !expandedInsts[instId];
    setExpandedInsts((prev) => ({ ...prev, [instId]: next }));
    if (next && !departmentsByInst[instId]) {
      try {
        const depts = await adminApi.getDepartments(instId);
        setDepartmentsByInst((prev) => ({ ...prev, [instId]: depts }));
      } catch {
        Alert.alert('Error', 'Failed to load departments');
      }
    }
  };

  const toggleDept = async (deptId: number) => {
    const next = !expandedDepts[deptId];
    setExpandedDepts((prev) => ({ ...prev, [deptId]: next }));
    if (next && !semestersByDept[deptId]) {
      try {
        const sems = await adminApi.getSemesters(deptId);
        setSemestersByDept((prev) => ({ ...prev, [deptId]: sems }));
      } catch {
        Alert.alert('Error', 'Failed to load semesters');
      }
    }
  };

  const toggleSem = async (semId: number) => {
    const next = !expandedSems[semId];
    setExpandedSems((prev) => ({ ...prev, [semId]: next }));
    if (next && !sectionsBySem[semId]) {
      try {
        const secs = await adminApi.getSections(semId);
        setSectionsBySem((prev) => ({ ...prev, [semId]: secs }));
      } catch {
        Alert.alert('Error', 'Failed to load sections');
      }
    }
  };

  const openModal = (
    type: 'inst' | 'dept' | 'sem' | 'sec',
    mode: 'create' | 'edit',
    target?: { id: number; name?: string; domain?: string; number?: number },
    parent?: number
  ) => {
    setModalType(type);
    setModalMode(mode);
    setTargetId(target?.id ?? null);
    setParentId(parent ?? null);
    setInputName(target?.name ?? (target?.number ? String(target.number) : ''));
    setInputDomain(target?.domain ?? '');
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!inputName.trim()) {
      Alert.alert('Validation', 'Please enter a name or number');
      return;
    }
    setSaving(true);
    try {
      if (modalType === 'inst') {
        if (modalMode === 'create') {
          await adminApi.createInstitution({ name: inputName.trim(), domain: inputDomain.trim() || undefined });
        } else if (targetId) {
          await adminApi.updateInstitution(targetId, { name: inputName.trim(), domain: inputDomain.trim() || undefined });
        }
        await loadInstitutions();
      } else if (modalType === 'dept') {
        if (modalMode === 'create' && parentId) {
          await adminApi.createDepartment({ name: inputName.trim(), institution: parentId });
          const depts = await adminApi.getDepartments(parentId);
          setDepartmentsByInst((prev) => ({ ...prev, [parentId]: depts }));
        } else if (targetId && parentId) {
          await adminApi.updateDepartment(targetId, { name: inputName.trim() });
          const depts = await adminApi.getDepartments(parentId);
          setDepartmentsByInst((prev) => ({ ...prev, [parentId]: depts }));
        }
      } else if (modalType === 'sem') {
        const num = parseInt(inputName.trim(), 10);
        if (isNaN(num)) {
          Alert.alert('Validation', 'Semester number must be an integer');
          setSaving(false);
          return;
        }
        if (modalMode === 'create' && parentId) {
          await adminApi.createSemester({ number: num, department: parentId });
          const sems = await adminApi.getSemesters(parentId);
          setSemestersByDept((prev) => ({ ...prev, [parentId]: sems }));
        } else if (targetId && parentId) {
          await adminApi.updateSemester(targetId, { number: num });
          const sems = await adminApi.getSemesters(parentId);
          setSemestersByDept((prev) => ({ ...prev, [parentId]: sems }));
        }
      } else if (modalType === 'sec') {
        if (modalMode === 'create' && parentId) {
          await adminApi.createSection({ name: inputName.trim(), semester: parentId });
          const secs = await adminApi.getSections(parentId);
          setSectionsBySem((prev) => ({ ...prev, [parentId]: secs }));
        } else if (targetId && parentId) {
          await adminApi.updateSection(targetId, { name: inputName.trim() });
          const secs = await adminApi.getSections(parentId);
          setSectionsBySem((prev) => ({ ...prev, [parentId]: secs }));
        }
      }
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.detail || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = (
    type: 'inst' | 'dept' | 'sem' | 'sec',
    id: number,
    name: string,
    parent?: number
  ) => {
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to delete ${name}? This will remove all nested entities and relationships.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              if (type === 'inst') {
                await adminApi.deleteInstitution(id);
                loadInstitutions();
              } else if (type === 'dept' && parent) {
                await adminApi.deleteDepartment(id);
                const depts = await adminApi.getDepartments(parent);
                setDepartmentsByInst((prev) => ({ ...prev, [parent]: depts }));
              } else if (type === 'sem' && parent) {
                await adminApi.deleteSemester(id);
                const sems = await adminApi.getSemesters(parent);
                setSemestersByDept((prev) => ({ ...prev, [parent]: sems }));
              } else if (type === 'sec' && parent) {
                await adminApi.deleteSection(id);
                const secs = await adminApi.getSections(parent);
                setSectionsBySem((prev) => ({ ...prev, [parent]: secs }));
              }
            } catch {
              Alert.alert('Error', 'Failed to delete entity');
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.cyan} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <Text style={styles.title}>University Hierarchy</Text>
        <TouchableOpacity
          style={styles.addInstBtn}
          onPress={() => openModal('inst', 'create')}
        >
          <Text style={styles.addInstText}>+ Add University</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollList}>
        {institutions.map((inst) => {
          const isInstExp = !!expandedInsts[inst.id];
          const depts = departmentsByInst[inst.id] || [];

          return (
            <View key={inst.id} style={styles.instCard}>
              <View style={styles.entityRow}>
                <TouchableOpacity
                  style={styles.expandTrigger}
                  onPress={() => toggleInst(inst.id)}
                >
                  <Text style={styles.expandIcon}>{isInstExp ? '▼' : '▶'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.instName}>{inst.name}</Text>
                    {inst.domain ? <Text style={styles.metaDomain}>🌐 {inst.domain}</Text> : null}
                  </View>
                </TouchableOpacity>

                <View style={styles.actionPills}>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openModal('dept', 'create', undefined, inst.id)}
                  >
                    <Text style={styles.addDeptPill}>+ Dept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => openModal('inst', 'edit', inst)}
                  >
                    <Text style={styles.editPill}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.iconBtn}
                    onPress={() => handleDelete('inst', inst.id, inst.name)}
                  >
                    <Text style={styles.delPill}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Departments Level */}
              {isInstExp && (
                <View style={styles.deptContainer}>
                  {depts.length === 0 ? (
                    <Text style={styles.emptySubtext}>No departments created yet.</Text>
                  ) : (
                    depts.map((dept) => {
                      const isDeptExp = !!expandedDepts[dept.id];
                      const sems = semestersByDept[dept.id] || [];

                      return (
                        <View key={dept.id} style={styles.deptCard}>
                          <View style={styles.entityRow}>
                            <TouchableOpacity
                              style={styles.expandTrigger}
                              onPress={() => toggleDept(dept.id)}
                            >
                              <Text style={styles.expandIcon}>{isDeptExp ? '▼' : '▶'}</Text>
                              <Text style={styles.deptName}>{dept.name}</Text>
                            </TouchableOpacity>

                            <View style={styles.actionPills}>
                              <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={() => openModal('sem', 'create', undefined, dept.id)}
                              >
                                <Text style={styles.addSemPill}>+ Sem</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={() => openModal('dept', 'edit', dept, inst.id)}
                              >
                                <Text style={styles.editPill}>Edit</Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={styles.iconBtn}
                                onPress={() => handleDelete('dept', dept.id, dept.name, inst.id)}
                              >
                                <Text style={styles.delPill}>✕</Text>
                              </TouchableOpacity>
                            </View>
                          </View>

                          {/* Semesters Level */}
                          {isDeptExp && (
                            <View style={styles.semContainer}>
                              {sems.length === 0 ? (
                                <Text style={styles.emptySubtext}>No semesters yet.</Text>
                              ) : (
                                sems.map((sem) => {
                                  const isSemExp = !!expandedSems[sem.id];
                                  const secs = sectionsBySem[sem.id] || [];

                                  return (
                                    <View key={sem.id} style={styles.semCard}>
                                      <View style={styles.entityRow}>
                                        <TouchableOpacity
                                          style={styles.expandTrigger}
                                          onPress={() => toggleSem(sem.id)}
                                        >
                                          <Text style={styles.expandIcon}>{isSemExp ? '▼' : '▶'}</Text>
                                          <Text style={styles.semName}>Semester {sem.number}</Text>
                                        </TouchableOpacity>

                                        <View style={styles.actionPills}>
                                          <TouchableOpacity
                                            style={styles.iconBtn}
                                            onPress={() => openModal('sec', 'create', undefined, sem.id)}
                                          >
                                            <Text style={styles.addSecPill}>+ Section</Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            style={styles.iconBtn}
                                            onPress={() => openModal('sem', 'edit', { id: sem.id, number: sem.number }, dept.id)}
                                          >
                                            <Text style={styles.editPill}>Edit</Text>
                                          </TouchableOpacity>
                                          <TouchableOpacity
                                            style={styles.iconBtn}
                                            onPress={() => handleDelete('sem', sem.id, `Semester ${sem.number}`, dept.id)}
                                          >
                                            <Text style={styles.delPill}>✕</Text>
                                          </TouchableOpacity>
                                        </View>
                                      </View>

                                      {/* Sections Level */}
                                      {isSemExp && (
                                        <View style={styles.secContainer}>
                                          {secs.length === 0 ? (
                                            <Text style={styles.emptySubtext}>No sections yet.</Text>
                                          ) : (
                                            secs.map((sec) => (
                                              <View key={sec.id} style={styles.secRow}>
                                                <Text style={styles.secName}>Section {sec.name}</Text>
                                                <View style={styles.actionPills}>
                                                  <TouchableOpacity
                                                    style={styles.iconBtn}
                                                    onPress={() => openModal('sec', 'edit', sec, sem.id)}
                                                  >
                                                    <Text style={styles.editPill}>Edit</Text>
                                                  </TouchableOpacity>
                                                  <TouchableOpacity
                                                    style={styles.iconBtn}
                                                    onPress={() => handleDelete('sec', sec.id, `Section ${sec.name}`, sem.id)}
                                                  >
                                                    <Text style={styles.delPill}>✕</Text>
                                                  </TouchableOpacity>
                                                </View>
                                              </View>
                                            ))
                                          )}
                                        </View>
                                      )}
                                    </View>
                                  );
                                })
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })
                  )}
                </View>
              )}
            </View>
          );
        })}

        {institutions.length === 0 && (
          <Text style={styles.emptyText}>No institutions found. Tap "+ Add University" above.</Text>
        )}
      </ScrollView>

      {/* Modal for adding/editing */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {modalMode === 'create' ? 'Create' : 'Edit'}{' '}
              {modalType === 'inst'
                ? 'University'
                : modalType === 'dept'
                ? 'Department'
                : modalType === 'sem'
                ? 'Semester'
                : 'Section'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder={
                modalType === 'sem'
                  ? 'Semester Number (e.g. 1)'
                  : 'Name (e.g. Computer Science)'
              }
              placeholderTextColor={Colors.textMuted}
              value={inputName}
              onChangeText={setInputName}
              keyboardType={modalType === 'sem' ? 'number-pad' : 'default'}
            />

            {modalType === 'inst' && (
              <TextInput
                style={[styles.input, { marginTop: 12 }]}
                placeholder="Domain (optional, e.g. stanford.edu)"
                placeholderTextColor={Colors.textMuted}
                value={inputDomain}
                onChangeText={setInputDomain}
                autoCapitalize="none"
              />
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleSave}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.white} size="small" />
                ) : (
                  <Text style={styles.saveText}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.bgDeep },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  title: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary },
  addInstBtn: {
    backgroundColor: Colors.cyan,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.md,
  },
  addInstText: { color: Colors.bgDeep, fontWeight: '700', fontSize: FontSize.xs },
  scrollList: { padding: 16, paddingBottom: 60, gap: 12 },

  instCard: {
    backgroundColor: Colors.glassA,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    overflow: 'hidden',
  },
  entityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  expandTrigger: { flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 },
  expandIcon: { color: Colors.textMuted, fontSize: 10, width: 14 },
  instName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  metaDomain: { color: Colors.cyan, fontSize: FontSize.xs, marginTop: 2 },
  actionPills: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  iconBtn: { padding: 2 },
  addDeptPill: {
    backgroundColor: 'rgba(34,211,238,0.15)',
    color: Colors.cyan,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  addSemPill: {
    backgroundColor: 'rgba(167,139,250,0.15)',
    color: Colors.purple,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  addSecPill: {
    backgroundColor: 'rgba(79,142,247,0.15)',
    color: Colors.emerald,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  editPill: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    color: Colors.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  delPill: {
    backgroundColor: 'rgba(248,113,113,0.12)',
    color: Colors.danger,
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },

  deptContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.2)',
    paddingLeft: 16,
    paddingRight: 10,
    paddingVertical: 8,
    gap: 8,
  },
  deptCard: {
    backgroundColor: Colors.glassB,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  deptName: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },

  semContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.glassBorder,
    backgroundColor: 'rgba(0,0,0,0.25)',
    paddingLeft: 14,
    paddingRight: 8,
    paddingVertical: 6,
    gap: 6,
  },
  semCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.04)',
  },
  semName: { color: Colors.purple, fontSize: FontSize.xs, fontWeight: '600' },

  secContainer: {
    paddingLeft: 14,
    paddingRight: 6,
    paddingVertical: 6,
    gap: 4,
  },
  secRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.02)',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radius.sm,
  },
  secName: { color: Colors.textSecondary, fontSize: FontSize.xs },

  emptySubtext: { color: Colors.textMuted, fontSize: FontSize.xs, padding: 8, fontStyle: 'italic' },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.cardBg,
    borderRadius: Radius.lg,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  modalTitle: { fontSize: FontSize.md, fontWeight: '700', color: Colors.textPrimary, marginBottom: 16 },
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 20 },
  cancelBtn: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: Radius.md },
  cancelText: { color: Colors.textSecondary, fontWeight: '600', fontSize: FontSize.sm },
  saveBtn: {
    backgroundColor: Colors.cyan,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.md,
    minWidth: 70,
    alignItems: 'center',
  },
  saveText: { color: Colors.bgDeep, fontWeight: '700', fontSize: FontSize.sm },
});
