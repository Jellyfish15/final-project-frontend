const cron = require("node-cron");
const youtubeCacheService = require("./services/youtubeCacheService");

/**
 * Initialize all scheduled tasks
 */
const initializeScheduledTasks = () => {
  console.log("[Scheduler] Initializing scheduled tasks...");

  // Daily cache refresh at 2 AM (02:00) every day
  // Cron format: minute hour day month dayOfWeek
  // 0 2 * * * = 2:00 AM daily
  const dailyCacheRefresh = cron.schedule("0 2 * * *", async () => {
    console.log("[Scheduler] 🔄 Starting daily cache refresh...");
    try {
      const result = await youtubeCacheService.cacheNewVideos(50);
      
      if (result.success) {
        console.log(
          `[Scheduler] ✅ Successfully cached ${result.cachedCount} new videos`
        );
        console.log(`[Scheduler] Total fetched: ${result.totalFetched}`);
        
        if (result.errors && result.errors.length > 0) {
          console.warn(
            `[Scheduler] ⚠️ Encountered ${result.errors.length} errors during caching`
          );
        }
      } else {
        console.error(
          `[Scheduler] ❌ Failed to cache videos: ${result.error}`
        );
      }

      // Log cache stats after refresh
      const stats = await youtubeCacheService.getCacheStats();
      if (stats) {
        console.log("[Scheduler] 📊 Cache Stats after refresh:");
        console.log(`  - Total Active: ${stats.totalActive}`);
        console.log(`  - Total Inactive: ${stats.totalInactive}`);
        console.log(`  - Subjects Covered: ${stats.bySubject.length}`);
      }
    } catch (error) {
      console.error(
        "[Scheduler] ❌ Error during daily cache refresh:",
        error.message
      );
    }
  });

  // Manual refresh endpoint hits this method, so daily cron provides automation

  // Optional: Alternative schedule - every 12 hours at 2 AM and 2 PM
  // const frequentRefresh = cron.schedule("0 2,14 * * *", async () => {
  //   // Runs at 2 AM and 2 PM daily
  // });

  // Optional: Weekly refresh on Sundays at 3 AM
  // const weeklyRefresh = cron.schedule("0 3 * * 0", async () => {
  //   // Runs every Sunday at 3 AM
  // });

  console.log(
    "[Scheduler] ✅ Scheduled tasks initialized:"
  );
  console.log(
    "  📅 Daily Cache Refresh: Every day at 2:00 AM (50 videos)"
  );
  console.log("  🕐 Timezone: Server local time");

  return {
    dailyCacheRefresh,
  };
};

/**
 * Stop all scheduled tasks
 */
const stopScheduledTasks = (tasks) => {
  console.log("[Scheduler] Stopping scheduled tasks...");
  if (tasks.dailyCacheRefresh) {
    tasks.dailyCacheRefresh.stop();
    console.log("[Scheduler] ✅ Daily cache refresh stopped");
  }
};

module.exports = {
  initializeScheduledTasks,
  stopScheduledTasks,
};
