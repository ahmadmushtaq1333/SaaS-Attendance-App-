import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore, userApi } from '@/entities/user';
import { Colors, Radius, FontSize } from '@/shared/constants/theme';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { MainStackParamList } from '@/app/navigation/types';

type Props = NativeStackScreenProps<MainStackParamList, 'NameSetup'>;

export const NameSetupScreen: React.FC<Props> = ({ navigation }) => {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Please enter your full name.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const updatedUser = await userApi.updateName(trimmed);
      setUser(updatedUser);
      navigation.replace('Dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save name. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.avatar}>
              <Text style={{ fontSize: 24 }}>👋</Text>
            </View>
            <Text style={styles.title}>Welcome to Quorum!</Text>
            <Text style={styles.subtitle}>
              Please set your full name to continue. This will be displayed on your portal and attendance records.
            </Text>
          </View>

          {error ? (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. John Doe"
              placeholderTextColor={Colors.textMuted}
              value={name}
              onChangeText={(text) => {
                setName(text);
                if (error) setError('');
              }}
              autoCapitalize="words"
              autoFocus
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.button, (!name.trim() || loading) && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={!name.trim() || loading}
            activeOpacity={0.8}
          >
            {loading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Continue →</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: Colors.glassA,
    borderRadius: Radius.xl,
    padding: 28,
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    gap: 18,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(79, 142, 247, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: '800',
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: FontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: FontSize.xs,
    color: Colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: Colors.glassBorder,
    borderRadius: Radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: FontSize.md,
    color: Colors.textPrimary,
  },
  button: {
    backgroundColor: Colors.emerald,
    paddingVertical: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: Colors.white,
    fontSize: FontSize.md,
    fontWeight: '700',
  },
  errorContainer: {
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    padding: 12,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSize.sm,
    textAlign: 'center',
  },
});
