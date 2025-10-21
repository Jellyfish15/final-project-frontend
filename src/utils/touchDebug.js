/**
 * Touch debugging utilities for Safari troubleshooting
 */

export const logTouchEvent = (eventType, event) => {
  // Only log in development (using import.meta.env for Vite)
  if (import.meta.env.DEV) {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    if (touch) {
      console.log(`[Touch Debug] ${eventType}:`, {
        clientX: touch.clientX,
        clientY: touch.clientY,
        timestamp: Date.now(),
        touchCount: event.touches?.length || 0,
        userAgent: navigator.userAgent.includes("Safari") ? "Safari" : "Other",
      });
    }
  }
};

export const isSafari = () => {
  return /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
};

export const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
};

export const isTouchDevice = () => {
  return "ontouchstart" in window || navigator.maxTouchPoints > 0;
};

export default {
  logTouchEvent,
  isSafari,
  isIOS,
  isTouchDevice,
};
