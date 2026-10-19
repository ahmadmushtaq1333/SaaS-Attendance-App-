// Quorum Design System — Mobile
// Mirroring the web app's glassmorphism design tokens (Dark & Light modes)

import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const darkColors = {
  // Backgrounds
  bgDeep: '#060B18',
  bgMid: '#091225',
  bgSurface: '#0C1A35',
  cardBg: 'rgba(12, 26, 53, 0.75)',
  cardBgSolid: '#0C1A35',

  // Glass layers
  glassA: 'rgba(148, 187, 255, 0.08)',
  glassB: 'rgba(148, 187, 255, 0.05)',
  glassC: 'rgba(148, 187, 255, 0.03)',
  glassBorder: 'rgba(148, 187, 255, 0.14)',
  glassInner: 'rgba(148, 187, 255, 0.07)',

  // Text
  textPrimary: '#EEF2FF',
  textSecondary: 'rgba(199, 213, 255, 0.72)',
  textMuted: 'rgba(148, 163, 220, 0.50)',

  // Accents
  emerald: '#4F8EF7',        // primary electric sapphire
  emeraldGlow: 'rgba(79, 142, 247, 0.25)',
  emeraldDim: 'rgba(79, 142, 247, 0.12)',
  cyan: '#818CF8',           // soft indigo
  cyanGlow: 'rgba(129, 140, 248, 0.22)',
  purple: '#A78BFA',         // violet
  purpleGlow: 'rgba(167, 139, 250, 0.20)',

  // Status
  warning: '#FBBF24',
  warningGlow: 'rgba(251, 191, 36, 0.20)',
  danger: '#F87171',
  dangerGlow: 'rgba(248, 113, 113, 0.20)',

  inputBg: 'rgba(9, 18, 37, 0.65)',
  inputBorder: 'rgba(148, 187, 255, 0.16)',
  white: '#FFFFFF',
};

export const lightColors = {
  // Backgrounds
  bgDeep: '#F0F4FF',
  bgMid: '#E6EDFF',
  bgSurface: '#FFFFFF',
  cardBg: 'rgba(255, 255, 255, 0.85)',
  cardBgSolid: '#FFFFFF',

  // Glass layers
  glassA: 'rgba(255, 255, 255, 0.85)',
  glassB: 'rgba(255, 255, 255, 0.70)',
  glassC: 'rgba(255, 255, 255, 0.55)',
  glassBorder: 'rgba(215, 228, 255, 0.85)',
  glassInner: 'rgba(255, 255, 255, 0.6)',

  // Text
  textPrimary: '#0B1340',
  textSecondary: '#2D3A66',
  textMuted: '#6272A4',

  // Accents
  emerald: '#2563EB',
  emeraldGlow: 'rgba(37, 99, 235, 0.20)',
  emeraldDim: 'rgba(37, 99, 235, 0.10)',
  cyan: '#4F46E5',
  cyanGlow: 'rgba(79, 70, 229, 0.20)',
  purple: '#7C3AED',
  purpleGlow: 'rgba(124, 58, 237, 0.20)',

  // Status
  warning: '#D97706',
  warningGlow: 'rgba(217, 119, 6, 0.20)',
  danger: '#DC2626',
  dangerGlow: 'rgba(220, 38, 38, 0.20)',

  inputBg: '#FFFFFF',
  inputBorder: 'rgba(148, 163, 220, 0.55)',
  white: '#FFFFFF',
};

// Default static Colors object for legacy/direct imports
export const Colors = darkColors;

interface ThemeState {
  isLightMode: boolean;
  toggleTheme: () => void;
  setTheme: (isLight: boolean) => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  isLightMode: false,
  toggleTheme: () => {
    const next = !get().isLightMode;
    set({ isLightMode: next });
    AsyncStorage.setItem('theme_mode', next ? 'light' : 'dark').catch(() => {});
  },
  setTheme: (isLight: boolean) => {
    set({ isLightMode: isLight });
    AsyncStorage.setItem('theme_mode', isLight ? 'light' : 'dark').catch(() => {});
  },
}));

// Hydrate stored theme preference on app start
AsyncStorage.getItem('theme_mode').then((val) => {
  if (val === 'light') {
    useThemeStore.getState().setTheme(true);
  }
}).catch(() => {});

export const useAppColors = () => {
  const isLightMode = useThemeStore((s) => s.isLightMode);
  return isLightMode ? lightColors : darkColors;
};

export const Radius = {
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  full: 9999,
};

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  xxl: 24,
  hero: 32,
};
