import {
  searchEducationalVideos,
  searchVideosByKeywords,
  getVideoDetails,
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
      return duration <= 600; // Allow up to 10 minutes for search results
    });

    console.log(`Filtered to ${filteredVideos.length} videos under 10 minutes`);
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
    const searchData = await searchEducationalVideos(count);

    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }

    const videoIds = searchData.items.map((item) => item.id.videoId).join(",");
    const detailsData = await getVideoDetails(videoIds);

    const filteredVideos = detailsData.items.filter((video) => {
      const duration = parseDuration(video.contentDetails.duration);
      return duration <= 300; // Increased to 5 minutes (300 seconds)
    });

    const formattedVideos = filteredVideos.map(formatVideoForApp);

    if (formattedVideos.length < count && searchData.nextPageToken) {
      try {
        const additionalSearchData = await searchEducationalVideos(
          count - formattedVideos.length,
          searchData.nextPageToken
        );
        const additionalVideoIds = additionalSearchData.items
          .map((item) => item.id.videoId)
          .join(",");
        const additionalDetailsData = await getVideoDetails(additionalVideoIds);

        const additionalFilteredVideos = additionalDetailsData.items.filter(
          (video) => {
            const duration = parseDuration(video.contentDetails.duration);
            return duration <= 300; // Increased to 5 minutes (300 seconds)
          }
        );

        const additionalVideos =
          additionalFilteredVideos.map(formatVideoForApp);
        formattedVideos.push(...additionalVideos);
      } catch (error) {
        console.warn("Additional search failed:", error);
      }
    }

    return formattedVideos.slice(0, count);
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
