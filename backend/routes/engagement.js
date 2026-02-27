const express = require("express");
const Engagement = require("../models/Engagement");
const Video = require("../models/Video");
const User = require("../models/User");
const { auth, optionalAuth } = require("../middleware/auth");

const router = express.Router();

// ──────────────────────────────────────────────
// POST /api/engagement/track
// Track a single engagement event (watch time, skip, replay, etc.)
// ──────────────────────────────────────────────
router.post("/track", auth, async (req, res) => {
  try {
    const {
      videoId,
      watchTime,
      totalDuration,
      completionRate,
      liked,
      commented,
      shared,
      replays,
      pauseCount,
      seekCount,
      skippedAt,
      skipReason,
      category,
      sessionId,
    } = req.body;

    if (!videoId) {
      return res
        .status(400)
        .json({ success: false, message: "videoId is required" });
    }

    // Upsert: update if this user already has engagement for this video in
    // the same session, otherwise create.
    const filter = {
      userId: req.user.userId,
      videoId,
      ...(sessionId ? { sessionId } : {}),
    };

    const update = {
      $set: {
        userId: req.user.userId,
        videoId,
        ...(watchTime != null && { watchTime }),
        ...(totalDuration != null && { totalDuration }),
        ...(completionRate != null && { completionRate }),
        ...(liked != null && { liked }),
        ...(commented != null && { commented }),
        ...(shared != null && { shared }),
        ...(replays != null && { replays }),
        ...(pauseCount != null && { pauseCount }),
        ...(seekCount != null && { seekCount }),
        ...(skippedAt != null && { skippedAt }),
        ...(skipReason != null && { skipReason }),
        ...(category && { category }),
        ...(sessionId && { sessionId }),
        completedAt:
          completionRate != null && completionRate >= 90 ? new Date() : null,
      },
    };

    const engagement = await Engagement.findOneAndUpdate(filter, update, {
      upsert: true,
      new: true,
      setDefaultsOnInsert: true,
    });

    // Also update the video's aggregate stats
    if (completionRate != null || watchTime != null) {
      try {
        const avgStats = await Engagement.aggregate([
          {
            $match: {
              videoId: engagement.videoId,
            },
          },
          {
            $group: {
              _id: null,
              avgCompletionRate: { $avg: "$completionRate" },
              avgWatchTime: { $avg: "$watchTime" },
            },
          },
        ]);

        if (avgStats.length > 0) {
          await Video.findByIdAndUpdate(videoId, {
            completionRate: avgStats[0].avgCompletionRate || 0,
            averageWatchTime: avgStats[0].avgWatchTime || 0,
          });
        }
      } catch (err) {
        // Non-critical — don't fail the request
        console.error("Failed to update video aggregate stats:", err.message);
      }
    }

    // Update user viewing history (most recent 200 entries)
    try {
      await User.findByIdAndUpdate(req.user.userId, {
        $push: {
          viewingHistory: {
            $each: [
              {
                videoId,
                watchTime: watchTime || 0,
                completed: (completionRate || 0) >= 90,
                timestamp: new Date(),
              },
            ],
            $slice: -200, // keep last 200
          },
        },
      });
    } catch (err) {
      console.error("Failed to update viewing history:", err.message);
    }

    res.json({ success: true, engagementId: engagement._id });
  } catch (error) {
    console.error("Engagement track error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ──────────────────────────────────────────────
// POST /api/engagement/batch
// Track multiple engagement events at once (batch send on page unload)
// ──────────────────────────────────────────────
router.post("/batch", auth, async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events) || events.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "events array is required" });
    }

    const results = await Promise.allSettled(
      events.map(async (event) => {
        const filter = {
          userId: req.user.userId,
          videoId: event.videoId,
          ...(event.sessionId ? { sessionId: event.sessionId } : {}),
        };

        return Engagement.findOneAndUpdate(
          filter,
          {
            $set: {
              userId: req.user.userId,
              ...event,
              completedAt: event.completionRate >= 90 ? new Date() : undefined,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true },
        );
      }),
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;

    res.json({
      success: true,
      tracked: succeeded,
      total: events.length,
    });
  } catch (error) {
    console.error("Engagement batch error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ──────────────────────────────────────────────
// GET /api/engagement/preferences
// Get current user's category preferences (derived from engagement data)
// ──────────────────────────────────────────────
router.get("/preferences", auth, async (req, res) => {
  try {
    const preferences = await Engagement.getCategoryPreferences(
      req.user.userId,
    );

    res.json({
      success: true,
      preferences,
    });
  } catch (error) {
    console.error("Get preferences error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

module.exports = router;
