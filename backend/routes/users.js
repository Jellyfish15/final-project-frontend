const express = require("express");
const { body, validationResult } = require("express-validator");
const User = require("../models/User");
const Video = require("../models/Video");
const { auth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// @route   GET /api/users/profile/:username
// @desc    Get user profile by username
// @access  Public
router.get("/profile/:username", optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;

    const user = await User.findOne({ username, isActive: true }).select(
      "-password -email"
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get user's videos
    const videos = await Video.find({
      creator: user._id,
      status: "approved",
      isPrivate: false,
    })
      .sort({ publishedAt: -1 })
      .limit(20)
      .select(
        "title thumbnailUrl views likeCount commentCount duration category createdAt"
      );

    // Check if current user is following this profile
    let isFollowing = false;
    if (req.user) {
      isFollowing = user.followers.includes(req.user.userId);
    }

    const profileData = {
      ...user.getPublicProfile(),
      videos,
      videoCount: videos.length,
      isFollowing,
    };

    res.json({
      success: true,
      profile: profileData,
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put(
  "/profile",
  [
    auth,
    body("displayName")
      .optional()
      .isLength({ min: 1, max: 50 })
      .trim()
      .withMessage("Display name must be 1-50 characters"),
    body("description")
      .optional()
      .isLength({ max: 500 })
      .trim()
      .withMessage("Description must be less than 500 characters"),
    body("username")
      .optional()
      .isLength({ min: 3, max: 30 })
      .matches(/^[a-zA-Z0-9_]+$/)
      .withMessage(
        "Username must be 3-30 characters and contain only letters, numbers, and underscores"
      ),
    body("interests")
      .optional()
      .isArray({ max: 10 })
      .withMessage("Interests must be an array with maximum 10 items"),
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

      const { displayName, description, username, interests, avatar } =
        req.body;

      const user = await User.findById(req.user.userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found",
        });
      }

      // Check if username is already taken (if being changed)
      if (username && username !== user.username) {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
          return res.status(400).json({
            success: false,
            message: "Username already taken",
          });
        }
        user.username = username;
      }

      // Update other fields
      if (displayName !== undefined) user.displayName = displayName;
      if (description !== undefined) user.description = description;
      if (interests !== undefined) user.interests = interests;
      if (avatar !== undefined) user.avatar = avatar;

      user.updatedAt = new Date();
      await user.save();

      res.json({
        success: true,
        message: "Profile updated successfully",
        user: user.getPublicProfile(),
      });
    } catch (error) {
      console.error("Update profile error:", error);
      res.status(500).json({
        success: false,
        message: "Server error",
      });
    }
  }
);

// @route   POST /api/users/follow/:userId
// @desc    Follow/unfollow a user
// @access  Private
router.post("/follow/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    if (userId === currentUserId) {
      return res.status(400).json({
        success: false,
        message: "Cannot follow yourself",
      });
    }

    const userToFollow = await User.findById(userId);
    const currentUser = await User.findById(currentUserId);

    if (!userToFollow || !currentUser) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isFollowing = currentUser.following.includes(userId);

    if (isFollowing) {
      // Unfollow
      currentUser.following = currentUser.following.filter(
        (id) => id.toString() !== userId
      );
      userToFollow.followers = userToFollow.followers.filter(
        (id) => id.toString() !== currentUserId
      );

      await currentUser.save();
      await userToFollow.save();

      res.json({
        success: true,
        message: "User unfollowed successfully",
        isFollowing: false,
      });
    } else {
      // Follow
      currentUser.following.push(userId);
      userToFollow.followers.push(currentUserId);

      await currentUser.save();
      await userToFollow.save();

      res.json({
        success: true,
        message: "User followed successfully",
        isFollowing: true,
      });
    }
  } catch (error) {
    console.error("Follow/unfollow error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET /api/users/search
// @desc    Search users by username or display name
// @access  Public
router.get("/search", async (req, res) => {
  try {
    const { q, page = 1, limit = 20 } = req.query;

    if (!q || q.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Search query must be at least 2 characters",
      });
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const searchRegex = new RegExp(q.trim(), "i");

    const users = await User.find({
      $and: [
        { isActive: true },
        {
          $or: [{ username: searchRegex }, { displayName: searchRegex }],
        },
      ],
    })
      .select(
        "username displayName avatar isVerified totalLikes totalViews createdAt"
      )
      .sort({ totalLikes: -1, totalViews: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const total = await User.countDocuments({
      $and: [
        { isActive: true },
        {
          $or: [{ username: searchRegex }, { displayName: searchRegex }],
        },
      ],
    });

    res.json({
      success: true,
      users,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Search users error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   GET /api/users/me/stats
// @desc    Get current user's statistics
// @access  Private
router.get("/me/stats", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get video statistics
    const videoStats = await Video.aggregate([
      { $match: { creator: user._id, status: "approved" } },
      {
        $group: {
          _id: null,
          totalVideos: { $sum: 1 },
          totalViews: { $sum: "$views" },
          totalLikes: { $sum: { $size: "$likes" } },
          totalComments: { $sum: { $size: "$comments" } },
          averageEngagement: { $avg: "$engagementRate" },
        },
      },
    ]);

    const stats = videoStats[0] || {
      totalVideos: 0,
      totalViews: 0,
      totalLikes: 0,
      totalComments: 0,
      averageEngagement: 0,
    };

    // Update user's cached stats
    user.totalLikes = stats.totalLikes;
    user.totalViews = stats.totalViews;
    await user.save();

    res.json({
      success: true,
      stats: {
        ...stats,
        followers: user.followers.length,
        following: user.following.length,
        joinDate: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   DELETE /api/users/account
// @desc    Delete user account (soft delete)
// @access  Private
router.delete("/account", auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Soft delete - deactivate account
    user.isActive = false;
    user.updatedAt = new Date();
    await user.save();

    // Also mark user's videos as private
    await Video.updateMany(
      { creator: user._id },
      { isPrivate: true, updatedAt: new Date() }
    );

    res.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

module.exports = router;
