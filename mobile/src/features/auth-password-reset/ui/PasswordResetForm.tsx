import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { passwordResetApi } from '../api/password-reset-api';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

interface PasswordResetFormProps {
  initialEmail?: string;
  onSuccess: () => void;
  onBackToLogin: () => void;
}

export const PasswordResetForm: React.FC<PasswordResetFormProps> = ({
  initialEmail = '',
  onSuccess,
  onBackToLogin,
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [email, setEmail] = useState(initialEmail);
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (!pass) return { text: '', color: 'transparent' };
    if (pass.length >= 8) score += 1;
    if (pass.length >= 12) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score < 2) return { text: 'Weak', color: Colors.danger };
    if (score < 4) return { text: 'Good', color: Colors.warning };
    return { text: 'Strong', color: Colors.emerald };
  };

  const strength = getPasswordStrength(newPassword);

  const handleRequest = async () => {
    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await passwordResetApi.requestReset(email);
      setMessage(res.message || 'Verification code sent to your email.');
      setStep(2);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Unable to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    setError('');
    setMessage('');

    if (otp.trim().length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }
    if (!newPassword || newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const res = await passwordResetApi.confirmReset(email, otp, newPassword);
      setMessage(res.message || 'Password reset successfully!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Failed to reset password. Check your OTP.');
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

      {step === 1 ? (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>Registered Email</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. student@university.edu"
              placeholderTextColor={Colors.textMuted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleRequest}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Send Verification Code</Text>}
          </TouchableOpacity>
        </>
      ) : (
        <>
          <View style={styles.field}>
            <Text style={styles.label}>6-Digit OTP Code</Text>
            <TextInput
              style={[styles.input, styles.otpInput]}
              placeholder="123456"
              placeholderTextColor={Colors.textMuted}
              value={otp}
              onChangeText={setOtp}
              keyboardType="number-pad"
              maxLength={6}
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={styles.label}>New Password</Text>
              {strength.text ? (
                <Text style={{ fontSize: FontSize.xs, color: strength.color, fontWeight: '700' }}>
                  {strength.text}
                </Text>
              ) : null}
            </View>
            <TextInput
              style={styles.input}
              placeholder="At least 8 characters"
              placeholderTextColor={Colors.textMuted}
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Confirm Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Re-type new password"
              placeholderTextColor={Colors.textMuted}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleConfirm}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Reset Password</Text>}
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
  primaryBtn: {
    backgroundColor: Colors.emerald,
    paddingVertical: 15,
    borderRadius: Radius.md,
    alignItems: 'center',
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: Colors.white, fontSize: FontSize.md, fontWeight: '700' },
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
