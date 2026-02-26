// API Configuration
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000";

// Performance tuning constants
export const VIDEO_PRELOAD_COUNT = 3;
export const MAX_CONCURRENT_REQUESTS = 6;
export const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
export const STALE_WHILE_REVALIDATE_MS = 30 * 1000;

// Feature flags
export const ENABLE_ADAPTIVE_QUALITY = true;
export const ENABLE_ANALYTICS = import.meta.env.PROD;
export const ENABLE_HAPTIC_FEEDBACK = true;
export const ENABLE_SWIPE_GESTURES = true;

// Export other config constants if needed
export const DEFAULT_TIMEOUT = 10000;
export const MAX_RETRIES = 3;

// Video quality presets
export const QUALITY_PRESETS = {
  "360p": { width: 640, height: 360, bitrate: 800000 },
  "480p": { width: 854, height: 480, bitrate: 1200000 },
  "720p": { width: 1280, height: 720, bitrate: 2500000 },
  "1080p": { width: 1920, height: 1080, bitrate: 5000000 },
  auto: null,
};
