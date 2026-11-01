/**
 * useHydrateTheme.ts
 * ------------------
 * Single-responsibility hook: reads the persisted theme preference from
 * AsyncStorage and applies it to the Zustand store.
 *
 * ## Separation of Concerns
 * This hook is intentionally decoupled from splash-screen lifetime.
 * Splash-screen dismissal is handled by `RootNavigator` once the full
 * auth bootstrap is also complete, ensuring zero white-flash regardless
 * of which operation (theme read vs. token check) finishes first.
 *
 * Usage in App.tsx:
 *   const isThemeReady = useHydrateTheme();
 *   if (!isThemeReady) return null;   // prevent theme flash
 */

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';

import { useThemeStore } from '@/shared/constants/theme';

// ---------------------------------------------------------------------------
// Module-scope: prevent the splash screen from auto-hiding immediately.
// Called synchronously when this module is first imported — the earliest
// safe point to register our intent.
// ---------------------------------------------------------------------------
SplashScreen.preventAutoHideAsync().catch(() => {
  // If prevention fails (e.g. splash already dismissed on certain platforms),
  // swallow the error — the rest of the boot sequence remains unaffected.
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** The AsyncStorage key used to persist the user's theme preference. */
const THEME_STORAGE_KEY = 'theme_mode' as const;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Reads the persisted theme preference from AsyncStorage and applies it
 * synchronously before the first render via {@link useThemeStore}.
 *
 * **Must be called once** in the root component (e.g. `App.tsx`).
 * The app should render `null` until this hook returns `true` to
 * prevent a momentary light/dark theme flash.
 *
 * **Does NOT hide the splash screen** — that responsibility belongs to
 * `RootNavigator`, which coordinates splash dismissal with the auth
 * bootstrap so both complete before the splash fades.
 *
 * @returns `true` once the theme preference has been applied; `false` while loading.
 */
export function useHydrateTheme(): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function hydrateTheme(): Promise<void> {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);

        // Only 'light' activates light mode; anything else (null, 'dark', …)
        // leaves the store in its default dark state.
        if (stored === 'light') {
          // Use getState() instead of the hook to avoid a React subscription
          // inside an async callback.
          useThemeStore.getState().setTheme(true);
        }
      } catch {
        // AsyncStorage read failure — proceed with the default dark theme
        // rather than blocking the app indefinitely.
      } finally {
        if (isMounted) {
          setIsReady(true);
        }
      }
    }

    hydrateTheme();

    return () => {
      isMounted = false;
    };
  }, []); // Run exactly once on mount

  return isReady;
}
