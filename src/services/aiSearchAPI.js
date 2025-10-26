import { API_BASE_URL } from "./config";

/**
 * AI Search API Service
 * Handles AI-powered search functionality
 */
class AISearchAPI {
  constructor() {
    this.baseURL = `${API_BASE_URL}/api/videos`;
  }

  /**
   * Perform AI-powered semantic search
   */
  async smartSearch(query, options = {}) {
    try {
      const { limit = 20, includeAll = false } = options;

      const params = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        includeAll: includeAll.toString(),
      });

      const token = localStorage.getItem("token");
      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${this.baseURL}/search/smart?${params}`, {
        method: "GET",
        headers,
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Smart search error:", error);
      throw error;
    }
  }

  /**
   * Get search suggestions based on partial query
   */
  async getSearchSuggestions(partialQuery, limit = 8) {
    try {
      if (!partialQuery || partialQuery.trim().length < 1) {
        return { suggestions: [] };
      }

      const params = new URLSearchParams({
        q: partialQuery,
        limit: limit.toString(),
      });

      const response = await fetch(
        `${this.baseURL}/search/suggestions?${params}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Suggestions failed: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error("Search suggestions error:", error);
      return { suggestions: [] }; // Fail gracefully
    }
  }

  /**
   * Record search feedback for learning
   */
  async recordSearchFeedback(query, videoId, action, relevanceRating = null) {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        return; // Skip if not authenticated
      }

      const response = await fetch(`${this.baseURL}/search/feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query,
          videoId,
          action,
          relevanceRating,
        }),
      });

      if (!response.ok) {
        console.warn("Failed to record search feedback:", response.status);
      }
    } catch (error) {
      console.error("Search feedback error:", error);
      // Fail silently for feedback
    }
  }

  /**
   * Fallback to basic search when AI search fails
   */
  async basicSearch(query, videos) {
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
   * Get trending searches or popular queries
   */
  async getTrendingSearches() {
    // This would typically come from analytics
    // For now, return some educational search suggestions
    return [
      "how to learn programming",
      "math tutorial",
      "science experiment",
      "cooking basics",
      "art techniques",
      "history facts",
      "language learning",
      "business skills",
    ];
  }

  /**
   * Analyze search query to provide helpful suggestions
   */
  analyzeQuery(query) {
    const normalizedQuery = query.toLowerCase().trim();

    const analysis = {
      isQuestion: this.isQuestion(normalizedQuery),
      intent: this.detectIntent(normalizedQuery),
      category: this.detectCategory(normalizedQuery),
      difficulty: this.detectDifficulty(normalizedQuery),
      suggestions: this.generateQuerySuggestions(normalizedQuery),
    };

    return analysis;
  }

  /**
   * Check if query is a question
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
   * Detect search intent
   */
  detectIntent(query) {
    const intents = {
      tutorial: ["how to", "tutorial", "guide", "learn", "teach"],
      explanation: ["what is", "explain", "definition", "meaning"],
      example: ["example", "sample", "demo", "show me"],
      comparison: ["vs", "versus", "compare", "difference"],
    };

    for (const [intent, patterns] of Object.entries(intents)) {
      if (patterns.some((pattern) => query.includes(pattern))) {
        return intent;
      }
    }
    return "general";
  }

  /**
   * Detect category from query
   */
  detectCategory(query) {
    const categories = {
      science: ["science", "physics", "chemistry", "biology"],
      math: ["math", "algebra", "geometry", "calculus"],
      technology: ["programming", "coding", "tech", "computer"],
      art: ["art", "drawing", "painting", "design"],
      cooking: ["cooking", "recipe", "food", "kitchen"],
      music: ["music", "instrument", "song"],
      history: ["history", "historical", "ancient"],
      language: ["language", "grammar", "vocabulary"],
    };

    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some((keyword) => query.includes(keyword))) {
        return category;
      }
    }
    return null;
  }

  /**
   * Detect difficulty level
   */
  detectDifficulty(query) {
    const levels = {
      beginner: ["beginner", "basic", "intro", "simple", "easy"],
      intermediate: ["intermediate", "advanced beginner"],
      advanced: ["advanced", "expert", "professional", "complex"],
    };

    for (const [level, keywords] of Object.entries(levels)) {
      if (keywords.some((keyword) => query.includes(keyword))) {
        return level;
      }
    }
    return null;
  }

  /**
   * Generate helpful query suggestions
   */
  generateQuerySuggestions(query) {
    const suggestions = [];

    if (query.length > 2) {
      suggestions.push(`how to ${query}`);
      suggestions.push(`${query} tutorial`);
      suggestions.push(`${query} explained`);
      suggestions.push(`learn ${query}`);
    }

    return suggestions;
  }
}

export default new AISearchAPI();
