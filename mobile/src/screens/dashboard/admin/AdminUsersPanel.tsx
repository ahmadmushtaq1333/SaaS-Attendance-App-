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
  AdminUser,
  Institution,
  Department,
  Semester,
  Section,
} from '@/entities/admin';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

export const AdminUsersPanel: React.FC = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher' | 'admin'>('all');

  // Cascading structure data
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInst, setSelectedInst] = useState<number | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [selectedDept, setSelectedDept] = useState<number | null>(null);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [selectedSem, setSelectedSem] = useState<number | null>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [selectedSec, setSelectedSec] = useState<number | null>(null);

  // Inspector Modal
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editRegNum, setEditRegNum] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Create User Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [createRole, setCreateRole] = useState<'student' | 'teacher' | 'admin'>('student');
  const [createEmail, setCreateEmail] = useState('');
  const [createFullName, setCreateFullName] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRegNum, setCreateRegNum] = useState('');
  const [creating, setCreating] = useState(false);

  // Bulk Generate Modal
  const [bulkModalVisible, setBulkModalVisible] = useState(false);
  const [bulkCount, setBulkCount] = useState('5');
  const [bulkPrefix, setBulkPrefix] = useState('std_');
  const [bulkPassword, setBulkPassword] = useState('');
  const [generating, setGenerating] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, instsData] = await Promise.all([
        adminApi.getUsers({ all: true }),
        adminApi.getInstitutions(),
      ]);
      setUsers(usersData.results);
      setInstitutions(instsData);
    } catch {
      Alert.alert('Error', 'Failed to load user directory');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Cascading filters handlers
  const handleSelectInst = async (instId: number | null) => {
    setSelectedInst(instId);
    setSelectedDept(null);
    setSelectedSem(null);
    setSelectedSec(null);
    setDepartments([]);
    setSemesters([]);
    setSections([]);
    if (instId) {
      try {
        const depts = await adminApi.getDepartments(instId);
        setDepartments(depts);
      } catch {
        console.error('Failed to load depts');
      }
    }
  };

  const handleSelectDept = async (deptId: number | null) => {
    setSelectedDept(deptId);
    setSelectedSem(null);
    setSelectedSec(null);
    setSemesters([]);
    setSections([]);
    if (deptId) {
      try {
        const sems = await adminApi.getSemesters(deptId);
        setSemesters(sems);
      } catch {
        console.error('Failed to load sems');
      }
    }
  };

  const handleSelectSem = async (semId: number | null) => {
    setSelectedSem(semId);
    setSelectedSec(null);
    setSections([]);
    if (semId) {
      try {
        const secs = await adminApi.getSections(semId);
        setSections(secs);
      } catch {
        console.error('Failed to load secs');
      }
    }
  };

  // Filtered Users computation
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (selectedInst && u.institution !== selectedInst) return false;
      if (selectedDept && u.department !== selectedDept) return false;
      if (selectedSec && u.section !== selectedSec) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const emailMatch = u.email?.toLowerCase().includes(q);
        const nameMatch = u.full_name?.toLowerCase().includes(q);
        const regMatch = u.registration_number?.toLowerCase().includes(q);
        if (!emailMatch && !nameMatch && !regMatch) return false;
      }
      return true;
    });
  }, [users, roleFilter, selectedInst, selectedDept, selectedSec, search]);

  // Inspector actions
  const openInspector = (user: AdminUser) => {
    setSelectedUser(user);
    setEditFullName(user.full_name || '');
    setEditEmail(user.email || '');
    setEditRegNum(user.registration_number || '');
    setEditPassword('');
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedUser) return;
    setActionLoading(true);
    try {
      const payload: Partial<AdminUser> & { password?: string } = {
        full_name: editFullName.trim() || null,
        email: editEmail.trim(),
        registration_number: editRegNum.trim() || null,
      };
      if (editPassword.trim()) {
        payload.password = editPassword.trim();
      }
      const updated = await adminApi.updateUser(selectedUser.id, payload);
      setSelectedUser(updated);
      setIsEditing(false);
      Alert.alert('Success', 'User profile updated');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.email?.[0] || 'Failed to update user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetDevice = () => {
    if (!selectedUser) return;
    Alert.alert(
      'Reset Device Binding',
      `Clear hardware binding for ${selectedUser.email}? The student can bind a new mobile device on their next attendance scan.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Device',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await adminApi.resetDevice(selectedUser.id);
              Alert.alert('Reset Success', res.message);
              loadData();
            } catch {
              Alert.alert('Error', 'Failed to reset device');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetPasskey = () => {
    if (!selectedUser) return;
    Alert.alert(
      'Reset Passkey',
      `Clear passkey credentials for ${selectedUser.email}? On their next sign-in, they will be prompted to register their new passkey.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Passkey',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await adminApi.resetPasskey(selectedUser.id);
              Alert.alert('Reset Success', res.message);
              loadData();
            } catch {
              Alert.alert('Error', 'Failed to reset passkey');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleResetDailyLock = () => {
    if (!selectedUser) return;
    Alert.alert(
      'Clear Daily Lock',
      `Allow ${selectedUser.email} to log in from a new device today?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear Lock',
          onPress: async () => {
            setActionLoading(true);
            try {
              const res = await adminApi.resetDailyLock(selectedUser.id);
              Alert.alert('Cleared', res.message);
              loadData();
            } catch {
              Alert.alert('Error', 'Failed to clear daily lock');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteUser = () => {
    if (!selectedUser) return;
    Alert.alert(
      'Permanently Delete',
      `Permanently delete account ${selectedUser.email}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setActionLoading(true);
            try {
              await adminApi.deleteUser(selectedUser.id);
              setSelectedUser(null);
              Alert.alert('Deleted', 'User account deleted');
              loadData();
            } catch {
              Alert.alert('Error', 'Failed to delete user');
            } finally {
              setActionLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateUser = async () => {
    if (!createEmail.trim()) {
      Alert.alert('Validation', 'Email is required');
      return;
    }
    setCreating(true);
    try {
      await adminApi.createUser({
        email: createEmail.trim().toLowerCase(),
        full_name: createFullName.trim() || null,
        role: createRole,
        password: createPassword.trim() || undefined,
        registration_number: createRegNum.trim() || undefined,
        institution: selectedInst || undefined,
        department: selectedDept || undefined,
        section: selectedSec || undefined,
        is_email_verified: true,
      });
      setCreateModalVisible(false);
      setCreateEmail('');
      setCreateFullName('');
      setCreatePassword('');
      setCreateRegNum('');
      Alert.alert('Success', 'User account created');
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.email?.[0] || 'Failed to create user');
    } finally {
      setCreating(false);
    }
  };

  const handleBulkGenerate = async () => {
    if (!selectedSec) {
      Alert.alert('Select Section', 'Please select a university, department, semester, and section first.');
      return;
    }
    const count = parseInt(bulkCount, 10);
    if (isNaN(count) || count < 1) {
      Alert.alert('Validation', 'Please enter a valid count');
      return;
    }
    setGenerating(true);
    try {
      const res = await adminApi.bulkGenerateUsers({
        section_id: selectedSec,
        count,
        prefix: bulkPrefix.trim(),
        password: bulkPassword.trim() || undefined,
      });
      setBulkModalVisible(false);
      Alert.alert('Generated', res.message);
      loadData();
    } catch (err: any) {
      Alert.alert('Error', err?.response?.data?.error || 'Failed to generate student accounts');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={Colors.emerald} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Search & Action Bar */}
      <View style={styles.topBar}>
        <TextInput
          style={styles.searchInput}
          placeholder="🔍 Search by name, email, reg no..."
          placeholderTextColor={Colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.addUserBtn}
            onPress={() => setCreateModalVisible(true)}
          >
            <Text style={styles.addUserBtnText}>+ User</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.bulkBtn}
            onPress={() => setBulkModalVisible(true)}
          >
            <Text style={styles.bulkBtnText}>⚡ Bulk</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Role Filter Tabs */}
      <View style={styles.roleTabsRow}>
        {(['all', 'student', 'teacher', 'admin'] as const).map((r) => (
          <TouchableOpacity
            key={r}
            style={[styles.roleTab, roleFilter === r && styles.roleTabActive]}
            onPress={() => setRoleFilter(r)}
          >
            <Text style={[styles.roleTabText, roleFilter === r && styles.roleTabTextActive]}>
              {r.toUpperCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cascading 4-Tier Hierarchy Selector Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar}>
        {/* Inst Dropdown */}
        <TouchableOpacity
          style={[styles.filterChip, Boolean(selectedInst) && styles.filterChipActive]}
          onPress={() => {
            Alert.alert(
              'Select Institution',
              'Filter by university:',
              [
                { text: 'All Universities', onPress: () => handleSelectInst(null) },
                ...institutions.map((inst) => ({
                  text: inst.name,
                  onPress: () => handleSelectInst(inst.id),
                })),
              ]
            );
          }}
        >
          <Text style={styles.filterChipText}>
            🏛️ {selectedInst ? institutions.find((i) => i.id === selectedInst)?.name : 'All Universities'}
          </Text>
        </TouchableOpacity>

        {/* Dept Dropdown */}
        {selectedInst && departments.length > 0 && (
          <TouchableOpacity
            style={[styles.filterChip, Boolean(selectedDept) && styles.filterChipActive]}
            onPress={() => {
              Alert.alert(
                'Select Department',
                'Filter by department:',
                [
                  { text: 'All Departments', onPress: () => handleSelectDept(null) },
                  ...departments.map((d) => ({
                    text: d.name,
                    onPress: () => handleSelectDept(d.id),
                  })),
                ]
              );
            }}
          >
            <Text style={styles.filterChipText}>
              📚 {selectedDept ? departments.find((d) => d.id === selectedDept)?.name : 'All Depts'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Sem Dropdown */}
        {selectedDept && semesters.length > 0 && (
          <TouchableOpacity
            style={[styles.filterChip, Boolean(selectedSem) && styles.filterChipActive]}
            onPress={() => {
              Alert.alert(
                'Select Semester',
                'Filter by semester:',
                [
                  { text: 'All Semesters', onPress: () => handleSelectSem(null) },
                  ...semesters.map((s) => ({
                    text: `Semester ${s.number}`,
                    onPress: () => handleSelectSem(s.id),
                  })),
                ]
              );
            }}
          >
            <Text style={styles.filterChipText}>
              ⏳ {selectedSem ? `Sem ${semesters.find((s) => s.id === selectedSem)?.number}` : 'All Semesters'}
            </Text>
          </TouchableOpacity>
        )}

        {/* Sec Dropdown */}
        {selectedSem && sections.length > 0 && (
          <TouchableOpacity
            style={[styles.filterChip, Boolean(selectedSec) && styles.filterChipActive]}
            onPress={() => {
              Alert.alert(
                'Select Section',
                'Filter by section:',
                [
                  { text: 'All Sections', onPress: () => setSelectedSec(null) },
                  ...sections.map((sec) => ({
                    text: `Section ${sec.name}`,
                    onPress: () => setSelectedSec(sec.id),
                  })),
                ]
              );
            }}
          >
            <Text style={styles.filterChipText}>
              🏷️ {selectedSec ? `Sec ${sections.find((sec) => sec.id === selectedSec)?.name}` : 'All Sections'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      {/* Users Count Summary */}
      <View style={styles.countSummary}>
        <Text style={styles.countText}>
          Showing {filteredUsers.length} of {users.length} accounts
        </Text>
      </View>

      {/* Users List */}
      <ScrollView contentContainerStyle={styles.list}>
        {filteredUsers.map((u) => {
          const roleColor =
            u.role === 'admin' ? Colors.purple : u.role === 'teacher' ? Colors.cyan : Colors.emerald;

          return (
            <TouchableOpacity
              key={u.id}
              style={styles.userCard}
              onPress={() => openInspector(u)}
            >
              <View style={[styles.avatar, { backgroundColor: `${roleColor}25` }]}>
                <Text style={[styles.avatarText, { color: roleColor }]}>
                  {(u.full_name || u.email).charAt(0).toUpperCase()}
                </Text>
              </View>

              <View style={styles.userInfo}>
                <View style={styles.userNameRow}>
                  <Text style={styles.userName}>
                    {u.full_name || u.email.split('@')[0]}
                  </Text>
                  <View style={[styles.roleBadge, { backgroundColor: `${roleColor}20` }]}>
                    <Text style={[styles.roleBadgeText, { color: roleColor }]}>
                      {u.role.toUpperCase()}
                    </Text>
                  </View>
                </View>

                <Text style={styles.userEmail}>{u.email}</Text>
                {u.registration_number ? (
                  <Text style={styles.userReg}>Reg: {u.registration_number}</Text>
                ) : null}

                {/* Status Badges */}
                <View style={styles.statusRow}>
                  {u.has_passkey && (
                    <Text style={styles.passkeyBadge}>🔑 Passkey</Text>
                  )}
                  {u.has_bound_device && (
                    <Text style={styles.deviceBadge}>📱 Bound</Text>
                  )}
                  {u.is_email_verified && (
                    <Text style={styles.verifiedBadge}>✓ Verified</Text>
                  )}
                </View>
              </View>

              <Text style={styles.chevron}>›</Text>
            </TouchableOpacity>
          );
        })}

        {filteredUsers.length === 0 && (
          <Text style={styles.emptyText}>No users matched your query or filters.</Text>
        )}
      </ScrollView>

      {/* User Inspector Modal */}
      <Modal visible={!!selectedUser} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.inspectorModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>User Account Details</Text>
              <TouchableOpacity onPress={() => setSelectedUser(null)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            {selectedUser && (
              <ScrollView contentContainerStyle={styles.inspectorBody}>
                {isEditing ? (
                  <View style={styles.editSection}>
                    <Text style={styles.label}>Full Name</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editFullName}
                      onChangeText={setEditFullName}
                    />

                    <Text style={styles.label}>Email Address</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editEmail}
                      onChangeText={setEditEmail}
                      autoCapitalize="none"
                      keyboardType="email-address"
                    />

                    <Text style={styles.label}>Registration Number</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editRegNum}
                      onChangeText={setEditRegNum}
                      autoCapitalize="characters"
                    />

                    <Text style={styles.label}>New Password (leave blank to keep)</Text>
                    <TextInput
                      style={styles.modalInput}
                      value={editPassword}
                      onChangeText={setEditPassword}
                      secureTextEntry
                      placeholder="Optional"
                      placeholderTextColor={Colors.textMuted}
                    />

                    <View style={styles.editBtnRow}>
                      <TouchableOpacity
                        style={styles.cancelBtn}
                        onPress={() => setIsEditing(false)}
                      >
                        <Text style={styles.cancelBtnText}>Cancel</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.saveEditBtn}
                        onPress={handleSaveEdit}
                        disabled={actionLoading}
                      >
                        <Text style={styles.saveEditBtnText}>
                          {actionLoading ? 'Saving...' : 'Save Profile'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Email:</Text>
                      <Text style={styles.detailValue}>{selectedUser.email}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Full Name:</Text>
                      <Text style={styles.detailValue}>{selectedUser.full_name || '—'}</Text>
                    </View>

                    <View style={styles.detailRow}>
                      <Text style={styles.detailLabel}>Role:</Text>
                      <Text style={[styles.detailValue, { fontWeight: '700', color: Colors.emerald }]}>
                        {selectedUser.role.toUpperCase()}
                      </Text>
                    </View>

                    {selectedUser.registration_number && (
                      <View style={styles.detailRow}>
                        <Text style={styles.detailLabel}>Reg No:</Text>
                        <Text style={styles.detailValue}>{selectedUser.registration_number}</Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={styles.editProfileBtn}
                      onPress={() => setIsEditing(true)}
                    >
                      <Text style={styles.editProfileBtnText}>✏️ Edit Profile Info</Text>
                    </TouchableOpacity>

                    {/* Security Overrides */}
                    <Text style={styles.sectionHeading}>Security Overrides</Text>

                    <TouchableOpacity
                      style={styles.overrideBtn}
                      onPress={handleResetDevice}
                      disabled={actionLoading}
                    >
                      <Text style={styles.overrideBtnText}>📱 Reset Device Binding</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.overrideBtn}
                      onPress={handleResetPasskey}
                      disabled={actionLoading}
                    >
                      <Text style={styles.overrideBtnText}>🔑 Reset Passkey Credentials</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.overrideBtn}
                      onPress={handleResetDailyLock}
                      disabled={actionLoading}
                    >
                      <Text style={styles.overrideBtnText}>⏱️ Clear Daily Lockout</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.overrideBtn, { borderColor: Colors.danger, backgroundColor: 'rgba(248,113,113,0.1)' }]}
                      onPress={handleDeleteUser}
                      disabled={actionLoading}
                    >
                      <Text style={[styles.overrideBtnText, { color: Colors.danger }]}>
                        🗑️ Permanently Delete Account
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Create User Modal */}
      <Modal visible={createModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.inspectorModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Account</Text>
              <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.inspectorBody}>
              <Text style={styles.label}>Account Role</Text>
              <View style={styles.roleTabsRow}>
                {(['student', 'teacher', 'admin'] as const).map((r) => (
                  <TouchableOpacity
                    key={r}
                    style={[styles.roleTab, createRole === r && styles.roleTabActive]}
                    onPress={() => setCreateRole(r)}
                  >
                    <Text style={[styles.roleTabText, createRole === r && styles.roleTabTextActive]}>
                      {r.toUpperCase()}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Email Address *</Text>
              <TextInput
                style={styles.modalInput}
                value={createEmail}
                onChangeText={setCreateEmail}
                placeholder="user@university.edu"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
                keyboardType="email-address"
              />

              <Text style={styles.label}>Full Name</Text>
              <TextInput
                style={styles.modalInput}
                value={createFullName}
                onChangeText={setCreateFullName}
                placeholder="Jane Doe"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.label}>Password (optional - auto if blank)</Text>
              <TextInput
                style={styles.modalInput}
                value={createPassword}
                onChangeText={setCreatePassword}
                placeholder="••••••••"
                placeholderTextColor={Colors.textMuted}
                secureTextEntry
              />

              {createRole === 'student' && (
                <>
                  <Text style={styles.label}>Registration Number (optional)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={createRegNum}
                    onChangeText={setCreateRegNum}
                    placeholder="e.g. 2024-CS-101"
                    placeholderTextColor={Colors.textMuted}
                    autoCapitalize="characters"
                  />
                </>
              )}

              <TouchableOpacity
                style={styles.createSubmitBtn}
                onPress={handleCreateUser}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator color={Colors.bgDeep} size="small" />
                ) : (
                  <Text style={styles.createSubmitText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Bulk Generate Modal */}
      <Modal visible={bulkModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.inspectorModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bulk Generate Students</Text>
              <TouchableOpacity onPress={() => setBulkModalVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.inspectorBody}>
              <Text style={styles.bulkNotice}>
                Target Section:{' '}
                {selectedSec
                  ? `Section ${sections.find((s) => s.id === selectedSec)?.name}`
                  : '⚠️ No section selected! Select one in the filter bar first.'}
              </Text>

              <Text style={styles.label}>Number of Accounts</Text>
              <TextInput
                style={styles.modalInput}
                value={bulkCount}
                onChangeText={setBulkCount}
                keyboardType="number-pad"
                placeholder="e.g. 10"
                placeholderTextColor={Colors.textMuted}
              />

              <Text style={styles.label}>Email Prefix</Text>
              <TextInput
                style={styles.modalInput}
                value={bulkPrefix}
                onChangeText={setBulkPrefix}
                placeholder="std_"
                placeholderTextColor={Colors.textMuted}
                autoCapitalize="none"
              />

              <Text style={styles.label}>Default Password (optional)</Text>
              <TextInput
                style={styles.modalInput}
                value={bulkPassword}
                onChangeText={setBulkPassword}
                placeholder="Auto-generated if empty"
                placeholderTextColor={Colors.textMuted}
              />

              <TouchableOpacity
                style={[styles.createSubmitBtn, !selectedSec && { opacity: 0.5 }]}
                onPress={handleBulkGenerate}
                disabled={generating || !selectedSec}
              >
                {generating ? (
                  <ActivityIndicator color={Colors.bgDeep} size="small" />
                ) : (
                  <Text style={styles.createSubmitText}>Generate Accounts</Text>
                )}
              </TouchableOpacity>
            </ScrollView>
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
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
    gap: 10,
  },
  searchInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  actionRow: { flexDirection: 'row', gap: 10 },
  addUserBtn: {
    flex: 1,
    backgroundColor: Colors.emerald,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  addUserBtnText: { color: Colors.bgDeep, fontWeight: '700', fontSize: FontSize.xs },
  bulkBtn: {
    flex: 1,
    backgroundColor: Colors.purple,
    paddingVertical: 8,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  bulkBtnText: { color: Colors.white, fontWeight: '700', fontSize: FontSize.xs },

  roleTabsRow: {
    flexDirection: 'row',
    paddingHorizontal: 14,
    paddingVertical: 8,
    gap: 8,
    backgroundColor: 'rgba(0,0,0,0.15)',
  },
  roleTab: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    backgroundColor: 'rgba(255,255,255,0.04)',
    alignItems: 'center',
  },
  roleTabActive: { backgroundColor: Colors.emerald },
  roleTabText: { color: Colors.textMuted, fontSize: 10, fontWeight: '700' },
  roleTabTextActive: { color: Colors.bgDeep },

  filterBar: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    maxHeight: 46,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  filterChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.full,
    backgroundColor: Colors.glassA,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    marginRight: 8,
  },
  filterChipActive: { borderColor: Colors.emerald, backgroundColor: 'rgba(79,142,247,0.1)' },
  filterChipText: { color: Colors.textSecondary, fontSize: 11, fontWeight: '600' },

  countSummary: { paddingHorizontal: 16, paddingVertical: 8 },
  countText: { color: Colors.textMuted, fontSize: FontSize.xs },

  list: { padding: 14, gap: 10, paddingBottom: 60 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.glassA,
    padding: 12,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 12,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 16, fontWeight: '700' },
  userInfo: { flex: 1 },
  userNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  userName: { color: Colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
  roleBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: Radius.sm },
  roleBadgeText: { fontSize: 9, fontWeight: '700' },
  userEmail: { color: Colors.textSecondary, fontSize: FontSize.xs, marginTop: 2 },
  userReg: { color: Colors.textMuted, fontSize: 10, marginTop: 2 },
  statusRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  passkeyBadge: { color: Colors.purple, fontSize: 9, fontWeight: '700' },
  deviceBadge: { color: Colors.cyan, fontSize: 9, fontWeight: '700' },
  verifiedBadge: { color: Colors.emerald, fontSize: 9, fontWeight: '700' },
  chevron: { color: Colors.textMuted, fontSize: 20 },
  emptyText: { color: Colors.textMuted, textAlign: 'center', marginTop: 40 },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  inspectorModal: {
    backgroundColor: Colors.cardBg,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    maxHeight: '85%',
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.glassBorder,
  },
  modalTitle: { color: Colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
  closeBtnText: { color: Colors.textMuted, fontSize: 18, padding: 4 },
  inspectorBody: { paddingBottom: 40 },

  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
  },
  detailLabel: { color: Colors.textSecondary, fontSize: FontSize.xs },
  detailValue: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },

  editProfileBtn: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 14,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  editProfileBtnText: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },

  sectionHeading: {
    color: Colors.textSecondary,
    fontSize: FontSize.xs,
    fontWeight: '700',
    marginTop: 20,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  overrideBtn: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  overrideBtnText: { color: Colors.textPrimary, fontSize: FontSize.xs, fontWeight: '600' },

  editSection: { gap: 10 },
  label: { color: Colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', marginTop: 6 },
  modalInput: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: Colors.textPrimary,
    fontSize: FontSize.sm,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
  },
  editBtnRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  cancelBtn: { flex: 1, paddingVertical: 10, alignItems: 'center' },
  cancelBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm },
  saveEditBtn: {
    flex: 1.5,
    backgroundColor: Colors.emerald,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  saveEditBtnText: { color: Colors.bgDeep, fontWeight: '700', fontSize: FontSize.sm },

  createSubmitBtn: {
    backgroundColor: Colors.emerald,
    paddingVertical: 12,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 20,
  },
  createSubmitText: { color: Colors.bgDeep, fontWeight: '700', fontSize: FontSize.sm },
  bulkNotice: { color: Colors.cyan, fontSize: FontSize.xs, marginBottom: 12, fontStyle: 'italic' },
});
