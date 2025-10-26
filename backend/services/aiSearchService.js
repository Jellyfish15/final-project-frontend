const natural = require("natural");
const { spawn } = require("child_process");
const fs = require("fs").promises;
const path = require("path");

/**
 * AI-Powered Search Service
 * Provides semantic search, query understanding, and intelligent video matching
 */
class AISearchService {
  constructor() {
    // Initialize NLP tools
    this.stemmer = natural.PorterStemmer;
    this.tokenizer = new natural.WordTokenizer();
    this.tfidf = new natural.TfIdf();
    // Remove problematic sentiment analyzer for now
    this.sentimentAnalyzer = null;

    // Educational keywords and categories
    this.educationalCategories = {
      science: [
        "physics",
        "chemistry",
        "biology",
        "astronomy",
        "geology",
        "science",
        "experiment",
        "research",
        "discovery",
      ],
      mathematics: [
        "math",
        "algebra",
        "geometry",
        "calculus",
        "statistics",
        "numbers",
        "equation",
        "formula",
        "theorem",
      ],
      technology: [
        "programming",
        "coding",
        "computer",
        "software",
        "algorithm",
        "data",
        "tech",
        "digital",
        "AI",
        "machine learning",
      ],
      language: [
        "language",
        "grammar",
        "vocabulary",
        "writing",
        "literature",
        "reading",
        "communication",
        "linguistics",
      ],
      history: [
        "history",
        "historical",
        "ancient",
        "civilization",
        "war",
        "culture",
        "timeline",
        "event",
        "period",
      ],
      art: [
        "art",
        "drawing",
        "painting",
        "design",
        "creative",
        "visual",
        "aesthetic",
        "artistic",
        "craft",
      ],
      music: [
        "music",
        "instrument",
        "melody",
        "rhythm",
        "composition",
        "song",
        "audio",
        "sound",
        "musical",
      ],
      business: [
        "business",
        "entrepreneurship",
        "marketing",
        "finance",
        "economics",
        "strategy",
        "management",
        "leadership",
      ],
      health: [
        "health",
        "fitness",
        "nutrition",
        "medical",
        "wellness",
        "exercise",
        "diet",
        "mental health",
        "psychology",
      ],
      cooking: [
        "cooking",
        "recipe",
        "food",
        "cuisine",
        "ingredient",
        "kitchen",
        "baking",
        "chef",
        "culinary",
      ],
    };

    // Common learning intents
    this.learningIntents = {
      tutorial: [
        "how to",
        "tutorial",
        "guide",
        "step by step",
        "learn",
        "teach",
        "explain",
        "show me",
      ],
      concept: [
        "what is",
        "define",
        "meaning",
        "concept",
        "theory",
        "principle",
        "idea",
      ],
      example: [
        "example",
        "sample",
        "case study",
        "demonstration",
        "illustration",
        "instance",
      ],
      comparison: [
        "vs",
        "versus",
        "compare",
        "difference",
        "similar",
        "contrast",
        "better",
      ],
      problem_solving: [
        "solve",
        "solution",
        "fix",
        "troubleshoot",
        "debug",
        "resolve",
        "answer",
      ],
    };

    // Difficulty level indicators
    this.difficultyLevels = {
      beginner: [
        "beginner",
        "basic",
        "intro",
        "fundamentals",
        "simple",
        "easy",
        "starter",
      ],
      intermediate: [
        "intermediate",
        "advanced beginner",
        "next level",
        "beyond basics",
      ],
      advanced: [
        "advanced",
        "expert",
        "professional",
        "complex",
        "deep dive",
        "mastery",
      ],
    };
  }

  /**
   * Enhanced semantic search that understands context and intent
   */
  async semanticSearch(query, videos, userProfile = null) {
    try {
      // Preprocess and analyze the query
      const queryAnalysis = this.analyzeQuery(query);

      // Score each video based on multiple factors
      const scoredVideos = videos.map((video) => {
        const score = this.calculateVideoRelevanceScore(
          video,
          queryAnalysis,
          userProfile
        );
        return { ...video, relevanceScore: score };
      });

      // Sort by relevance score and return top results
      return scoredVideos
        .filter((video) => video.relevanceScore > 0.1) // Filter out very low relevance
        .sort((a, b) => b.relevanceScore - a.relevanceScore);
    } catch (error) {
      console.error("Semantic search error:", error);
      // Fallback to basic search
      return this.basicSearch(query, videos);
    }
  }

