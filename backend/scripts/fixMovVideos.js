/**
 * One-time migration: Rename any .mov video files to .mp4 on disk
 * and update the corresponding MongoDB records.
 *
 * MOV and MP4 share the same ISO BMFF container format, so H.264-encoded
 * .mov files (the default from iPhones/iPads) play perfectly as .mp4.
 *
 * Usage:  MONGODB_URI=<uri> node scripts/fixMovVideos.js
 */

const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

// Load env
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const Video = require("../models/Video");

const videosDir = path.join(__dirname, "..", "uploads", "videos");

async function fixMovVideos() {
  const mongoURI = process.env.MONGODB_URI || "mongodb://localhost:27017/nudl";
  console.log("Connecting to MongoDB...");
  await mongoose.connect(mongoURI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  console.log("Connected.");

  // Find all videos with .mov in their videoUrl
  const movVideos = await Video.find({
    videoUrl: { $regex: /\.mov$/i },
  });

  console.log(`Found ${movVideos.length} video(s) with .mov URLs`);

  for (const video of movVideos) {
    const oldUrl = video.videoUrl;
    const newUrl = oldUrl.replace(/\.mov$/i, ".mp4");

    // Try to rename the physical file
    const oldFilename = path.basename(oldUrl);
    const newFilename = path.basename(newUrl);
    const oldPath = path.join(videosDir, oldFilename);
    const newPath = path.join(videosDir, newFilename);

    if (fs.existsSync(oldPath)) {
      try {
        fs.renameSync(oldPath, newPath);
        console.log(`  Renamed file: ${oldFilename} → ${newFilename}`);
      } catch (err) {
        console.warn(`  Could not rename file: ${err.message}`);
        // Update DB anyway — the MIME type fix in server.js will help
      }
    } else {
      console.log(`  File not found on disk: ${oldPath} (may be on remote server)`);
    }

    // Update MongoDB record
    video.videoUrl = newUrl;
    await video.save();
    console.log(`  Updated DB: ${oldUrl} → ${newUrl}`);
  }

  console.log("Done.");
  await mongoose.disconnect();
}

fixMovVideos().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
