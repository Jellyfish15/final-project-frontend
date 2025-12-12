const mongoose = require("mongoose");
require("dotenv").config();

// MongoDB URIs
const LOCAL_URI = "mongodb://localhost:27017/nudl";
const ATLAS_URI = process.env.MONGODB_URI;

// Schema
const youtubeVideoSchema = new mongoose.Schema({
  videoId: { type: String, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  channelTitle: String,
  publishedAt: Date,
  thumbnailUrl: String,
  subject: String,
  active: { type: Boolean, default: true },
  cachedAt: { type: Date, default: Date.now },
});

async function migrateData() {
  console.log("============================================================");
  console.log("YouTube Videos Migration Script");
  console.log("============================================================");
  console.log(`From: ${LOCAL_URI}`);
  console.log(
    `To: ${ATLAS_URI.replace(
      /mongodb\+srv:\/\/[^:]+:[^@]+@/,
      "mongodb+srv://***:***@"
    )}`
  );
  console.log("------------------------------------------------------------\n");

  // Connect to local MongoDB
  console.log("Connecting to local MongoDB...");
  const localConn = await mongoose.createConnection(LOCAL_URI).asPromise();
  console.log("✅ Connected to local MongoDB\n");

  // Connect to Atlas
  console.log("Connecting to MongoDB Atlas...");
  const atlasConn = await mongoose.createConnection(ATLAS_URI).asPromise();
  console.log("✅ Connected to MongoDB Atlas\n");

  // Create models
  const LocalVideo = localConn.model("YouTubeVideo", youtubeVideoSchema);
  const AtlasVideo = atlasConn.model("YouTubeVideo", youtubeVideoSchema);

  // Fetch all videos from local
  console.log("Fetching videos from local database...");
  const localVideos = await LocalVideo.find({});
  console.log(`Found ${localVideos.length} videos in local database\n`);

  if (localVideos.length === 0) {
    console.log("❌ No videos to migrate");
    await localConn.close();
    await atlasConn.close();
    process.exit(0);
  }

  // Check existing videos in Atlas
  console.log("Checking existing videos in Atlas...");
  const existingCount = await AtlasVideo.countDocuments();
  console.log(`Found ${existingCount} existing videos in Atlas\n`);

  // Migrate videos
  console.log("Starting migration...");
  let inserted = 0;
  let skipped = 0;

  for (const video of localVideos) {
    try {
      // Check if video already exists
      const exists = await AtlasVideo.findOne({ videoId: video.videoId });
      if (exists) {
        skipped++;
        continue;
      }

      // Insert new video
      await AtlasVideo.create({
        videoId: video.videoId,
        title: video.title,
        description: video.description,
        channelTitle: video.channelTitle,
        publishedAt: video.publishedAt,
        thumbnailUrl: video.thumbnailUrl,
        subject: video.subject,
        active: video.active,
        cachedAt: video.cachedAt,
      });
      inserted++;
      process.stdout.write(`\rInserted: ${inserted} | Skipped: ${skipped}`);
    } catch (error) {
      console.error(
        `\n❌ Error migrating video ${video.videoId}:`,
        error.message
      );
    }
  }

  console.log(
    "\n\n============================================================"
  );
  console.log("MIGRATION COMPLETE");
  console.log("============================================================");
  console.log(`✅ Inserted: ${inserted} videos`);
  console.log(`⏭️  Skipped: ${skipped} videos (already exist)`);
  console.log(`📊 Total in Atlas: ${await AtlasVideo.countDocuments()} videos`);
  console.log("============================================================\n");

  await localConn.close();
  await atlasConn.close();
}

migrateData().catch((error) => {
  console.error("❌ Migration failed:", error);
  process.exit(1);
});
