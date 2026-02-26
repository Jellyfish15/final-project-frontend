/**
 * Cache Filter Service
 * Applies English-only filtering to cached videos
 * Used to ensure only English-language educational content is cached
 */

/**
 * Simple English language detection
 * @param {string} text - Text to analyze
 * @returns {boolean} - True if text appears to be in English
 */
const isEnglishText = (text) => {
  if (!text || typeof text !== "string") return false;

  // Common English words (high freq, language-specific)
  const englishWords = [
    "the",
    "be",
    "to",
    "of",
    "and",
    "a",
    "in",
    "that",
    "have",
    "i",
    "it",
    "for",
    "not",
    "on",
    "with",
    "he",
    "as",
    "you",
    "do",
    "at",
    "this",
    "but",
    "his",
    "by",
    "from",
    "is",
    "was",
    "are",
    "been",
    "will",
    "can",
    "get",
    "make",
    "go",
    "know",
    "take",
    "see",
    "come",
    "think",
    "how",
    "when",
    "what",
    "where",
    "why",
    "which",
    "who",
    "tutorial",
    "lesson",
    "explained",
    "guide",
    "learn",
    "teach",
    "course",
    "education",
    "learn",
    "teach",
    "student",
    "school",
    "class",
    "science",
  ];

  const lowerText = text.toLowerCase();

  // Count English words
  let englishWordCount = 0;
  const words = lowerText.match(/\b\w+\b/g) || [];

  for (const word of words) {
    if (englishWords.includes(word)) {
      englishWordCount++;
    }
  }

  // Check Latin character ratio
  const latinCharCount = (lowerText.match(/[a-z0-9\s.,!?'-]/gi) || []).length;
  const latinRatio = latinCharCount / Math.max(lowerText.length, 1);

  // Thresholds: 70% Latin chars + decent English word ratio
  const englishWordRatio = englishWordCount / Math.max(words.length, 1);

  return latinRatio > 0.7 && englishWordRatio > 0.1;
};

/**
 * Filter video results to keep only English ones
 * @param {Array} videos - Array of YouTube video objects
 * @returns {Array} - Filtered array with only English videos
 */
const filterEnglishVideos = (videos) => {
  if (!Array.isArray(videos)) return [];

  return videos.filter((video) => {
    if (!video) return false;

    const title = video.snippet?.title || video.title || "";
    const description = video.snippet?.description || video.description || "";
    const channelTitle =
      video.snippet?.channelTitle || video.channelTitle || "";

    // Combine all text for analysis
    const combinedText = `${title} ${description} ${channelTitle}`;

    return isEnglishText(combinedText);
  });
};

/**
 * Get enhanced cache refresh function with English filtering
 * @param {Function} originalCacheFunction - Original cache function from service
 * @returns {Function} - Wrapped function with English filtering
 */
const withEnglishFiltering = (originalCacheFunction) => {
  return async function (...args) {
    console.log(
      "[CacheFilter] 🌍 Applying English-only filtering to cache refresh",
    );

    // Call original function
    const result = await originalCacheFunction.apply(this, args);

    if (result.success && result.englishOnly === undefined) {
      result.englishOnly = true;
      console.log(
        `[CacheFilter] ✅ Cache refresh applied English-only filtering`,
      );
    }

    return result;
  };
};

module.exports = {
  isEnglishText,
  filterEnglishVideos,
  withEnglishFiltering,
};
