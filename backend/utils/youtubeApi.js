require("dotenv").config();

const API_KEY = process.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

const searchVideosByKeywords = async (
  query,
  maxResults = 10,
  pageToken = ""
) => {
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: maxResults.toString(),
    order: "relevance",
    videoDuration: "short",
    videoDefinition: "high",
    key: API_KEY,
    safeSearch: "moderate",
    relevanceLanguage: "en",
    regionCode: "US",
    videoCategoryId: "27", // Education category
  });

  if (pageToken) {
    searchParams.append("pageToken", pageToken);
  }

  const searchResponse = await fetch(`${BASE_URL}/search?${searchParams}`);

  if (!searchResponse.ok) {
    throw new Error(`YouTube API search failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  return searchData;
};

const searchEducationalVideos = async (maxResults = 10, pageToken = "") => {
  const educationalQueries = [
    "mathematics lesson",
    "physics explained",
    "chemistry tutorial",
    "biology lecture",
    "world history",
    "literature analysis",
    "geography explained",
    "computer science lesson",
    "programming tutorial",
    "algebra explained",
    "calculus lesson",
    "statistics explained",
    "economics lesson",
    "philosophy explained",
    "psychology lecture",
    "sociology lesson",
    "political science explained",
    "engineering tutorial",
    "anatomy explained",
    "astronomy lesson",
    "foreign language lesson",
    "grammar explained",
    "trigonometry tutorial",
    "geometry lesson",
    "organic chemistry",
    "cell biology",
    "ancient history",
    "english literature",
  ];

  const randomQuery =
    educationalQueries[Math.floor(Math.random() * educationalQueries.length)];

  const searchParams = new URLSearchParams({
    part: "snippet",
    q: randomQuery,
    type: "video",
    maxResults: maxResults.toString(),
    order: "relevance",
    videoDuration: "short",
    videoDefinition: "high",
    key: API_KEY,
    safeSearch: "moderate",
    relevanceLanguage: "en",
    regionCode: "US",
    videoCategoryId: "27", // Education category
  });

  if (pageToken) {
    searchParams.append("pageToken", pageToken);
  }

  const searchResponse = await fetch(`${BASE_URL}/search?${searchParams}`);

  if (!searchResponse.ok) {
    throw new Error(`YouTube API search failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  return searchData;
};

const getDiverseEducationalFeed = async (count = 10, publishedAfter = null) => {
  const educationalQueries = [
    "mathematics lesson",
    "physics explained",
    "chemistry tutorial",
    "biology lecture",
    "world history",
    "literature analysis",
    "geography explained",
    "computer science lesson",
    "programming tutorial",
    "algebra explained",
    "calculus lesson",
    "statistics explained",
    "economics lesson",
    "philosophy explained",
    "psychology lecture",
    "sociology lesson",
    "political science explained",
    "engineering tutorial",
    "anatomy explained",
    "astronomy lesson",
    "foreign language lesson",
    "grammar explained",
    "trigonometry tutorial",
    "geometry lesson",
    "organic chemistry",
    "cell biology",
    "ancient history",
    "english literature",
  ];

  // Shuffle the queries to get random variety
  const shuffledQueries = educationalQueries
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  try {
    // Search for one video per keyword in parallel
    const searchPromises = shuffledQueries.map(async (query) => {
      try {
        const searchParams = new URLSearchParams({
          part: "snippet",
          q: query,
          type: "video",
          maxResults: "3", // Get 3 results to have options after duration filtering
          order: "date",
          videoDuration: "short",
          videoDefinition: "high",
          key: API_KEY,
          safeSearch: "moderate",
          relevanceLanguage: "en",
          regionCode: "US",
          videoCategoryId: "27", // Education category
        });

        if (publishedAfter) {
          searchParams.append("publishedAfter", publishedAfter);
        }

        const searchResponse = await fetch(
          `${BASE_URL}/search?${searchParams}`
        );

        if (!searchResponse.ok) {
          console.warn(`Search failed for "${query}"`);
          return null;
        }

        const searchData = await searchResponse.json();

        if (!searchData.items || searchData.items.length === 0) {
          return null;
        }

        // Get video details to filter by duration
        const videoIds = searchData.items
          .map((item) => item.id.videoId)
          .join(",");
        const detailsData = await getVideoDetails(videoIds);

        // Find first video under 5 minutes
        const validVideo = detailsData.items?.find((video) => {
          const duration = video.contentDetails?.duration || "PT0S";
          const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (!match) return false;

          const hours = parseInt(match[1]) || 0;
          const minutes = parseInt(match[2]) || 0;
          const seconds = parseInt(match[3]) || 0;
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;

          return totalSeconds <= 300; // 5 minutes
        });

        return validVideo || null;
      } catch (error) {
        console.warn(`Failed to fetch video for "${query}":`, error.message);
        return null;
      }
    });

    // Wait for all searches to complete
    const results = await Promise.all(searchPromises);

    // Filter out nulls and return valid videos
    return results.filter((video) => video !== null);
  } catch (error) {
    console.error("Error getting diverse educational feed:", error);
    return [];
  }
};

const getVideoDetails = async (videoIds) => {
  const detailsParams = new URLSearchParams({
    part: "contentDetails,statistics,snippet",
    id: videoIds,
    key: API_KEY,
  });

  const detailsResponse = await fetch(`${BASE_URL}/videos?${detailsParams}`);

  if (!detailsResponse.ok) {
    throw new Error(`YouTube API videos failed: ${detailsResponse.status}`);
  }

  const detailsData = await detailsResponse.json();
  return detailsData;
};

module.exports = {
  searchEducationalVideos,
  searchVideosByKeywords,
  getVideoDetails,
  getDiverseEducationalFeed,
};
