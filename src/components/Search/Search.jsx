import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useVideo } from "../../contexts/VideoContext";
import { useAuth } from "../AuthContext/AuthContext";
import aiSearchAPI from "../../services/aiSearchAPI";
import { searchYouTubeVideos } from "../../../services/youtubeService";
import SearchIcon from "../../images/search.svg";
import "./Search.css";

const Search = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchMode, setSearchMode] = useState("ai"); // Always use AI mode
  const [queryAnalysis, setQueryAnalysis] = useState(null);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [recentSearches, setRecentSearches] = useState([]);
  const [featuredVideos, setFeaturedVideos] = useState([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [currentEducatorIndex, setCurrentEducatorIndex] = useState(0);

  // Sample popular educators data
  const popularEducators = [
    {
      id: 1,
      name: "Dr. Sarah Chen",
      subject: "Computer Science",
      avatar:
        "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&h=150&fit=crop&crop=face",
      followers: "2.4M",
      videos: 127,
    },
    {
      id: 2,
      name: "Prof. Michael Johnson",
      subject: "Mathematics",
      avatar:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face",
      followers: "1.8M",
      videos: 89,
    },
    {
      id: 3,
      name: "Dr. Emily Rodriguez",
      subject: "Physics",
      avatar:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face",
      followers: "1.2M",
      videos: 156,
    },
    {
      id: 4,
      name: "Prof. David Kim",
      subject: "Chemistry",
      avatar:
        "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face",
      followers: "950K",
      videos: 73,
    },
    {
      id: 5,
      name: "Dr. Lisa Thompson",
      subject: "Biology",
      avatar:
        "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=150&h=150&fit=crop&crop=face",
      followers: "1.6M",
      videos: 112,
    },
    {
      id: 6,
      name: "Prof. James Wilson",
      subject: "History",
      avatar:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&h=150&fit=crop&crop=face",
      followers: "780K",
      videos: 94,
    },
  ];

  const navigate = useNavigate();
  const { videos, setVideoById } = useVideo();
  const { isAuthenticated } = useAuth();

  // Helper function to determine font size class based on text length
  const getTextSizeClass = (text, type) => {
    const length = text.length;

    if (type === "name") {
      if (length <= 12) return "name-short";
      if (length <= 18) return "name-medium";
      if (length <= 25) return "name-long";
      return "name-very-long";
    } else if (type === "subject") {
      if (length <= 10) return "subject-short";
      if (length <= 16) return "subject-medium";
      return "subject-long";
    }
    return "";
  };

  const searchInputRef = useRef(null);
  const suggestionsTimeoutRef = useRef(null);

  // Load trending searches and recent searches on component mount
  useEffect(() => {
    loadTrendingSearches();
    loadRecentSearches();
    loadFeaturedVideos();
  }, []);

  // Load featured videos for the empty state
  const loadFeaturedVideos = async () => {
    setIsLoadingFeatured(true);
    try {
      // First try to get videos from the global videos context
      if (videos && videos.length > 0) {
        // Take a random selection of 10 videos (2 complete rows of 5)
        const shuffled = [...videos].sort(() => 0.5 - Math.random());
        const selectedVideos = shuffled.slice(0, 10);

        // Process thumbnail URLs for each video
        const processedVideos = selectedVideos.map((video) => {
          const processedVideo = { ...video };

          // Process thumbnail URL similar to App.jsx logic
          let thumbnailUrl = video.thumbnailUrl;

          if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
            const backendURL = "http://localhost:5000";
            thumbnailUrl = thumbnailUrl.startsWith("/api/")
              ? thumbnailUrl.replace("/api/", "/")
              : thumbnailUrl;
            thumbnailUrl = `${backendURL}${thumbnailUrl}`;
          }

          // Also try other possible thumbnail properties
          if (!thumbnailUrl) {
            thumbnailUrl =
              video.thumbnail ||
              video.thumbnails?.medium?.url ||
              video.thumbnails?.default?.url ||
              video.snippet?.thumbnails?.medium?.url ||
              video.snippet?.thumbnails?.default?.url;
          }

          processedVideo.thumbnailUrl = thumbnailUrl;

          return processedVideo;
        });

        // Debug: Log the video structure to see available thumbnail properties
        console.log("Featured videos data structure:", processedVideos[0]);
        console.log(
          "Available properties:",
          Object.keys(processedVideos[0] || {})
        );
        console.log("Final thumbnail URL:", processedVideos[0]?.thumbnailUrl);

        setFeaturedVideos(processedVideos);
      } else {
        // Fallback: try to load videos from API
        const { videosAPI } = await import("../../services/api");
        const response = await videosAPI.getFeed(1, 10);
        if (response.videos && response.videos.length > 0) {
          console.log("API videos data structure:", response.videos[0]);
          setFeaturedVideos(response.videos);
        }
      }
    } catch (error) {
      console.error("Failed to load featured videos:", error);
      // If all else fails, use some sample videos from context
      if (videos && videos.length > 0) {
        setFeaturedVideos(videos.slice(0, 6));
      }
    } finally {
      setIsLoadingFeatured(false);
    }
  };

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
      console.log("performSearch called with query:", query);

      if (!query || query.trim().length < 2) {
        console.log("Query too short, clearing results");
        setSearchResults([]);
        return;
      }

      console.log("Starting search for:", query);
      setIsSearching(true);
      saveRecentSearch(query);

      try {
        let results = [];
        let youtubeResults = [];

        // Perform AI analysis of the search query
        let enhancedQuery = query;
        try {
          console.log("Analyzing query with AI...");
          const analysis = await aiSearchAPI.analyzeQuery(query);
          setQueryAnalysis(analysis);
          console.log("AI analysis result:", analysis);

          // Use AI suggestions to enhance the search query
          if (
            analysis &&
            analysis.suggestions &&
            analysis.suggestions.length > 0
          ) {
            enhancedQuery = analysis.suggestions[0]; // Use the top AI suggestion
            console.log("AI enhanced query:", enhancedQuery);
          }
        } catch (analysisError) {
          console.warn("Query analysis failed:", analysisError);
        }

        if (searchMode === "ai") {
          // Try AI-powered search first with local videos
          try {
            console.log("Starting AI search with query:", query);
            console.log("Available videos for search:", videos?.length || 0);
            const aiResponse = await aiSearchAPI.smartSearch(query, {
              limit: 15, // Reduced to make room for YouTube results
            });
            results = aiResponse.results || [];
            console.log(
              "AI Search results:",
              results.length,
              "local videos found"
            );
            console.log("AI Search response:", aiResponse);
          } catch (aiError) {
            console.warn(
              "AI search failed, falling back to basic search:",
              aiError
            );
            // Fallback to basic search
            try {
              console.log("Trying basic search fallback");
              results = await aiSearchAPI.basicSearch(query, videos);
              console.log("Basic search results:", results.length);
            } catch (basicError) {
              console.error("Basic search also failed:", basicError);
              results = [];
            }
          }

          // Search YouTube using the enhanced query
          try {
            console.log(
              "Searching YouTube with enhanced query:",
              enhancedQuery
            );
            youtubeResults = await searchYouTubeVideos(enhancedQuery, 10);
            console.log(
              "YouTube Search results:",
              youtubeResults.length,
              "YouTube videos found"
            );
            console.log("YouTube results:", youtubeResults);
          } catch (youtubeError) {
            console.warn("YouTube search failed:", youtubeError);
            // Try with original query if enhanced query fails
            try {
              console.log(
                "Retrying YouTube search with original query:",
                query
              );
              youtubeResults = await searchYouTubeVideos(query, 10);
              console.log(
                "YouTube retry results:",
                youtubeResults.length,
                "videos"
              );
            } catch (originalError) {
              console.warn(
                "YouTube search with original query failed:",
                originalError
              );
            }
          }
        } else {
          // Use basic search for local videos
          results = await aiSearchAPI.basicSearch(query, videos);

          // Still search YouTube for additional results
          try {
            youtubeResults = await searchYouTubeVideos(query, 10);
          } catch (youtubeError) {
            console.warn("YouTube search failed:", youtubeError);
          }
        }

        // Combine and sort results - prioritize local videos, then YouTube
        console.log(
          "Combining results - Local:",
          results.length,
          "YouTube:",
          youtubeResults.length
        );
        const combinedResults = [
          ...results,
          ...youtubeResults.map((video) => ({ ...video, source: "youtube" })),
        ];

        // If using AI mode, sort by relevance (AI results first, then YouTube)
        if (searchMode === "ai" && combinedResults.length > 0) {
          console.log(
            `Combined results: ${results.length} local + ${youtubeResults.length} YouTube = ${combinedResults.length} total`
          );
        }

        console.log("Final combined results:", combinedResults);
        setSearchResults(combinedResults);
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

    // Always navigate to Videos page and play the video, regardless of source
    setVideoById(video.id, true); // Create focused feed
    navigate(`/videos?videoId=${video.id}`);
  };

  const nextEducator = () => {
    setCurrentEducatorIndex((prev) =>
      prev >= popularEducators.length - 3 ? 0 : prev + 1
    );
  };

  const prevEducator = () => {
    setCurrentEducatorIndex((prev) =>
      prev <= 0 ? popularEducators.length - 3 : prev - 1
    );
  };

  const handleInputFocus = () => {
    setIsInputFocused(true);
    setShowDropdown(true);
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow clicks
    setTimeout(() => {
      setShowSuggestions(false);
      setIsInputFocused(false);
      setShowDropdown(false);
    }, 200);
  };

  const getSearchPlaceholder = () => {
    return "Search videos using AI...";
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
        <div className="search__suggestions-content">
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
      </div>
    );
  };

  const renderSearchDropdown = () => {
    if (!showDropdown || searchTerm.trim().length > 0) return null;

    return (
      <div className="search__dropdown">
        <div className="search__dropdown-content">
          {/* Trending Searches */}
          {trendingSearches.length > 0 && (
            <div className="search__dropdown-section">
              <h4 className="search__dropdown-title">Trending Searches</h4>
              <div className="search__dropdown-list">
                {trendingSearches.map((trend, index) => (
                  <div
                    key={index}
                    className="search__dropdown-item search__dropdown-item--trending"
                    onClick={() => handleSuggestionClick(trend)}
                  >
                    <span className="search__dropdown-icon">🔥</span>
                    <span>{trend}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="search__dropdown-section">
              <h4 className="search__dropdown-title">Recent Searches</h4>
              <div className="search__dropdown-list">
                {recentSearches.map((recent, index) => (
                  <div
                    key={index}
                    className="search__dropdown-item search__dropdown-item--recent"
                    onClick={() => handleSuggestionClick(recent)}
                  >
                    <span className="search__dropdown-icon">🕒</span>
                    <span>{recent}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Show message if no trending or recent searches */}
          {trendingSearches.length === 0 && recentSearches.length === 0 && (
            <div className="search__dropdown-empty">
              <span className="search__dropdown-icon">🔍</span>
              <span>Start typing to search for videos...</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderEmptyState = () => (
    <div className="search__empty-state">
      {/* Featured Videos Grid */}
      {isLoadingFeatured ? (
        <div className="search__featured-loading">
          <div className="search__loading-spinner">⏳</div>
          <p>Loading featured videos...</p>
        </div>
      ) : featuredVideos.length > 0 ? (
        <div className="search__featured-section">
          <h2 className="search__explore-title">Discover & Learn</h2>
          <div className="search__featured-instagram-grid">
            {featuredVideos.map((video, index) => {
              // Pattern: 5 videos per logical row (4 squares + 1 vertical)
              const positionInRow = index % 5;
              const rowNumber = Math.floor(index / 5);
              const isVertical = positionInRow === 4;

              // Alternate vertical video position: left on even rows, right on odd rows
              const verticalOnLeft = rowNumber % 2 === 0;

              return (
                <div
                  key={video._id || video.id}
                  className={`search__featured-video ${
                    isVertical
                      ? "search__featured-video--vertical"
                      : "search__featured-video--square"
                  } ${
                    isVertical && verticalOnLeft
                      ? "search__featured-video--vertical-left"
                      : ""
                  } ${
                    isVertical && !verticalOnLeft
                      ? "search__featured-video--vertical-right"
                      : ""
                  }`}
                  data-position={positionInRow}
                  data-row={rowNumber}
                  onClick={() => handleVideoClick(video)}
                >
                  <div className="search__featured-thumbnail">
                    <img
                      src={
                        video.thumbnailUrl ||
                        "https://via.placeholder.com/200x150?text=Video"
                      }
                      alt={video.title}
                      onError={(e) => {
                        e.target.src =
                          "https://via.placeholder.com/200x150?text=Video";
                      }}
                    />
                    <div className="search__featured-play-overlay">
                      <div className="search__featured-play-button">▶</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* Popular Educators Carousel */}
      <div className="search__educators-section">
        <h2 className="search__educators-title">Popular Educators</h2>
        <div className="search__educators-carousel">
          <button
            className="search__educators-nav search__educators-nav--prev"
            onClick={prevEducator}
          >
            ‹
          </button>

          <div className="search__educators-container">
            <div
              className="search__educators-track"
              style={{
                transform: `translateX(-${currentEducatorIndex * (100 / 3)}%)`,
              }}
            >
              {popularEducators.map((educator) => (
                <div key={educator.id} className="search__educator-card">
                  <div className="search__educator-avatar">
                    <img
                      src={educator.avatar}
                      alt={educator.name}
                      onError={(e) => {
                        e.target.src =
                          "https://via.placeholder.com/150x150?text=Avatar";
                      }}
                    />
                  </div>
                  <div className="search__educator-info">
                    <h4
                      className={`search__educator-name ${getTextSizeClass(
                        educator.name,
                        "name"
                      )}`}
                    >
                      {educator.name}
                    </h4>
                    <p
                      className={`search__educator-subject ${getTextSizeClass(
                        educator.subject,
                        "subject"
                      )}`}
                    >
                      {educator.subject}
                    </p>
                    <div className="search__educator-stats">
                      <span>{educator.followers} followers</span>
                      <span>•</span>
                      <span>{educator.videos} videos</span>
                    </div>
                  </div>
                  <button className="search__educator-follow">Follow</button>
                </div>
              ))}
            </div>
          </div>

          <button
            className="search__educators-nav search__educators-nav--next"
            onClick={nextEducator}
          >
            ›
          </button>
        </div>
      </div>
    </div>
  );

  const renderSearchResults = () => {
    if (isSearching) {
      return (
        <div className="search__loading">
          <div className="search__loading-spinner">⏳</div>
          <p>Searching for videos using AI and YouTube API...</p>
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
                <div className="search__video-title-row">
                  <h4 className="search__video-title">{video.title}</h4>
                  {(video.source === "youtube" ||
                    video.videoType === "youtube") && (
                    <span className="search__youtube-badge">📺 YouTube</span>
                  )}
                </div>
                <p className="search__video-creator">
                  {video.creator.displayName ||
                    video.creator.username ||
                    video.creator}
                  {video.creator.isVerified && (
                    <span className="search__verified">✓</span>
                  )}
                </p>
                <div className="search__video-stats">
                  <span>{video.views || "0"} views</span>
                  <span>•</span>
                  <span>{video.likes || "0"} likes</span>
                  <span>•</span>
                  <span>
                    {Math.floor((video.duration || 0) / 60)}:
                    {((video.duration || 0) % 60).toString().padStart(2, "0")}
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
          <form onSubmit={handleSearch} className="search__form">
            <div
              className={`search__input-container ${
                showDropdown || showSuggestions
                  ? "search__input-container--dropdown-active"
                  : ""
              }`}
            >
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
              {renderSearchDropdown()}
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
