import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  School,
  Users,
  BookOpen,
  Clock,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
} from 'lucide-react-native';
import { useAuthStore } from '@/entities/user';
import { adminApi, AdminStats } from '@/entities/admin';
import { useAppColors, Radius, FontSize } from '@/shared/constants/theme';
import { AppBackground, GlassNavBar } from '@/shared/ui';
import { AdminInstitutionsPanel } from './admin/AdminInstitutionsPanel';
import { AdminUsersPanel } from './admin/AdminUsersPanel';
import { AdminCoursesPanel } from './admin/AdminCoursesPanel';
import { AdminSessionsPanel } from './admin/AdminSessionsPanel';
import { AdminExcelImportPanel } from './admin/AdminExcelImportPanel';

type AdminTab = 'institutions' | 'users' | 'courses' | 'sessions' | 'import';

export const AdminDashboardScreen: React.FC = () => {
  const { user, logout } = useAuthStore();
  const colors = useAppColors();

  const [activeTab, setActiveTab] = useState<AdminTab>('institutions');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);

  const fetchStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await adminApi.getStats();
      setStats(data);
    } catch {
      console.error('Failed to load admin stats');
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const displayName = user?.full_name || user?.email?.split('@')[0] || 'Admin';
  const initials = displayName.slice(0, 2).toUpperCase();

  const navTabs: { id: AdminTab; label: string; icon: any; count?: number; color: string }[] = [
    { id: 'institutions', label: 'Universities', icon: School, count: stats?.institutions, color: colors.cyan },
    { id: 'users', label: 'Users', icon: Users, count: stats?.totalUsers, color: colors.emerald },
    { id: 'courses', label: 'Courses', icon: BookOpen, count: stats?.courses, color: colors.purple },
    { id: 'sessions', label: 'Live Sessions', icon: Clock, count: stats?.activeSessions, color: colors.warning },
    { id: 'import', label: 'Excel Import', icon: FileSpreadsheet, color: colors.emerald },
  ];

  return (
    <AppBackground>
      <SafeAreaView style={styles.safeArea}>
        <GlassNavBar />

        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Page Header + Admin Chip (matches web AdminDashboard.jsx) ── */}
          <View style={styles.headerSection}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                System Administration
              </Text>
              <View style={styles.subTitleRow}>
                <Text style={[styles.pageSub, { color: colors.textMuted }]}>
                  Manage across{' '}
                  <Text style={{ color: colors.cyan, fontWeight: '700' }}>
                    {stats ? `${stats.institutions} institution${stats.institutions !== 1 ? 's' : ''}` : 'all'}
                  </Text>
                </Text>
                <TouchableOpacity
                  onPress={fetchStats}
                  disabled={loadingStats}
                  style={styles.refreshBtn}
                  activeOpacity={0.7}
                >
                  <RefreshCw size={11} color={colors.textMuted} />
                  <Text style={[styles.refreshText, { color: colors.textMuted }]}>
                    {loadingStats ? 'Loading…' : 'Refresh'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Admin Chip */}
            <View
              style={[
                styles.adminChip,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.glassBorder,
                },
              ]}
            >
              <View style={[styles.avatar, { borderColor: `${colors.purple}60` }]}>
                <Text style={[styles.avatarText, { color: colors.textPrimary }]}>{initials}</Text>
              </View>
              <View style={styles.adminMeta}>
                <Text style={[styles.adminName, { color: colors.textPrimary }]}>{displayName}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.pulseDot, { backgroundColor: colors.emerald }]} />
                  <Text style={[styles.badgeText, { color: user?.is_superuser ? colors.emerald : colors.purple }]}>
                    {user?.is_superuser ? 'System Admin' : `Admin · ${user?.institution_name || 'Global'}`}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* ── 4 KPI Cards (matches web KpiCard layout) ── */}
          <View style={styles.kpiContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.kpiScroll}
            >
              {/* Card 1: Total Users */}
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: `${colors.emerald}40`,
                  },
                ]}
              >
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIconBox, { backgroundColor: `${colors.emerald}20` }]}>
                    <Users size={18} color={colors.emerald} />
                  </View>
                  <Text style={[styles.kpiTrending, { color: colors.emerald }]}>↑ 12%</Text>
                </View>
                <Text style={[styles.kpiVal, { color: colors.textPrimary }]}>
                  {loadingStats ? '—' : stats?.totalUsers ?? 0}
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>TOTAL USERS</Text>
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                  {stats?.activeUsers ?? 0} active accounts
                </Text>
              </View>

              {/* Card 2: Universities */}
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: `${colors.cyan}40`,
                  },
                ]}
              >
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIconBox, { backgroundColor: `${colors.cyan}20` }]}>
                    <School size={18} color={colors.cyan} />
                  </View>
                  <Text style={[styles.kpiTrending, { color: colors.cyan }]}>↑ 3%</Text>
                </View>
                <Text style={[styles.kpiVal, { color: colors.textPrimary }]}>
                  {loadingStats ? '—' : stats?.institutions ?? 0}
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>UNIVERSITIES</Text>
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                  {stats?.courses ?? 0} total courses
                </Text>
              </View>

              {/* Card 3: Teachers */}
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: `${colors.purple}40`,
                  },
                ]}
              >
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIconBox, { backgroundColor: `${colors.purple}20` }]}>
                    <CheckCircle size={18} color={colors.purple} />
                  </View>
                  <Text style={[styles.kpiTrending, { color: colors.purple }]}>↑ 8%</Text>
                </View>
                <Text style={[styles.kpiVal, { color: colors.textPrimary }]}>
                  {loadingStats ? '—' : stats?.teachers ?? 0}
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>TEACHERS</Text>
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                  {stats?.students ?? 0} students enrolled
                </Text>
              </View>

              {/* Card 4: Live Sessions */}
              <View
                style={[
                  styles.kpiCard,
                  {
                    backgroundColor: colors.cardBg,
                    borderColor: `${colors.warning}40`,
                  },
                ]}
              >
                <View style={styles.kpiTop}>
                  <View style={[styles.kpiIconBox, { backgroundColor: `${colors.warning}20` }]}>
                    <Clock size={18} color={colors.warning} />
                  </View>
                  <Text style={[styles.kpiTrending, { color: colors.warning }]}>Live QR</Text>
                </View>
                <Text style={[styles.kpiVal, { color: colors.textPrimary }]}>
                  {loadingStats ? '—' : stats?.activeSessions ?? 0}
                </Text>
                <Text style={[styles.kpiLabel, { color: colors.textMuted }]}>LIVE SESSIONS</Text>
                <Text style={[styles.kpiSub, { color: colors.textSecondary }]}>
                  {stats?.unverified ?? 0} pending activation
                </Text>
              </View>
            </ScrollView>
          </View>

          {/* ── 5-Tab Segmented Navigation Bar with Lucide Icons ── */}
          <View style={styles.tabBarContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.tabScroll}
            >
              {navTabs.map((tab) => {
                const isActive = activeTab === tab.id;
                const IconComponent = tab.icon;
                return (
                  <TouchableOpacity
                    key={tab.id}
                    style={[
                      styles.tabBtn,
                      {
                        backgroundColor: isActive ? `${tab.color}22` : colors.cardBg,
                        borderColor: isActive ? tab.color : colors.glassBorder,
                      },
                    ]}
                    onPress={() => setActiveTab(tab.id)}
                    activeOpacity={0.75}
                  >
                    <IconComponent
                      size={15}
                      color={isActive ? tab.color : colors.textMuted}
                    />
                    <Text
                      style={[
                        styles.tabLabel,
                        {
                          color: isActive ? tab.color : colors.textSecondary,
                          fontWeight: isActive ? '700' : '500',
                        },
                      ]}
                    >
                      {tab.label}
                    </Text>
                    {tab.count !== undefined && (
                      <View
                        style={[
                          styles.tabCountBadge,
                          {
                            backgroundColor: isActive ? `${tab.color}30` : 'rgba(255,255,255,0.06)',
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.tabCountText,
                            { color: isActive ? tab.color : colors.textMuted },
                          ]}
                        >
                          {tab.count}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>

          {/* ── Active Panel Content ── */}
          <View style={styles.panelContainer}>
            {activeTab === 'institutions' && <AdminInstitutionsPanel />}
            {activeTab === 'users' && <AdminUsersPanel />}
            {activeTab === 'courses' && <AdminCoursesPanel />}
            {activeTab === 'sessions' && <AdminSessionsPanel />}
            {activeTab === 'import' && <AdminExcelImportPanel />}
          </View>
        </ScrollView>
      </SafeAreaView>
    </AppBackground>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    gap: 16,
    paddingBottom: 50,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  subTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 3,
  },
  pageSub: {
    fontSize: 12,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
  },
  refreshText: {
    fontSize: 11,
    fontWeight: '600',
  },
  adminChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: 'rgba(167, 139, 250, 0.2)',
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '800',
  },
  adminMeta: {
    gap: 1,
  },
  adminName: {
    fontSize: 13,
    fontWeight: '700',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  kpiContainer: {
    marginHorizontal: -16,
  },
  kpiScroll: {
    paddingHorizontal: 16,
    gap: 12,
  },
  kpiCard: {
    width: 155,
    borderRadius: Radius.lg,
    borderWidth: 1,
    padding: 14,
    gap: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  kpiIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kpiTrending: {
    fontSize: 10,
    fontWeight: '700',
  },
  kpiVal: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  kpiLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  kpiSub: {
    fontSize: 11,
    marginTop: 4,
  },
  tabBarContainer: {
    marginHorizontal: -16,
  },
  tabScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  tabBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: Radius.md,
    borderWidth: 1,
  },
  tabLabel: {
    fontSize: 13,
  },
  tabCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tabCountText: {
    fontSize: 10,
    fontWeight: '700',
  },
  panelContainer: {
    width: '100%',
  },
});
