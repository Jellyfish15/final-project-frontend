const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL =
  import.meta.env.VITE_YOUTUBE_API_BASE_URL ||
  "https://www.googleapis.com/youtube/v3";

// Temporary debugging - remove after fixing
console.log("🔍 DEBUG - API Key Status:", {
  hasApiKey: !!API_KEY,
  apiKeyLength: API_KEY?.length || 0,
  firstChars: API_KEY?.substring(0, 10) || 'undefined',
  baseUrl: BASE_URL,
  mode: import.meta.env.MODE
});

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

  console.log("🎯 DEBUG - Making API call:", {
    query: randomQuery,
    hasKey: !!API_KEY,
    url: `${BASE_URL}/search`
  });

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
  
  console.log("📡 DEBUG - API Response:", {
    status: searchResponse.status,
    statusText: searchResponse.statusText,
    ok: searchResponse.ok
  });

  if (!searchResponse.ok) {
    const errorText = await searchResponse.text();
    console.error("❌ DEBUG - API Error Details:", {
      status: searchResponse.status,
      statusText: searchResponse.statusText,
      errorBody: errorText,
      requestUrl: `${BASE_URL}/search?${searchParams}`
    });
    throw new Error(`YouTube API search failed: ${searchResponse.status} - ${errorText}`);
  }

  const searchData = await searchResponse.json();
  console.log("✅ DEBUG - API Success:", {
    itemCount: searchData.items?.length || 0,
    hasItems: !!(searchData.items && searchData.items.length > 0)
  });
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
