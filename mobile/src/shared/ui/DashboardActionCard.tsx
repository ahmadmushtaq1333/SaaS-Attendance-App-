import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useAppColors, useThemeStore, Radius } from '../constants/theme';

interface StatItem {
  label: string;
  value: string | number;
  color?: string;
}

interface DashboardActionCardProps {
  icon: any;
  color: string;
  title: string;
  description: string;
  stats?: StatItem[];
  buttonText: string;
  onPress: () => void;
  badge?: React.ReactNode;
}

export const DashboardActionCard: React.FC<DashboardActionCardProps> = React.memo(({
  icon: Icon,
  color,
  title,
  description,
  stats,
  buttonText,
  onPress,
  badge,
}) => {
  const colors = useAppColors();
  const isLightMode = useThemeStore((s) => s.isLightMode);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.glassBorder,
          shadowOpacity: isLightMode ? 0.04 : 0.2,
        },
      ]}
    >
      {/* Ambient watermarked glow matching web DashboardActionCard.jsx */}
      <View
        pointerEvents="none"
        style={[
          styles.watermarkGlow,
          {
            backgroundColor: color,
            opacity: 0.05,
          },
        ]}
      />

      {/* Header with Icon + Title + Description */}
      <View style={styles.headerRow}>
        <View
          style={[
            styles.iconBox,
            {
              backgroundColor: `${color}18`,
            },
          ]}
        >
          <Icon size={22} color={color} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {title}
            </Text>
            {badge}
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={2}>
            {description}
          </Text>
        </View>
      </View>

      {/* Optional Stats Grid */}
      {stats && stats.length > 0 && (
        <View style={[styles.statsContainer, { borderColor: colors.glassBorder }]}>
          {stats.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]} numberOfLines={1}>
                {stat.label}
              </Text>
              <Text
                style={[
                  styles.statValue,
                  { color: stat.color || colors.textPrimary },
                ]}
                numberOfLines={1}
              >
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Button */}
      <View
        style={[
          styles.actionButton,
          {
            backgroundColor: color,
            shadowColor: color,
          },
        ]}
      >
        <Text style={styles.buttonText} numberOfLines={1}>
          {buttonText}
        </Text>
        <ArrowRight size={14} color="#FFFFFF" strokeWidth={2.5} />
      </View>
    </TouchableOpacity>
  );
});

DashboardActionCard.displayName = 'DashboardActionCard';

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    gap: 16,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: '#0B1340',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 16,
    elevation: 2,
  },
  watermarkGlow: {
    position: 'absolute',
    top: -30,
    right: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  headerText: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  description: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderWidth: 1,
  },
  statItem: {
    flex: 1,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    fontSize: 17,
    fontWeight: '800',
    marginTop: 1,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 44,
    borderRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
});
