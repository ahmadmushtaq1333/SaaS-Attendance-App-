import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { ArrowRight } from 'lucide-react-native';
import { useAppColors, Radius, FontSize } from '../constants/theme';

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

export const DashboardActionCard: React.FC<DashboardActionCardProps> = ({
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

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.82}
      style={[
        styles.card,
        {
          backgroundColor: colors.cardBg,
          borderColor: colors.glassBorder,
        },
      ]}
    >
      {/* Ambient background glow circle */}
      <View
        style={[
          styles.glowCircle,
          { backgroundColor: color },
        ]}
      />

      {/* Header with Icon + Title + Description */}
      <View style={styles.headerRow}>
        <View style={[styles.iconBox, { backgroundColor: `${color}20` }]}>
          <Icon size={22} color={color} />
        </View>
        <View style={styles.headerText}>
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
            {badge}
          </View>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            {description}
          </Text>
        </View>
      </View>

      {/* Optional Stats Grid */}
      {stats && stats.length > 0 && (
        <View style={[styles.statsContainer, { borderColor: colors.glassBorder }]}>
          {stats.map((stat, i) => (
            <View key={i} style={styles.statItem}>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>{stat.label}</Text>
              <Text
                style={[
                  styles.statValue,
                  { color: stat.color || colors.textPrimary },
                ]}
              >
                {stat.value}
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* Action Button */}
      <View style={[styles.actionButton, { backgroundColor: color }]}>
        <Text style={styles.buttonText}>{buttonText}</Text>
        <ArrowRight size={14} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 20,
    gap: 14,
    position: 'relative',
    overflow: 'hidden',
  },
  glowCircle: {
    position: 'absolute',
    top: -20,
    right: -20,
    width: 110,
    height: 110,
    borderRadius: 55,
    opacity: 0.08,
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
  },
  description: {
    fontSize: 13,
    marginTop: 2,
    lineHeight: 18,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
    padding: 12,
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
    fontSize: 18,
    fontWeight: '700',
    marginTop: 2,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: Radius.sm,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
