const express = require("express");
const { body, validationResult } = require("express-validator");
const Video = require("../models/Video");
const User = require("../models/User");
const { auth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/videos/feed
// @desc    Get algorithmic video feed
// @access  Public (better with auth)
router.get("/feed", optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    let currentUser = null;
    if (req.user) {
      currentUser = await User.findById(req.user.userId);
    }

    // Get algorithmic feed
    const videos = await Video.getAlgorithmFeed(
      currentUser,
      parseInt(page),
      parseInt(limit)
    );

    // Format videos for response
    const formattedVideos = videos.map((video) => ({
      id: video._id || video.id,
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      category: video.category,
      tags: video.tags,
      creator: video.creatorInfo || {
        username: video.creatorDetails?.[0]?.username || "unknown",
        displayName:
          video.creatorDetails?.[0]?.displayName || "Unknown Creator",
        avatar:
          video.creatorDetails?.[0]?.avatar ||
          "https://via.placeholder.com/40x40?text=U",
        isVerified: video.creatorDetails?.[0]?.isVerified || false,
      },
      views: video.views,
      likes: video.likes?.length || 0,
      comments: video.comments?.length || 0,
      shares: video.shares,
      engagementRate: video.engagementRate,
      publishedAt: video.publishedAt,
      isLiked: req.user
        ? video.likes?.some((like) => like.user.toString() === req.user.userId)
        : false,
    }));

    res.json({
      success: true,
      videos: formattedVideos,
      pagination: {
        current: parseInt(page),
        hasMore: formattedVideos.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get feed error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET /api/videos/:id
// @desc    Get single video by ID
// @access  Public
router.get("/:id", optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id).populate(
      "creator",
      "username displayName avatar isVerified"
    );

    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check if video is accessible
    if (video.isPrivate || video.status !== "approved") {
      if (!req.user || video.creator._id.toString() !== req.user.userId) {
        return res.status(403).json({
          success: false,
          message: "Video not accessible",
        });
      }
    }

    // Increment view count
    video.views += 1;
    await video.save();

    const formattedVideo = {
      id: video._id,
      title: video.title,
      description: video.description,
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      category: video.category,
      tags: video.tags,
      creator: {
        username: video.creator.username,
        displayName: video.creator.displayName,
        avatar: video.creator.avatar,
        isVerified: video.creator.isVerified,
      },
      views: video.views,
      likes: video.likes.length,
      comments: video.comments.length,
      shares: video.shares,
      engagementRate: video.engagementRate,
      publishedAt: video.publishedAt,
      isLiked: req.user
        ? video.likes.some((like) => like.user.toString() === req.user.userId)
        : false,
    };

    res.json({
      success: true,
      video: formattedVideo,
    });
  } catch (error) {
    console.error("Get video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   POST /api/videos/:id/like
// @desc    Like/unlike a video
// @access  Private
router.post("/:id/like", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const existingLike = video.likes.find(
      (like) => like.user.toString() === req.user.userId
    );
    let isLiked;

    if (existingLike) {
      // Remove like
      await video.removeLike(req.user.userId);
      isLiked = false;
    } else {
      // Add like
      await video.addLike(req.user.userId);
      isLiked = true;
    }

    res.json({
      success: true,
      message: isLiked ? "Video liked" : "Video unliked",
      isLiked,
      likeCount: video.likes.length,
    });
  } catch (error) {
    console.error("Like video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   POST /api/videos/:id/comment
// @desc    Add a comment to a video
// @access  Private
router.post(
  "/:id/comment",
  [
    auth,
    body("text")
      .isLength({ min: 1, max: 500 })
      .trim()
      .withMessage("Comment must be 1-500 characters"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const { id } = req.params;
      const { text } = req.body;

      const video = await Video.findById(id);
      if (!video) {
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      const comment = await video.addComment(
        req.user.userId,
        req.user.username,
        text
      );

      res.json({
        success: true,
        message: "Comment added successfully",
        comment: {
          id: comment._id,
          username: comment.username,
          text: comment.text,
          createdAt: comment.createdAt,
        },
      });
    } catch (error) {
      console.error("Add comment error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   GET /api/videos/:id/comments
// @desc    Get video comments
// @access  Public
router.get("/:id/comments", async (req, res) => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const comments = video.comments
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(skip, skip + parseInt(limit));

    res.json({
      success: true,
      comments: comments.map((comment) => ({
        id: comment._id,
        username: comment.username,
        text: comment.text,
        createdAt: comment.createdAt,
      })),
      pagination: {
        current: parseInt(page),
        hasMore: comments.length === parseInt(limit),
      },
    });
  } catch (error) {
    console.error("Get comments error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   POST /api/videos/:id/share
// @desc    Increment share count
// @access  Public
router.post("/:id/share", async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    video.shares += 1;
    video.calculateEngagementRate();
    await video.save();

    res.json({
      success: true,
      message: "Share count updated",
      shares: video.shares,
    });
  } catch (error) {
    console.error("Share video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET /api/videos/user/:username
// @desc    Get videos by username
// @access  Public
router.get("/user/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 12 } = req.query;

    const user = await User.findOne({ username, isActive: true });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const videos = await Video.find({
      creator: user._id,
      status: "approved",
      isPrivate: false,
    })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select("title thumbnailUrl views duration category publishedAt");

    const total = await Video.countDocuments({
      creator: user._id,
      status: "approved",
      isPrivate: false,
    });

    res.json({
      success: true,
      videos,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Get user videos error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   DELETE /api/videos/:id
// @desc    Delete a video (creator only)
// @access  Private
router.delete("/:id", auth, async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check if user is the creator
    if (video.creator.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this video",
      });
    }

    await Video.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Delete video error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
