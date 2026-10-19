import React from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DeviceRebindForm } from '@/features/auth-device-rebind';
import { Colors, FontSize } from '@/shared/constants/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '@/app/navigation/types';

type Props = NativeStackScreenProps<AuthStackParamList, 'DeviceRebind'>;

export const DeviceRebindScreen: React.FC<Props> = ({ navigation, route }) => {
  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.header}>
            <Text style={styles.badge}>📱 DEVICE SECURITY</Text>
            <Text style={styles.title}>Rebind Device</Text>
            <Text style={styles.subtitle}>
              Transfer your attendance access to this physical device securely.
            </Text>
          </View>

          <DeviceRebindForm
            email={route.params.email}
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
    color: Colors.cyan,
    marginBottom: 8,
    letterSpacing: 1,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, marginBottom: 8 },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
});
