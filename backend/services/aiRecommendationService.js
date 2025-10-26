/**
 * AI-Powered Video Recommendation Service
 * Provides personalized video recommendations based on user behavior and preferences
 */
class AIRecommendationService {
  constructor() {
    // Recommendation strategies
    this.strategies = {
      content_based: this.contentBasedRecommendations.bind(this),
      collaborative: this.collaborativeFilteringRecommendations.bind(this),
      popularity_based: this.popularityBasedRecommendations.bind(this),
      temporal: this.temporalRecommendations.bind(this),
    };

    // Weights for different recommendation factors
    this.weights = {
      userInterests: 0.25,
      viewingHistory: 0.2,
      searchHistory: 0.15,
      engagement: 0.15,
      popularity: 0.1,
      recency: 0.1,
      diversity: 0.05,
    };
  }

  /**
   * Get personalized video recommendations for a user
   */
  async getPersonalizedRecommendations(user, allVideos, options = {}) {
    const {
      count = 20,
      excludeWatched = true,
      diversityFactor = 0.3,
      includePopular = true,
    } = options;

    try {
      // Filter out inappropriate videos
      let candidateVideos = allVideos.filter(
        (video) =>
          video.status === "approved" &&
          !video.isPrivate &&
          video.publishedAt <= new Date()
      );

      // Exclude previously watched videos if requested
      if (excludeWatched && user.viewingHistory) {
        const watchedIds = new Set(
          user.viewingHistory.map((v) => v.videoId.toString())
        );
        candidateVideos = candidateVideos.filter(
          (video) => !watchedIds.has(video._id.toString())
        );
      }

      // Get recommendations from different strategies
      const recommendations = await this.combineRecommendationStrategies(
        user,
        candidateVideos,
        count
      );

      // Apply diversity filter to avoid too many similar videos
      const diversifiedRecommendations = this.applyDiversityFilter(
        recommendations,
        diversityFactor
      );

      // Final scoring and ranking
      const finalRecommendations = this.finalRanking(
        diversifiedRecommendations,
        user,
        count
      );

      return finalRecommendations;
    } catch (error) {
      console.error("AI Recommendation error:", error);
      // Fallback to basic popularity-based recommendations
      return this.getFallbackRecommendations(allVideos, count);
    }
  }

  /**
   * Combine multiple recommendation strategies
   */
  async combineRecommendationStrategies(user, videos, count) {
    const strategyResults = {};

    // Run each strategy
    for (const [strategyName, strategyFunction] of Object.entries(
      this.strategies
    )) {
      try {
        strategyResults[strategyName] = await strategyFunction(
          user,
          videos,
          count * 2
        );
      } catch (error) {
        console.error(`Strategy ${strategyName} failed:`, error);
        strategyResults[strategyName] = [];
      }
    }

    // Combine results with weighted scoring
    const combinedScores = new Map();

    Object.entries(strategyResults).forEach(([strategy, recommendations]) => {
      recommendations.forEach((video, index) => {
        const videoId = video._id.toString();
        const strategyScore =
          (recommendations.length - index) / recommendations.length;

        if (!combinedScores.has(videoId)) {
          combinedScores.set(videoId, {
            video,
            totalScore: 0,
            strategyScores: {},
          });
        }

        const videoData = combinedScores.get(videoId);
        videoData.strategyScores[strategy] = strategyScore;
        videoData.totalScore +=
          strategyScore * this.getStrategyWeight(strategy);
      });
    });

    // Sort by combined score
    return Array.from(combinedScores.values())
      .sort((a, b) => b.totalScore - a.totalScore)
      .map((item) => ({ ...item.video, recommendationScore: item.totalScore }));
  }

