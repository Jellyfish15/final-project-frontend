const mongoose = require("mongoose");

const engagementSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true,
      index: true,
    },
    
    // Engagement metrics
    watchTime: {
      type: Number, // seconds watched
      default: 0,
    },
    totalDuration: {
      type: Number, // total video length
      default: 0,
    },
    completionRate: {
      type: Number, // percentage watched (0-100)
      default: 0,
    },
    
    // Interaction tracking
    liked: {
      type: Boolean,
      default: false,
    },
    commented: {
      type: Boolean,
      default: false,
    },
    shared: {
      type: Boolean,
      default: false,
    },
    
    // Attention metrics
    replays: {
      type: Number, // how many times rewatched
      default: 0,
    },
    pauseCount: {
      type: Number, // how many times paused
      default: 0,
    },
    seekCount: {
      type: Number, // how many times seeked/skipped
      default: 0,
    },
    
    // Skip behavior
    skippedAt: {
      type: Number, // at what second user skipped (if skipped)
      default: null,
    },
    skipReason: {
      type: String,
      enum: ["bored", "too-hard", "not-interested", "seen-before", null],
      default: null,
    },
    
    // Engagement score (calculated)
    engagementScore: {
      type: Number, // 0-100 score
      default: 0,
    },
    
    // Category interest
    category: {
      type: String,
      index: true,
    },
    
    // Session tracking
    sessionId: {
      type: String,
      index: true,
    },
    
    // Timestamps
    startedAt: {
      type: Date,
      default: Date.now,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient queries
engagementSchema.index({ userId: 1, videoId: 1 });
engagementSchema.index({ userId: 1, category: 1 });
engagementSchema.index({ userId: 1, engagementScore: -1 });
engagementSchema.index({ sessionId: 1, createdAt: -1 });

// Calculate engagement score before saving
engagementSchema.pre("save", function (next) {
  // Base score from completion rate (0-40 points)
  let score = this.completionRate * 0.4;
  
  // Interaction bonuses
  if (this.liked) score += 15;
  if (this.commented) score += 20;
  if (this.shared) score += 25;
  
  // Replay bonus (up to 10 points)
  score += Math.min(this.replays * 3, 10);
  
  // Penalties for disengagement
  if (this.pauseCount > 3) score -= 5;
  if (this.seekCount > 5) score -= 10;
  
  // Early skip penalty
  if (this.skippedAt && this.skippedAt < this.totalDuration * 0.3) {
    score -= 15;
  }
  
  this.engagementScore = Math.max(0, Math.min(100, score));
  next();
});

// Static method to get user's category preferences
engagementSchema.statics.getCategoryPreferences = async function (userId) {
  const preferences = await this.aggregate([
    { $match: { userId: new mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: "$category",
        avgEngagement: { $avg: "$engagementScore" },
        totalWatched: { $sum: 1 },
        avgCompletionRate: { $avg: "$completionRate" },
      },
    },
    { $sort: { avgEngagement: -1 } },
  ]);
  
  return preferences;
};

// Static method to detect if user is losing interest
engagementSchema.statics.detectDisengagement = async function (
  userId,
  sessionId
) {
  const recentEngagements = await this.find({
    userId,
    sessionId,
  })
    .sort({ createdAt: -1 })
    .limit(5);
  
  if (recentEngagements.length < 3) return false;
  
  const avgCompletionRate =
    recentEngagements.reduce((sum, e) => sum + e.completionRate, 0) /
    recentEngagements.length;
  const recentSkips = recentEngagements.filter((e) => e.skippedAt !== null)
    .length;
  
  // User is disengaging if:
  // - Average completion rate < 30%
  // - More than 50% of recent videos were skipped
  return avgCompletionRate < 30 || recentSkips / recentEngagements.length > 0.5;
};

module.exports = mongoose.model("Engagement", engagementSchema);
