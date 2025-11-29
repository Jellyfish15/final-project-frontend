const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL =
  import.meta.env.VITE_YOUTUBE_API_BASE_URL ||
  "https://www.googleapis.com/youtube/v3";

export const searchVideosByKeywords = async (
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

export const searchEducationalVideos = async (
  maxResults = 10,
  pageToken = ""
) => {
  const educationalQueries = [
    "mathematics lesson",
    "science explained",
    "physics tutorial",
    "chemistry basics",
    "biology lecture",
    "history documentary",
    "literature analysis",
    "geography lesson",
    "computer science tutorial",
    "programming fundamentals",
    "algebra tutorial",
    "calculus explained",
    "statistics lesson",
    "economics basics",
    "philosophy introduction",
    "psychology concepts",
    "sociology explained",
    "political science",
    "engineering basics",
    "medical education",
    "anatomy lesson",
    "astronomy explained",
    "language learning",
    "grammar tutorial",
    "writing skills",
    "academic research",
    "study techniques",
    "test preparation",
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

export const getVideoDetails = async (videoIds) => {
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

export default {
  searchEducationalVideos,
  searchVideosByKeywords,
  getVideoDetails,
};
