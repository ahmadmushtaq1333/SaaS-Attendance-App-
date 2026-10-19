import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { PasswordResetForm } from '@/features/auth-password-reset';
import { Colors, FontSize } from '@/shared/constants/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

export const ForgotPasswordScreen: React.FC<Props> = ({ navigation, route }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.badge}>🔐 ACCOUNT RECOVERY</Text>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              Enter your registered university email to receive a 6-digit verification code.
            </Text>
          </View>

          <PasswordResetForm
            initialEmail={route.params?.email}
            onSuccess={() => navigation.navigate('Login')}
            onBackToLogin={() => navigation.navigate('Login')}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bgDeep },
  container: { flex: 1 },
  content: { padding: 24, justifyContent: 'center', minHeight: '100%' },
  header: { marginBottom: 32, alignItems: 'center' },
  badge: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    color: Colors.emerald,
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
