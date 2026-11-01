import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Activity, LogOut, Sun, Moon } from 'lucide-react-native';
import { useAuthStore } from '@/entities/user';
import { useThemeStore, useAppColors, Radius } from '../constants/theme';
import { haptic } from '../lib/haptics';

interface GlassNavBarProps {
  onLogout?: () => void;
  activeTab?: string;
  tabs?: { id: string; label: string; icon?: any }[];
  onSelectTab?: (id: string) => void;
}

export const GlassNavBar: React.FC<GlassNavBarProps> = React.memo(({
  onLogout,
  activeTab,
  tabs,
  onSelectTab,
}) => {
  const { user, logout } = useAuthStore();
  const isLightMode = useThemeStore((s) => s.isLightMode);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const colors = useAppColors();

  const handleLogout = onLogout || logout;

  // Exact matching initials logic from web App.jsx line 60:
  // getInitials = (email) => email.split("@")[0].slice(0, 2).toUpperCase();
  const email = user?.email || '';
  const initials = email
    ? email.split('@')[0].slice(0, 2).toUpperCase()
    : user?.full_name
    ? user.full_name.slice(0, 2).toUpperCase()
    : 'QU';

  return (
    <View
      style={[
        styles.navContainer,
        {
          backgroundColor: isLightMode ? '#FFFFFF' : 'rgba(9, 18, 37, 0.85)',
          borderColor: colors.glassBorder,
          shadowOpacity: isLightMode ? 0.06 : 0.25,
        },
      ]}
    >
      {/* Brand logo & title */}
      <View style={styles.brandRow}>
        <View style={styles.logoSquare}>
          <Activity size={16} color="#FFFFFF" strokeWidth={2.5} />
        </View>
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Quorum</Text>
      </View>

      {/* Optional In-Navbar Navigation Pills (for screens that provide tabs) */}
      {tabs && tabs.length > 0 && (
        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => {
                  haptic.light();
                  onSelectTab?.(tab.id);
                }}
                style={[
                  styles.tabPill,
                  isActive && {
                    backgroundColor: `${colors.emerald}20`,
                    borderColor: colors.emerald,
                  },
                ]}
                activeOpacity={0.7}
              >
                {tab.icon &&
                  React.createElement(tab.icon, {
                    size: 13,
                    color: isActive ? colors.emerald : colors.textMuted,
                  })}
                <Text
                  style={[
                    styles.tabLabel,
                    { color: isActive ? colors.emerald : colors.textSecondary },
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Right actions: Theme toggle, Avatar, Logout */}
      <View style={styles.actionsRow}>
        {/* Sun/Moon Toggle */}
        <TouchableOpacity
          onPress={() => {
            haptic.light();
            toggleTheme();
          }}
          style={[
            styles.iconBtn,
            {
              borderColor: isLightMode ? 'rgba(11, 19, 64, 0.08)' : 'rgba(255, 255, 255, 0.1)',
              backgroundColor: isLightMode ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.06)',
            },
          ]}
          activeOpacity={0.7}
          accessibilityLabel="Toggle light and dark theme"
        >
          {isLightMode ? (
            <Moon size={16} color={colors.textPrimary} />
          ) : (
            <Sun size={16} color={colors.warning} />
          )}
        </TouchableOpacity>

        {/* User initials avatar (e.g. '24') */}
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Logout button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={[
            styles.logoutBtn,
            {
              backgroundColor: isLightMode ? '#FEE2E2' : 'rgba(248, 113, 113, 0.15)',
              borderColor: isLightMode ? '#FCA5A5' : 'rgba(248, 113, 113, 0.3)',
            },
          ]}
          activeOpacity={0.7}
          accessibilityLabel="Logout"
        >
          <LogOut size={14} color={isLightMode ? '#DC2626' : '#F87171'} />
        </TouchableOpacity>
      </View>
    </View>
  );
});

GlassNavBar.displayName = 'GlassNavBar';

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 18,
    borderWidth: 1,
    shadowColor: '#0B1340',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 14,
    elevation: 3,
    zIndex: 100,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoSquare: {
    width: 32,
    height: 32,
    borderRadius: 9,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  tabLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#2563EB',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 2,
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
