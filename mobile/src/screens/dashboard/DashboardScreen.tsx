import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuthStore } from '@/entities/user';
import { StudentDashboard } from './StudentDashboard';
import { TeacherDashboard } from './TeacherDashboard';
import { Colors } from '@/shared/constants/theme';

export const DashboardScreen = () => {
  const { user } = useAuthStore();

  // Route to the correct experience based on role
  if (user?.role === 'student') {
    return <StudentDashboard />;
  }

  // Route teacher and admin to TeacherDashboard
  if (user?.role === 'teacher' || user?.role === 'admin') {
    return <TeacherDashboard />;
  }
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Quorum</Text>
      <Text style={styles.subtitle}>Welcome back, {user?.first_name || 'User'}!</Text>
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
