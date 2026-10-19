import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { calculateSafetyMetrics } from '@/shared/lib/attendanceCalculator';
import { Radius, FontSize } from '@/shared/constants/theme';

interface SafetyBadgeProps {
  attended: number;
  total: number;
  target?: number;
}

export const SafetyBadge: React.FC<SafetyBadgeProps> = ({ attended, total, target = 75 }) => {
  const metrics = calculateSafetyMetrics(attended, total, target);

  return (
    <View style={[styles.badge, { backgroundColor: metrics.badgeBg, borderColor: `${metrics.badgeColor}40` }]}>
      <Text style={[styles.text, { color: metrics.badgeColor }]}>
        {metrics.badgeText}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
