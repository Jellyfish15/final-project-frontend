const YouTubeVideo = require("../models/YouTubeVideo");
const { getDiverseEducationalFeed } = require("../utils/youtubeApi");

class YouTubeCacheService {
  /**
   * Get cached YouTube videos
   * @param {number} limit - Number of videos to return
   * @param {string} subject - Optional subject filter
   * @returns {Array} Cached videos in app format
   */
  async getCachedVideos(limit = 20, subject = null) {
    try {
      const query = { isActive: true };
      if (subject) {
        query.subject = subject;
      }

      const cachedVideos = await YouTubeVideo.find(query)
        .sort({ cachedAt: -1 }) // Most recently cached first
        .limit(limit)
        .lean();

      // Convert to app format
      return cachedVideos.map((video) => this.formatCachedVideoForApp(video));
    } catch (error) {
      console.error("Error fetching cached videos:", error);
      return [];
    }
  }

  /**
   * Get diverse cached videos (one per subject)
   * @param {number} count - Number of videos to return
   * @returns {Array} Diverse cached videos
   */
  async getDiverseCachedVideos(count = 10) {
    try {
      // Get all active videos grouped by subject
      const videos = await YouTubeVideo.find({ isActive: true })
        .sort({ cachedAt: -1 })
        .lean();

      if (videos.length === 0) {
        return [];
      }

      // Group by subject and pick one random video per subject
      const videosBySubject = {};
      videos.forEach((video) => {
        if (!videosBySubject[video.subject]) {
          videosBySubject[video.subject] = [];
        }
        videosBySubject[video.subject].push(video);
      });

      // Select one random video from each subject
      const diverseVideos = [];
      const subjects = Object.keys(videosBySubject);

      // Shuffle subjects to add randomness
      const shuffledSubjects = subjects.sort(() => Math.random() - 0.5);

      for (const subject of shuffledSubjects) {
        if (diverseVideos.length >= count) break;

        const subjectVideos = videosBySubject[subject];
        const randomVideo =
          subjectVideos[Math.floor(Math.random() * subjectVideos.length)];
        diverseVideos.push(randomVideo);
      }

      // If we don't have enough diverse videos, fill with random ones
      if (diverseVideos.length < count && videos.length > 0) {
        const remaining = count - diverseVideos.length;
        const usedIds = new Set(diverseVideos.map((v) => v.videoId));
        const availableVideos = videos.filter((v) => !usedIds.has(v.videoId));

        for (let i = 0; i < remaining && i < availableVideos.length; i++) {
          const randomIndex = Math.floor(
            Math.random() * availableVideos.length
          );
          diverseVideos.push(availableVideos[randomIndex]);
          availableVideos.splice(randomIndex, 1);
        }
      }

      return diverseVideos.map((video) => this.formatCachedVideoForApp(video));
    } catch (error) {
      console.error("Error fetching diverse cached videos:", error);
      return [];
    }
  }

  /**
   * Cache new YouTube videos from API
   * @param {number} count - Number of videos to cache
   * @returns {Object} Result with success status and cached count
   */
  async cacheNewVideos(count = 28) {
    try {
      console.log(`Fetching ${count} new YouTube videos to cache...`);

      // Fetch diverse educational videos from YouTube API
      const youtubeVideos = await getDiverseEducationalFeed(count);

      if (!youtubeVideos || youtubeVideos.length === 0) {
        console.log("No videos returned from YouTube API");
        return { success: false, cachedCount: 0, error: "No videos fetched" };
      }

      console.log(`Received ${youtubeVideos.length} videos from YouTube API`);

      let cachedCount = 0;
      const errors = [];

      for (const ytVideo of youtubeVideos) {
        try {
          // Check if video already exists
          const exists = await YouTubeVideo.findOne({
            videoId: ytVideo.id,
          });

          if (exists) {
            console.log(`Video already cached: ${ytVideo.id}`);
            continue;
          }

          // Extract subject from snippet data (you'll need to determine this based on your data)
          const subject = this.extractSubject(ytVideo);

          // Create new cached video
          const cachedVideo = new YouTubeVideo({
            videoId: ytVideo.id,
            title: ytVideo.snippet.title,
            description: ytVideo.snippet.description || "",
            thumbnailUrl:
              ytVideo.snippet.thumbnails?.medium?.url ||
              ytVideo.snippet.thumbnails?.default?.url,
            channelTitle: ytVideo.snippet.channelTitle,
            subject: subject,
            duration: this.parseDuration(
              ytVideo.contentDetails?.duration || "PT0S"
            ),
            viewCount: parseInt(ytVideo.statistics?.viewCount || 0),
            publishedAt: new Date(ytVideo.snippet.publishedAt),
            videoUrl: `https://www.youtube.com/embed/${ytVideo.id}`,
            isActive: true,
          });

          await cachedVideo.save();
          cachedCount++;
          console.log(`Cached video: ${ytVideo.snippet.title}`);
        } catch (error) {
          console.error(`Error caching video ${ytVideo.id}:`, error.message);
          errors.push({ videoId: ytVideo.id, error: error.message });
        }
      }

      console.log(`Successfully cached ${cachedCount} new videos`);

      return {
        success: true,
        cachedCount,
        totalFetched: youtubeVideos.length,
        errors: errors.length > 0 ? errors : undefined,
      };
    } catch (error) {
      console.error("Error in cacheNewVideos:", error);
      return {
        success: false,
        cachedCount: 0,
        error: error.message,
      };
    }
  }

