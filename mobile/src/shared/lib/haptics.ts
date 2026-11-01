/**
 * haptics.ts
 * ----------
 * Thin, failure-safe wrapper around expo-haptics.
 * All functions are no-ops on unsupported devices / simulators.
 * Import and call directly — no setup needed.
 */

import * as Haptics from 'expo-haptics';

/**
 * A safe haptics utility object. Every method is async and silently
 * swallows errors so callers never have to guard against unsupported
 * devices or simulator environments.
 */
export const haptic = {
  /**
   * Triggers a success notification haptic (e.g. task completed).
   */
  async success(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // No-op on unsupported devices / simulators
    }
  },

  /**
   * Triggers a warning notification haptic (e.g. action needs attention).
   */
  async warning(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    } catch {
      // No-op on unsupported devices / simulators
    }
  },

  /**
   * Triggers an error notification haptic (e.g. failed action).
   */
  async error(): Promise<void> {
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } catch {
      // No-op on unsupported devices / simulators
    }
  },

  /**
   * Triggers a light impact haptic (e.g. minor UI interaction).
   */
  async light(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      // No-op on unsupported devices / simulators
    }
  },

  /**
   * Triggers a medium impact haptic (e.g. standard button press).
   */
  async medium(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    } catch {
      // No-op on unsupported devices / simulators
    }
  },

  /**
   * Triggers a heavy impact haptic (e.g. destructive action, long-press).
   */
  async heavy(): Promise<void> {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    } catch {
      // No-op on unsupported devices / simulators
    }
  },
} as const;
