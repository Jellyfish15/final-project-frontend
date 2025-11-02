const Engagement = require("../models/Engagement");
const Video = require("../models/Video");
const User = require("../models/User");

class RecommendationAlgorithm {
  // Calculate engagement score for a video based on user behavior
  static calculateEngagementScore(engagement) {
    let score = 0;
    
    // Completion rate (40 points max)
    score += engagement.completionRate * 0.4;
    
    // Interactions
    if (engagement.liked) score += 15;
    if (engagement.commented) score += 20;
    if (engagement.shared) score += 25;
    
    // Replay value
    score += Math.min(engagement.replays * 3, 10);
    
    // Penalties
    if (engagement.pauseCount > 3) score -= 5;
    if (engagement.seekCount > 5) score -= 10;
    if (engagement.skippedAt && engagement.skippedAt < engagement.totalDuration * 0.3) {
      score -= 15;
    }
    
    return Math.max(0, Math.min(100, score));
  }

  // Get user's category preferences with weights
  static async getUserPreferences(userId) {
    const engagements = await Engagement.find({ userId })
      .sort({ createdAt: -1 })
      .limit(50); // Last 50 videos

    if (engagements.length === 0) {
      // Default preferences for new users
      return {
        education: 0.3,
        science: 0.2,
        math: 0.15,
        coding: 0.15,
        other: 0.2,
      };
    }

    // Calculate category weights based on engagement
    const categoryScores = {};
    const categoryCounts = {};

    engagements.forEach((eng) => {
      if (!categoryScores[eng.category]) {
        categoryScores[eng.category] = 0;
        categoryCounts[eng.category] = 0;
      }
      categoryScores[eng.category] += eng.engagementScore;
      categoryCounts[eng.category]++;
    });

    // Normalize scores
    const preferences = {};
    let totalScore = 0;

    Object.keys(categoryScores).forEach((category) => {
      const avgScore = categoryScores[category] / categoryCounts[category];
      preferences[category] = avgScore;
      totalScore += avgScore;
    });

    // Convert to percentages
    Object.keys(preferences).forEach((category) => {
      preferences[category] = preferences[category] / totalScore;
    });

    return preferences;
  }

  // Detect if user is disengaging
  static async detectDisengagement(userId, sessionId) {
    const recentEngagements = await Engagement.find({
      userId,
      sessionId,
    })
      .sort({ createdAt: -1 })
      .limit(5);

    if (recentEngagements.length < 3) {
      return {
        isDisengaging: false,
        severity: 0,
        reason: null,
      };
    }

    const avgCompletionRate =
      recentEngagements.reduce((sum, e) => sum + e.completionRate, 0) /
      recentEngagements.length;
    const avgEngagement =
      recentEngagements.reduce((sum, e) => sum + e.engagementScore, 0) /
      recentEngagements.length;
    const recentSkips = recentEngagements.filter((e) => e.skippedAt !== null).length;
    const skipRate = recentSkips / recentEngagements.length;

    let severity = 0;
    let reason = null;

    // Calculate disengagement severity (0-100)
    if (avgCompletionRate < 20) {
      severity += 40;
      reason = "very-low-completion";
    } else if (avgCompletionRate < 40) {
      severity += 20;
      reason = "low-completion";
    }

    if (skipRate > 0.6) {
      severity += 30;
      reason = reason ? `${reason},excessive-skipping` : "excessive-skipping";
    }

    if (avgEngagement < 30) {
      severity += 20;
      reason = reason ? `${reason},low-engagement` : "low-engagement";
    }

    // Check for rapid scrolling pattern
    const avgTimeBetweenVideos =
      recentEngagements.length > 1
        ? (recentEngagements[0].createdAt - recentEngagements[recentEngagements.length - 1].createdAt) /
          (recentEngagements.length - 1) / 1000 // in seconds
        : 0;

    if (avgTimeBetweenVideos > 0 && avgTimeBetweenVideos < 10) {
      severity += 10;
      reason = reason ? `${reason},rapid-scrolling` : "rapid-scrolling";
    }

    return {
      isDisengaging: severity > 30,
      severity: Math.min(100, severity),
      reason,
      metrics: {
        avgCompletionRate,
        avgEngagement,
        skipRate,
        avgTimeBetweenVideos,
      },
    };
  }

