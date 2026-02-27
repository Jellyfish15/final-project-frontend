const express = require("express");
const Video = require("../models/Video");
const YouTubeVideo = require("../models/YouTubeVideo");
const Engagement = require("../models/Engagement");
const User = require("../models/User");
const { optionalAuth } = require("../middleware/auth");

const router = express.Router();

// ──────────────────────────────────────────────
// TikTok-style scoring helpers
// ──────────────────────────────────────────────

/**
 * Calculate a TikTok-style score for a user-uploaded video.
 * Factors: engagement velocity, completion rate, recency, category match.
 */
function scoreUploadedVideo(video, userPrefs, now) {
  let score = 0;

  // 1. Engagement rate (0-30 pts)
  score += Math.min((video.engagementRate || 0) * 3, 30);

  // 2. Velocity — recent engagement matters more than total.
  //    Approximate: likes-per-day since publish.
  const ageMs = now - new Date(video.publishedAt || video.createdAt).getTime();
  const ageDays = Math.max(ageMs / (1000 * 60 * 60 * 24), 0.1);
  const likesPerDay = (video.likes?.length || 0) / ageDays;
  score += Math.min(likesPerDay * 5, 20); // up to 20 pts

  // 3. Completion / watch-through rate (0-20 pts)
  score += Math.min((video.completionRate || 0) * 0.2, 20);

  // 4. Recency boost (0-15 pts) — newer content boosted
  const recencyBoost = Math.max(0, 15 - ageDays * 0.5);
  score += recencyBoost;

  // 5. Category match with user interests (0-10 pts)
  if (userPrefs && userPrefs.length > 0 && userPrefs.includes(video.category)) {
    score += 10;
  }

  // 6. Small random jitter for diversity (0-5 pts)
  score += Math.random() * 5;

  return score;
}

/**
 * Score a YouTube cached video similarly.
 */
function scoreYouTubeVideo(video, userPrefs, now) {
  let score = 0;

  // 1. View count signal (log scale, 0-20 pts)
  const views = video.viewCount || 0;
  score += Math.min(Math.log10(Math.max(views, 1)) * 4, 20);

  // 2. Recency (0-15 pts)
  const ageMs = now - new Date(video.publishedAt).getTime();
  const ageDays = Math.max(ageMs / (1000 * 60 * 60 * 24), 0.1);
  score += Math.max(0, 15 - ageDays * 0.05);

  // 3. Category (subject) match (0-10 pts)
  if (userPrefs && userPrefs.length > 0) {
    // YouTube videos have 'subject' instead of 'category'
    const subjectLower = (video.subject || "").toLowerCase();
    if (userPrefs.some((p) => subjectLower.includes(p.toLowerCase()))) {
      score += 10;
    }
  }

  // 4. Random jitter (0-5 pts)
  score += Math.random() * 5;

  return score;
}

// ──────────────────────────────────────────────
// Normalise both video types into the same shape
// ──────────────────────────────────────────────

function normalizeUploadedVideo(v) {
  return {
    _id: v._id?.toString() || v.id,
    title: v.title,
    description: v.description || "",
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl,
    duration: v.duration,
    category: v.category,
    tags: v.tags || [],
    creator: v.creatorInfo?.username || v.creator?.username || "Unknown",
    displayName:
      v.creatorInfo?.displayName || v.creator?.displayName || "Unknown Creator",
    avatar:
      v.creatorInfo?.avatar ||
      v.creator?.avatar ||
      "https://via.placeholder.com/40x40?text=U",
    isVerified: v.creatorInfo?.isVerified || v.creator?.isVerified || false,
    views: v.views || 0,
    likes: v.likes?.length || 0,
    comments: v.comments?.length || 0,
    shares: v.shares || 0,
    engagementRate: v.engagementRate || 0,
    publishedAt: v.publishedAt || v.uploadedAt || v.createdAt,
    videoType: "uploaded",
  };
}

function normalizeYouTubeVideo(v) {
  return {
    _id: v._id?.toString() || v.videoId,
    videoId: v.videoId,
    title: v.title,
    description: v.description || "",
    videoUrl: v.videoUrl,
    thumbnailUrl: v.thumbnailUrl,
    duration: v.duration || 0,
    category: v.subject || "education",
    tags: [],
    creator: v.channelTitle || "YouTube Creator",
    displayName: v.channelTitle || "YouTube Creator",
    avatar: "https://via.placeholder.com/40x40?text=YT",
    isVerified: false,
    views: v.viewCount || 0,
    likes: 0,
    comments: 0,
    shares: 0,
    engagementRate: 0,
    publishedAt: v.publishedAt,
    videoType: "youtube",
  };
}

