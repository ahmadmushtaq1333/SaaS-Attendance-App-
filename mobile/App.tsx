/**
 * App.tsx — Application root
 * --------------------------
 * Boot sequence:
 *   1. useHydrateTheme() reads the persisted theme preference from AsyncStorage
 *      and applies it. Returns false until done (renders null to prevent flash).
 *   2. RootNavigator mounts, runs the auth bootstrap, then dismisses the
 *      native splash screen via NavigationContainer.onReady.
 */

import { StatusBar } from 'expo-status-bar';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { RootNavigator } from '@/app/navigation/RootNavigator';
import { ErrorBoundary } from '@/shared/ui';
import { useHydrateTheme } from '@/shared/lib/useHydrateTheme';

// Prevent native splash screen from auto-hiding until Three.js is ready or auth completes
SplashScreen.preventAutoHideAsync().catch(() => {});

export default function App() {
  // Block render until theme preference is loaded from storage.
  // This prevents a momentary wrong-theme flash on cold start.
  // The native splash screen remains visible while this is false.
  const isThemeReady = useHydrateTheme();

  if (!isThemeReady) {
    return <View style={{ flex: 1, backgroundColor: '#000308' }} />;
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#000308' }}>
      <SafeAreaProvider style={{ flex: 1, backgroundColor: '#000308' }}>
        <StatusBar style="light" backgroundColor="#000308" />
        <ErrorBoundary>
          <RootNavigator />
        </ErrorBoundary>
      </SafeAreaProvider>
    </View>
  );
}
