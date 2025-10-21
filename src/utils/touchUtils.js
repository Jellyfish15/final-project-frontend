/**
 * Utility functions for optimizing touch performance
 */

export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;

  return function (...args) {
    const currentTime = Date.now();

    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

export const debounce = (func, delay) => {
  let timeoutId;

  return function (...args) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => {
      func.apply(this, args);
    }, delay);
  };
};

// Touch gesture detection utilities
export const getTouchDistance = (touch1, touch2) => {
  const dx = touch1.clientX - touch2.clientX;
  const dy = touch1.clientY - touch2.clientY;
  return Math.sqrt(dx * dx + dy * dy);
};

export const getTouchAngle = (touch1, touch2) => {
  const dx = touch2.clientX - touch1.clientX;
  const dy = touch2.clientY - touch1.clientY;
  return Math.atan2(dy, dx) * (180 / Math.PI);
};

export const isVerticalSwipe = (startTouch, endTouch) => {
  const dx = Math.abs(endTouch.clientX - startTouch.clientX);
  const dy = Math.abs(endTouch.clientY - startTouch.clientY);
  return dy > dx && dy > 30; // Require more vertical than horizontal movement
};

export default {
  throttle,
  debounce,
  getTouchDistance,
  getTouchAngle,
  isVerticalSwipe,
};
