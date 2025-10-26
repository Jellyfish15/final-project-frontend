import { API_BASE_URL } from "./config";

/**
 * User Interaction Tracking Service
 * Tracks user behavior to improve AI recommendations
 */
class UserInteractionService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api`;
    this.pendingInteractions = [];
    this.batchTimer = null;
    this.batchSize = 10;
    this.batchDelay = 5000; // 5 seconds
  }

  /**
   * Track video view interaction
   */
  async trackVideoView(videoId, metadata = {}) {
    const interaction = {
      type: "video_view",
      videoId,
      timestamp: new Date().toISOString(),
      metadata: {
        source: metadata.source || "direct", // 'search', 'recommendation', 'direct', 'profile'
        searchQuery: metadata.searchQuery || null,
        watchTime: metadata.watchTime || 0,
        completed: metadata.completed || false,
        ...metadata,
      },
    };

    this.queueInteraction(interaction);
  }

  /**
   * Track search interaction
   */
  async trackSearch(query, results, selectedVideo = null) {
    const interaction = {
      type: "search",
      timestamp: new Date().toISOString(),
      metadata: {
        query,
        resultCount: results.length,
        selectedVideoId: selectedVideo?.id || null,
        selectedPosition: selectedVideo
          ? results.findIndex((r) => r.id === selectedVideo.id)
          : -1,
        aiPowered: true,
      },
    };

    this.queueInteraction(interaction);
  }

  /**
   * Track video engagement (like, comment, share)
   */
  async trackVideoEngagement(videoId, action, metadata = {}) {
    const interaction = {
      type: "video_engagement",
      videoId,
      timestamp: new Date().toISOString(),
      metadata: {
        action, // 'like', 'unlike', 'comment', 'share'
        source: metadata.source || "video_player",
        ...metadata,
      },
    };

    this.queueInteraction(interaction);
  }

  /**
   * Track navigation patterns
   */
  async trackNavigation(from, to, metadata = {}) {
    const interaction = {
      type: "navigation",
      timestamp: new Date().toISOString(),
      metadata: {
        from,
        to,
        duration: metadata.duration || 0,
        ...metadata,
      },
    };

    this.queueInteraction(interaction);
  }

  /**
   * Track user preferences updates
   */
  async trackPreferenceUpdate(preferenceType, oldValue, newValue) {
    const interaction = {
      type: "preference_update",
      timestamp: new Date().toISOString(),
      metadata: {
        preferenceType,
        oldValue,
        newValue,
      },
    };

    this.queueInteraction(interaction);
  }

  /**
   * Track recommendation interactions
   */
  async trackRecommendation(videoId, position, source, action = "view") {
    const interaction = {
      type: "recommendation",
      videoId,
      timestamp: new Date().toISOString(),
      metadata: {
        position,
        source, // 'ai_feed', 'category_based', 'popularity_based'
        action, // 'view', 'skip', 'like', 'share'
      },
    };

    this.queueInteraction(interaction);
  }

  /**
   * Queue interaction for batch processing
   */
  queueInteraction(interaction) {
    const token = localStorage.getItem("token");
    if (!token) {
      return; // Don't track for anonymous users
    }

    this.pendingInteractions.push(interaction);

    // Send batch if we reach the batch size
    if (this.pendingInteractions.length >= this.batchSize) {
      this.sendBatch();
    } else {
      // Set timer for delayed batch send
      this.scheduleBatchSend();
    }
  }

  /**
   * Schedule batch send with debouncing
   */
  scheduleBatchSend() {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
    }

    this.batchTimer = setTimeout(() => {
      this.sendBatch();
    }, this.batchDelay);
  }

  /**
   * Send batch of interactions to server
   */
  async sendBatch() {
    if (this.pendingInteractions.length === 0) {
      return;
    }

    const batch = [...this.pendingInteractions];
    this.pendingInteractions = [];

    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return;
      }

      const response = await fetch(`${this.baseURL}/users/interactions/batch`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ interactions: batch }),
      });

      if (!response.ok) {
        console.warn("Failed to send interaction batch:", response.status);
        // Could implement retry logic here
      }
    } catch (error) {
      console.error("Error sending interaction batch:", error);
      // Could implement retry queue here
    }
  }

  /**
   * Track video watch time in real-time
   */
  createVideoWatchTracker(videoId, videoDuration, source = "direct") {
    let startTime = Date.now();
    let watchTime = 0;
    let intervals = [];
    let isActive = true;

    const tracker = {
      start() {
        startTime = Date.now();
        isActive = true;
      },

      pause() {
        if (isActive) {
          watchTime += Date.now() - startTime;
          isActive = false;
        }
      },

      resume() {
        if (!isActive) {
          startTime = Date.now();
          isActive = true;
        }
      },

      seek(currentTime) {
        intervals.push({
          start: Math.max(0, watchTime / 1000),
          end: currentTime,
          timestamp: new Date().toISOString(),
        });
      },

      complete() {
        this.pause();
        const totalWatchTime = watchTime / 1000; // Convert to seconds
        const completionRate = totalWatchTime / videoDuration;

        this.trackVideoView(videoId, {
          source,
          watchTime: totalWatchTime,
          completed: completionRate >= 0.9, // Consider 90%+ as completed
          completionRate,
          intervals,
          videoDuration,
        });
      },

      destroy() {
        this.pause();
        // Send any remaining watch time
        if (watchTime > 1000) {
          // Only if watched for more than 1 second
          this.complete();
        }
      },
    };

    return tracker;
  }

  /**
   * Get user's interaction analytics (for user dashboard)
   */
  async getUserAnalytics() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return null;
      }

      const response = await fetch(`${this.baseURL}/users/analytics`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Analytics failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      return null;
    }
  }

  /**
   * Update user preferences based on behavior
   */
  async updateUserPreferences(preferences) {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return false;
      }

      const response = await fetch(`${this.baseURL}/users/preferences`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(preferences),
      });

      if (!response.ok) {
        throw new Error(`Preferences update failed: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error("Error updating preferences:", error);
      return false;
    }
  }

  /**
   * Get personalized recommendations
   */
  async getPersonalizedRecommendations(count = 20) {
    try {
      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${this.baseURL}/videos/recommendations?count=${count}`,
        {
          method: "GET",
          headers,
        }
      );

      if (!response.ok) {
        throw new Error(`Recommendations failed: ${response.status}`);
      }

      const data = await response.json();
      return data.recommendations || [];
    } catch (error) {
      console.error("Error fetching recommendations:", error);
      return [];
    }
  }

  /**
   * Force send any pending interactions (useful on page unload)
   */
  async flushPendingInteractions() {
    if (this.pendingInteractions.length > 0) {
      await this.sendBatch();
    }
  }

  /**
   * Initialize tracking for the session
   */
  initializeSession() {
    // Track page load
    this.queueInteraction({
      type: "session_start",
      timestamp: new Date().toISOString(),
      metadata: {
        userAgent: navigator.userAgent,
        viewport: {
          width: window.innerWidth,
          height: window.innerHeight,
        },
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
    });

    // Track page unload to send pending interactions
    window.addEventListener("beforeunload", () => {
      this.flushPendingInteractions();
    });

    // Track visibility changes (user switches tabs)
    document.addEventListener("visibilitychange", () => {
      this.queueInteraction({
        type: "visibility_change",
        timestamp: new Date().toISOString(),
        metadata: {
          hidden: document.hidden,
        },
      });
    });
  }
}

export default new UserInteractionService();
