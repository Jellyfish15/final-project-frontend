const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { body, validationResult } = require("express-validator");
const Video = require("../models/Video");
const { auth } = require("../middleware/auth");

const router = express.Router();

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
const videosDir = path.join(uploadsDir, "videos");
const thumbnailsDir = path.join(uploadsDir, "thumbnails");
const avatarsDir = path.join(uploadsDir, "avatars");

[uploadsDir, videosDir, thumbnailsDir, avatarsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// File filter for videos
const videoFilter = (req, file, cb) => {
  const allowedTypes = [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/webm",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only MP4, MPEG, MOV, and WebM videos are allowed."
      ),
      false
    );
  }
};

// File filter for images
const imageFilter = (req, file, cb) => {
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
      ),
      false
    );
  }
};

// Multer configuration for video upload
const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, videosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `video-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

// Multer configuration for image upload
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.fieldname === "avatar") {
      cb(null, avatarsDir);
    } else {
      cb(null, thumbnailsDir);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const prefix = file.fieldname === "avatar" ? "avatar" : "thumb";
    cb(null, `${prefix}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB max file size
  },
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// @route   POST /api/upload/video
// @desc    Upload a video file
// @access  Private
router.post(
  "/video",
  auth,
  uploadVideo.single("video"),
  [
    body("title")
      .isLength({ min: 1, max: 150 })
      .trim()
      .withMessage("Title must be 1-150 characters"),
    body("description")
      .optional()
      .isLength({ max: 2000 })
      .trim()
      .withMessage("Description must be less than 2000 characters"),
    body("category")
      .isIn([
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
      ])
      .withMessage("Invalid category"),
    body("isPrivate")
      .optional()
      .isBoolean()
      .withMessage("isPrivate must be a boolean"),
  ],
  async (req, res) => {
    try {
      console.log("Upload request body:", req.body);
      console.log(
        "Upload request file:",
        req.file ? req.file.filename : "No file"
      );

      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log("Validation errors:", errors.array());
        // Delete uploaded file if validation fails
        if (req.file) {
          fs.unlinkSync(req.file.path);
        }
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No video file uploaded",
        });
      }

      const { title, description, category, isPrivate } = req.body;

      // Parse tags from JSON string if provided
      let tags = [];
      if (req.body.tags) {
        try {
          tags = JSON.parse(req.body.tags);
          if (!Array.isArray(tags)) {
            tags = [];
          }
        } catch (e) {
          tags = [];
        }
      }

      // Get video metadata (you might want to use ffprobe for this)
      const videoUrl = `/uploads/videos/${req.file.filename}`;
      const fileSize = req.file.size;

      // Generate 3 thumbnails at different timestamps
      const ffmpeg = require("fluent-ffmpeg");
      const thumbFilenames = [
        `${req.file.filename}-1.png`,
        `${req.file.filename}-2.png`,
        `${req.file.filename}-3.png`,
      ];
      const thumbPaths = thumbFilenames.map((f) => path.join(thumbnailsDir, f));
      const thumbUrls = thumbFilenames.map((f) => `/uploads/thumbnails/${f}`);

      console.log("Starting ffmpeg thumbnail generation for 3 images...");
      ffmpeg(path.join(videosDir, req.file.filename))
        .on("start", (cmd) => {
          console.log("ffmpeg started with command:", cmd);
        })
        .on("end", async () => {
          console.log("ffmpeg thumbnail generation finished.");
          // Do not set thumbnail yet, let user select
          const video = new Video({
            title,
            description: description || "",
            videoUrl,
            thumbnailUrl: thumbUrls[0], // Default to first, will update after selection
            thumbnailOptions: thumbUrls, // Store all options for frontend
            videoType: "uploaded",
            duration: 0,
            fileSize,
            category,
            tags: tags,
            creator: req.user.userId,
            isPrivate: isPrivate === "true" || isPrivate === true,
            status: "approved",
            uploadedAt: new Date(),
            publishedAt: new Date(),
          });
          await video.save();
          res.status(201).json({
            success: true,
            message: "Video uploaded successfully",
            video: {
              _id: video._id,
              id: video._id,
              title: video.title,
              description: video.description,
              thumbnailUrl: video.thumbnailUrl,
              thumbnailOptions: video.thumbnailOptions,
              category: video.category,
              tags: video.tags,
              status: video.status,
              uploadedAt: video.uploadedAt,
            },
          });
        })
        .on("error", async (err) => {
          console.error("Thumbnail generation failed:", err.message);
          // Use placeholder if thumbnail generation fails
          const video = new Video({
            title,
            description: description || "",
            videoUrl,
            thumbnailUrl: `/uploads/thumbnails/placeholder-thumb.jpg`,
            thumbnailOptions: [],
            videoType: "uploaded",
            duration: 0,
            fileSize,
            category,
            tags: tags,
            creator: req.user.userId,
            isPrivate: isPrivate === "true" || isPrivate === true,
            status: "approved",
            uploadedAt: new Date(),
            publishedAt: new Date(),
          });
          await video.save();
          res.status(201).json({
            success: true,
            message: "Video uploaded successfully (no thumbnails)",
            video: {
              _id: video._id,
              id: video._id,
              title: video.title,
              description: video.description,
              thumbnailUrl: video.thumbnailUrl,
              thumbnailOptions: [],
              category: video.category,
              tags: video.tags,
              status: video.status,
              uploadedAt: video.uploadedAt,
            },
          });
        })
        .screenshots({
          timestamps: ["00:00:01", "00:00:03", "00:00:05"],
          filename: "%f",
          folder: thumbnailsDir,
          size: "320x240",
        });
    } catch (error) {
      console.error("Video upload error:", error);

      // Delete uploaded file on error
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: "Server error during video upload",
      });
    }
  }
);

