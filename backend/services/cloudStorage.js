/**
 * Cloudinary storage service.
 *
 * When the CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME + KEY + SECRET) env vars
 * are set, uploads go to Cloudinary. Otherwise we fall back to local disk
 * storage so development "just works" without any cloud credentials.
 */

const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

// ── Configuration ──────────────────────────────

const isCloudinaryConfigured = () => {
  return !!(
    process.env.CLOUDINARY_URL ||
    (process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET)
  );
};

if (isCloudinaryConfigured()) {
  // CLOUDINARY_URL takes precedence (format: cloudinary://key:secret@cloud_name)
  if (!process.env.CLOUDINARY_URL) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
  }
  console.log("☁️  Cloudinary configured — uploads will go to the cloud");
} else {
  console.log(
    "📁 Cloudinary not configured — uploads will use local disk storage",
  );
}

// ── Local storage paths (fallback) ─────────────

const uploadsDir = path.join(__dirname, "../uploads");
const videosDir = path.join(uploadsDir, "videos");
const thumbnailsDir = path.join(uploadsDir, "thumbnails");
const avatarsDir = path.join(uploadsDir, "avatars");

[uploadsDir, videosDir, thumbnailsDir, avatarsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// ── Multer storages ────────────────────────────

// Video storage
function getVideoStorage() {
  if (isCloudinaryConfigured()) {
    return new CloudinaryStorage({
      cloudinary,
      params: {
        folder: "nudl/videos",
        resource_type: "video",
        allowed_formats: ["mp4", "webm", "mov", "mpeg"],
        transformation: [
          { quality: "auto", fetch_format: "mp4" },
        ],
      },
    });
  }

  // Local disk fallback
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, videosDir),
    filename: (_req, file, cb) => {
      const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `video-${suffix}${path.extname(file.originalname)}`);
    },
  });
}

// Image / thumbnail / avatar storage
function getImageStorage(subFolder = "thumbnails") {
  if (isCloudinaryConfigured()) {
    return new CloudinaryStorage({
      cloudinary,
      params: {
        folder: `nudl/${subFolder}`,
        resource_type: "image",
        allowed_formats: ["jpg", "jpeg", "png", "webp"],
        transformation: [{ quality: "auto", fetch_format: "auto" }],
      },
    });
  }

  const dest = subFolder === "avatars" ? avatarsDir : thumbnailsDir;
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dest),
    filename: (_req, file, cb) => {
      const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const prefix = subFolder === "avatars" ? "avatar" : "thumb";
      cb(null, `${prefix}-${suffix}${path.extname(file.originalname)}`);
    },
  });
}

// ── Helper: resolve a URL ──────────────────────
// Cloudinary returns full HTTPS URLs; local storage returns relative paths.

function resolveUrl(urlOrPath) {
  if (!urlOrPath) return urlOrPath;
  if (urlOrPath.startsWith("http")) return urlOrPath; // already absolute
  return urlOrPath; // local path — frontend prepends backend origin
}

// ── Helper: delete a resource from Cloudinary ──

async function deleteResource(urlOrPublicId, resourceType = "image") {
  if (!isCloudinaryConfigured()) return;
  try {
    // If given a full URL, extract the public_id
    let publicId = urlOrPublicId;
    if (urlOrPublicId.startsWith("http")) {
      // URL format: https://res.cloudinary.com/<cloud>/video/upload/v.../nudl/videos/abc.mp4
      const parts = urlOrPublicId.split("/upload/");
      if (parts[1]) {
        publicId = parts[1].replace(/^v\d+\//, "").replace(/\.[^/.]+$/, "");
      }
    }
    await cloudinary.uploader.destroy(publicId, {
      resource_type: resourceType,
    });
  } catch (err) {
    console.error("Cloudinary delete error:", err.message);
  }
}

module.exports = {
  cloudinary,
  isCloudinaryConfigured,
  getVideoStorage,
  getImageStorage,
  resolveUrl,
  deleteResource,
  // Expose dirs for legacy code that still references them
  videosDir,
  thumbnailsDir,
  avatarsDir,
};
