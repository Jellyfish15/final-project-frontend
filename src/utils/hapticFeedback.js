/**
 * Utility functions for providing haptic feedback on mobile devices
 */

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
