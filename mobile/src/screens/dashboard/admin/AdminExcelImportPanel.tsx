import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { adminApi, Institution, ImportResultResponse } from '@/entities/admin';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';

export const AdminExcelImportPanel: React.FC = () => {
  const colors = useAppColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const [file, setFile] = useState<{ uri: string; name: string; size?: number; type?: string } | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [selectedInstId, setSelectedInstId] = useState<number | null>(null);
  const [globalRole, setGlobalRole] = useState<'student' | 'teacher'>('student');
  const [passwordStrategy, setPasswordStrategy] = useState<'auto' | 'reg_no' | 'custom'>('auto');
  const [customPassword, setCustomPassword] = useState('');

  const [validating, setValidating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [validationResult, setValidationResult] = useState<ImportResultResponse | null>(null);

  useEffect(() => {
    adminApi.getInstitutions().then((data) => {
      setInstitutions(data);
      if (data.length > 0) setSelectedInstId(data[0].id);
    }).catch(() => {});
  }, []);

  const handlePickDocument = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv',
        ],
        copyToCacheDirectory: true,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        setFile({
          uri: asset.uri,
          name: asset.name,
          size: asset.size,
          type: asset.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        setValidationResult(null);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick file from device');
    }
  };

  const handleValidateDryRun = async () => {
    if (!file) {
      Alert.alert('Select File', 'Please pick an Excel (.xlsx) or CSV file first.');
      return;
    }
    setValidating(true);
    try {
      const result = await adminApi.executeImportFile(
        { uri: file.uri, name: file.name, type: file.type || '' },
        {
          dry_run: true,
          global_role: globalRole,
          global_institution: selectedInstId || undefined,
          password_strategy: passwordStrategy,
          custom_password: customPassword.trim() || undefined,
        }
      );
      setValidationResult(result);
    } catch (err: any) {
      Alert.alert('Validation Error', err?.response?.data?.error || 'Failed to parse spreadsheet');
    } finally {
      setValidating(false);
    }
  };

  const handleCommitImport = async () => {
    if (!file) return;
    Alert.alert(
      'Confirm Import',
      `Commit import for ${file.name}? New user accounts will be created.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Commit Import',
          onPress: async () => {
            setImporting(true);
            try {
              const result = await adminApi.executeImportFile(
                { uri: file.uri, name: file.name, type: file.type || '' },
                {
                  dry_run: false,
                  global_role: globalRole,
                  global_institution: selectedInstId || undefined,
                  password_strategy: passwordStrategy,
                  custom_password: customPassword.trim() || undefined,
                }
              );
              Alert.alert('Import Complete', result.message || `Successfully created ${result.created_count ?? 0} accounts.`);
              setFile(null);
              setValidationResult(null);
            } catch (err: any) {
              Alert.alert('Import Failed', err?.response?.data?.error || 'Failed to commit import');
            } finally {
              setImporting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <Text style={styles.title}>Excel & CSV Account Onboarding</Text>
        <Text style={styles.subtitle}>
          Upload class rosters, student enrollments, or faculty lists to bulk generate accounts.
        </Text>
      </View>

      {/* File Upload Box */}
      <TouchableOpacity style={styles.uploadBox} onPress={handlePickDocument}>
        <View style={styles.iconCircle}>
          <Text style={styles.iconText}>📊</Text>
        </View>
        <Text style={styles.uploadPrompt}>
          {file ? file.name : 'Tap to select Excel (.xlsx) or CSV'}
        </Text>
        {file?.size ? (
          <Text style={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</Text>
        ) : (
          <Text style={styles.fileHint}>Supports .xlsx, .xls, and .csv files</Text>
        )}
      </TouchableOpacity>

      {/* Configuration Options */}
      <View style={styles.configCard}>
        <Text style={styles.cardHeader}>Import Settings</Text>

        {/* Global Role */}
        <Text style={styles.label}>Default Role</Text>
        <View style={styles.roleRow}>
          {(['student', 'teacher'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.roleBtn, globalRole === r && styles.roleBtnActive]}
              onPress={() => setGlobalRole(r)}
            >
              <Text style={[styles.roleBtnText, globalRole === r && styles.roleBtnTextActive]}>
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* University Selector */}
        <Text style={styles.label}>Target University</Text>
        <TouchableOpacity
          style={styles.pickerBox}
          onPress={() => {
            Alert.alert(
              'Select University',
              'Choose institution:',
              institutions.map((i) => ({
                text: i.name,
                onPress: () => setSelectedInstId(i.id),
              }))
            );
          }}
        >
          <Text style={styles.pickerText}>
            🏛️ {selectedInstId ? institutions.find((i) => i.id === selectedInstId)?.name : 'Select Institution'}
          </Text>
        </TouchableOpacity>

        {/* Password Strategy */}
        <Text style={styles.label}>Password Strategy</Text>
        <View style={styles.roleRow}>
          {[
            { id: 'auto', label: 'Auto' },
            { id: 'reg_no', label: 'Reg No' },
            { id: 'custom', label: 'Custom' },
          ].map((strat) => (
            <TouchableOpacity
              key={strat.id}
              style={[styles.roleBtn, passwordStrategy === strat.id && styles.roleBtnActive]}
              onPress={() => setPasswordStrategy(strat.id as any)}
            >
              <Text
                style={[
                  styles.roleBtnText,
                  passwordStrategy === strat.id && styles.roleBtnTextActive,
                ]}
              >
                {strat.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {passwordStrategy === 'custom' && (
          <TextInput
            style={styles.input}
            placeholder="Enter custom default password"
            placeholderTextColor={colors.textMuted}
            value={customPassword}
            onChangeText={setCustomPassword}
          />
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.btnRow}>
        <TouchableOpacity
          style={[styles.actionBtn, styles.validateBtn, !file && { opacity: 0.5 }]}
          onPress={handleValidateDryRun}
          disabled={validating || !file}
        >
          {validating ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.validateBtnText}>🔍 Validate & Dry Run</Text>
          )}
        </TouchableOpacity>

        {validationResult && (
          <TouchableOpacity
            style={[styles.actionBtn, styles.commitBtn]}
            onPress={handleCommitImport}
            disabled={importing}
          >
            {importing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.commitBtnText}>🚀 Commit Import</Text>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Validation Report */}
      {validationResult && (
        <View style={styles.reportCard}>
          <Text style={styles.reportTitle}>Validation Summary</Text>
          <View style={styles.metricsRow}>
            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.emerald }]}>
                {validationResult.valid_count ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Valid Rows</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.danger }]}>
                {validationResult.errors?.length ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Errors</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={[styles.metricVal, { color: colors.warning }]}>
                {validationResult.warnings?.length ?? 0}
              </Text>
              <Text style={styles.metricLabel}>Warnings</Text>
            </View>
          </View>

          {validationResult.errors && validationResult.errors.length > 0 && (
            <View style={styles.errorList}>
              <Text style={styles.errorHeading}>Errors to Fix:</Text>
              {validationResult.errors.slice(0, 5).map((err, i) => (
                <Text key={i} style={styles.errorItem}>• {err}</Text>
              ))}
              {validationResult.errors.length > 5 && (
                <Text style={styles.moreErrors}>
                  + {validationResult.errors.length - 5} more errors
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </ScrollView>
  );
};

const createStyles = (colors: ReturnType<typeof useAppColors>) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: 16, paddingBottom: 60, gap: 16 },
    header: { gap: 4 },
    title: { color: colors.textPrimary, fontSize: FontSize.md, fontWeight: '700' },
    subtitle: { color: colors.textSecondary, fontSize: FontSize.xs, lineHeight: 18 },

    uploadBox: {
      backgroundColor: colors.cardBg,
      borderWidth: 2,
      borderColor: colors.glassBorder,
      borderStyle: 'dashed',
      borderRadius: Radius.lg,
      padding: 24,
      alignItems: 'center',
      gap: 8,
    },
    iconCircle: {
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: `${colors.emerald}20`,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconText: { fontSize: 24 },
    uploadPrompt: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: '600' },
    fileSize: { color: colors.emerald, fontSize: FontSize.xs, fontWeight: '700' },
    fileHint: { color: colors.textMuted, fontSize: FontSize.xs },

    configCard: {
      backgroundColor: colors.cardBg,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 16,
      gap: 10,
    },
    cardHeader: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
    label: { color: colors.textSecondary, fontSize: FontSize.xs, fontWeight: '600', marginTop: 6 },
    roleRow: { flexDirection: 'row', gap: 8 },
    roleBtn: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: Radius.md,
      backgroundColor: colors.glassA,
      alignItems: 'center',
    },
    roleBtnActive: { backgroundColor: colors.emerald },
    roleBtnText: { color: colors.textMuted, fontSize: FontSize.xs, fontWeight: '700' },
    roleBtnTextActive: { color: '#FFFFFF' },

    pickerBox: {
      backgroundColor: colors.inputBg,
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: colors.inputBorder,
    },
    pickerText: { color: colors.textPrimary, fontSize: FontSize.sm },
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

    btnRow: { flexDirection: 'row', gap: 10 },
    actionBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: Radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    validateBtn: { backgroundColor: colors.glassB, borderWidth: 1, borderColor: colors.glassBorder },
    validateBtnText: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
    commitBtn: { backgroundColor: colors.emerald },
    commitBtnText: { color: '#FFFFFF', fontSize: FontSize.sm, fontWeight: '800' },

    reportCard: {
      backgroundColor: colors.cardBg,
      borderRadius: Radius.lg,
      borderWidth: 1,
      borderColor: colors.glassBorder,
      padding: 16,
      gap: 12,
    },
    reportTitle: { color: colors.textPrimary, fontSize: FontSize.sm, fontWeight: '700' },
    metricsRow: { flexDirection: 'row', justifyContent: 'space-around' },
    metricBox: { alignItems: 'center' },
    metricVal: { fontSize: 22, fontWeight: '800' },
    metricLabel: { color: colors.textMuted, fontSize: 10, marginTop: 2 },

    errorList: {
      borderTopWidth: 1,
      borderTopColor: colors.glassBorder,
      paddingTop: 10,
      gap: 4,
    },
    errorHeading: { color: colors.danger, fontSize: FontSize.xs, fontWeight: '700' },
    errorItem: { color: colors.danger, fontSize: 11 },
    moreErrors: { color: colors.textMuted, fontSize: 10, fontStyle: 'italic' },
  });
