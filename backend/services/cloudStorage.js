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
  // On Render, skip Cloudinary unless explicitly opted in.
  // Prevents broken uploads when stale/invalid Cloudinary env vars are set.
  if (process.env.RENDER && process.env.USE_CLOUDINARY !== "true") {
    return false;
  }

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
  // Verify the configuration is actually valid
  const cfg = cloudinary.config();
  if (!cfg.cloud_name || !cfg.api_key || !cfg.api_secret) {
    console.error(
      "⚠️  Cloudinary env vars present but config incomplete — cloud_name:",
      !!cfg.cloud_name,
      "api_key:",
      !!cfg.api_key,
      "api_secret:",
      !!cfg.api_secret,
    );
  } else {
    console.log("☁️  Cloudinary configured — uploads will go to the cloud");
  }
} else {
  console.log(
    "📁 Cloudinary not configured — uploads will use local disk storage",
  );
  if (process.env.RENDER) {
    console.log(
      "   To enable Cloudinary on Render, set USE_CLOUDINARY=true and CLOUDINARY_URL (or CLOUDINARY_CLOUD_NAME + CLOUDINARY_API_KEY + CLOUDINARY_API_SECRET) in the Render dashboard",
    );
  }
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

// Video storage — always use local disk; we upload to Cloudinary manually
// in the route handler for reliability (multer-storage-cloudinary is unreliable)
function getVideoStorage() {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, videosDir),
    filename: (_req, file, cb) => {
      const suffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(null, `video-${suffix}${path.extname(file.originalname)}`);
    },
  });
}

// Upload a local file to Cloudinary (returns { secure_url, public_id, bytes })
// Uses chunked upload for files > 6MB for reliability on slow connections
// Poll Cloudinary until a pending resource is fully processed
async function waitForCloudinaryResource(publicId, resourceType = "video", maxAttempts = 30, intervalMs = 3000) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const resource = await cloudinary.api.resource(publicId, {
        resource_type: resourceType,
      });
      if (resource && resource.secure_url) {
        console.log(`[Cloudinary] Resource ready after ${i + 1} poll(s)`);
        return resource;
      }
    } catch (err) {
      // Resource may not be queryable yet — keep polling
      console.log(`[Cloudinary] Poll ${i + 1}/${maxAttempts}: not ready yet (${err.message})`);
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Cloudinary resource ${publicId} did not become ready after ${maxAttempts} attempts`);
}

function uploadToCloudinary(filePath, options = {}) {
  const fileSize = fs.statSync(filePath).size;
  const useChunked = fileSize > 6 * 1024 * 1024; // 6MB threshold

  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder: options.folder || "nudl/videos",
      resource_type: options.resource_type || "video",
      timeout: 300000, // 5 minute timeout
      ...options,
    };

    const handleResult = async (error, result) => {
      if (error) return reject(error);

      // Cloudinary may return a "pending" status for large chunked uploads
      // before the resource is fully processed. Poll until it's ready.
      if (result && result.public_id && result.status === "pending" && !result.secure_url) {
        console.log(
          `[Cloudinary] Upload accepted but pending (public_id: ${result.public_id}). Polling for completion...`,
        );
        try {
          const ready = await waitForCloudinaryResource(
            result.public_id,
            uploadOptions.resource_type || "video",
          );
          return resolve(ready);
        } catch (pollErr) {
          pollErr._cloudinaryPublicId = result.public_id;
          return reject(pollErr);
        }
      }

      if (!result || !result.secure_url) {
        const err = new Error(
          "Cloudinary returned an invalid response (no secure_url). Result: " +
            JSON.stringify(result),
        );
        // Attach public_id so callers can clean up the orphaned resource
        if (result && result.public_id) {
          err._cloudinaryPublicId = result.public_id;
        }
        return reject(err);
      }
      resolve(result);
    };

    if (useChunked) {
      console.log(
        `[Cloudinary] Using chunked upload for ${(fileSize / 1024 / 1024).toFixed(1)}MB file`,
      );
      uploadOptions.chunk_size = 6000000; // 6MB chunks
      cloudinary.uploader.upload_large(filePath, uploadOptions, handleResult);
    } else {
      cloudinary.uploader.upload(filePath, uploadOptions, handleResult);
    }
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
  uploadToCloudinary,
  resolveUrl,
  deleteResource,
  // Expose dirs for legacy code that still references them
  videosDir,
  thumbnailsDir,
  avatarsDir,
};
