import React from 'react';
import { View } from 'react-native';

// We implement this using SVG-style math rendered as a View with borderWidth trick
// since react-native doesn't have SVG natively without extra libs
interface ProgressRingProps {
  pct: number;
  size?: number;
  color?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = ({ pct, size = 52, color = '#4F8EF7' }) => {
  const strokeWidth = 4;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDash = (pct / 100) * circumference;

  return (
    // We use a styled View since raw SVG requires react-native-svg
    // The circular progress is achieved via borderColor trick
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: strokeWidth,
        borderColor: 'rgba(148, 187, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {/* Colored arc overlay via clipping - simple approach without SVG */}
      <View
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: strokeWidth,
          borderColor: color,
          borderRightColor: 'transparent',
          borderBottomColor: pct > 50 ? color : 'transparent',
          transform: [{ rotate: `${(pct / 100) * 360 - 90}deg` }],
        }}
      />
    </View>
  );
};