  /**
   * Content-based recommendations based on user interests and viewing history
   */
  async contentBasedRecommendations(user, videos, count) {
    const userInterests = new Set(user.interests || []);
    const watchedCategories = new Map();

    // Analyze viewing history to understand preferences
    if (user.viewingHistory && user.viewingHistory.length > 0) {
      user.viewingHistory.forEach((history) => {
        const video = videos.find(
          (v) => v._id.toString() === history.videoId.toString()
        );
        if (video && video.category) {
          const category = video.category;
          const score = history.completed
            ? 1.0
            : history.watchTime / video.duration;
          watchedCategories.set(
            category,
            (watchedCategories.get(category) || 0) + score
          );
        }
      });
    }

    // Score videos based on content similarity
    const scoredVideos = videos.map((video) => {
      let score = 0;

      // Interest matching
      if (userInterests.has(video.category)) {
        score += 0.4;
      }

      // Viewing history category preferences
      if (watchedCategories.has(video.category)) {
        score += watchedCategories.get(video.category) * 0.3;
      }

      // Tag similarity (if user has search history)
      if (user.searchHistory && video.tags) {
        const searchTerms = user.searchHistory.map((s) =>
          s.query.toLowerCase()
        );
        const tagMatches = video.tags.filter((tag) =>
          searchTerms.some((term) => term.includes(tag.toLowerCase()))
        );
        score += (tagMatches.length / video.tags.length) * 0.2;
      }

      // Creator affinity (if user has liked videos from this creator)
      if (user.viewingHistory) {
        const creatorVideos = user.viewingHistory.filter((h) => {
          const historyVideo = videos.find(
            (v) => v._id.toString() === h.videoId.toString()
          );
          return (
            historyVideo &&
            historyVideo.creator.toString() === video.creator.toString()
          );
        });
        if (creatorVideos.length > 0) {
          const avgCompletion =
            creatorVideos.reduce((sum, h) => {
              const historyVideo = videos.find(
                (v) => v._id.toString() === h.videoId.toString()
              );
              return (
                sum + (h.completed ? 1 : h.watchTime / historyVideo.duration)
              );
            }, 0) / creatorVideos.length;
          score += avgCompletion * 0.1;
        }
      }

      return { ...video, contentScore: score };
    });

    return scoredVideos
      .filter((video) => video.contentScore > 0.1)
      .sort((a, b) => b.contentScore - a.contentScore)
      .slice(0, count);
  }

  /**
   * Collaborative filtering based on similar users
   */
  async collaborativeFilteringRecommendations(user, videos, count) {
    // This is a simplified collaborative filtering
    // In a real implementation, you'd analyze user similarity patterns

    const userInterests = new Set(user.interests || []);
    const userWatchedCategories = new Set();

    if (user.viewingHistory) {
      user.viewingHistory.forEach((history) => {
        const video = videos.find(
          (v) => v._id.toString() === history.videoId.toString()
        );
        if (video) userWatchedCategories.add(video.category);
      });
    }

    // Find videos that are popular among users with similar interests
    // (This is simplified - in reality you'd query other users with similar profiles)
    const collaborativeScores = videos.map((video) => {
      let score = 0;

      // Boost popular videos in user's interest categories
      if (userInterests.has(video.category)) {
        score += ((video.views || 0) / 10000) * 0.3;
        score += ((video.likes?.length || 0) / 100) * 0.2;
      }

      // Boost videos in categories the user has watched before
      if (userWatchedCategories.has(video.category)) {
        score += video.engagementRate * 0.3;
      }

      // Consider video recency for trending content
      if (video.publishedAt) {
        const daysSincePublished =
          (Date.now() - new Date(video.publishedAt)) / (1000 * 60 * 60 * 24);
        if (daysSincePublished < 7) {
          // Recent videos get a boost
          score += 0.2;
        }
      }

      return { ...video, collaborativeScore: score };
    });

    return collaborativeScores
      .filter((video) => video.collaborativeScore > 0.1)
      .sort((a, b) => b.collaborativeScore - a.collaborativeScore)
      .slice(0, count);
  }

  /**
   * Popularity-based recommendations
   */
  async popularityBasedRecommendations(user, videos, count) {
    const scoredVideos = videos.map((video) => {
      // Calculate popularity score based on multiple metrics
      const viewScore = Math.log10((video.views || 0) + 1) / 6; // Normalize to 0-1
      const likeScore =
        (video.likes?.length || 0) / Math.max(video.views || 1, 1);
      const engagementScore = video.engagementRate || 0;

      // Recent popularity boost
      let recencyBoost = 0;
      if (video.publishedAt) {
        const daysSincePublished =
          (Date.now() - new Date(video.publishedAt)) / (1000 * 60 * 60 * 24);
        recencyBoost = Math.max(0, (30 - daysSincePublished) / 30) * 0.2;
      }

      const popularityScore =
        viewScore * 0.4 +
        likeScore * 0.3 +
        engagementScore * 0.2 +
        recencyBoost;

      return { ...video, popularityScore };
    });

    return scoredVideos
      .sort((a, b) => b.popularityScore - a.popularityScore)
      .slice(0, count);
  }

