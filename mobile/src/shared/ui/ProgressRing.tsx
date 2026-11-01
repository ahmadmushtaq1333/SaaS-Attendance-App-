import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

interface ProgressRingProps {
  pct: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
}

export const ProgressRing: React.FC<ProgressRingProps> = React.memo(({
  pct,
  size = 46,
  stroke = 4,
  color = '#2563EB',
  trackColor = 'rgba(0, 0, 0, 0.06)',
}) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const clampedPct = Math.max(0, Math.min(100, isNaN(pct) ? 0 : pct));
  const dash = (clampedPct / 100) * circ;

  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={trackColor}
          strokeWidth={stroke}
        />
        {clampedPct > 0 && (
          <Circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circ}`}
            strokeLinecap="round"
          />
        )}
      </Svg>
    </View>
  );
});

ProgressRing.displayName = 'ProgressRing';
