import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Activity, LogOut, Sun, Moon } from 'lucide-react-native';
import { useAuthStore } from '@/entities/user';
import { useThemeStore, useAppColors, Radius } from '../constants/theme';

interface GlassNavBarProps {
  onLogout?: () => void;
  activeTab?: string;
  tabs?: { id: string; label: string; icon?: any }[];
  onSelectTab?: (id: string) => void;
}

export const GlassNavBar: React.FC<GlassNavBarProps> = ({
  onLogout,
  activeTab,
  tabs,
  onSelectTab,
}) => {
  const { user, logout } = useAuthStore();
  const { isLightMode, toggleTheme } = useThemeStore();
  const colors = useAppColors();

  const handleLogout = onLogout || logout;

  const email = user?.email || '';
  const fullName = user?.full_name || '';
  const initials = fullName
    ? fullName.split(' ').map((p) => p[0]).join('').slice(0, 2).toUpperCase()
    : email.slice(0, 2).toUpperCase() || 'QU';

  return (
    <View style={[styles.navContainer, {
      backgroundColor: isLightMode ? 'rgba(255, 255, 255, 0.85)' : 'rgba(9, 18, 37, 0.75)',
      borderBottomColor: colors.glassBorder,
    }]}>
      {/* Brand logo & title */}
      <View style={styles.brandRow}>
        <View style={styles.logoSquare}>
          <Activity size={18} color="#07111F" strokeWidth={2.5} />
        </View>
        <Text style={[styles.brandTitle, { color: colors.textPrimary }]}>Quorum</Text>
      </View>

      {/* Optional In-Navbar Navigation Pills */}
      {tabs && tabs.length > 0 && (
        <View style={styles.tabsRow}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => onSelectTab?.(tab.id)}
                style={[
                  styles.tabPill,
                  isActive && { backgroundColor: `${colors.emerald}20`, borderColor: colors.emerald },
                ]}
                activeOpacity={0.7}
              >
                {tab.icon && React.createElement(tab.icon, {
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
          onPress={toggleTheme}
          style={[styles.iconBtn, { borderColor: colors.glassBorder }]}
          activeOpacity={0.7}
          accessibilityLabel="Toggle light and dark theme"
        >
          {isLightMode ? (
            <Moon size={16} color={colors.textPrimary} />
          ) : (
            <Sun size={16} color={colors.warning} />
          )}
        </TouchableOpacity>

        {/* User initials avatar */}
        <View style={[styles.avatarCircle, { borderColor: `${colors.emerald}50` }]}>
          <Text style={[styles.avatarText, { color: colors.textPrimary }]}>{initials}</Text>
        </View>

        {/* Logout button */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutBtn}
          activeOpacity={0.7}
          accessibilityLabel="Logout"
        >
          <LogOut size={14} color="#F87171" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  navContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
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
    backgroundColor: '#4F8EF7',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F8EF7',
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
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
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  avatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    backgroundColor: 'rgba(79, 142, 247, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 11,
    fontWeight: '800',
  },
  logoutBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(248, 113, 113, 0.3)',
    backgroundColor: 'rgba(248, 113, 113, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
