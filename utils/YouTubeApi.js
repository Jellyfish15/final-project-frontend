const API_KEY = import.meta.env.VITE_YOUTUBE_API_KEY;
const BASE_URL =
  import.meta.env.VITE_YOUTUBE_API_BASE_URL ||
  "https://www.googleapis.com/youtube/v3";

/**
 * Simple English language detection based on text analysis
 */
const isEnglish = (text) => {
  if (!text) return false;

  // Common English words
  const englishWords = [
    "the", "be", "to", "of", "and", "a", "in", "that", "have", "i",
    "it", "for", "not", "on", "with", "he", "as", "you", "do", "at",
    "this", "but", "his", "by", "from", "is", "was", "are", "been",
    "will", "can", "get", "make", "go", "know", "take", "see", "come",
    "think", "how", "when", "what", "where", "why", "which", "who",
    "tutorial", "lesson", "explained", "guide", "learn", "teach", "course"
  ];

  const lowerText = text.toLowerCase();
  
  // Check for common English words
  let englishWordCount = 0;
  const words = lowerText.match(/\b\w+\b/g) || [];
  
  for (const word of words) {
    if (englishWords.includes(word)) {
      englishWordCount++;
    }
  }

  // Check for English character patterns (Latin characters mostly)
  const latinCharCount = (lowerText.match(/[a-z0-9\s.,!?'-]/gi) || []).length;
  const latinRatio = latinCharCount / Math.max(lowerText.length, 1);

  // If text contains mostly Latin characters and some English words, it's likely English
  const englishWordRatio = englishWordCount / Math.max(words.length, 1);
  
  return latinRatio > 0.7 && englishWordRatio > 0.15;
};

export const searchVideosByKeywords = async (
  query,
  maxResults = 10,
  pageToken = ""
) => {
  // Append "shorts" or "short" to the query to prioritize YouTube Shorts
  const shortsQuery = `${query} shorts OR #shorts`;

  const searchParams = new URLSearchParams({
    part: "snippet",
    q: shortsQuery,
    type: "video",
    maxResults: (maxResults * 2).toString(), // Get 2x to filter by language
    order: "relevance",
    videoDuration: "short", // This limits to videos under 4 minutes
    videoDefinition: "high",
    key: API_KEY,
    safeSearch: "moderate",
    relevanceLanguage: "en",
    regionCode: "US",
    hl: "en", // UI language to prioritize English content
  });

  if (pageToken) {
    searchParams.append("pageToken", pageToken);
  }

  const searchResponse = await fetch(`${BASE_URL}/search?${searchParams}`);

  if (!searchResponse.ok) {
    throw new Error(`YouTube API search failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  
  // Filter by language - keep only English videos
  if (searchData.items) {
    searchData.items = searchData.items.filter((item) => {
      const title = item.snippet?.title || "";
      const description = item.snippet?.description || "";
      const text = `${title} ${description}`;
      return isEnglish(text);
    }).slice(0, maxResults);
  }
  
  return searchData;
};

export const searchEducationalVideos = async (
  maxResults = 10,
  pageToken = ""
) => {
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
    maxResults: (maxResults * 2).toString(), // Get 2x to filter by language
    order: "relevance",
    videoDuration: "short",
    videoDefinition: "high",
    key: API_KEY,
    safeSearch: "moderate",
    relevanceLanguage: "en",
    regionCode: "US",
    videoCategoryId: "27", // Education category
    hl: "en", // UI language to prioritize English content
  });

  if (pageToken) {
    searchParams.append("pageToken", pageToken);
  }

  const searchResponse = await fetch(`${BASE_URL}/search?${searchParams}`);

  if (!searchResponse.ok) {
    throw new Error(`YouTube API search failed: ${searchResponse.status}`);
  }

  const searchData = await searchResponse.json();
  
  // Filter by language - keep only English videos
  if (searchData.items) {
    searchData.items = searchData.items.filter((item) => {
      const title = item.snippet?.title || "";
      const description = item.snippet?.description || "";
      const text = `${title} ${description}`;
      return isEnglish(text);
    }).slice(0, maxResults);
  }
  
  return searchData;
};

// New function to get one video per keyword for diverse feed
export const getDiverseEducationalFeed = async (count = 10) => {
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
          maxResults: "6", // Get 6 results to have options after language & duration filtering
          order: "relevance",
          videoDuration: "short",
          videoDefinition: "high",
          key: API_KEY,
          safeSearch: "moderate",
          relevanceLanguage: "en",
          regionCode: "US",
          videoCategoryId: "27", // Education category
          hl: "en", // UI language to prioritize English content
        });

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

        // Filter by language first - keep only English videos
        const englishItems = searchData.items.filter((item) => {
          const title = item.snippet?.title || "";
          const description = item.snippet?.description || "";
          const text = `${title} ${description}`;
          return isEnglish(text);
        });

        if (englishItems.length === 0) {
          return null;
        }

        // Get video details to filter by duration
        const videoIds = englishItems
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
  getDiverseEducationalFeed,
};
