const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { body, validationResult } = require("express-validator");
const Video = require("../models/Video");
const { auth } = require("../middleware/auth");
const ffmpeg = require("fluent-ffmpeg");
const {
  isCloudinaryConfigured,
  getVideoStorage,
  getImageStorage,
  resolveUrl,
  deleteResource,
  videosDir,
  thumbnailsDir,
  avatarsDir,
} = require("../services/cloudStorage");

const router = express.Router();

// Create uploads directory if it doesn't exist (local fallback)
const uploadsDir = path.join(__dirname, "../uploads");
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
    "video/x-m4v",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only MP4, MPEG, MOV, and WebM videos are allowed.",
      ),
      false,
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
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
      ),
      false,
    );
  }
};

// Multer configuration for video upload — uses Cloudinary when configured
const videoStorage = getVideoStorage();

// Multer configuration for image upload — uses Cloudinary when configured
const imageStorage = getImageStorage("thumbnails");

// Avatar-specific storage
const avatarStorage = getImageStorage("avatars");

const uploadVideo = multer({
  storage: videoStorage,
  fileFilter: videoFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB max file size
  },
});

const uploadImage = multer({
  storage: imageStorage,
  fileFilter: imageFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

// @route   POST /api/upload/temp-video
// @desc    Upload video temporarily and generate 3 thumbnail options
// @access  Private
router.post(
  "/temp-video",
  auth,
  uploadVideo.single("video"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No video file uploaded",
        });
      }

      // ── Cloudinary path: video already uploaded, generate thumbnails via URL transforms ──
      if (
        isCloudinaryConfigured() &&
        req.file.path &&
        req.file.path.startsWith("http")
      ) {
        const cloudUrl = req.file.path; // full Cloudinary URL
        const filename = req.file.filename || path.basename(cloudUrl);

        // Cloudinary can generate thumbnails from video by changing the extension to .jpg
        // and adding a time-offset transformation (so_<seconds>)
        const baseUrl = cloudUrl.replace(/\.[^/.]+$/, ""); // strip extension
        const thumbnailUrls = [
          `${baseUrl}.jpg`, // first frame
          // Use Cloudinary transformation to grab frames at 25%, 50%, 75%
          cloudUrl
            .replace("/upload/", "/upload/so_2,w_640,c_fill/")
            .replace(/\.[^/.]+$/, ".jpg"),
          cloudUrl
            .replace("/upload/", "/upload/so_5,w_640,c_fill/")
            .replace(/\.[^/.]+$/, ".jpg"),
        ];

        return res.status(200).json({
          success: true,
          message: "Video uploaded to cloud and thumbnails generated",
          videoData: {
            filename,
            videoUrl: cloudUrl,
            fileSize: req.file.size || 0,
            thumbnailUrls,
            thumbnailPrefix: filename,
            cloudinary: true,
          },
        });
      }

      // ── Local storage path: original FFmpeg-based flow ──
      const videoPath = path.join(videosDir, req.file.filename);
      const originalFilename = req.file.filename;

      // Check if we're on a free tier (Render free tier has limited memory)
      const isFreeTier =
        process.env.RENDER_INSTANCE_TYPE === "free" ||
        process.env.SKIP_VIDEO_CONVERSION === "true" ||
        !process.env.RENDER_INSTANCE_TYPE; // Local development

      let finalFilename = originalFilename;
      let finalVideoPath = videoPath;

      // Only convert video if NOT on free tier
      if (!isFreeTier) {
        console.log("Converting video to browser-compatible format...");
        const convertedFilename = `converted-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.mp4`;
        const convertedPath = path.join(videosDir, convertedFilename);

        console.log("Original video path:", videoPath);
        console.log("Converted video path:", convertedPath);

        // Convert video using FFmpeg
        const conversionPromise = new Promise((resolve, reject) => {
          ffmpeg(videoPath)
            .videoCodec("libx264")
            .audioCodec("aac")
            .outputOptions([
              "-preset fast",
              "-crf 23",
              "-movflags +faststart",
              "-pix_fmt yuv420p",
            ])
            .on("start", (commandLine) => {
              console.log("FFmpeg conversion started:", commandLine);
            })
            .on("progress", (progress) => {
              console.log("Processing: " + progress.percent + "% done");
            })
            .on("end", () => {
              console.log("Video conversion completed");
              // Delete original file after successful conversion
              if (fs.existsSync(videoPath)) {
                fs.unlinkSync(videoPath);
                console.log("Original file deleted");
              }
              resolve(convertedFilename);
            })
            .on("error", (err, stdout, stderr) => {
              console.error("FFmpeg conversion error:", err.message);
              console.error("FFmpeg stderr:", stderr);
              reject(err);
            })
            .save(convertedPath);
        });

        try {
          finalFilename = await Promise.race([
            conversionPromise,
            new Promise((_, reject) =>
              setTimeout(
                () =>
                  reject(
                    new Error("Video conversion timeout after 120 seconds"),
                  ),
                120000,
              ),
            ),
          ]);
          finalVideoPath = path.join(videosDir, finalFilename);
        } catch (err) {
          console.error("Video conversion failed:", err.message);
          // Clean up files
          if (fs.existsSync(videoPath)) fs.unlinkSync(videoPath);
          if (fs.existsSync(convertedPath)) fs.unlinkSync(convertedPath);
          return res.status(500).json({
            success: false,
            message:
              "Failed to convert video to browser-compatible format: " +
              err.message,
          });
        }
      } else {
        console.log(
          "Skipping video conversion (free tier or local development)",
        );
      }

      const videoUrl = `/uploads/videos/${finalFilename}`;

      // Generate thumbnails immediately
      const thumbnailPrefix = `thumb-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 9)}`;

      console.log("Starting generation of 3 thumbnails...");
      console.log("Video path:", finalVideoPath);
      console.log("Thumbnail prefix:", thumbnailPrefix);

      // Promise to wait for thumbnail generation
      const thumbnailPromise = new Promise((resolve, reject) => {
        ffmpeg(finalVideoPath)
          .on("start", (commandLine) => {
            console.log("FFmpeg started - generating 3 thumbnails");
            console.log("FFmpeg command:", commandLine);
          })
          .on("end", () => {
            console.log("Thumbnail generation completed");
            // Verify files exist before resolving
            const thumbFiles = [
              `${thumbnailPrefix}_1.png`,
              `${thumbnailPrefix}_2.png`,
              `${thumbnailPrefix}_3.png`,
            ];

            const allFilesExist = thumbFiles.every((file) => {
              const filePath = path.join(thumbnailsDir, file);
              const exists = fs.existsSync(filePath);
              console.log(
                `Thumbnail file ${file}: ${exists ? "EXISTS" : "MISSING"} at ${filePath}`,
              );
              return exists;
            });

            if (allFilesExist) {
              const thumbUrls = [
                `/uploads/thumbnails/${thumbnailPrefix}_1.png`,
                `/uploads/thumbnails/${thumbnailPrefix}_2.png`,
                `/uploads/thumbnails/${thumbnailPrefix}_3.png`,
              ];
              console.log("All thumbnails generated successfully:", thumbUrls);
              resolve(thumbUrls);
            } else {
              reject(new Error("Generated thumbnail files not found"));
            }
          })
          .on("error", (err, stdout, stderr) => {
            console.error("FFmpeg error:", err.message);
            console.error("FFmpeg stdout:", stdout);
            console.error("FFmpeg stderr:", stderr);
            reject(err);
          })
          .screenshots({
            timestamps: ["25%", "50%", "75%"],
            filename: `${thumbnailPrefix}_%i.png`,
            folder: thumbnailsDir,
            size: "640x?",
          });
      });

      // Wait for thumbnails to generate (with timeout)
      let thumbnailUrls;
      try {
        thumbnailUrls = await Promise.race([
          thumbnailPromise,
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error("Thumbnail generation timeout after 60 seconds"),
                ),
              60000,
            ),
          ),
        ]);
      } catch (err) {
        console.error("Thumbnail generation failed:", err.message);
        // If generation fails, return error instead of placeholder URLs
        return res.status(500).json({
          success: false,
          message: "Failed to generate thumbnail previews: " + err.message,
        });
      }

      res.status(200).json({
        success: true,
        message: "Video uploaded and thumbnails generated",
        videoData: {
          filename: finalFilename,
          videoUrl,
          fileSize: req.file.size,
          thumbnailUrls,
          thumbnailPrefix,
        },
      });
    } catch (error) {
      console.error("Temp video upload error:", error);

      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }

      res.status(500).json({
        success: false,
        message: "Server error during video upload: " + error.message,
      });
    }
  },
);

