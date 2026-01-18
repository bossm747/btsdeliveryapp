import { useCallback, useMemo } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Haptic Feedback Hook for BTS Delivery App
 *
 * Provides subtle vibration feedback for mobile devices to enhance user experience.
 * Automatically detects browser support and respects user preferences.
 *
 * Patterns:
 * - light: Very brief (10ms) for button taps
 * - medium: Standard (25ms) for confirmations
 * - heavy: Longer (50ms) for errors/warnings
 * - success: Two short pulses for success states
 * - error: One long pulse for error states
 * - selection: Ultra-brief (5ms) for selections
 */

// Types for haptic patterns
export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

// Vibration patterns in milliseconds
// For arrays: [vibrate, pause, vibrate, pause, ...]
const HAPTIC_PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [15, 50, 15], // Two short pulses
  error: [100], // One long pulse
  selection: 5,
};

// Store for haptic settings
interface HapticSettingsStore {
  enabled: boolean;
  setEnabled: (enabled: boolean) => void;
  toggleEnabled: () => void;
}

export const useHapticSettings = create<HapticSettingsStore>()(
  persist(
    (set) => ({
      // Default to enabled on mobile devices
      enabled: typeof window !== 'undefined' &&
               ('ontouchstart' in window || navigator.maxTouchPoints > 0),
      setEnabled: (enabled) => set({ enabled }),
      toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
    }),
    {
      name: 'bts-haptic-settings',
    }
  )
);

/**
 * Check if the Vibration API is supported
 */
export function isVibrationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return 'vibrate' in navigator;
}

/**
 * Check if the device is likely a mobile device
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;

  // Check for touch capability
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Check user agent for mobile indicators
  const userAgent = navigator.userAgent.toLowerCase();
  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);

  return hasTouch || isMobileUA;
}

/**
 * Core vibration function
 * Handles the actual vibration with safety checks
 */
function vibrate(pattern: number | number[]): boolean {
  if (!isVibrationSupported()) {
    return false;
  }

  try {
    return navigator.vibrate(pattern);
  } catch (error) {
    // Silently fail - vibration is not critical
    console.debug('Haptic feedback failed:', error);
    return false;
  }
}

/**
 * Standalone haptic utility object for use outside of React components
 * Use this for direct haptic feedback without hooks
 */
export const haptic = {
  /**
   * Very brief vibration (10ms) for button taps
   */
  light: (): boolean => {
    const settings = useHapticSettings.getState();
    if (!settings.enabled) return false;
    return vibrate(HAPTIC_PATTERNS.light);
  },

  /**
   * Standard vibration (25ms) for confirmations
   */
  medium: (): boolean => {
    const settings = useHapticSettings.getState();
    if (!settings.enabled) return false;
    return vibrate(HAPTIC_PATTERNS.medium);
  },

  /**
   * Longer vibration (50ms) for errors/warnings
   */
  heavy: (): boolean => {
    const settings = useHapticSettings.getState();
    if (!settings.enabled) return false;
    return vibrate(HAPTIC_PATTERNS.heavy);
  },

  /**
   * Two short pulses for success states
   */
  success: (): boolean => {
    const settings = useHapticSettings.getState();
    if (!settings.enabled) return false;
    return vibrate(HAPTIC_PATTERNS.success);
  },

  /**
   * One long pulse for error states
   */
  error: (): boolean => {
    const settings = useHapticSettings.getState();
    if (!settings.enabled) return false;
    return vibrate(HAPTIC_PATTERNS.error);
  },

  /**
   * Ultra-brief vibration (5ms) for selections
   */
  selection: (): boolean => {
    const settings = useHapticSettings.getState();
    if (!settings.enabled) return false;
    return vibrate(HAPTIC_PATTERNS.selection);
  },

  /**
   * Custom pattern vibration
   */
  custom: (pattern: number | number[]): boolean => {
    const settings = useHapticSettings.getState();
    if (!settings.enabled) return false;
    return vibrate(pattern);
  },

  /**
   * Stop any ongoing vibration
   */
  stop: (): boolean => {
    return vibrate(0);
  },

  /**
   * Check if haptic feedback is available
   */
  isSupported: isVibrationSupported,

  /**
   * Check if device is mobile
   */
  isMobile: isMobileDevice,
};

/**
 * React hook for haptic feedback
 * Provides memoized haptic functions that respect user settings
 */
export function useHaptic() {
  const { enabled, setEnabled, toggleEnabled } = useHapticSettings();

  const isSupported = useMemo(() => isVibrationSupported(), []);
  const isMobile = useMemo(() => isMobileDevice(), []);

  const triggerLight = useCallback(() => {
    if (!enabled) return false;
    return vibrate(HAPTIC_PATTERNS.light);
  }, [enabled]);

  const triggerMedium = useCallback(() => {
    if (!enabled) return false;
    return vibrate(HAPTIC_PATTERNS.medium);
  }, [enabled]);

  const triggerHeavy = useCallback(() => {
    if (!enabled) return false;
    return vibrate(HAPTIC_PATTERNS.heavy);
  }, [enabled]);

  const triggerSuccess = useCallback(() => {
    if (!enabled) return false;
    return vibrate(HAPTIC_PATTERNS.success);
  }, [enabled]);

  const triggerError = useCallback(() => {
    if (!enabled) return false;
    return vibrate(HAPTIC_PATTERNS.error);
  }, [enabled]);

  const triggerSelection = useCallback(() => {
    if (!enabled) return false;
    return vibrate(HAPTIC_PATTERNS.selection);
  }, [enabled]);

  const triggerCustom = useCallback((pattern: number | number[]) => {
    if (!enabled) return false;
    return vibrate(pattern);
  }, [enabled]);

  const stopVibration = useCallback(() => {
    return vibrate(0);
  }, []);

  return {
    // State
    enabled,
    isSupported,
    isMobile,

    // Settings
    setEnabled,
    toggleEnabled,

    // Haptic patterns
    light: triggerLight,
    medium: triggerMedium,
    heavy: triggerHeavy,
    success: triggerSuccess,
    error: triggerError,
    selection: triggerSelection,
    custom: triggerCustom,
    stop: stopVibration,
  };
}

export default useHaptic;
