require("dotenv").config();

const API_KEY = process.env.VITE_YOUTUBE_API_KEY;
const BASE_URL = "https://www.googleapis.com/youtube/v3";

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

/**
 * Simple English language detection based on text analysis
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if text appears to be in English
 */
const isEnglish = (text) => {
  if (!text) return false;

  // Common English words (high frequency, language-specific)
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
  // Threshold: 70% Latin characters and good English word ratio
  const englishWordRatio = englishWordCount / Math.max(words.length, 1);
  
  return latinRatio > 0.7 && englishWordRatio > 0.15;
};

const searchVideosByKeywords = async (
  query,
  maxResults = 10,
  pageToken = "",
) => {
  const searchParams = new URLSearchParams({
    part: "snippet",
    q: query,
    type: "video",
    maxResults: (maxResults * 2).toString(), // Get 2x to filter by language
    order: "relevance",
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
    "data science tutorial",
    "machine learning basics",
    "art history lecture",
    "music theory lesson",
    "environmental science",
    "earth science explained",
    "human anatomy lesson",
    "neuroscience basics",
    "microbiology lesson",
    "genetics explained",
    "biochemistry tutorial",
    "physics problem solving",
    "chemistry lab",
    "critical thinking skills",
    "logic lesson",
    "public speaking tips",
    "study skills",
    "note taking strategies",
    "exam preparation",
    "financial literacy",
    "investing basics",
    "business fundamentals",
    "marketing basics",
    "entrepreneurship lesson",
    "civics education",
    "government explained",
    "law basics",
    "psychology fundamentals",
    "sociology concepts",
    "ethics in technology",
    "coding interview prep",
    "javascript fundamentals",
    "python basics",
    "sql tutorial",
    "data visualization",
    "cybersecurity basics",
    "networking fundamentals",
    "operating systems explained",
    "robotics tutorial",
    "ai for beginners",
    "health education",
    "nutrition science",
    "exercise science",
    "medical terminology",
    "first aid basics",
    "climate change explained",
    "renewable energy",
    "space science",
    "oceanography",
    "geology basics",
    "language learning tips",
    "esl grammar",
    "reading comprehension",
    "writing skills",
    "creative writing lesson",
    "history documentary",
    "modern history",
    "world geography",
    "map skills",
    "economics explained",
    "statistics for beginners",
    "probability basics",
    "precalculus lesson",
    "linear algebra basics",
    "discrete math",
    "web development tutorial",
    "computer science concepts",
    "engineering design",
    "physics lab",
    "chemistry experiments",
    "biology lab",
    "science for kids",
    "math for kids",
    "history for kids",
    "coding for kids",
  ];

  const randomQuery =
    educationalQueries[Math.floor(Math.random() * educationalQueries.length)];

  const searchParams = new URLSearchParams({
    part: "snippet",
    q: randomQuery,
    type: "video",
    maxResults: (maxResults * 2).toString(), // Get 2x to filter by language
    order: "relevance",
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

const getDiverseEducationalFeed = async (count = 10, publishedAfter = null) => {
  const MAX_DURATION_SECONDS = 900; // 15 minutes
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
          order: "date",
          key: API_KEY,
          safeSearch: "moderate",
          relevanceLanguage: "en",
          regionCode: "US",
          hl: "en", // UI language to prioritize English content
        });

        if (publishedAfter) {
          searchParams.append("publishedAfter", publishedAfter);
        }

        const searchResponse = await fetch(
          `${BASE_URL}/search?${searchParams}`,
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

        // Find first video under 15 minutes
        const validVideo = detailsData.items?.find((video) => {
          const duration = video.contentDetails?.duration || "PT0S";
          const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
          if (!match) return false;

          const hours = parseInt(match[1]) || 0;
          const minutes = parseInt(match[2]) || 0;
          const seconds = parseInt(match[3]) || 0;
          const totalSeconds = hours * 3600 + minutes * 60 + seconds;

          return totalSeconds <= MAX_DURATION_SECONDS; // 15 minutes
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