// ──────────────────────────────────────────────
// GET /api/feed — Unified, ranked feed
// ──────────────────────────────────────────────

router.get("/", optionalAuth, async (req, res) => {
  try {
    const { page = 1, limit = 20, category } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const now = Date.now();

    // Resolve user preferences (if logged in)
    let userPrefs = [];
    let viewedVideoIds = new Set();
    if (req.user) {
      try {
        const user = await User.findById(req.user.userId).lean();
        if (user) {
          userPrefs = user.interests || [];
          // Get recently viewed video IDs so we can de-prioritise them
          const recentEngagements = await Engagement.find({
            userId: user._id,
          })
            .sort({ createdAt: -1 })
            .limit(100)
            .select("videoId")
            .lean();
          viewedVideoIds = new Set(
            recentEngagements.map((e) => e.videoId.toString()),
          );
        }
      } catch (err) {
        // Continue without personalisation
      }
    }

    // Build queries in parallel
    const uploadedQuery = {
      status: "approved",
      isPrivate: false,
    };
    if (category) {
      uploadedQuery.category = category;
    }

    const ytQuery = { isActive: true };
    if (category) {
      ytQuery.subject = { $regex: new RegExp(category, "i") };
    }

    const [uploadedVideos, youtubeVideos] = await Promise.all([
      Video.find(uploadedQuery)
        .populate("creator", "username displayName avatar isVerified")
        .sort({ publishedAt: -1 })
        .limit(200)
        .lean(),
      YouTubeVideo.find(ytQuery).sort({ cachedAt: -1 }).limit(300).lean(),
    ]);

    // Normalise
    const normalizedUploaded = uploadedVideos.map(normalizeUploadedVideo);
    const normalizedYT = youtubeVideos.map(normalizeYouTubeVideo);

    // Score everything
    const scoredUploaded = normalizedUploaded.map((v) => ({
      ...v,
      _score: scoreUploadedVideo(
        {
          ...v,
          likes: uploadedVideos.find(
            (u) => (u._id?.toString() || u.id) === v._id,
          )?.likes,
        },
        userPrefs,
        now,
      ),
    }));

    const scoredYT = normalizedYT.map((v) => ({
      ...v,
      _score: scoreYouTubeVideo(v, userPrefs, now),
    }));

    // Merge and sort by score descending
    let allVideos = [...scoredUploaded, ...scoredYT];

    // De-prioritise already-viewed videos (push them down, don't remove)
    allVideos = allVideos.map((v) => ({
      ...v,
      _score: viewedVideoIds.has(v._id) ? v._score * 0.3 : v._score,
    }));

    allVideos.sort((a, b) => b._score - a._score);

    // Diversity injection: make sure we don't have more than 3 consecutive
    // videos of the same category
    const diversified = [];
    const remaining = [...allVideos];
    while (remaining.length > 0 && diversified.length < allVideos.length) {
      const candidate = remaining.shift();
      const lastThree = diversified.slice(-3);
      const sameCategoryCount = lastThree.filter(
        (v) => v.category === candidate.category,
      ).length;

      if (sameCategoryCount >= 3 && remaining.length > 0) {
        // Find next video with a different category
        const diffIdx = remaining.findIndex(
          (v) => v.category !== candidate.category,
        );
        if (diffIdx !== -1) {
          diversified.push(remaining.splice(diffIdx, 1)[0]);
          remaining.unshift(candidate); // put this one back
        } else {
          diversified.push(candidate);
        }
      } else {
        diversified.push(candidate);
      }
    }

    // Paginate
    const paginated = diversified.slice(skip, skip + parseInt(limit));

    // Remove internal scoring from response
    const responseVideos = paginated.map(({ _score, ...rest }) => rest);

    res.json({
      success: true,
      videos: responseVideos,
      pagination: {
        current: parseInt(page),
        hasMore: skip + parseInt(limit) < diversified.length,
        total: diversified.length,
      },
      meta: {
        uploadedCount: normalizedUploaded.length,
        youtubeCount: normalizedYT.length,
      },
    });
  } catch (error) {
    console.error("Unified feed error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to load feed",
    });
  }
});

module.exports = router;
