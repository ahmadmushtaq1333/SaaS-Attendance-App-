import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, Sun, Moon } from 'lucide-react-native';
import { LoginForm } from '@/features/auth-by-email';
import { useThemeStore, useAppColors, Radius } from '@/shared/constants/theme';
import { AppBackground } from '@/shared/ui';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { isLightMode, toggleTheme } = useThemeStore();
  const colors = useAppColors();

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        {/* Top-right theme toggle button */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.themeToggleBtn,
            {
              backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.8)' : 'rgba(9, 18, 37, 0.75)',
              borderColor: colors.glassBorder,
            },
          ]}
          activeOpacity={0.7}
        >
          {isLightMode ? (
            <Moon size={16} color={colors.textPrimary} />
          ) : (
            <Sun size={16} color={colors.warning} />
          )}
        </TouchableOpacity>

        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Glass-A Central Card */}
            <View
              style={[
                styles.glassCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              {/* Brand Header */}
              <View style={styles.brandHeader}>
                <View style={styles.logoBadge}>
                  <Activity size={24} color="#07111F" strokeWidth={2.5} />
                </View>
                <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>
                  Quorum
                </Text>
                <Text style={[styles.brandSubtitle, { color: colors.textMuted }]}>
                  Sign in to your institute portal
                </Text>
              </View>

              {/* Login Form */}
              <LoginForm
                onForgotPassword={(email) => navigation.navigate('ForgotPassword', { email })}
                onEmailUnverified={(email) => navigation.navigate('EmailVerification', { email })}
                onDeviceMismatch={(email) => navigation.navigate('DeviceRebind', { email })}
              />
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  themeToggleBtn: {
    position: 'absolute',
    top: 16,
    right: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: Radius.md,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  glassCard: {
    width: '100%',
    maxWidth: 440,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingHorizontal: 26,
    paddingVertical: 34,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 8,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#4F8EF7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: '#4F8EF7',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 6,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  brandSubtitle: {
    fontSize: 13,
  },
});