// @route   POST /api/upload/thumbnail
// @desc    Upload a thumbnail for a video
// @access  Private
router.post(
  "/thumbnail/:videoId",
  auth,
  uploadImage.single("thumbnail"),
  async (req, res) => {
    try {
      const { videoId } = req.params;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No thumbnail file uploaded",
        });
      }

      const video = await Video.findById(videoId);
      if (!video) {
        // Delete uploaded file if video not found
        fs.unlinkSync(req.file.path);
        return res.status(404).json({
          success: false,
          message: "Video not found",
        });
      }

      // Check if user owns the video
      if (video.creator.toString() !== req.user.userId) {
        fs.unlinkSync(req.file.path);
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this video",
        });
      }

      // Update video with new thumbnail
      const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;
      video.thumbnailUrl = thumbnailUrl;
      video.updatedAt = new Date();
      await video.save();

      res.json({
        success: true,
        message: "Thumbnail uploaded successfully",
        thumbnailUrl,
      });
    } catch (error) {
      console.error("Thumbnail upload error:", error);

      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: "Server error during thumbnail upload",
      });
    }
  }
);

// @route   POST /api/upload/avatar
// @desc    Upload user avatar
// @access  Private
router.post("/avatar", auth, uploadImage.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "No avatar file uploaded",
      });
    }

    const User = require("../models/User");
    const user = await User.findById(req.user.userId);

    if (!user) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Update user avatar
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    user.avatar = avatarUrl;
    user.updatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Avatar uploaded successfully",
      avatarUrl,
    });
  } catch (error) {
    console.error("Avatar upload error:", error);

    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      message: "Server error during avatar upload",
    });
  }
});

// @route   GET /api/upload/my-videos
// @desc    Get current user's uploaded videos
// @access  Private
router.get("/my-videos", auth, async (req, res) => {
  try {
    const { page = 1, limit = 12, status } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const query = { creator: req.user.userId };
    if (status) {
      query.status = status;
    }

    const videos = await Video.find(query)
      .sort({ uploadedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select(
        "title description thumbnailUrl duration category status views uploadedAt publishedAt likes comments"
      );

    // Format videos to include counts
    const formattedVideos = videos.map((video) => ({
      _id: video._id,
      title: video.title,
      description: video.description,
      thumbnailUrl: video.thumbnailUrl,
      duration: video.duration,
      category: video.category,
      status: video.status,
      views: video.views,
      likes: video.likes?.length || 0,
      comments: video.comments?.length || 0,
      uploadedAt: video.uploadedAt,
      publishedAt: video.publishedAt,
    }));

    const total = await Video.countDocuments(query);

    res.json({
      success: true,
      videos: formattedVideos,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / parseInt(limit)),
        total,
      },
    });
  } catch (error) {
    console.error("Get my videos error:", error);
    res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
});

// @route   DELETE /api/upload/video/:videoId
// @desc    Delete a video and its files
// @access  Private
router.delete("/video/:videoId", auth, async (req, res) => {
  try {
    console.log("DELETE route hit with videoId:", req.params.videoId);
    const { videoId } = req.params;

    const video = await Video.findById(videoId);
    if (!video) {
      return res.status(404).json({
        success: false,
        message: "Video not found",
      });
    }

    // Check if user owns the video
    if (video.creator.toString() !== req.user.userId) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this video",
      });
    }

    // Delete video file if it exists
    if (video.videoUrl && !video.videoUrl.startsWith("http")) {
      const videoFilePath = path.join(__dirname, "..", video.videoUrl);
      if (fs.existsSync(videoFilePath)) {
        fs.unlinkSync(videoFilePath);
        console.log("Deleted video file:", videoFilePath);
      }
    }

    // Delete thumbnail file if it exists
    if (video.thumbnailUrl && !video.thumbnailUrl.startsWith("http")) {
      const thumbnailFilePath = path.join(__dirname, "..", video.thumbnailUrl);
      if (fs.existsSync(thumbnailFilePath)) {
        fs.unlinkSync(thumbnailFilePath);
        console.log("Deleted thumbnail file:", thumbnailFilePath);
      }
    }

    // Delete video record from database
    await Video.findByIdAndDelete(videoId);

    res.json({
      success: true,
      message: "Video deleted successfully",
    });
  } catch (error) {
    console.error("Video deletion error:", error);
    res.status(500).json({
      success: false,
      message: "Server error during video deletion",
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message:
          "File size too large. Maximum size is 100MB for videos and 5MB for images.",
      });
    }
  }

  if (error.message.includes("Invalid file type")) {
    return res.status(400).json({
      success: false,
      message: error.message,
    });
  }

  next(error);
});

module.exports = router;
