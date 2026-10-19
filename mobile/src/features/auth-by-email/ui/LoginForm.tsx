import React, { useState } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Shield,
  AlertCircle,
} from 'lucide-react-native';
import { useLogin } from '../model/useLogin';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';

interface LoginFormProps {
  onForgotPassword?: (email: string) => void;
  onEmailUnverified?: (email: string) => void;
  onDeviceMismatch?: (email: string) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({
  onForgotPassword,
  onEmailUnverified,
  onDeviceMismatch,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const colors = useAppColors();
  const { login, isLoading, error } = useLogin();

  const handleLogin = async () => {
    if (!email.trim() || !password) return;
    const result = await login({ email: email.trim(), password });
    if (!result.success) {
      if (result.redirect === 'email_unverified' && onEmailUnverified) {
        onEmailUnverified(result.email || email.trim());
      } else if (result.redirect === 'device_mismatch' && onDeviceMismatch) {
        onDeviceMismatch(result.email || email.trim());
      }
    }
  };

  return (
    <View style={styles.container}>
      {/* Error alert banner */}
      {error && (
        <View style={[styles.errorContainer, { borderColor: `${colors.danger}40` }]}>
          <AlertCircle size={15} color={colors.danger} style={{ flexShrink: 0 }} />
          <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
        </View>
      )}

      {/* Email / Registration Input */}
      <View style={styles.field}>
        <View style={styles.labelRow}>
          <Mail size={13} color={colors.emerald} />
          <Text style={[styles.label, { color: colors.textSecondary }]}>
            Email or Registration No.
          </Text>
        </View>
        <TextInput
          style={[
            styles.input,
            {
              backgroundColor: colors.inputBg,
              borderColor: colors.inputBorder,
              color: colors.textPrimary,
            },
          ]}
          placeholder="Email or Registration No. (e.g. 24pwswe0018)"
          placeholderTextColor={colors.textMuted}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!isLoading}
        />
      </View>

      {/* Password Input */}
      <View style={styles.field}>
        <View style={styles.passwordHeader}>
          <View style={styles.labelRow}>
            <Lock size={13} color={colors.cyan} />
            <Text style={[styles.label, { color: colors.textSecondary }]}>Password</Text>
          </View>
          {onForgotPassword && (
            <TouchableOpacity onPress={() => onForgotPassword(email.trim())}>
              <Text style={[styles.forgotText, { color: colors.purple }]}>Forgot Password?</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.passwordInputWrapper}>
          <TextInput
            style={[
              styles.input,
              styles.passwordInput,
              {
                backgroundColor: colors.inputBg,
                borderColor: colors.inputBorder,
                color: colors.textPrimary,
              },
            ]}
            placeholder="••••••••••••"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            editable={!isLoading}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
            activeOpacity={0.7}
          >
            {showPassword ? (
              <EyeOff size={16} color={colors.textMuted} />
            ) : (
              <Eye size={16} color={colors.textMuted} />
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Sign In Primary Button */}
      <TouchableOpacity
        style={[
          styles.button,
          { backgroundColor: colors.emerald },
          (!email.trim() || !password || isLoading) && styles.buttonDisabled,
        ]}
        onPress={handleLogin}
        disabled={!email.trim() || !password || isLoading}
        activeOpacity={0.85}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <View style={styles.buttonInner}>
            <Text style={styles.buttonText}>Sign In</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      {/* Security Footer */}
      <View style={[styles.securityFooter, { borderTopColor: colors.glassInner }]}>
        <Shield size={13} color={colors.emerald} />
        <Text style={[styles.securityText, { color: colors.textMuted }]}>
          Secure &amp; Encrypted Connection
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    gap: 18,
  },
  field: {
    gap: 7,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  passwordHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: FontSize.md,
  },
  passwordInputWrapper: {
    position: 'relative',
    justifyContent: 'center',
  },
  passwordInput: {
    paddingRight: 44,
  },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    padding: 6,
  },
  button: {
    borderRadius: Radius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: '#4F8EF7',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  buttonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  securityText: {
    fontSize: 12,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    borderWidth: 1,
  },
  errorText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
});
