import React from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useThemeStore } from '../constants/theme';

export const AppBackground: React.FC<{ children?: React.ReactNode }> = ({ children }) => {
  const isLightMode = useThemeStore((s) => s.isLightMode);
  const { width, height } = Dimensions.get('window');

  return (
    <View style={styles.container}>
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Defs>
          {/* Base gradient */}
          <RadialGradient id="bgGrad" cx="50%" cy="30%" rx="100%" ry="100%">
            <Stop offset="0%" stopColor={isLightMode ? '#F0F4FF' : '#080F20'} />
            <Stop offset="100%" stopColor={isLightMode ? '#E6EDFF' : '#060B18'} />
          </RadialGradient>

          {/* Blob 1: Electric Sapphire top-left */}
          <RadialGradient id="blob1" cx="15%" cy="10%" rx="60%" ry="45%">
            <Stop offset="0%" stopColor={isLightMode ? '#3B82F6' : '#4F8EF7'} stopOpacity={isLightMode ? 0.25 : 0.35} />
            <Stop offset="100%" stopColor={isLightMode ? '#3B82F6' : '#4F8EF7'} stopOpacity={0} />
          </RadialGradient>

          {/* Blob 2: Soft Indigo/Cyan mid-right */}
          <RadialGradient id="blob2" cx="88%" cy="42%" rx="55%" ry="45%">
            <Stop offset="0%" stopColor={isLightMode ? '#6366F1' : '#818CF8'} stopOpacity={isLightMode ? 0.22 : 0.28} />
            <Stop offset="100%" stopColor={isLightMode ? '#6366F1' : '#818CF8'} stopOpacity={0} />
          </RadialGradient>

          {/* Blob 3: Violet bottom-left */}
          <RadialGradient id="blob3" cx="20%" cy="88%" rx="50%" ry="38%">
            <Stop offset="0%" stopColor={isLightMode ? '#8B5CF6' : '#A78BFA'} stopOpacity={isLightMode ? 0.20 : 0.22} />
            <Stop offset="100%" stopColor={isLightMode ? '#8B5CF6' : '#A78BFA'} stopOpacity={0} />
          </RadialGradient>
        </Defs>

        <Rect x="0" y="0" width={width} height={height} fill="url(#bgGrad)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#blob1)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#blob2)" />
        <Rect x="0" y="0" width={width} height={height} fill="url(#blob3)" />
      </Svg>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
});
