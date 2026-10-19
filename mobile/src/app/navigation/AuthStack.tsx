import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { EmailVerificationScreen } from '@/screens/auth/EmailVerificationScreen';
import { DeviceRebindScreen } from '@/screens/auth/DeviceRebindScreen';
import { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export const AuthStack = () => {
  return (
    <Stack.Navigator 
      screenOptions={{ 
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
      <Stack.Screen name="DeviceRebind" component={DeviceRebindScreen} />
    </Stack.Navigator>
  );
};