// @route   POST /api/upload/finalize-video
// @desc    Finalize pre-uploaded video with metadata
// @access  Private
router.post(
  "/finalize-video",
  auth,
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
      // Check for validation errors
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: errors.array(),
        });
      }

      const {
        videoFilename,
        title,
        description,
        category,
        tags: tagsJson,
        isPrivate,
        selectedThumbnailUrl,
      } = req.body;

      if (!videoFilename || !title) {
        return res.status(400).json({
          success: false,
          message: "Video filename and title are required",
        });
      }

      // Parse tags
      let tags = [];
      if (tagsJson) {
        try {
          tags = JSON.parse(tagsJson);
          if (!Array.isArray(tags)) tags = [];
        } catch (e) {
          tags = [];
        }
      }

      const videoUrl = `/uploads/videos/${videoFilename}`;

      // Extract just the path from selectedThumbnailUrl (remove http://localhost:5000 if present)
      let thumbnailUrl = selectedThumbnailUrl || "";
      if (thumbnailUrl && thumbnailUrl.includes("localhost:5000")) {
        thumbnailUrl = thumbnailUrl.replace(/^https?:\/\/[^\/]+/, "");
      }

      // If Cloudinary URLs are detected, use them directly
      const isCloudVideo =
        videoFilename.startsWith("http") || req.body.cloudinary === "true";
      const finalVideoUrl = isCloudVideo
        ? req.body.videoUrl || videoFilename
        : videoUrl;
      const finalThumbnailUrl = thumbnailUrl.startsWith("http")
        ? thumbnailUrl
        : thumbnailUrl;

      console.log("Finalizing video:", {
        title,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl,
        category,
        creator: req.user.userId,
      });

      // Create video in database
      const video = new Video({
        title: title.trim(),
        description: description?.trim() || "",
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl,
        videoType: "uploaded",
        duration: 0,
        fileSize: 0,
        category,
        tags,
        creator: req.user.userId,
        isPrivate: isPrivate === "true" || isPrivate === true,
        status: "approved",
        uploadedAt: new Date(),
        publishedAt: new Date(),
      });

      await video.save();

      res.status(201).json({
        success: true,
        message: "Video finalized successfully",
        video: {
          _id: video._id,
          id: video._id,
          title: video.title,
          description: video.description,
          thumbnailUrl: video.thumbnailUrl,
          category: video.category,
          tags: video.tags,
          status: video.status,
          uploadedAt: video.uploadedAt,
        },
      });
    } catch (error) {
      console.error("Finalize video error:", error);
      res.status(500).json({
        success: false,
        message: "Server error while finalizing video",
      });
    }
  },
);

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
        req.file ? req.file.filename : "No file",
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

      // Get video metadata
      const videoUrl = `/uploads/videos/${req.file.filename}`;
      const fileSize = req.file.size;

      // Generate thumbnail immediately
      const thumbnailPrefix = `thumb-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const primaryThumbnailPath = path.join(
        thumbnailsDir,
        `${thumbnailPrefix}_1.png`,
      );
      const primaryThumbnailUrl = `/uploads/thumbnails/${thumbnailPrefix}_1.png`;

      console.log("Starting thumbnail generation at 20% of video...");
      console.log("Video path:", path.join(videosDir, req.file.filename));
      console.log("Thumbnail output path:", primaryThumbnailPath);

      // Generate primary thumbnail at 20% of video
      ffmpeg(path.join(videosDir, req.file.filename))
        .on("start", (cmd) => {
          console.log("FFmpeg started - generating thumbnail");
        })
        .on("end", async () => {
          console.log("Thumbnail generation completed successfully");

          // Create video record in database
          const video = new Video({
            title,
            description: description || "",
            videoUrl,
            thumbnailUrl: primaryThumbnailUrl,
            thumbnailOptions: [primaryThumbnailUrl],
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

          try {
            await video.save();
            console.log("Video saved to database with thumbnail");
          } catch (dbError) {
            console.error("Error saving video to database:", dbError);
          }
        })
        .on("error", (err) => {
          console.error("FFmpeg error:", err.message);
          console.error("Full error:", err);
        })
        .screenshots({
          timestamps: ["20%"],
          filename: `${thumbnailPrefix}_1.png`,
          folder: thumbnailsDir,
          size: "640x360",
        })
        .run();

      // Return response immediately (don't wait for thumbnail)
      const video = new Video({
        title,
        description: description || "",
        videoUrl,
        thumbnailUrl: primaryThumbnailUrl,
        thumbnailOptions: [primaryThumbnailUrl],
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

      try {
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
      } catch (saveError) {
        console.error("Error saving video:", saveError);
        res.status(500).json({
          success: false,
          message: "Error saving video information",
        });
      }
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
  },
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
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No thumbnail file uploaded",
        });
      }

      const video = await Video.findById(req.params.videoId);
      if (!video) {
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
  },
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
        "title description thumbnailUrl duration category status views uploadedAt publishedAt likes comments",
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
