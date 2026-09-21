import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuthStore, userApi } from '@/entities/user';
import { secureStorage, TOKEN_KEYS } from '@/shared/lib/storage';

import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';

export const RootNavigator = () => {
  const { isAuthenticated, setUser, isLoading, setLoading } = useAuthStore();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const token = await secureStorage.getItem(TOKEN_KEYS.ACCESS);
        if (token) {
          // If we have a token, fetch the user profile
          const user = await userApi.getCurrentUser();
          setUser(user);
        } else {
          setUser(null);
        }
      } catch (error) {
        // If profile fetch fails (e.g. 401 and refresh fails), reset state
        setUser(null);
      } finally {
        setLoading(false);
        setIsReady(true);
      }
    };

    bootstrapAsync();
  }, [setUser, setLoading]);

  if (!isReady || isLoading) {
    return (
      <View style={styles.splashContainer}>
        <ActivityIndicator size="large" color="#4f46e5" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {/* The Core Security Rule: Render AuthStack if logged out, MainStack if logged in */}
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  }
});
