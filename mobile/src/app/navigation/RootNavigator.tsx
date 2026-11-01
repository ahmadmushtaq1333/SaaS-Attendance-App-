/**
 * RootNavigator.tsx
 * -----------------
 * The app's root navigation tree. Owns two responsibilities:
 *
 *   1. **Auth bootstrap**: checks SecureStore for a valid token on cold start
 *      and fetches the current user profile if one exists.
 *   2. **Splash screen dismissal**: hides the native splash screen only after
 *      *both* the theme hydration (upstream, in App.tsx) and the auth bootstrap
 *      here are complete — preventing any white-flash or dark-screen gap.
 *
 * The fallback loading container uses the Quorum dark background (#000308)
 * so the transition from native splash to React is completely seamless.
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { View, StyleSheet } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { useAuthStore, userApi } from '@/entities/user';
import { secureStorage, TOKEN_KEYS } from '@/shared/lib/storage';
import { setOnAuthFailure } from '@/shared/api';

import { AuthStack } from './AuthStack';
import { MainStack } from './MainStack';

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const RootNavigator: React.FC = () => {
  const { isAuthenticated, setUser, logout, isLoading, setLoading } = useAuthStore();
  const [isReady, setIsReady] = useState(false);
  const splashHiddenRef = useRef(false);

  // ---------------------------------------------------------------------------
  // Wire up the global 401 handler once (auth failure → logout)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    setOnAuthFailure(logout);
  }, [logout]);

  // ---------------------------------------------------------------------------
  // Auth bootstrap: read stored token → verify with server → set user
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let isMounted = true;

    const bootstrapAsync = async (): Promise<void> => {
      try {
        const token = await secureStorage.getItem(TOKEN_KEYS.ACCESS);
        if (token) {
          // Token exists — verify it by fetching the current user profile.
          // The response interceptor in apiClient handles silent refresh on 401.
          const user = await userApi.getCurrentUser();
          if (isMounted) setUser(user);
        } else {
          if (isMounted) setUser(null);
        }
      } catch {
        // Token invalid / network error during bootstrap — reset to logged-out state.
        if (isMounted) setUser(null);
      } finally {
        if (isMounted) {
          setLoading(false);
          setIsReady(true);
        }
      }
    };

    bootstrapAsync();

    return () => {
      isMounted = false;
    };
  }, [setUser, setLoading]);

  // ---------------------------------------------------------------------------
  // Splash dismissal:
  // If user is already authenticated (returning user), dismiss native splash
  // immediately upon navigation ready.
  // If user is unauthenticated, splash is held until Three.js renders its
  // first frame inside Quorum3DIntro (or fallback timeout), achieving a
  // zero-seam transition into the 3D cinematic.
  // ---------------------------------------------------------------------------
  const onNavigationReady = useCallback(async () => {
    if (splashHiddenRef.current) return;
    if (isAuthenticated) {
      splashHiddenRef.current = true;
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Safe to ignore — splash may already be hidden on some platforms.
      }
    }
  }, [isAuthenticated]);

  // ---------------------------------------------------------------------------
  // Loading state — keep the background dark (#000308) to match native splash
  // ---------------------------------------------------------------------------
  if (!isReady || isLoading) {
    return <View style={styles.splashContainer} />;
  }

  // ---------------------------------------------------------------------------
  // Navigation tree
  // ---------------------------------------------------------------------------
  return (
    <NavigationContainer onReady={onNavigationReady}>
      {/* Core security rule: auth state is the single source of truth */}
      {isAuthenticated ? <MainStack /> : <AuthStack />}
    </NavigationContainer>
  );
};

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    // Matches the native splash background (#000308) — seamless transition, no flash.
    backgroundColor: '#000308',
  },
});
