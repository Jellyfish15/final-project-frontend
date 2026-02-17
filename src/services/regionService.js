/**
 * Region detection and language preference service
 * Detects user's region and determines appropriate content language filter
 */

/**
 * Get user's detected region/language code
 * @returns {string} Language code (e.g., "en-US", "es-ES", "fr-FR")
 */
export const getDetectedLanguage = () => {
  return navigator.language || "en-US";
};

/**
 * Get user's timezone
 * @returns {string} Timezone (e.g., "America/New_York")
 */
export const getDetectedTimezone = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
};

/**
 * List of English-speaking country codes
 * These regions will have strict English-only filtering
 */
const ENGLISH_SPEAKING_REGIONS = [
  "US", // United States
  "GB", // United Kingdom
  "CA", // Canada
  "AU", // Australia
  "NZ", // New Zealand
  "IE", // Ireland
  "ZA", // South Africa
  "IN", // India (English widely spoken)
  "SG", // Singapore
  "JM", // Jamaica
  "BB", // Barbados
  "BZ", // Belize
  "GD", // Grenada
  "GY", // Guyana
  "MG", // Malta (English + Maltese)
  "PK", // Pakistan (English widely used)
  "PH", // Philippines (English widely spoken)
];

/**
 * Timezone to country code mapping (common timezones)
 */
const TIMEZONE_TO_COUNTRY = {
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "Europe/London": "GB",
  "Europe/Dublin": "IE",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Pacific/Auckland": "NZ",
  "Africa/Johannesburg": "ZA",
  "Asia/Kolkata": "IN",
  "Asia/Singapore": "SG",
  "America/Jamaica": "JM",
};

/**
 * Language code to country code mapping
 */
const LANGUAGE_TO_COUNTRY = {
  "en-US": "US",
  "en-GB": "GB",
  "en-CA": "CA",
  "en-AU": "AU",
  "en-NZ": "NZ",
  "en-IE": "IE",
  "en-ZA": "ZA",
  "en-IN": "IN",
  "en-SG": "SG",
  "en-JM": "JM",
  "es-ES": "ES",
  "es-MX": "MX",
  "fr-FR": "FR",
  "de-DE": "DE",
  "it-IT": "IT",
  "ja-JP": "JP",
  "ko-KR": "KR",
  "zh-CN": "CN",
  "zh-TW": "TW",
  "pt-BR": "BR",
  "ru-RU": "RU",
  "pl-PL": "PL",
};

/**
 * Extract country code from language string
 * @param {string} language - Language code (e.g., "en-US")
 * @returns {string} Country code
 */
const getCountryFromLanguage = (language) => {
  // Check exact match first
  if (LANGUAGE_TO_COUNTRY[language]) {
    return LANGUAGE_TO_COUNTRY[language];
  }

  // Check language prefix (e.g., "en" from "en-US")
  const prefix = language.split("-")[0].toUpperCase();
  return prefix;
};

/**
 * Extract country code from timezone
 * @param {string} timezone - Timezone string
 * @returns {string|null} Country code
 */
const getCountryFromTimezone = (timezone) => {
  return TIMEZONE_TO_COUNTRY[timezone] || null;
};

/**
 * Detect user's country code
 * Uses multiple methods: language > timezone > default
 * @returns {string} Country code
 */
export const detectUserCountry = () => {
  // Method 1: Browser language (most reliable for user preference)
  const language = getDetectedLanguage();
  const countryFromLanguage = getCountryFromLanguage(language);

  // If it's an English-speaking country detected from language, use it
  if (ENGLISH_SPEAKING_REGIONS.includes(countryFromLanguage)) {
    console.log(
      `[Region] Detected English-speaking region from language: ${language} → ${countryFromLanguage}`,
    );
    return countryFromLanguage;
  }

  // Method 2: Timezone (fallback)
  const timezone = getDetectedTimezone();
  const countryFromTimezone = getCountryFromTimezone(timezone);

  if (countryFromTimezone) {
    console.log(
      `[Region] Detected region from timezone: ${timezone} → ${countryFromTimezone}`,
    );
    return countryFromTimezone;
  }

  // Method 3: If language is English-like, assume English-speaking region
  if (language.startsWith("en")) {
    console.log(
      `[Region] Detected English language prefix: ${language} → defaulting to US`,
    );
    return "US";
  }

  // Default to user's language/country
  console.log(`[Region] Using default from language: ${language}`);
  return countryFromLanguage;
};

/**
 * Check if user is in an English-speaking region
 * @returns {boolean} True if user should see English-only content
 */
export const isEnglishSpeakingRegion = () => {
  const country = detectUserCountry();
  const isEnglish = ENGLISH_SPEAKING_REGIONS.includes(country);
  console.log(
    `[Region] User country: ${country}, English content only: ${isEnglish}`,
  );
  return isEnglish;
};

/**
 * Get appropriate content language filter for user's region
 * @returns {string|null} Language code ("en", "es", "fr", etc.) or null for all languages
 */
export const getRegionalLanguageFilter = () => {
  if (isEnglishSpeakingRegion()) {
    return "en"; // English only
  }

  // For non-English regions, detect their language
  const language = getDetectedLanguage();
  const languageCode = language.split("-")[0]; // Extract "en", "es", "fr", etc.

  console.log(`[Region] Using regional language preference: ${languageCode}`);
  return languageCode;
};

/**
 * Get UI language for YouTube API requests
 * @returns {string} Language/region code for API
 */
export const getYouTubeApiLanguage = () => {
  const language = getDetectedLanguage();
  // Use full language-region code if available, otherwise just language
  return language || "en";
};

/**
 * Get region code for YouTube API requests
 * @returns {string} Region code (US, GB, etc.)
 */
export const getYouTubeApiRegion = () => {
  const country = detectUserCountry();
  return country || "US"; // Default to US if detection fails
};
