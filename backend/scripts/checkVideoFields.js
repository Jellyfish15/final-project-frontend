const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://stgenad_db_user:oCLG9w9BPlqMOlld@nudlcluster.44n1j2w.mongodb.net/nudl?appName=NudlCluster";

async function checkFields() {
  await mongoose.connect(MONGODB_URI);
  
  const doc = await mongoose.connection.db.collection('youtubevideos').findOne({isActive: true});
  
  console.log('Video fields:', Object.keys(doc));
  console.log('\nSample video:');
  console.log(JSON.stringify(doc, null, 2));
  console.log('\nHas videoUrl:', !!doc.videoUrl);
  console.log('Has duration:', !!doc.duration);
  
  await mongoose.connection.close();
}

checkFields().catch(console.error);