  // Get recommended videos based on user behavior
  static async getRecommendedVideos(userId, sessionId, limit = 20) {
    const user = await User.findById(userId);
    if (!user) throw new Error("User not found");

    // Detect disengagement
    const disengagement = await this.detectDisengagement(userId, sessionId);

    // Get user preferences
    const preferences = await this.getUserPreferences(userId);

    // Get recently watched video IDs to avoid showing again
    const recentEngagements = await Engagement.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .select("videoId");
    const watchedVideoIds = recentEngagements.map((e) => e.videoId);

    let query = {
      _id: { $nin: watchedVideoIds },
      status: "approved",
    };

    let videos = [];

    if (disengagement.isDisengaging) {
      // User is losing interest - show more entertaining/easier content
      console.log(`User ${userId} is disengaging (severity: ${disengagement.severity})`);
      
      // Strategy: Mix of entertaining content and lighter educational material
      const entertainmentRatio = Math.min(disengagement.severity / 100, 0.7);
      const entertainmentCount = Math.floor(limit * entertainmentRatio);
      const educationalCount = limit - entertainmentCount;

      // Get popular, highly engaging videos (entertainment hook)
      const entertainingVideos = await Video.find({
        ...query,
        $or: [
          { category: { $in: ["art", "music", "sports", "cooking"] } },
          { views: { $gte: 1000 } }, // Popular videos
        ],
      })
        .sort({ views: -1, likes: -1 })
        .limit(entertainmentCount);

      // Get simpler educational content
      const simpleEducationalVideos = await Video.find({
        ...query,
        category: { $in: ["education", "science", "history"] },
        duration: { $lte: 180 }, // Shorter videos (3 min or less)
      })
        .sort({ likes: -1 })
        .limit(educationalCount);

      videos = [...entertainingVideos, ...simpleEducationalVideos];
    } else {
      // User is engaged - provide content based on preferences
      // Build category distribution based on preferences
      const categoryDistribution = [];
      Object.entries(preferences).forEach(([category, weight]) => {
        const count = Math.floor(limit * weight);
        if (count > 0) {
          categoryDistribution.push({ category, count });
        }
      });

      // Fetch videos for each category
      for (const { category, count } of categoryDistribution) {
        const categoryVideos = await Video.find({
          ...query,
          category,
        })
          .sort({ 
            createdAt: -1,
            likes: -1,
            views: -1,
          })
          .limit(count);

        videos.push(...categoryVideos);
      }

      // Fill remaining slots with trending content
      const remaining = limit - videos.length;
      if (remaining > 0) {
        const trendingVideos = await Video.find({
          ...query,
          _id: { $nin: [...watchedVideoIds, ...videos.map((v) => v._id)] },
        })
          .sort({ views: -1, likes: -1 })
          .limit(remaining);

        videos.push(...trendingVideos);
      }
    }

    // Shuffle videos to add variety
    videos = this.shuffleArray(videos);

    // Add engagement prediction score to each video
    videos = videos.map((video) => {
      const predictedEngagement = this.predictEngagement(
        video,
        preferences,
        disengagement
      );
      return {
        ...video.toObject(),
        predictedEngagement,
      };
    });

    // Sort by predicted engagement
    videos.sort((a, b) => b.predictedEngagement - a.predictedEngagement);

    return {
      videos: videos.slice(0, limit),
      disengagement,
      preferences,
    };
  }

  // Predict how engaging a video will be for the user
  static predictEngagement(video, preferences, disengagement) {
    let score = 50; // Base score

    // Category match bonus
    const categoryWeight = preferences[video.category] || 0.1;
    score += categoryWeight * 30;

    // Popularity factors
    score += Math.min((video.views / 1000) * 5, 10);
    score += Math.min((video.likes.length / 10) * 5, 10);

    // If disengaging, boost entertaining/shorter content
    if (disengagement.isDisengaging) {
      if (["art", "music", "sports", "cooking"].includes(video.category)) {
        score += 20;
      }
      if (video.duration < 180) {
        score += 15;
      }
    }

    return Math.min(100, score);
  }

  // Fisher-Yates shuffle algorithm
  static shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }

  // Track video engagement in real-time
  static async trackEngagement(engagementData) {
    const {
      userId,
      videoId,
      watchTime,
      totalDuration,
      liked,
      commented,
      shared,
      replays,
      pauseCount,
      seekCount,
      skippedAt,
      category,
      sessionId,
    } = engagementData;

    // Calculate completion rate
    const completionRate = (watchTime / totalDuration) * 100;

    // Find or create engagement record
    let engagement = await Engagement.findOne({ userId, videoId, sessionId });

    if (!engagement) {
      engagement = new Engagement({
        userId,
        videoId,
        category,
        sessionId,
      });
    }

    // Update engagement data
    engagement.watchTime = Math.max(engagement.watchTime, watchTime);
    engagement.totalDuration = totalDuration;
    engagement.completionRate = completionRate;
    engagement.liked = liked || engagement.liked;
    engagement.commented = commented || engagement.commented;
    engagement.shared = shared || engagement.shared;
    engagement.replays = replays || engagement.replays;
    engagement.pauseCount = pauseCount || engagement.pauseCount;
    engagement.seekCount = seekCount || engagement.seekCount;

    if (skippedAt !== undefined) {
      engagement.skippedAt = skippedAt;
    }

    if (completionRate >= 90) {
      engagement.completedAt = new Date();
    }

    await engagement.save();

    return engagement;
  }
}

module.exports = RecommendationAlgorithm;
