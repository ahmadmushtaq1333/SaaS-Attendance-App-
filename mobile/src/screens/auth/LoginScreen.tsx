import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Activity, Sun, Moon } from 'lucide-react-native';
import { LoginForm } from '@/features/auth-by-email';
import { useThemeStore, useAppColors, Radius } from '@/shared/constants/theme';
import { AppBackground } from '@/shared/ui';
import { Quorum3DIntro } from '@/widgets/intro';
import * as SplashScreen from 'expo-splash-screen';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

/** Tracks whether the 3D intro has played during the current cold-launch session */
let hasPlayedIntroThisSession = false;

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const { isLightMode, toggleTheme } = useThemeStore();
  const colors = useAppColors();
  const insets = useSafeAreaInsets();
  const [showIntro, setShowIntro] = useState(!hasPlayedIntroThisSession);

  // If the intro has already played during this session, ensure the splash is hidden immediately
  React.useEffect(() => {
    if (hasPlayedIntroThisSession) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, []);

  const handleIntroFinish = useCallback(() => {
    hasPlayedIntroThisSession = true;
    setShowIntro(false);
  }, []);

  return (
    <AppBackground>
      {/* Cinematic 3D Intro Overlay on cold start */}
      {showIntro && <Quorum3DIntro onFinish={handleIntroFinish} />}

      <SafeAreaView style={styles.safeArea}>
        {/* Top-right theme toggle button */}
        <TouchableOpacity
          onPress={toggleTheme}
          style={[
            styles.themeToggleBtn,
            {
              top: insets.top + 8,
              backgroundColor: isLightMode ? '#FFFFFF' : 'rgba(9, 18, 37, 0.75)',
              borderColor: colors.glassBorder,
            },
          ]}
          activeOpacity={0.7}
          accessibilityLabel="Toggle light and dark theme"
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
                {/* Tapping logo badge replays the 3D Intro */}
                <TouchableOpacity
                  style={styles.logoBadge}
                  onPress={() => setShowIntro(true)}
                  activeOpacity={0.8}
                  accessibilityRole="button"
                  accessibilityLabel="Replay 3D intro"
                >
                  <Activity size={24} color="#07111F" strokeWidth={2.5} />
                </TouchableOpacity>
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
    right: 20,
    zIndex: 10,
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#07111F',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 1,
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
    shadowColor: '#07111F',
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 2,
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
