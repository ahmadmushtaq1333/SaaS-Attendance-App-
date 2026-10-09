import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { DashboardScreen } from '@/screens/dashboard/DashboardScreen';
import { NameSetupScreen } from '@/screens/auth/NameSetupScreen';
import { MainStackParamList } from './types';
import { useAuthStore } from '@/entities/user';

const Stack = createNativeStackNavigator<MainStackParamList>();

export const MainStack = () => {
  const { user } = useAuthStore();
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
      initialRouteName={user?.full_name ? 'Dashboard' : 'NameSetup'}
    >
      <Stack.Screen name="NameSetup" component={NameSetupScreen} options={{ gestureEnabled: false }} />
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
};
