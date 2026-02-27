const express = require("express");
const multer = require("multer");
const ffmpeg = require("fluent-ffmpeg");
const fs = require("fs");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const path = require("path");
require("dotenv").config();

const {
  initializeScheduledTasks,
  stopScheduledTasks,
} = require("./scheduledTasks");

const upload = multer({ dest: "uploads/" });
const app = express();
const PORT = process.env.PORT || 5000;

// Store scheduled tasks for cleanup
let scheduledTasks = null;

// Security middleware
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
});
app.use("/api/", limiter);

// CORS configuration
app.use(
  cors({
    origin: "*", // Allow all origins for now
    credentials: false,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-auth-token"],
    exposedHeaders: ["Content-Range", "X-Content-Range"],
    maxAge: 86400, // 24 hours
  }),
);

// Handle preflight requests explicitly
app.options("*", cors());

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Compression and logging
app.use(compression());
app.use(morgan("combined"));

// Static file serving for uploads with proper MIME types
app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads"), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".mp4")) {
        res.setHeader("Content-Type", "video/mp4");
      } else if (filePath.endsWith(".webm")) {
        res.setHeader("Content-Type", "video/webm");
      } else if (filePath.endsWith(".mov")) {
        res.setHeader("Content-Type", "video/quicktime");
      } else if (filePath.endsWith(".jpg") || filePath.endsWith(".jpeg")) {
        res.setHeader("Content-Type", "image/jpeg");
      } else if (filePath.endsWith(".png")) {
        res.setHeader("Content-Type", "image/png");
      }
      // Enable range requests for video streaming
      res.setHeader("Accept-Ranges", "bytes");
    },
  }),
);

// Database connection
const connectDB = async () => {
  try {
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/nudl";
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    process.exit(1);
  }
};

app.post("/upload", upload.single("video"), (req, res) => {
  const videoPath = req.file.path;
  const thumbnailPath = `thumbnails/${req.file.filename}.png`;

  ffmpeg(videoPath)
    .on("end", () => {
      // Save video and thumbnail info to DB here
      res.json({ videoUrl: videoPath, thumbnailUrl: thumbnailPath });
    })
    .on("error", (err) => {
      res
        .status(500)
        .json({ error: "Thumbnail generation failed", details: err.message });
    })
    .screenshots({
      timestamps: ["00:00:01"],
      filename: `${req.file.filename}.png`,
      folder: "thumbnails",
      size: "320x240",
    });
});

// Routes
app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/videos", require("./routes/videos"));
app.use("/api/upload", require("./routes/upload"));
app.use("/api/youtube-cache", require("./routes/youtubeCache"));
app.use("/api/feed", require("./routes/feed"));
app.use("/api/engagement", require("./routes/engagement"));

// Video streaming route with range request support
app.get("/stream/video/:filename", (req, res) => {
  const videoPath = path.join(
    __dirname,
    "uploads",
    "videos",
    req.params.filename,
  );

  if (!fs.existsSync(videoPath)) {
    return res.status(404).send("Video not found");
  }

  const stat = fs.statSync(videoPath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(videoPath, { start, end });
    const head = {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "video/mp4",
    };

    res.writeHead(206, head);
    file.pipe(res);
  } else {
    const head = {
      "Content-Length": fileSize,
      "Content-Type": "video/mp4",
      "Accept-Ranges": "bytes",
    };
    res.writeHead(200, head);
    fs.createReadStream(videoPath).pipe(res);
  }
});

// Health check endpoint (for Render and monitoring)
app.get("/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Error:", err.stack);

  // Mongoose validation errors
  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: "Validation Error",
      errors,
    });
  }

  // Mongoose duplicate key errors
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue)[0];
    return res.status(400).json({
      success: false,
      message: `${field} already exists`,
    });
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return res.status(401).json({
      success: false,
      message: "Invalid token",
    });
  }

  // Default error
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Graceful shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received. Shutting down gracefully...");

  // Stop scheduled tasks
  if (scheduledTasks) {
    stopScheduledTasks(scheduledTasks);
  }

  await mongoose.connection.close();
  console.log("MongoDB connection closed.");
  process.exit(0);
});

// Start server
const startServer = async () => {
  await connectDB();

  // Initialize scheduled tasks
  scheduledTasks = initializeScheduledTasks();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || "development"}`);
    console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
    console.log(`🌐 Server bound to 0.0.0.0:${PORT}`);
  });
};

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});

module.exports = app;
