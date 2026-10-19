import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { rebindApi } from '../api/rebind-api';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

interface DeviceRebindFormProps {
  email: string;
  onSuccess: () => void;
  onBackToLogin: () => void;
}

export const DeviceRebindForm: React.FC<DeviceRebindFormProps> = ({
  email,
  onSuccess,
  onBackToLogin,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleRequestCode = async () => {
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await rebindApi.requestRebind(email);
      setMessage(res.message || 'Verification code sent to your email.');
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to request device rebind.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRebind = async () => {
    if (code.trim().length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await rebindApi.confirmRebind(email, code);
      setMessage(res.message || 'Device rebind successful! You can now log in.');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {message ? (
        <View style={styles.successBox}>
          <Text style={styles.successText}>✓ {message}</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <View style={styles.field}>
        <Text style={styles.label}>Account Email</Text>
        <TextInput
          style={[styles.input, { opacity: 0.7 }]}
          value={email}
          editable={false}
        />
      </View>

      {step === 1 ? (
        <>
          <Text style={styles.helperText}>
            This account is registered to another device. To transfer your attendance access to this phone, we need to verify your email.
          </Text>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleRequestCode}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Send Rebind Code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>6-Digit Rebind Code</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="123456"
              placeholderTextColor={Colors.textMuted}
              value={code}
              onChangeText={setCode}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
              autoFocus
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleConfirmRebind}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Confirm Rebind</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.resendBtn}
            onPress={handleRequestCode}
            disabled={resending || loading}
          >
            <Text style={styles.resendBtnText}>Resend Code</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity onPress={onBackToLogin} style={styles.backBtn}>
        <Text style={styles.backBtnText}>← Back to Login</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', gap: 16 },
  field: { gap: 6 },
  label: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: '600', textTransform: 'uppercase' },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.md,
    padding: 14,
    color: Colors.textPrimary,
    fontSize: FontSize.md,
  },
  otpInput: { letterSpacing: 6, textAlign: 'center', fontSize: FontSize.lg, fontWeight: '700' },
  helperText: { fontSize: FontSize.sm, color: Colors.textSecondary, lineHeight: 20 },
  primaryBtn: {
    backgroundColor: Colors.emerald,
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendBtnText: { color: Colors.emerald, fontSize: FontSize.sm, fontWeight: '600' },
  backBtn: { alignItems: 'center', paddingVertical: 10 },
  backBtnText: { color: Colors.textSecondary, fontSize: FontSize.sm, fontWeight: '600' },
  successBox: {
    backgroundColor: 'rgba(79, 142, 247, 0.15)',
    padding: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.emerald,
  },
  successText: { color: Colors.emerald, fontSize: FontSize.sm, textAlign: 'center', fontWeight: '600' },
  errorBox: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    padding: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: { color: Colors.danger, fontSize: FontSize.sm, textAlign: 'center' },
});
