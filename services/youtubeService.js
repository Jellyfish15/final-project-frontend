import {
  searchEducationalVideos,
  searchVideosByKeywords,
  getVideoDetails,
  getDiverseEducationalFeed,
} from "../utils/YouTubeApi.js";

const parseDuration = (duration) => {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;

  const hours = parseInt(match[1]) || 0;
  const minutes = parseInt(match[2]) || 0;
  const seconds = parseInt(match[3]) || 0;

  return hours * 3600 + minutes * 60 + seconds;
};

export const formatVideoForApp = (youtubeVideo) => {
  const snippet = youtubeVideo.snippet;

  return {
    id: youtubeVideo.id,
    title: snippet.title,
    creator: {
      username: snippet.channelTitle,
      displayName: snippet.channelTitle,
      isVerified: true,
    },
    avatar:
      snippet.thumbnails?.default?.url ||
      "https://via.placeholder.com/40x40?text=YT",
    videoUrl: `https://www.youtube.com/embed/${youtubeVideo.id}`,
    videoType: "youtube",
    likes: "0",
    comments: "0",
    shares: "0",
    description: snippet.description || "",
    isVerified: true,
    duration: parseDuration(youtubeVideo.contentDetails?.duration || "PT0S"),
    thumbnailUrl:
      snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
    thumbnail:
      snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
    publishedAt: snippet.publishedAt,
    viewCount: youtubeVideo.statistics?.viewCount || 0,
    views: youtubeVideo.statistics?.viewCount || "0",
  };
};

export const searchYouTubeVideos = async (query, count = 10) => {
  try {
    console.log(`Searching YouTube for: "${query}"`);

    const searchData = await searchVideosByKeywords(query, count);
    console.log("YouTube search response:", searchData);

    if (!searchData.items || searchData.items.length === 0) {
      console.log("No YouTube videos found for query:", query);
      return [];
    }

    console.log(`Found ${searchData.items.length} videos from search`);
    const videoIds = searchData.items.map((item) => item.id.videoId).join(",");
    console.log("Video IDs:", videoIds);

    const detailsData = await getVideoDetails(videoIds);
    console.log("Video details response:", detailsData);

    if (!detailsData.items || detailsData.items.length === 0) {
      console.log("No video details found");
      return [];
    }

    const filteredVideos = detailsData.items.filter((video) => {
      const duration = parseDuration(video.contentDetails?.duration || "PT0S");
      return duration <= 180; // Prioritize videos under 3 minutes (ideal for Shorts)
    });

    console.log(
      `Filtered to ${filteredVideos.length} videos under 3 minutes (Shorts-friendly)`
    );
    const formattedVideos = filteredVideos.map(formatVideoForApp);

    console.log(
      `Found ${formattedVideos.length} YouTube videos for: "${query}"`
    );
    console.log("Formatted videos:", formattedVideos);
    return formattedVideos.slice(0, count);
  } catch (error) {
    console.error("Error searching YouTube videos:", error);
    console.error("Error details:", error.message, error.stack);
    return [];
  }
};

export const getEducationalVideoFeed = async (count = 10) => {
  try {
    console.log(`Fetching diverse educational feed with ${count} videos...`);

    // Use the new diverse feed function to get one video per keyword
    const diverseVideos = await getDiverseEducationalFeed(count);

    if (!diverseVideos || diverseVideos.length === 0) {
      console.warn(
        "Diverse feed returned no videos, falling back to regular search"
      );
      // Fallback to old method if diverse feed fails
      const searchData = await searchEducationalVideos(count);

      if (!searchData.items || searchData.items.length === 0) {
        return [];
      }

      const videoIds = searchData.items
        .map((item) => item.id.videoId)
        .join(",");
      const detailsData = await getVideoDetails(videoIds);

      const filteredVideos = detailsData.items.filter((video) => {
        const duration = parseDuration(video.contentDetails.duration);
        return duration <= 300;
      });

      return filteredVideos.map(formatVideoForApp).slice(0, count);
    }

    // Format the diverse videos for the app
    const formattedVideos = diverseVideos.map(formatVideoForApp);

    console.log(
      `Successfully loaded ${formattedVideos.length} diverse educational videos`
    );
    console.log(
      "Topics covered:",
      formattedVideos.map((v) => v.title).join(", ")
    );

    return formattedVideos;
  } catch (error) {
    console.error("Error getting educational video feed:", error);
    return [];
  }
};

export default {
  formatVideoForApp,
  getEducationalVideoFeed,
  searchYouTubeVideos,
};
