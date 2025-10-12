import {
  searchEducationalVideos,
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
    creator: `@${snippet.channelTitle}`,
    avatar:
      snippet.thumbnails?.default?.url ||
      "https://via.placeholder.com/40x40?text=YT",
    videoUrl: `https://www.youtube.com/embed/${youtubeVideo.id}`,
    videoType: "youtube",
    likes: "0",
    comments: "0",
    shares: "0",
    description: "",
    isVerified: true,
    duration: parseDuration(youtubeVideo.contentDetails.duration),
    thumbnail:
      snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url,
    publishedAt: snippet.publishedAt,
    viewCount: 0,
  };
};

export const getEducationalVideoFeed = async (count = 10) => {
  try {
    const searchData = await searchEducationalVideos(count);
    const videoIds = searchData.items.map((item) => item.id.videoId).join(",");

    const detailsData = await getVideoDetails(videoIds);

    const filteredVideos = detailsData.items.filter((video) => {
      const duration = parseDuration(video.contentDetails.duration);
      return duration <= 90;
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
            return duration <= 90;
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
};
