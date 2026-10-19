import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/entities/user';
import { StudentDashboard } from './StudentDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { AdminDashboardScreen } from './AdminDashboardScreen';
import { Colors } from '@/shared/constants/theme';

export const DashboardScreen = () => {
  const { user } = useAuthStore();

  // Route to the correct experience based on role
  if (user?.role === 'student') {
    return <StudentDashboard />;
  }

  // Route admin or superuser to AdminDashboardScreen
  if (user?.role === 'admin' || user?.is_superuser) {
    return <AdminDashboardScreen />;
  }

  // Route teacher to TeacherDashboard
  if (user?.role === 'teacher') {
    return <TeacherDashboard />;
  }
  const displayName = user?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'User';

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quorum</Text>
      <Text style={styles.subtitle}>Welcome back, {displayName}!</Text>
      <Text style={styles.roleBadge}>
        🏫 {String(user?.role ?? '').toUpperCase()} Dashboard — Coming Soon
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bgDeep,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: Colors.emerald,
    letterSpacing: 1,
  },
  subtitle: {
    fontSize: 18,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  roleBadge: {
    marginTop: 16,
    backgroundColor: Colors.emeraldDim,
    color: Colors.emerald,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 9999,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
  },
});