  /**
   * Temporal recommendations based on time of day, day of week, etc.
   */
  async temporalRecommendations(user, videos, count) {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    const scoredVideos = videos.map((video) => {
      let temporalScore = 0;

      // Time-based content preferences
      if (hour >= 9 && hour <= 17) {
        // Working hours
        if (["technology", "business", "coding"].includes(video.category)) {
          temporalScore += 0.3;
        }
      } else if (hour >= 18 && hour <= 22) {
        // Evening
        if (["art", "music", "cooking", "health"].includes(video.category)) {
          temporalScore += 0.3;
        }
      }

      // Weekend vs weekday preferences
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        // Weekend
        if (["art", "music", "cooking", "sports"].includes(video.category)) {
          temporalScore += 0.2;
        }
      } else {
        // Weekday
        if (
          ["education", "science", "technology", "business"].includes(
            video.category
          )
        ) {
          temporalScore += 0.2;
        }
      }

      // Shorter videos for busy times
      if (hour >= 12 && hour <= 14) {
        // Lunch time
        if (video.duration <= 180) {
          // 3 minutes or less
          temporalScore += 0.2;
        }
      }

      return { ...video, temporalScore };
    });

    return scoredVideos
      .filter((video) => video.temporalScore > 0)
      .sort((a, b) => b.temporalScore - a.temporalScore)
      .slice(0, count);
  }

  /**
   * Apply diversity filter to recommendations
   */
  applyDiversityFilter(recommendations, diversityFactor) {
    if (diversityFactor === 0) return recommendations;

    const diversified = [];
    const categoryCounts = new Map();
    const creatorCounts = new Map();

    for (const video of recommendations) {
      const category = video.category;
      const creator = video.creator.toString();

      const categoryCount = categoryCounts.get(category) || 0;
      const creatorCount = creatorCounts.get(creator) || 0;

      // Apply diversity penalty
      const diversityPenalty = categoryCount * 0.1 + creatorCount * 0.05;
      const adjustedScore =
        (video.recommendationScore || video.contentScore || 0) -
        diversityPenalty * diversityFactor;

      if (adjustedScore > 0.1) {
        diversified.push({ ...video, adjustedScore });
        categoryCounts.set(category, categoryCount + 1);
        creatorCounts.set(creator, creatorCount + 1);
      }
    }

    return diversified.sort((a, b) => b.adjustedScore - a.adjustedScore);
  }

  /**
   * Final ranking with all factors considered
   */
  finalRanking(videos, user, count) {
    return videos
      .map((video) => {
        // Calculate final score based on all factors
        let finalScore = video.adjustedScore || video.recommendationScore || 0;

        // Boost based on user's preferred duration
        if (user.preferredDuration) {
          const durationDiff = Math.abs(
            video.duration - user.preferredDuration
          );
          const durationScore = Math.max(
            0,
            1 - durationDiff / user.preferredDuration
          );
          finalScore += durationScore * 0.1;
        }

        // Quality boost for well-produced content
        if (video.views > 1000 && video.engagementRate > 5) {
          finalScore += 0.1;
        }

        return { ...video, finalScore };
      })
      .sort((a, b) => b.finalScore - a.finalScore)
      .slice(0, count);
  }

  /**
   * Get strategy weight based on user profile completeness
   */
  getStrategyWeight(strategyName) {
    const baseWeights = {
      content_based: 0.35,
      collaborative: 0.25,
      popularity_based: 0.25,
      temporal: 0.15,
    };
    return baseWeights[strategyName] || 0;
  }

  /**
   * Fallback recommendations when AI fails
   */
  getFallbackRecommendations(videos, count) {
    return videos
      .filter((video) => video.status === "approved" && !video.isPrivate)
      .sort((a, b) => {
        // Sort by engagement and recency
        const aScore = (a.engagementRate || 0) + (a.views || 0) / 10000;
        const bScore = (b.engagementRate || 0) + (b.views || 0) / 10000;
        return bScore - aScore;
      })
      .slice(0, count);
  }

  /**
   * Learn from user interactions to improve future recommendations
   */
  async recordInteraction(userId, videoId, interactionType, metadata = {}) {
    const interaction = {
      userId,
      videoId,
      type: interactionType, // 'view', 'like', 'complete', 'skip', 'share'
      timestamp: new Date(),
      metadata, // Additional context like watch time, search query, etc.
    };

    // In a real implementation, you'd store this in a separate interactions collection
    // and use it to continuously improve recommendations
    console.log("Recorded interaction:", interaction);

    return interaction;
  }

  /**
   * Get explanation for why a video was recommended
   */
  getRecommendationExplanation(video, user) {
    const reasons = [];

    if (user.interests && user.interests.includes(video.category)) {
      reasons.push(`Matches your interest in ${video.category}`);
    }

    if (video.views > 10000) {
      reasons.push("Popular content");
    }

    if (video.engagementRate > 10) {
      reasons.push("Highly engaging");
    }

    const daysSincePublished =
      (Date.now() - new Date(video.publishedAt)) / (1000 * 60 * 60 * 24);
    if (daysSincePublished < 3) {
      reasons.push("Recently published");
    }

    return reasons.length > 0 ? reasons.join(", ") : "Recommended for you";
  }
}

module.exports = new AIRecommendationService();
