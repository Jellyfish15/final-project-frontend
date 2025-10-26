import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useVideo } from "../../contexts/VideoContext";
import { useAuth } from "../AuthContext/AuthContext";
import aiSearchAPI from "../../services/aiSearchAPI";
import SearchIcon from "../../images/search.svg";
import "./Search.css";

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchMode, setSearchMode] = useState("ai"); // "ai" or "basic"
  const [queryAnalysis, setQueryAnalysis] = useState(null);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);

  const navigate = useNavigate();
  const { videos, setVideoById } = useVideo();
  const { isAuthenticated } = useAuth();
  const searchInputRef = useRef(null);
  const suggestionsTimeoutRef = useRef(null);

  // Load trending searches and recent searches on component mount
  useEffect(() => {
    loadTrendingSearches();
    loadRecentSearches();
  }, []);

  // Debounced suggestions
  useEffect(() => {
    if (suggestionsTimeoutRef.current) {
      clearTimeout(suggestionsTimeoutRef.current);
    }

    if (searchTerm.trim().length > 0) {
      suggestionsTimeoutRef.current = setTimeout(() => {
        loadSuggestions(searchTerm);
      }, 300);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (suggestionsTimeoutRef.current) {
        clearTimeout(suggestionsTimeoutRef.current);
      }
    };
  }, [searchTerm]);

  // Analyze query in real-time
  useEffect(() => {
    if (searchTerm.trim().length > 2) {
      const analysis = aiSearchAPI.analyzeQuery(searchTerm);
      setQueryAnalysis(analysis);
    } else {
      setQueryAnalysis(null);
    }
  }, [searchTerm]);

  const loadTrendingSearches = async () => {
    try {
      const trending = await aiSearchAPI.getTrendingSearches();
      setTrendingSearches(trending);
    } catch (error) {
      console.error("Failed to load trending searches:", error);
    }
  };

  const loadRecentSearches = () => {
    const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    setRecentSearches(recent.slice(0, 5));
  };

  const saveRecentSearch = (query) => {
    if (query.trim().length < 2) return;

    const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    const filtered = recent.filter((item) => item !== query);
    const updated = [query, ...filtered].slice(0, 10);

    localStorage.setItem("recentSearches", JSON.stringify(updated));
    setRecentSearches(updated.slice(0, 5));
  };

  const loadSuggestions = async (query) => {
    try {
      const response = await aiSearchAPI.getSearchSuggestions(query);
      setSuggestions(response.suggestions || []);
      setShowSuggestions(response.suggestions?.length > 0);
    } catch (error) {
      console.error("Failed to load suggestions:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const performSearch = useCallback(
    async (query) => {
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      saveRecentSearch(query);

      try {
        let results = [];

        if (searchMode === "ai") {
          // Try AI-powered search first
          try {
            const aiResponse = await aiSearchAPI.smartSearch(query, {
              limit: 20,
            });
            results = aiResponse.results || [];
            console.log("AI Search results:", results.length, "videos found");
          } catch (aiError) {
            console.warn(
              "AI search failed, falling back to basic search:",
              aiError
            );
            // Fallback to basic search
            results = await aiSearchAPI.basicSearch(query, videos);
          }
        } else {
          // Use basic search
          results = await aiSearchAPI.basicSearch(query, videos);
        }

        setSearchResults(results);
        setShowSuggestions(false);
      } catch (error) {
        console.error("Search failed:", error);
        // Final fallback to local filtering
        const fallbackResults = videos.filter((video) => {
          const searchLower = query.toLowerCase();
          return (
            video.title.toLowerCase().includes(searchLower) ||
            video.creator.username.toLowerCase().includes(searchLower) ||
            (video.description &&
              video.description.toLowerCase().includes(searchLower))
          );
        });
        setSearchResults(fallbackResults);
      } finally {
        setIsSearching(false);
      }
    },
    [videos, searchMode]
  );

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(searchTerm);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    performSearch(suggestion);
  };

  const handleVideoClick = async (video) => {
    // Record search feedback
    if (isAuthenticated) {
      await aiSearchAPI.recordSearchFeedback(searchTerm, video.id, "click");
    }

    // Navigate to video player with the selected video
    setVideoById(video.id, true); // Create focused feed
    navigate(`/videos?videoId=${video.id}`);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => setShowSuggestions(false), 200);
  };

  const getSearchPlaceholder = () => {
    if (queryAnalysis?.intent) {
      switch (queryAnalysis.intent) {
        case "tutorial":
          return "Search for tutorials and guides...";
        case "explanation":
          return "Search for explanations and definitions...";
        case "example":
          return "Search for examples and demonstrations...";
        default:
          return "Search videos with AI...";
      }
    }
    return "Search videos with AI...";
  };

  const renderSearchAnalysis = () => {
    if (!queryAnalysis) return null;

    return (
      <div className="search__analysis">
        <div className="search__analysis-tags">
          {queryAnalysis.isQuestion && (
            <span className="search__tag search__tag--question">
              ❓ Question
            </span>
          )}
          {queryAnalysis.intent && (
            <span className="search__tag search__tag--intent">
              🎯 {queryAnalysis.intent.replace("_", " ")}
            </span>
          )}
          {queryAnalysis.category && (
            <span className="search__tag search__tag--category">
              📂 {queryAnalysis.category}
            </span>
          )}
          {queryAnalysis.difficulty && (
            <span className="search__tag search__tag--difficulty">
              📊 {queryAnalysis.difficulty}
            </span>
          )}
        </div>
      </div>
    );
  };

  const renderSuggestions = () => {
    if (!showSuggestions || suggestions.length === 0) return null;

    return (
      <div className="search__suggestions">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className="search__suggestion"
            onClick={() => handleSuggestionClick(suggestion)}
          >
            <SearchIcon className="search__suggestion-icon" />
            <span>{suggestion}</span>
          </div>
        ))}
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="search__empty-state">
      <div className="search__empty-icon">🤖</div>
      <h3>AI-Powered Video Search</h3>
      <p>Find educational videos using natural language!</p>

      {trendingSearches.length > 0 && (
        <div className="search__trending">
          <h4>Trending Searches</h4>
          <div className="search__trending-tags">
            {trendingSearches.map((trend, index) => (
              <button
                key={index}
                className="search__trending-tag"
                onClick={() => handleSuggestionClick(trend)}
              >
                {trend}
              </button>
            ))}
          </div>
        </div>
      )}

      {recentSearches.length > 0 && (
        <div className="search__recent">
          <h4>Recent Searches</h4>
          <div className="search__recent-list">
            {recentSearches.map((recent, index) => (
              <button
                key={index}
                className="search__recent-item"
                onClick={() => handleSuggestionClick(recent)}
              >
                � {recent}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="search__loading">
          <div className="search__loading-spinner">🤖</div>
          <p>AI is searching for the best videos...</p>
        </div>
      );
    }

    if (searchResults.length === 0 && searchTerm.trim()) {
      return (
        <div className="search__empty-state">
          <div className="search__empty-icon">🔍</div>
          <h3>No videos found</h3>
          <p>No videos found for "{searchTerm}"</p>
          <div className="search__suggestions-help">
            <p>Try:</p>
            <ul>
              <li>Using different keywords</li>
              <li>Asking a question (e.g., "How to learn programming?")</li>
              <li>Being more specific about the topic</li>
            </ul>
          </div>
        </div>
      );
    }

    return (
      <div className="search__results-list">
        {searchResults.map((video) => (
          <div key={video.id} className="search__result-item">
            <div
              className="search__video-result search__video-result--ai"
              onClick={() => handleVideoClick(video)}
            >
              <div className="search__video-thumbnail">
                <img
                  src={video.thumbnailUrl}
                  alt={video.title}
                  onError={(e) => {
                    e.target.src =
                      "https://via.placeholder.com/120x150?text=Video";
                  }}
                />
                <div className="search__video-play-overlay">
                  <div className="search__video-play-button">▶</div>
                </div>
                {video.relevanceScore && (
                  <div className="search__relevance-score">
                    {Math.round(video.relevanceScore * 100)}% match
                  </div>
                )}
              </div>
              <div className="search__video-info">
                <h4 className="search__video-title">{video.title}</h4>
                <p className="search__video-creator">
                  {video.creator.displayName || video.creator.username}
                  {video.creator.isVerified && (
                    <span className="search__verified">✓</span>
                  )}
                </p>
                <div className="search__video-stats">
                  <span>{video.views} views</span>
                  <span>•</span>
                  <span>{video.likes} likes</span>
                  <span>•</span>
                  <span>
                    {Math.floor(video.duration / 60)}:
                    {(video.duration % 60).toString().padStart(2, "0")}
                  </span>
                </div>
                {video.category && (
                  <div className="search__video-category">
                    📂 {video.category}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="search">
      <div className="search__container">
        <div className="search__header">
          <div className="search__controls">
            <div className="search__mode-toggle">
              <button
                className={`search__mode-btn ${
                  searchMode === "ai" ? "search__mode-btn--active" : ""
                }`}
                onClick={() => setSearchMode("ai")}
              >
                🤖 AI Search
              </button>
              <button
                className={`search__mode-btn ${
                  searchMode === "basic" ? "search__mode-btn--active" : ""
                }`}
                onClick={() => setSearchMode("basic")}
              >
                🔍 Basic
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="search__form">
            <div className="search__input-container">
              <input
                ref={searchInputRef}
                type="text"
                placeholder={getSearchPlaceholder()}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
                className="search__input"
              />
              <button
                type="submit"
                className="search__button"
                disabled={isSearching}
              >
                {isSearching ? (
                  "⏳"
                ) : (
                  <img src={SearchIcon} alt="Search" className="search__icon" />
                )}
              </button>
              {renderSuggestions()}
            </div>
          </form>

          {renderSearchAnalysis()}
        </div>

        <div className="search__results">
          {!searchTerm.trim() ? renderEmptyState() : renderSearchResults()}
        </div>
      </div>
    </div>
  );
};

export default Search;