  /**
   * Analyze the search query to understand intent and context
   */
  analyzeQuery(query) {
    const normalizedQuery = query.toLowerCase().trim();
    const tokens = this.tokenizer.tokenize(normalizedQuery);
    const stemmedTokens = tokens.map((token) => this.stemmer.stem(token));

    return {
      original: query,
      normalized: normalizedQuery,
      tokens: tokens,
      stemmed: stemmedTokens,
      category: this.detectCategory(normalizedQuery),
      intent: this.detectIntent(normalizedQuery),
      difficulty: this.detectDifficulty(normalizedQuery),
      isQuestion: this.isQuestion(normalizedQuery),
      sentiment: this.analyzeSentiment(tokens),
      keyPhrases: this.extractKeyPhrases(normalizedQuery),
    };
  }

  /**
   * Detect the educational category from the query
   */
  detectCategory(query) {
    let bestMatch = null;
    let bestScore = 0;

    for (const [category, keywords] of Object.entries(
      this.educationalCategories
    )) {
      const score =
        keywords.reduce((acc, keyword) => {
          return acc + (query.includes(keyword) ? 1 : 0);
        }, 0) / keywords.length;

      if (score > bestScore) {
        bestScore = score;
        bestMatch = category;
      }
    }

    return bestScore > 0.1 ? bestMatch : null;
  }

  /**
   * Detect the learning intent from the query
   */
  detectIntent(query) {
    for (const [intent, patterns] of Object.entries(this.learningIntents)) {
      if (patterns.some((pattern) => query.includes(pattern))) {
        return intent;
      }
    }
    return "general";
  }

  /**
   * Detect difficulty level preference
   */
  detectDifficulty(query) {
    for (const [level, indicators] of Object.entries(this.difficultyLevels)) {
      if (indicators.some((indicator) => query.includes(indicator))) {
        return level;
      }
    }
    return null;
  }

  /**
   * Check if the query is a question
   */
  isQuestion(query) {
    const questionWords = [
      "what",
      "how",
      "why",
      "when",
      "where",
      "who",
      "which",
    ];
    return (
      query.endsWith("?") ||
      questionWords.some((word) => query.startsWith(word))
    );
  }

  /**
   * Analyze sentiment of the query
   */
  analyzeSentiment(tokens) {
    try {
      // Simple sentiment analysis based on positive/negative words
      const positiveWords = [
        "good",
        "great",
        "excellent",
        "amazing",
        "awesome",
        "love",
        "like",
        "best",
      ];
      const negativeWords = [
        "bad",
        "terrible",
        "awful",
        "hate",
        "worst",
        "horrible",
        "dislike",
      ];

      let score = 0;
      tokens.forEach((token) => {
        if (positiveWords.includes(token.toLowerCase())) score += 1;
        if (negativeWords.includes(token.toLowerCase())) score -= 1;
      });

      return {
        score: score,
        type: score > 0 ? "positive" : score < 0 ? "negative" : "neutral",
      };
    } catch (error) {
      return { score: 0, type: "neutral" };
    }
  }

  /**
   * Extract key phrases from the query
   */
  extractKeyPhrases(query) {
    // Simple implementation - can be enhanced with more sophisticated NLP
    const stopWords = [
      "the",
      "a",
      "an",
      "and",
      "or",
      "but",
      "in",
      "on",
      "at",
      "to",
      "for",
      "of",
      "with",
      "by",
    ];
    const words = query
      .split(" ")
      .filter(
        (word) => word.length > 2 && !stopWords.includes(word.toLowerCase())
      );

    // Extract bigrams and trigrams
    const phrases = [];
    for (let i = 0; i < words.length - 1; i++) {
      phrases.push(words[i] + " " + words[i + 1]);
      if (i < words.length - 2) {
        phrases.push(words[i] + " " + words[i + 1] + " " + words[i + 2]);
      }
    }

    return [...words, ...phrases];
  }

