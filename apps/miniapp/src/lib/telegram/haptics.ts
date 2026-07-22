import { getWebApp, type HapticImpactStyle, type HapticNotificationType } from "./types";

/**
 * Haptic feedback helpers — every meaningful touch in 7MZ Store answers with
 * a physical response inside Telegram. All calls are safe no-ops outside
 * Telegram or on platforms without haptics support.
 */
export const haptics = {
  /** Light tick for taps on cards, list rows, toggles. */
  tap(style: HapticImpactStyle = "light"): void {
    try {
      getWebApp()?.HapticFeedback?.impactOccurred(style);
    } catch {
      /* noop */
    }
  },

  /** Medium thunk for primary actions: add to cart, pay, claim. */
  press(): void {
    try {
      getWebApp()?.HapticFeedback?.impactOccurred("medium");
    } catch {
      /* noop */
    }
  },

  /** Success / warning / error notification pulses. */
  notify(type: HapticNotificationType): void {
    try {
      getWebApp()?.HapticFeedback?.notificationOccurred(type);
    } catch {
      /* noop */
    }
  },

  /** Subtle tick when a selection changes (tabs, segmented controls, wheels). */
  select(): void {
    try {
      getWebApp()?.HapticFeedback?.selectionChanged();
    } catch {
      /* noop */
    }
  },
};
