import React, { useMemo } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useThemeStore } from '../constants/theme';

// ---------------------------------------------------------------------------
// Inner SVG layer — only re-renders when isLightMode changes.
// Extracting it as its own memo component prevents the 4 radial-gradient
// full-screen SVG from repainting on every parent state update.
// ---------------------------------------------------------------------------
interface BackgroundSvgLayerProps {
  isLightMode: boolean;
  width: number;
  height: number;
}

const BackgroundSvgLayer = React.memo<BackgroundSvgLayerProps>(
  ({ isLightMode, width, height }) => (
    <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
      <Defs>
        {/* Base background gradient */}
        <RadialGradient id="bgGrad" cx="50%" cy="30%" rx="100%" ry="100%">
          <Stop offset="0%" stopColor={isLightMode ? '#F0F4FF' : '#080F20'} />
          <Stop offset="100%" stopColor={isLightMode ? '#E6EDFF' : '#060B18'} />
        </RadialGradient>

        {/* Blob 1: Top-Left */}
        <RadialGradient id="blob1" cx="10%" cy="10%" rx="55%" ry="45%">
          <Stop
            offset="0%"
            stopColor={isLightMode ? '#93C5FD' : '#4F8EF7'}
            stopOpacity={isLightMode ? 0.24 : 0.35}
          />
          <Stop
            offset="100%"
            stopColor={isLightMode ? '#DBEAFE' : '#4F8EF7'}
            stopOpacity={0}
          />
        </RadialGradient>

        {/* Blob 2: Top-Right */}
        <RadialGradient id="blob2" cx="90%" cy="20%" rx="55%" ry="45%">
          <Stop
            offset="0%"
            stopColor={isLightMode ? '#C4B5FD' : '#818CF8'}
            stopOpacity={isLightMode ? 0.20 : 0.28}
          />
          <Stop
            offset="100%"
            stopColor={isLightMode ? '#EDE9FE' : '#818CF8'}
            stopOpacity={0}
          />
        </RadialGradient>

        {/* Blob 3: Bottom-Center */}
        <RadialGradient id="blob3" cx="50%" cy="80%" rx="60%" ry="50%">
          <Stop
            offset="0%"
            stopColor={isLightMode ? '#A5B4FC' : '#A78BFA'}
            stopOpacity={isLightMode ? 0.18 : 0.22}
          />
          <Stop
            offset="100%"
            stopColor={isLightMode ? '#E0E7FF' : '#A78BFA'}
            stopOpacity={0}
          />
        </RadialGradient>
      </Defs>

      <Rect x="0" y="0" width={width} height={height} fill="url(#bgGrad)" />
      <Rect x="0" y="0" width={width} height={height} fill="url(#blob1)" />
      <Rect x="0" y="0" width={width} height={height} fill="url(#blob2)" />
      <Rect x="0" y="0" width={width} height={height} fill="url(#blob3)" />
    </Svg>
  ),
  // Only re-render when the theme actually switches — not on any parent state change
  (prev, next) => prev.isLightMode === next.isLightMode,
);

BackgroundSvgLayer.displayName = 'BackgroundSvgLayer';

// ---------------------------------------------------------------------------
// Public component
// ---------------------------------------------------------------------------
export const AppBackground = React.memo<{ children?: React.ReactNode }>(({ children }) => {
  const isLightMode = useThemeStore((s) => s.isLightMode);
  // Screen dimensions are stable; memoize so Dimensions.get() is called once.
  const { width, height } = useMemo(() => Dimensions.get('window'), []);

  return (
    <View style={styles.container}>
      <BackgroundSvgLayer isLightMode={isLightMode} width={width} height={height} />
      {children}
    </View>
  );
});

AppBackground.displayName = 'AppBackground';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
