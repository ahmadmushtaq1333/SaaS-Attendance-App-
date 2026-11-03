/**
 * Quorum3DIntro.tsx
 * -----------------
 * Fullscreen hardware-accelerated 3D intro overlay component.
 *
 * Architecture & Decoupling:
 * - Completely self-contained: handles WebView lifecycle, message decoding,
 *   haptics, gesture skip, and native crossfade animations.
 * - Communicates outward via a single clean callback `onFinish()`.
 * - Clean GPU teardown: once the fade transition finishes, the WebView
 *   and WebGL canvas unmount completely, freeing all GPU memory.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Text,
  Animated,
  Platform,
} from 'react-native';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as SplashScreen from 'expo-splash-screen';
import { haptic } from '@/shared/lib/haptics';
import { getQuorum3dHtml } from './quorum3dHtml';

export interface Quorum3DIntroProps {
  /** Called when the intro sequence completes or is skipped and fade-out finishes. */
  onFinish: () => void;
  /** Optional callback fired when Three.js has rendered its first frame. */
  onReady?: () => void;
}

export const Quorum3DIntro: React.FC<Quorum3DIntroProps> = React.memo(({ onFinish, onReady }) => {
  const insets = useSafeAreaInsets();
  const [isMounted, setIsMounted] = useState(true);
  // True until Three.js fires READY — keeps an opaque black cover over the WebView
  // so the user never sees the WebView's blank white initialisation frame.
  const [webViewReady, setWebViewReady] = useState(false);
  const isTransitioningRef = useRef(false);
  const splashDismissedRef = useRef(false);
  const webViewRef = useRef<any>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  // Fades the black cover out once Three.js is ready
  const coverAnim = useRef(new Animated.Value(1)).current;

  const htmlContent = useMemo(() => getQuorum3dHtml(), []);

  const dismissSplash = useCallback(async () => {
    if (splashDismissedRef.current) return;
    splashDismissedRef.current = true;
    try {
      await SplashScreen.hideAsync();
    } catch {
      // Safe to ignore if already hidden
    }
  }, []);

  // Safety fallback: if Three.js never fires READY (e.g. WebView crash),
  // dismiss native splash and reveal whatever is rendered after 3s.
  useEffect(() => {
    const fallbackTimer = setTimeout(() => {
      dismissSplash();
      setWebViewReady(true);
      coverAnim.setValue(0);
      webViewRef.current?.postMessage(JSON.stringify({ type: 'START' }));
    }, 3000);

    return () => clearTimeout(fallbackTimer);
  }, [dismissSplash, coverAnim]);

  const triggerHandoff = useCallback((isSkip: boolean) => {
    if (isTransitioningRef.current) return;
    isTransitioningRef.current = true;

    // Guarantee native splash is dismissed
    dismissSplash();

    if (isSkip) {
      haptic.light();
    }

    // Smooth native crossfade: flash briefly then fade container to reveal underlying screen
    Animated.sequence([
      ...(isSkip
        ? []
        : [
            Animated.timing(flashAnim, {
              toValue: 1,
              duration: 250,
              useNativeDriver: true,
            }),
          ]),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMounted(false);
      onFinish();
    });
  }, [dismissSplash, fadeAnim, flashAnim, onFinish]);

  const onMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'READY') {
        // Dismiss native splash first, then fade the black cover to reveal
        // the fully-rendered Three.js first frame — no white flash possible.
        dismissSplash();
        setWebViewReady(true);
        Animated.timing(coverAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start(() => {
          // Tell Three.js to begin its animation sequence
          setTimeout(() => {
            webViewRef.current?.postMessage(JSON.stringify({ type: 'START' }));
          }, 80);
          onReady?.();
        });
      } else if (data.type === 'COMPLETE') {
        triggerHandoff(false);
      } else if (data.type === 'SKIP') {
        triggerHandoff(true);
      }
    } catch {
      dismissSplash();
      setWebViewReady(true);
      coverAnim.setValue(0);
      triggerHandoff(false);
    }
  }, [dismissSplash, coverAnim, onReady, triggerHandoff]);

  if (!isMounted) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      {/* 3D WebGL Canvas via WebView */}
      <WebView
        ref={webViewRef}
        source={{ html: htmlContent }}
        style={styles.webView}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        javaScriptEnabled={true}
        domStorageEnabled={true}
        androidHardwareAccelerationDisabled={false}
        originWhitelist={['*']}
        onMessage={onMessage}
        backgroundColor="#000308"
      />

      {/* Black cover held opaque until Three.js fires READY.
          Prevents the WebView blank-white initialisation frame from ever
          being visible to the user. Fades out in 200ms once ready. */}
      {!webViewReady && (
        <Animated.View
          pointerEvents="none"
          style={[styles.blackCover, { opacity: coverAnim }]}
        />
      )}

      {/* Optional Pure White Flash Overlay during camera surge */}
      <Animated.View
        pointerEvents="none"
        style={[styles.flashOverlay, { opacity: flashAnim }]}
      />

      {/* Floating Skip Pill Button */}
      <TouchableOpacity
        style={[
          styles.skipButton,
          { top: Math.max(insets.top + 10, 24) },
        ]}
        onPress={() => triggerHandoff(true)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
      >
        <Text style={styles.skipText}>Skip</Text>
      </TouchableOpacity>
    </Animated.View>
  );
});

Quorum3DIntro.displayName = 'Quorum3DIntro';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000308',
    zIndex: 9999,
  },
  webView: {
    flex: 1,
    backgroundColor: '#000308',
  },
  flashOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#FFFFFF',
    zIndex: 10000,
  },
  blackCover: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000308',
    zIndex: 9998, // below flashOverlay, above webView
  },
  skipButton: {
    position: 'absolute',
    right: 20,
    zIndex: 10001,
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  skipText: {
    color: '#E8EAF6',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
