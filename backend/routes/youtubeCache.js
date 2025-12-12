const express = require("express");
const youtubeCacheService = require("../services/youtubeCacheService");

const router = express.Router();

// @route   GET /api/youtube-cache/videos
// @desc    Get cached YouTube videos
// @access  Public
router.get("/videos", async (req, res) => {
  try {
    const { limit = 20, subject } = req.query;

    const videos = await youtubeCacheService.getCachedVideos(
      parseInt(limit),
      subject
    );

    res.json({
      success: true,
      videos,
      count: videos.length,
      cached: true,
    });
  } catch (error) {
    console.error("Error fetching cached videos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cached videos",
      error: error.message,
    });
  }
});

// @route   GET /api/youtube-cache/random
// @desc    Get random cached YouTube videos
// @access  Public
router.get("/random", async (req, res) => {
  try {
    const { limit = 50 } = req.query;

    const videos = await youtubeCacheService.getRandomCachedVideos(
      parseInt(limit)
    );

    res.json({
      success: true,
      videos,
      count: videos.length,
      cached: true,
    });
  } catch (error) {
    console.error("Error fetching random cached videos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch random cached videos",
      error: error.message,
    });
  }
});

// @route   GET /api/youtube-cache/diverse
// @desc    Get diverse cached YouTube videos (one per subject)
// @access  Public
router.get("/diverse", async (req, res) => {
  try {
    const { count = 1000 } = req.query;

    const videos = await youtubeCacheService.getDiverseCachedVideos(
      parseInt(count)
    );

    res.json({
      success: true,
      videos,
      count: videos.length,
      cached: true,
    });
  } catch (error) {
    console.error("Error fetching diverse cached videos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch diverse cached videos",
      error: error.message,
    });
  }
});

// @route   GET /api/youtube-cache/feed
// @desc    Get videos with opportunistic caching (tries to cache new videos first)
// @access  Public
router.get("/feed", async (req, res) => {
  try {
    const { count = 28 } = req.query;

    const result = await youtubeCacheService.getVideosWithOpportunisticCaching(
      parseInt(count)
    );

    res.json(result);
  } catch (error) {
    console.error("Error fetching feed with opportunistic caching:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch feed",
      error: error.message,
    });
  }
});

// @route   POST /api/youtube-cache/refresh
// @desc    Manually trigger caching of new YouTube videos
// @access  Public (you might want to add auth here in production)
router.post("/refresh", async (req, res) => {
  try {
    const { count = 28 } = req.body;

    console.log(`Manual cache refresh triggered for ${count} videos`);

    const result = await youtubeCacheService.cacheNewVideos(parseInt(count));

    res.json({
      success: result.success,
      message: result.success
        ? `Successfully cached ${result.cachedCount} new videos`
        : "Failed to cache videos",
      ...result,
    });
  } catch (error) {
    console.error("Error refreshing cache:", error);
    res.status(500).json({
      success: false,
      message: "Failed to refresh cache",
      error: error.message,
    });
  }
});

// @route   GET /api/youtube-cache/stats
// @desc    Get cache statistics
// @access  Public
router.get("/stats", async (req, res) => {
  try {
    const stats = await youtubeCacheService.getCacheStats();

    res.json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Error fetching cache stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch cache stats",
      error: error.message,
    });
  }
});

// @route   DELETE /api/youtube-cache/old
// @desc    Remove old cached videos
// @access  Public (you might want to add auth here in production)
router.delete("/old", async (req, res) => {
  try {
    const { days = 30 } = req.query;

    const removedCount = await youtubeCacheService.removeOldVideos(
      parseInt(days)
    );

    res.json({
      success: true,
      message: `Removed ${removedCount} old videos`,
      removedCount,
    });
  } catch (error) {
    console.error("Error removing old videos:", error);
    res.status(500).json({
      success: false,
      message: "Failed to remove old videos",
      error: error.message,
    });
  }
});

// @route   GET /api/youtube-cache/check/:videoId
// @desc    Check if a video is cached
// @access  Public
router.get("/check/:videoId", async (req, res) => {
  try {
    const { videoId } = req.params;

    const exists = await youtubeCacheService.videoExists(videoId);

    res.json({
      success: true,
      videoId,
      exists,
    });
  } catch (error) {
    console.error("Error checking video:", error);
    res.status(500).json({
      success: false,
      message: "Failed to check video",
      error: error.message,
    });
  }
});

module.exports = router;
