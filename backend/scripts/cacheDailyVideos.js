#!/usr/bin/env node

/**
 * Daily YouTube Video Caching Script
 * Run this script once per day to cache new educational videos
 *
 * Usage:
 *   node backend/scripts/cacheDailyVideos.js [count]
 *
 * Example:
 *   node backend/scripts/cacheDailyVideos.js 28
 */

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const mongoose = require("mongoose");
const youtubeCacheService = require("../services/youtubeCacheService");

const VIDEOS_TO_CACHE = parseInt(process.argv[2]) || 28; // Default 28 videos

async function main() {
  try {
    console.log("=".repeat(60));
    console.log("YouTube Video Caching Script");
    console.log("=".repeat(60));
    console.log(`Target: Cache ${VIDEOS_TO_CACHE} new educational videos`);
    console.log(`Started: ${new Date().toISOString()}`);
    console.log("-".repeat(60));

    // Connect to MongoDB
    const mongoURI =
      process.env.MONGODB_URI || "mongodb://localhost:27017/nudl";
    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ MongoDB connected");

    // Get current cache stats
    console.log("\nCurrent cache status:");
    const statsBefore = await youtubeCacheService.getCacheStats();
    if (statsBefore) {
      console.log(`  Total active videos: ${statsBefore.totalActive}`);
      console.log(`  Total inactive videos: ${statsBefore.totalInactive}`);
      console.log(`  Last cached: ${statsBefore.lastCached || "Never"}`);
      console.log("\n  Videos by subject:");
      statsBefore.bySubject.forEach((s) => {
        console.log(`    ${s.subject}: ${s.count}`);
      });
    }

    // Cache new videos
    console.log(`\nFetching ${VIDEOS_TO_CACHE} new videos from YouTube...`);
    const result = await youtubeCacheService.cacheNewVideos(VIDEOS_TO_CACHE);

    // Display results
    console.log("\n" + "=".repeat(60));
    console.log("RESULTS");
    console.log("=".repeat(60));

    if (result.success) {
      console.log(`✅ Success: Cached ${result.cachedCount} new videos`);
      console.log(`   Total fetched from API: ${result.totalFetched}`);

      if (result.errors && result.errors.length > 0) {
        console.log(`\n⚠️  Errors encountered: ${result.errors.length}`);
        result.errors.forEach((err, i) => {
          console.log(`   ${i + 1}. Video ${err.videoId}: ${err.error}`);
        });
      }
    } else {
      console.log(`❌ Failed: ${result.error}`);
      process.exit(1);
    }

    // Get updated stats
    console.log("\nUpdated cache status:");
    const statsAfter = await youtubeCacheService.getCacheStats();
    if (statsAfter) {
      console.log(`  Total active videos: ${statsAfter.totalActive}`);
      console.log(
        `  Growth: +${
          statsAfter.totalActive - (statsBefore?.totalActive || 0)
        } videos`
      );
      console.log(`  Last cached: ${statsAfter.lastCached}`);
    }

    // Clean up old videos (optional - runs if enabled)
    const cleanupOldVideos = process.env.AUTO_CLEANUP_OLD_VIDEOS === "true";
    if (cleanupOldVideos) {
      const daysToKeep = parseInt(process.env.DAYS_TO_KEEP_VIDEOS) || 30;
      console.log(`\nCleaning up videos older than ${daysToKeep} days...`);
      const removedCount = await youtubeCacheService.removeOldVideos(
        daysToKeep
      );
      console.log(`✅ Removed ${removedCount} old videos`);
    }

    console.log("\n" + "=".repeat(60));
    console.log(`Completed: ${new Date().toISOString()}`);
    console.log("=".repeat(60));

    // Close MongoDB connection
    await mongoose.connection.close();
    console.log("MongoDB connection closed");

    process.exit(0);
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ FATAL ERROR");
    console.error("=".repeat(60));
    console.error(error);

    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
    }

    process.exit(1);
  }
}

// Run the script
main();
