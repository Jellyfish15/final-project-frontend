const mongoose = require("mongoose");

const YouTubeVideoSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    thumbnailUrl: {
      type: String,
      required: true,
    },
    channelTitle: {
      type: String,
      required: true,
    },
    subject: {
      type: String,
      required: true,
      index: true, // For filtering by subject
    },
    duration: {
      type: Number, // Duration in seconds
      required: true,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    publishedAt: {
      type: Date,
      required: true,
    },
    cachedAt: {
      type: Date,
      default: Date.now,
      index: true, // For removing old videos
    },
    videoUrl: {
      type: String,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Index for efficient querying
YouTubeVideoSchema.index({ isActive: 1, cachedAt: -1 });
YouTubeVideoSchema.index({ subject: 1, isActive: 1 });

module.exports = mongoose.model("YouTubeVideo", YouTubeVideoSchema);