  /**
   * Check if a specific video is cached
   * @param {string} videoId - YouTube video ID
   * @returns {boolean} Whether video exists in cache
   */
  async videoExists(videoId) {
    try {
      const video = await YouTubeVideo.findOne({ videoId, isActive: true });
      return !!video;
    } catch (error) {
      console.error("Error checking video existence:", error);
      return false;
    }
  }

  /**
   * Remove old cached videos (older than X days)
   * @param {number} daysOld - Remove videos older than this many days
   * @returns {number} Number of videos removed
   */
  async removeOldVideos(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await YouTubeVideo.updateMany(
        { cachedAt: { $lt: cutoffDate }, isActive: true },
        { $set: { isActive: false } }
      );

      console.log(
        `Deactivated ${result.modifiedCount} videos older than ${daysOld} days`
      );
      return result.modifiedCount;
    } catch (error) {
      console.error("Error removing old videos:", error);
      return 0;
    }
  }

  /**
   * Get cache statistics
   * @returns {Object} Statistics about cached videos
   */
  async getCacheStats() {
    try {
      const totalActive = await YouTubeVideo.countDocuments({
        isActive: true,
      });
      const totalInactive = await YouTubeVideo.countDocuments({
        isActive: false,
      });

      // Get count by subject
      const bySubject = await YouTubeVideo.aggregate([
        { $match: { isActive: true } },
        { $group: { _id: "$subject", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]);

      // Get most recent cache time
      const mostRecent = await YouTubeVideo.findOne({ isActive: true })
        .sort({ cachedAt: -1 })
        .select("cachedAt");

      return {
        totalActive,
        totalInactive,
        total: totalActive + totalInactive,
        bySubject: bySubject.map((s) => ({ subject: s._id, count: s.count })),
        lastCached: mostRecent?.cachedAt || null,
      };
    } catch (error) {
      console.error("Error getting cache stats:", error);
      return null;
    }
  }

  /**
   * Format cached video for app consumption
   * @param {Object} cachedVideo - MongoDB document
   * @returns {Object} Formatted video object
   */
  formatCachedVideoForApp(cachedVideo) {
    return {
      id: cachedVideo.videoId,
      title: cachedVideo.title,
      creator: {
        username: cachedVideo.channelTitle,
        displayName: cachedVideo.channelTitle,
        isVerified: true,
      },
      avatar: `https://via.placeholder.com/40x40?text=YT`,
      videoUrl: cachedVideo.videoUrl,
      videoType: "youtube",
      likes: "0",
      comments: "0",
      shares: "0",
      description: cachedVideo.description,
      isVerified: true,
      duration: cachedVideo.duration,
      thumbnailUrl: cachedVideo.thumbnailUrl,
      thumbnail: cachedVideo.thumbnailUrl,
      publishedAt: cachedVideo.publishedAt,
      viewCount: cachedVideo.viewCount,
      views: cachedVideo.viewCount.toString(),
      subject: cachedVideo.subject,
      cached: true, // Flag to indicate this came from cache
    };
  }

  /**
   * Parse YouTube duration format to seconds
   * @param {string} duration - ISO 8601 duration (e.g., "PT4M13S")
   * @returns {number} Duration in seconds
   */
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1]) || 0;
    const minutes = parseInt(match[2]) || 0;
    const seconds = parseInt(match[3]) || 0;

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Extract subject from YouTube video data
   * This is a simple implementation - you might want to make it more sophisticated
   * @param {Object} ytVideo - YouTube video object
   * @returns {string} Subject category
   */
  extractSubject(ytVideo) {
    const title = ytVideo.snippet.title.toLowerCase();
    const description = ytVideo.snippet.description?.toLowerCase() || "";
    const combined = `${title} ${description}`;

    // Map of keywords to subjects (based on your educational queries)
    const subjectMap = {
      mathematics: [
        "math",
        "algebra",
        "calculus",
        "geometry",
        "trigonometry",
        "statistics",
      ],
      physics: ["physics", "mechanics", "quantum"],
      chemistry: ["chemistry", "organic", "chemical"],
      biology: ["biology", "cell", "anatomy", "genetics"],
      history: ["history", "ancient", "civilization"],
      literature: ["literature", "poetry", "novel", "shakespeare"],
      geography: ["geography", "earth", "climate", "continent"],
      "computer science": [
        "programming",
        "computer science",
        "coding",
        "algorithm",
        "javascript",
        "python",
      ],
      economics: ["economics", "economy", "market", "finance"],
      philosophy: ["philosophy", "logic", "ethics"],
      psychology: ["psychology", "behavior", "mind"],
      sociology: ["sociology", "society", "social"],
      "political science": ["political", "politics", "government"],
      engineering: ["engineering", "mechanical", "electrical"],
      astronomy: ["astronomy", "space", "planet", "star"],
      language: [
        "language",
        "grammar",
        "foreign language",
        "spanish",
        "french",
      ],
    };

    // Check which subject matches the most keywords
    for (const [subject, keywords] of Object.entries(subjectMap)) {
      for (const keyword of keywords) {
        if (combined.includes(keyword)) {
          return subject;
        }
      }
    }

    return "general education"; // Default fallback
  }
}

module.exports = new YouTubeCacheService();
