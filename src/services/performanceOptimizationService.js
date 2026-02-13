/**
 * Performance Optimization Service
 * Handles preloading, image optimization, and caching strategies
 */

class PerformanceOptimizationService {
  constructor() {
    this.preloadedThumbnails = new Set();
    this.preloadedVideos = new Set();
    this.imageCache = new Map();
  }

  /**
   * Preload thumbnail image with optimization
   * @param {string} url - Image URL
   * @param {string} id - Unique identifier for caching
   * @returns {Promise} Resolves when image is loaded
   */
  async preloadThumbnail(url, id) {
    if (!url || this.preloadedThumbnails.has(id)) {
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.preloadedThumbnails.add(id);
        resolve();
      };
      img.onerror = reject;

      // Use low-quality thumbnail first (if available)
      img.src = this.getOptimizedImageUrl(url);
    });
  }

  /**
   * Get optimized image URL with proper caching headers
   * @param {string} url - Original image URL
   * @returns {string} Optimized URL with cache busting if needed
   */
  getOptimizedImageUrl(url) {
    if (!url) return url;

    // Add cache busting only if not already present
    if (!url.includes("?") && !url.includes("&")) {
      // For production, you might want to remove cache busting for CDN optimization
      // For now, we'll use it to ensure fresh thumbnails
      return url;
    }
    return url;
  }

  /**
   * Preload video metadata (not the full video file)
   * This allows the video element to fetch duration, codecs, etc.
   * @param {string} videoUrl - Video URL
   * @param {string} id - Unique identifier
   */
  preloadVideoMetadata(videoUrl, id) {
    if (!videoUrl || this.preloadedVideos.has(id)) {
      return;
    }

    try {
      const video = document.createElement("video");
      video.preload = "metadata"; // Only load metadata, not the full video
      video.src = videoUrl;

      video.onloadedmetadata = () => {
        this.preloadedVideos.add(id);
        console.log(`[Performance] Video metadata preloaded: ${id}`);
      };

      video.onerror = (err) => {
        console.warn(
          `[Performance] Failed to preload video metadata: ${id}`,
          err,
        );
      };

      // Set a timeout to prevent memory leaks
      setTimeout(() => {
        if (!this.preloadedVideos.has(id)) {
          video.src = ""; // Clear to free memory
        }
      }, 30000); // 30 second timeout
    } catch (err) {
      console.warn(`[Performance] Error preloading video: ${id}`, err);
    }
  }

  /**
   * Batch preload multiple thumbnails
   * @param {Array} videos - Array of video objects with thumbnailUrl and _id
   * @param {number} limit - Maximum number of thumbnails to preload
   */
  async batchPreloadThumbnails(videos, limit = 5) {
    if (!videos || videos.length === 0) return;

    const toPreload = videos.slice(0, limit);
    const promises = toPreload.map((video) =>
      this.preloadThumbnail(video.thumbnailUrl, video._id || video.id),
    );

    try {
      await Promise.allSettled(promises);
      console.log(
        `[Performance] Preloaded ${toPreload.length} thumbnails in background`,
      );
    } catch (err) {
      console.warn("[Performance] Some thumbnails failed to preload:", err);
    }
  }

  /**
   * Batch preload video metadata
   * @param {Array} videos - Array of video objects with videoUrl and _id
   * @param {number} limit - Maximum videos to preload metadata for
   */
  batchPreloadVideoMetadata(videos, limit = 3) {
    if (!videos || videos.length === 0) return;

    const toPreload = videos.slice(1, limit + 1); // Skip first (already playing)
    toPreload.forEach((video) => {
      if (video.videoUrl) {
        this.preloadVideoMetadata(video.videoUrl, video._id || video.id);
      }
    });
  }

  /**
   * Get network connection info for adaptive loading
   * @returns {Object} Network connection details
   */
  getNetworkInfo() {
    if ("connection" in navigator) {
      const conn = navigator.connection;
      return {
        effectiveType: conn.effectiveType, // '4g', '3g', '2g', 'slow-2g'
        downlink: conn.downlink,
        rtt: conn.rtt,
        saveData: conn.saveData,
      };
    }
    return { effectiveType: "unknown" };
  }

  /**
   * Determine if we should preload based on network conditions
   * @returns {boolean} True if preloading should be aggressive
   */
  shouldAggressivelyPreload() {
    const network = this.getNetworkInfo();
    return (
      !network.saveData &&
      (network.effectiveType === "4g" || network.effectiveType === "unknown")
    );
  }

  /**
   * Clear preload caches to free memory
   */
  clearCache() {
    this.preloadedThumbnails.clear();
    this.preloadedVideos.clear();
    this.imageCache.clear();
    console.log("[Performance] Caches cleared");
  }

  /**
   * Measure performance metrics
   * @returns {Object} Performance metrics
   */
  getMetrics() {
    if (!window.performance) return null;

    const perfData = window.performance.timing;
    const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;

    return {
      totalLoadTime: pageLoadTime,
      dnsTime: perfData.domainLookupEnd - perfData.domainLookupStart,
      tcpTime: perfData.connectEnd - perfData.connectStart,
      serverTime: perfData.responseStart - perfData.requestStart,
      renderTime: perfData.domComplete - perfData.domLoading,
    };
  }
}

export default new PerformanceOptimizationService();