  /**
   * Calculate relevance score for a video based on query analysis
   */
  calculateVideoRelevanceScore(video, queryAnalysis, userProfile) {
    let score = 0;

    // Title relevance (highest weight)
    score +=
      this.calculateTextSimilarity(queryAnalysis, video.title || "") * 0.4;

    // Description relevance
    score +=
      this.calculateTextSimilarity(queryAnalysis, video.description || "") *
      0.25;

    // Category matching
    if (queryAnalysis.category && video.category === queryAnalysis.category) {
      score += 0.2;
    }

    // Tags relevance
    if (video.tags && video.tags.length > 0) {
      const tagRelevance = video.tags.some((tag) =>
        queryAnalysis.keyPhrases.some((phrase) =>
          phrase.toLowerCase().includes(tag.toLowerCase())
        )
      );
      if (tagRelevance) score += 0.1;
    }

    // Creator relevance
    if (video.creator && video.creator.username) {
      score +=
        this.calculateTextSimilarity(queryAnalysis, video.creator.username) *
        0.05;
    }

    // User profile matching (if available)
    if (userProfile) {
      score +=
        this.calculateUserProfileRelevance(video, userProfile, queryAnalysis) *
        0.15;
    }

    // Engagement boost for popular content
    const engagementBoost = Math.min((video.views || 0) / 10000, 0.1);
    score += engagementBoost;

    // Recency boost
    if (video.publishedAt) {
      const daysSincePublished =
        (Date.now() - new Date(video.publishedAt)) / (1000 * 60 * 60 * 24);
      const recencyBoost = Math.max(0, (30 - daysSincePublished) / 30) * 0.05;
      score += recencyBoost;
    }

    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Calculate text similarity using multiple techniques
   */
  calculateTextSimilarity(queryAnalysis, text) {
    if (!text) return 0;

    const normalizedText = text.toLowerCase();
    let similarity = 0;

    // Exact phrase matching
    queryAnalysis.keyPhrases.forEach((phrase) => {
      if (normalizedText.includes(phrase.toLowerCase())) {
        similarity += 0.3;
      }
    });

    // Token overlap
    const textTokens = this.tokenizer.tokenize(normalizedText);
    const queryTokens = queryAnalysis.tokens;
    const overlap = queryTokens.filter((token) =>
      textTokens.includes(token)
    ).length;
    similarity += (overlap / queryTokens.length) * 0.4;

    // Stemmed token overlap
    const textStemmed = textTokens.map((token) => this.stemmer.stem(token));
    const stemOverlap = queryAnalysis.stemmed.filter((stem) =>
      textStemmed.includes(stem)
    ).length;
    similarity += (stemOverlap / queryAnalysis.stemmed.length) * 0.3;

    return Math.min(similarity, 1);
  }

  /**
   * Calculate relevance based on user profile and preferences
   */
  calculateUserProfileRelevance(video, userProfile, queryAnalysis) {
    let relevance = 0;

    // User's preferred categories
    if (
      userProfile.interests &&
      userProfile.interests.includes(video.category)
    ) {
      relevance += 0.5;
    }

    // User's viewing history (if available)
    if (userProfile.viewingHistory) {
      const historicalCategories = userProfile.viewingHistory.map(
        (v) => v.category
      );
      const categoryFrequency = historicalCategories.filter(
        (cat) => cat === video.category
      ).length;
      relevance += Math.min(categoryFrequency / 10, 0.3);
    }

    // User's engagement patterns
    if (userProfile.preferredDuration) {
      const durationMatch =
        Math.abs(video.duration - userProfile.preferredDuration) /
        userProfile.preferredDuration;
      relevance += Math.max(0, (1 - durationMatch) * 0.2);
    }

    return relevance;
  }

  /**
   * Generate search suggestions based on query
   */
  generateSearchSuggestions(partialQuery, videos) {
    const suggestions = new Set();
    const normalizedQuery = partialQuery.toLowerCase();

    // Add category-based suggestions
    for (const [category, keywords] of Object.entries(
      this.educationalCategories
    )) {
      keywords.forEach((keyword) => {
        if (
          keyword.startsWith(normalizedQuery) ||
          normalizedQuery.includes(keyword)
        ) {
          suggestions.add(`${keyword} tutorial`);
          suggestions.add(`learn ${keyword}`);
          suggestions.add(`${keyword} explained`);
        }
      });
    }

    // Add intent-based suggestions
    if (normalizedQuery.length > 2) {
      suggestions.add(`how to ${normalizedQuery}`);
      suggestions.add(`what is ${normalizedQuery}`);
      suggestions.add(`${normalizedQuery} tutorial`);
      suggestions.add(`${normalizedQuery} explained`);
    }

    // Add suggestions from actual video titles
    videos.forEach((video) => {
      if (video.title && video.title.toLowerCase().includes(normalizedQuery)) {
        const words = video.title.split(" ");
        if (words.length <= 6) {
          // Only suggest shorter titles
          suggestions.add(video.title);
        }
      }
    });

    return Array.from(suggestions).slice(0, 8); // Limit to 8 suggestions
  }

  /**
   * Fallback basic search for when AI search fails
   */
  basicSearch(query, videos) {
    const normalizedQuery = query.toLowerCase();

    return videos.filter((video) => {
      const title = (video.title || "").toLowerCase();
      const description = (video.description || "").toLowerCase();
      const creator = (video.creator?.username || "").toLowerCase();

      return (
        title.includes(normalizedQuery) ||
        description.includes(normalizedQuery) ||
        creator.includes(normalizedQuery)
      );
    });
  }

  /**
   * Analyze search patterns to improve recommendations
   */
  analyzeSearchPatterns(searchQuery, selectedVideo, userProfile) {
    // This could be used to learn user preferences and improve future searches
    return {
      query: searchQuery,
      selectedVideo: selectedVideo._id,
      timestamp: new Date(),
      userProfile: userProfile?._id,
    };
  }
}

module.exports = new AISearchService();
