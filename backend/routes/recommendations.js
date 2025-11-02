const express = require("express");
const { auth } = require("../middleware/auth");
const RecommendationAlgorithm = require("../services/RecommendationAlgorithm");
const Engagement = require("../models/Engagement");
const { v4: uuidv4 } = require("uuid");

const router = express.Router();

// @route   GET /api/recommendations/feed
// @desc    Get personalized video recommendations
// @access  Private
router.get("/feed", auth, async (req, res) => {
  try {
    const { limit = 20, sessionId } = req.query;
    const userId = req.user.userId;

    // Generate session ID if not provided
    const currentSessionId = sessionId || uuidv4();

    const recommendations = await RecommendationAlgorithm.getRecommendedVideos(
      userId,
      currentSessionId,
      parseInt(limit)
    );

    res.json({
      success: true,
      sessionId: currentSessionId,
      ...recommendations,
    });
  } catch (error) {
    console.error("Get recommendations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get recommendations",
    });
  }
});

// @route   POST /api/recommendations/track
// @desc    Track video engagement in real-time
// @access  Private
router.post("/track", auth, async (req, res) => {
  try {
    const {
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
    } = req.body;

    const userId = req.user.userId;

    const engagement = await RecommendationAlgorithm.trackEngagement({
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
    });

    res.json({
      success: true,
      engagement: {
        engagementScore: engagement.engagementScore,
        completionRate: engagement.completionRate,
      },
    });
  } catch (error) {
    console.error("Track engagement error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to track engagement",
    });
  }
});

// @route   GET /api/recommendations/preferences
// @desc    Get user's content preferences
// @access  Private
router.get("/preferences", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const preferences = await RecommendationAlgorithm.getUserPreferences(userId);
    const categoryStats = await Engagement.getCategoryPreferences(userId);

    res.json({
      success: true,
      preferences,
      categoryStats,
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get preferences",
    });
  }
});

// @route   GET /api/recommendations/disengagement-check
// @desc    Check if user is showing signs of disengagement
// @access  Private
router.get("/disengagement-check", auth, async (req, res) => {
  try {
    const { sessionId } = req.query;
    const userId = req.user.userId;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID required",
      });
    }

    const disengagement = await RecommendationAlgorithm.detectDisengagement(
      userId,
      sessionId
    );

    res.json({
      success: true,
      ...disengagement,
    });
  } catch (error) {
    console.error("Disengagement check error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check disengagement",
    });
  }
});

// @route   GET /api/recommendations/stats
// @desc    Get user's engagement statistics
// @access  Private
router.get("/stats", auth, async (req, res) => {
  try {
    const userId = req.user.userId;

    const engagements = await Engagement.find({ userId })
      .sort({ createdAt: -1 })
      .limit(100);

    const stats = {
      totalVideosWatched: engagements.length,
      avgCompletionRate:
        engagements.reduce((sum, e) => sum + e.completionRate, 0) /
        engagements.length,
      avgEngagementScore:
        engagements.reduce((sum, e) => sum + e.engagementScore, 0) /
        engagements.length,
      totalWatchTime: engagements.reduce((sum, e) => sum + e.watchTime, 0),
      interactions: {
        likes: engagements.filter((e) => e.liked).length,
        comments: engagements.filter((e) => e.commented).length,
        shares: engagements.filter((e) => e.shared).length,
      },
    };

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to get stats",
    });
  }
});

module.exports = router;
