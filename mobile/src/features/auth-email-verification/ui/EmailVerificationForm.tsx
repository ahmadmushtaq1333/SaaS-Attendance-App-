import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { verificationApi } from '../api/verification-api';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';

interface EmailVerificationFormProps {
  email: string;
  onSuccess: () => void;
  onBackToLogin: () => void;
}

export const EmailVerificationForm: React.FC<EmailVerificationFormProps> = ({
  email,
  onSuccess,
  onBackToLogin,
}) => {
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleVerify = async () => {
    if (code.trim().length !== 6) {
      setError('Please enter the 6-digit verification code.');
      return;
    }

    setError('');
    setMessage('');
    setLoading(true);

    try {
      const res = await verificationApi.verifyEmail(email, code);
      setMessage(res.message || 'Account verified successfully!');
      setTimeout(() => {
        onSuccess();
      }, 1500);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Invalid or expired code.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setMessage('');
    setResending(true);

    try {
      const res = await verificationApi.sendOtp(email);
      setMessage(res.message || 'A new verification code was sent to your email.');
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Unable to resend OTP. Please try again.');
    } finally {
      setResending(false);
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
        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={[styles.input, { opacity: 0.7 }]}
          value={email}
          editable={false}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>6-Digit Activation Code</Text>
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
        onPress={handleVerify}
        disabled={loading}
      >
        {loading ? <ActivityIndicator color={Colors.white} /> : <Text style={styles.primaryBtnText}>Verify Email</Text>}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.resendBtn}
        onPress={handleResend}
        disabled={resending || loading}
      >
        {resending ? (
          <ActivityIndicator size="small" color={Colors.emerald} />
        ) : (
          <Text style={styles.resendBtnText}>Resend Code</Text>
        )}
      </TouchableOpacity>

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
