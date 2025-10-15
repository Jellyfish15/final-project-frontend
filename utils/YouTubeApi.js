const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL =
  import.meta.env.VITE_YOUTUBE_API_BASE_URL ||
  "https://www.googleapis.com/youtube/v3";

// Debug logging for production troubleshooting
console.log("🔍 Environment Debug Info:");
console.log("- API Key exists:", !!API_KEY);
console.log("- API Key first 10 chars:", API_KEY ? API_KEY.substring(0, 10) + "..." : "undefined");
console.log("- Base URL:", BASE_URL);
console.log("- Environment mode:", import.meta.env.MODE);

export const searchEducationalVideos = async (
  maxResults = 10,
  pageToken = ""
) => {
  const educationalQueries = [
    "educational tutorial short",
    "quick learning tips",
    "science facts",
    "math tutorial",
    "how to learn",
    "educational content",
    "learning tutorial",
    "knowledge sharing",
    "skill tutorial",
    "educational shorts",
    "quick facts",
    "learning tips",
    "tutorial basics",
    "educational guide",
    "learning technique",
  ];

  const randomQuery =
    educationalQueries[Math.floor(Math.random() * educationalQueries.length)];

  console.log("🔍 Making YouTube API request:");
  console.log("- Query:", randomQuery);
  console.log("- Max results:", maxResults);
  
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
  });

  if (pageToken) {
    searchParams.append("pageToken", pageToken);
  }

  const searchResponse = await fetch(`${BASE_URL}/search?${searchParams}`);
  console.log("📊 API Response status:", searchResponse.status);

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    console.error("❌ YouTube API Error:", {
      status: searchResponse.status,
      statusText: searchResponse.statusText,
      errorBody: errorText
    });
    throw new Error(`YouTube API search failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  console.log("✅ Search success, items found:", searchData.items?.length || 0);
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
  getVideoDetails,
};
