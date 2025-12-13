const mongoose = require("mongoose");

const MONGODB_URI =
  process.env.MONGODB_URI ||
  "mongodb+srv://stgenad_db_user:oCLG9w9BPlqMOlld@nudlcluster.44n1j2w.mongodb.net/nudl?appName=NudlCluster";

async function fixVideos() {
  console.log("Connecting to MongoDB Atlas...");
  await mongoose.connect(MONGODB_URI);
  console.log("Connected!\n");

  const collection = mongoose.connection.db.collection("youtubevideos");

  // Get all videos missing videoUrl or duration
  const videos = await collection
    .find({
      $or: [
        { videoUrl: { $exists: false } },
        { duration: { $exists: false } },
        { viewCount: { $exists: false } },
      ],
    })
    .toArray();

  console.log(`Found ${videos.length} videos to update\n`);

  let updated = 0;
  for (const video of videos) {
    const updates = {};

    if (!video.videoUrl) {
      updates.videoUrl = `https://www.youtube.com/watch?v=${video.videoId}`;
    }

    if (!video.duration) {
      updates.duration = 180; // Default 3 minutes
    }

    if (!video.viewCount) {
      updates.viewCount = 0;
    }

    await collection.updateOne({ _id: video._id }, { $set: updates });

    updated++;
    process.stdout.write(`\rUpdated: ${updated}/${videos.length}`);
  }

  console.log("\n\nDone! All videos now have required fields.");

  await mongoose.connection.close();
}

fixVideos().catch(console.error);
