const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    // Basic video information
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    // Video file information
    videoUrl: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    duration: {
      type: Number, // in seconds
      required: true,
      max: 300, // 5 minutes max
    },
    fileSize: {
      type: Number, // in bytes
      required: true,
    },
    resolution: {
      width: Number,
      height: Number,
    },

    // Content categorization
    category: {
      type: String,
      required: true,
      enum: [
        "education",
        "science",
        "math",
        "coding",
        "language",
        "history",
        "art",
        "music",
        "sports",
        "cooking",
        "technology",
        "business",
        "health",
        "other",
      ],
    },
    tags: [
      {
        type: String,
        trim: true,
        maxlength: 30,
      },
    ],

    // Creator information
    creator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    creatorInfo: {
      username: String,
      displayName: String,
      avatar: String,
      isVerified: Boolean,
    },

    // Engagement metrics
    views: {
      type: Number,
      default: 0,
    },
    likes: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    comments: [
      {
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
        },
        username: String,
        text: {
          type: String,
          required: true,
          maxlength: 500,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    shares: {
      type: Number,
      default: 0,
    },

    // Algorithm-related fields
    engagementRate: {
      type: Number,
      default: 0,
    },
    averageWatchTime: {
      type: Number,
      default: 0,
    },
    completionRate: {
      type: Number,
      default: 0,
    },

    // Content moderation
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "flagged"],
      default: "pending",
    },
    moderationNotes: {
      type: String,
      default: "",
    },

    // Visibility settings
    isPrivate: {
      type: Boolean,
      default: false,
    },
    isEducational: {
      type: Boolean,
      default: true,
    },
    ageRestriction: {
      type: String,
      enum: ["all", "13+", "16+", "18+"],
      default: "all",
    },

    // Metadata
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    publishedAt: {
      type: Date,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better performance
videoSchema.index({ creator: 1, uploadedAt: -1 });
videoSchema.index({ category: 1, status: 1 });
videoSchema.index({ engagementRate: -1, views: -1 });
videoSchema.index({ tags: 1 });
videoSchema.index({ status: 1, isPrivate: 1, publishedAt: -1 });

// Virtual for like count
videoSchema.virtual("likeCount").get(function () {
  return this.likes.length;
});

// Virtual for comment count
videoSchema.virtual("commentCount").get(function () {
  return this.comments.length;
});

// Pre-save middleware to update creator info
videoSchema.pre("save", async function (next) {
  if (this.isModified("creator") || this.isNew) {
    try {
      const User = mongoose.model("User");
      const creator = await User.findById(this.creator);
      if (creator) {
        this.creatorInfo = {
          username: creator.username,
          displayName: creator.displayName,
          avatar: creator.avatar,
          isVerified: creator.isVerified,
        };
      }
    } catch (error) {
      console.error("Error updating creator info:", error);
    }
  }
  next();
});

// Method to calculate engagement rate
videoSchema.methods.calculateEngagementRate = function () {
  if (this.views === 0) return 0;
  const engagements = this.likes.length + this.comments.length + this.shares;
  this.engagementRate = (engagements / this.views) * 100;
  return this.engagementRate;
};

// Method to add like
videoSchema.methods.addLike = async function (userId) {
  const existingLike = this.likes.find(
    (like) => like.user.toString() === userId.toString()
  );
  if (!existingLike) {
    this.likes.push({ user: userId });
    this.calculateEngagementRate();
    await this.save();
    return true;
  }
  return false;
};

// Method to remove like
videoSchema.methods.removeLike = async function (userId) {
  const likeIndex = this.likes.findIndex(
    (like) => like.user.toString() === userId.toString()
  );
  if (likeIndex !== -1) {
    this.likes.splice(likeIndex, 1);
    this.calculateEngagementRate();
    await this.save();
    return true;
  }
  return false;
};

// Method to add comment
videoSchema.methods.addComment = async function (userId, username, text) {
  this.comments.push({
    user: userId,
    username: username,
    text: text,
  });
  this.calculateEngagementRate();
  await this.save();
  return this.comments[this.comments.length - 1];
};

// Static method to get algorithm feed
videoSchema.statics.getAlgorithmFeed = async function (
  user,
  page = 1,
  limit = 10
) {
  const skip = (page - 1) * limit;

  // Base query for approved, public videos
  const baseQuery = {
    status: "approved",
    isPrivate: false,
    publishedAt: { $exists: true, $lte: new Date() },
  };

  // If user has interests, prioritize matching content
  let sortCriteria = { publishedAt: -1 };
  if (user && user.interests && user.interests.length > 0) {
    // Weight algorithm: engagement + category match + recency
    const pipeline = [
      { $match: baseQuery },
      {
        $addFields: {
          categoryMatch: {
            $cond: [
              { $in: ["$category", user.interests] },
              10, // Boost score for matching categories
              0,
            ],
          },
          recencyScore: {
            $divide: [
              { $subtract: [new Date(), "$publishedAt"] },
              1000 * 60 * 60 * 24, // Convert to days
            ],
          },
        },
      },
      {
        $addFields: {
          algorithmScore: {
            $add: [
              "$engagementRate",
              "$categoryMatch",
              { $divide: [10, { $add: ["$recencyScore", 1] }] }, // Newer content gets higher score
            ],
          },
        },
      },
      { $sort: { algorithmScore: -1, publishedAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $lookup: {
          from: "users",
          localField: "creator",
          foreignField: "_id",
          as: "creatorDetails",
        },
      },
    ];

    return await this.aggregate(pipeline);
  }

  // Fallback: sort by engagement and recency
  return await this.find(baseQuery)
    .sort({ engagementRate: -1, publishedAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate("creator", "username displayName avatar isVerified");
};

module.exports = mongoose.model("Video", videoSchema);
