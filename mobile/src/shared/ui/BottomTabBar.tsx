import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppColors, useThemeStore, Radius, FontSize } from '../constants/theme';
import { haptic } from '../lib/haptics';

export interface TabItem {
  id: string;
  label: string;
  icon: any;
  badge?: number | string;
}

interface BottomTabBarProps {
  tabs: TabItem[];
  activeTab: string;
  onSelectTab: (id: string) => void;
}

export const BottomTabBar: React.FC<BottomTabBarProps> = React.memo(({
  tabs,
  activeTab,
  onSelectTab,
}) => {
  const colors = useAppColors();
  const isLightMode = useThemeStore((s) => s.isLightMode);
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.wrapper,
        {
          paddingBottom: Math.max(insets.bottom, 12),
        },
      ]}
      pointerEvents="box-none"
    >
      <View
        style={[
          styles.container,
          {
            backgroundColor: isLightMode
              ? '#FFFFFF'
              : 'rgba(9, 18, 37, 0.88)',
            borderColor: colors.glassBorder,
            shadowColor: isLightMode ? '#0B1340' : '#000000',
          },
        ]}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const IconComponent = tab.icon;

          return (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tabBtn,
                isActive && {
                  backgroundColor: isLightMode
                    ? 'rgba(37, 99, 235, 0.12)'
                    : 'rgba(79, 142, 247, 0.16)',
                },
              ]}
              onPress={() => {
                haptic.light();
                onSelectTab(tab.id);
              }}
              activeOpacity={0.75}
            >
              <View style={styles.iconContainer}>
                <IconComponent
                  size={20}
                  color={isActive ? colors.emerald : colors.textMuted}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.badge !== undefined && (
                  <View
                    style={[
                      styles.badgeDot,
                      {
                        backgroundColor: colors.emerald,
                        borderColor: isLightMode ? '#FFFFFF' : '#091225',
                      },
                    ]}
                  >
                    {typeof tab.badge === 'number' && tab.badge > 0 && (
                      <Text style={styles.badgeText}>{tab.badge > 99 ? '99+' : tab.badge}</Text>
                    )}
                  </View>
                )}
              </View>

              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? colors.emerald : colors.textMuted,
                    fontWeight: isActive ? '700' : '500',
                  },
                ]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
});

BottomTabBar.displayName = 'BottomTabBar';

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 16,
    zIndex: 999,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    maxWidth: 500,
    borderRadius: Radius.xl,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  tabBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: Radius.lg,
    gap: 3,
  },
  iconContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 11,
    letterSpacing: -0.2,
  },
  badgeDot: {
    position: 'absolute',
    top: -3,
    right: -8,
    minWidth: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: '800',
    paddingHorizontal: 2,
  },
});
