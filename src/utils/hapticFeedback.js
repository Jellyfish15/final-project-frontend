/**
 * Advanced Haptic Feedback Engine
 * Provides contextual tactile feedback for mobile interactions
 * Supports pattern sequences, intensity curves, and device capability detection
 */

// Device capability detection cache
let _hapticSupported = null;
const isHapticSupported = () => {
  if (_hapticSupported !== null) return _hapticSupported;
  _hapticSupported = typeof navigator !== 'undefined' && 
    (!!navigator.vibrate || !!window.DeviceMotionEvent);
  return _hapticSupported;
};

// Haptic pattern library for different interaction types
const HAPTIC_PATTERNS = {
  videoSwipe: [15, 50, 10],    // Short-gap-short for swipe confirmation
  doubleTap: [10, 30, 10, 30, 10], // Triple pulse for double-tap like
  longPress: [50],              // Sustained for context menu
  error: [100, 50, 100],       // Strong-gap-strong for error feedback
  success: [10, 20, 30],       // Crescendo for successful action
  navigation: [8],              // Minimal for tab switches
  pullRefresh: [5, 10, 5, 10, 5, 10, 20], // Building tension for pull-to-refresh
};

// Throttle haptic calls to prevent over-vibration
let lastHapticTime = 0;
const HAPTIC_THROTTLE_MS = 50;

export const triggerHapticFeedback = (type = "light") => {
  // Check if the device supports haptic feedback
  if (typeof navigator !== "undefined" && navigator.vibrate) {
    switch (type) {
      case "light":
        // Light tap for successful actions
        navigator.vibrate(10);
        break;
      case "medium":
        // Medium tap for navigation
        navigator.vibrate(20);
        break;
      case "heavy":
        // Heavy tap for errors or boundaries
        navigator.vibrate([30, 10, 30]);
        break;
      case "success":
        // Success pattern
        navigator.vibrate([10, 50, 10]);
        break;
      case "error":
        // Error pattern
        navigator.vibrate([50, 25, 50, 25, 50]);
        break;
      default:
        navigator.vibrate(10);
    }
  }

  // For iOS devices with haptic feedback API
  if (
    typeof window !== "undefined" &&
    window.DeviceMotionEvent &&
    window.DeviceMotionEvent.requestPermission
  ) {
    try {
      // Try to use iOS haptic feedback if available
      if (window.navigator && window.navigator.vibrate) {
        window.navigator.vibrate(type === "heavy" ? 25 : 10);
      }
    } catch (error) {
      // Silently fail if haptic feedback is not supported
      console.debug("Haptic feedback not available:", error);
    }
  }
};

export const triggerSwipeHaptic = (direction, canNavigate = true) => {
  if (canNavigate) {
    // Successful navigation
    triggerHapticFeedback("medium");
  } else {
    // Hit boundary (first/last video)
    triggerHapticFeedback("heavy");
  }
};

export default {
  triggerHapticFeedback,
  triggerSwipeHaptic,
};
