import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useVideo } from "../../contexts/useVideo";
import { searchYouTubeVideos } from "../../../services/youtubeService";
import { videosAPI } from "../../services/api";
import { API_BASE_URL } from "../../services/config";
import SearchIcon from "../../images/search.svg";
import VideoSidebar from "../VideoSidebar/VideoSidebar";
import "./Search.css";

const Search = ({ onOpenLogin, onOpenRegister }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [featuredVideos, setFeaturedVideos] = useState([]);
  const [isLoadingFeatured, setIsLoadingFeatured] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  const loadMoreSentinelRef = useRef(null);
  const featuredVideoIdsRef = useRef(new Set());
  const loadMoreFailCountRef = useRef(0);
  const loadMoreCooldownRef = useRef(false);

  const navigate = useNavigate();
  const { videos } = useVideo();

  const searchInputRef = useRef(null);

  // Helper: process thumbnail URL for a video
  const processThumbnail = useCallback((video) => {
    const processedVideo = { ...video };
    let thumbnailUrl = video.thumbnailUrl;

    if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
      const backendURL = API_BASE_URL.replace(/\/api\/?$/, "");
      thumbnailUrl = thumbnailUrl.startsWith("/api/")
        ? thumbnailUrl.replace("/api/", "/")
        : thumbnailUrl;
      thumbnailUrl = `${backendURL}${thumbnailUrl}`;
    }

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
  }, []);

  // Load featured videos for the empty state
  const loadFeaturedVideos = useCallback(async () => {
    setIsLoadingFeatured(true);
    try {
      let selectedVideos = [];
      const uploadedVideos = videos || [];
      const uploadedCount = uploadedVideos.length;
      const youtubeNeeded = Math.max(0, 20 - uploadedCount);

      if (youtubeNeeded > 0) {
        try {
          const youtubeResults = await searchYouTubeVideos(
            "educational quick lesson",
            youtubeNeeded,
          );
          if (youtubeResults && youtubeResults.length > 0) {
            selectedVideos = [...uploadedVideos, ...youtubeResults];
          } else {
            selectedVideos = uploadedVideos;
          }
        } catch (youtubeError) {
          selectedVideos = uploadedVideos;
        }
      } else {
        selectedVideos = uploadedVideos.slice(0, 20);
      }

      const processedVideos = selectedVideos.map(processThumbnail);

      // Track IDs for deduplication when loading more
      const idSet = new Set();
      processedVideos.forEach((v) => idSet.add(v._id || v.id));
      featuredVideoIdsRef.current = idSet;

      setFeaturedVideos(processedVideos);
    } catch (error) {
      if (videos && videos.length > 0) {
        setFeaturedVideos(videos.slice(0, 6));
      }
    } finally {
      setIsLoadingFeatured(false);
    }
  }, [videos, processThumbnail]);

  // Load more featured videos for infinite scroll
  const loadMoreFeaturedVideos = useCallback(async () => {
    if (
      isLoadingMore ||
      loadMoreCooldownRef.current ||
      loadMoreFailCountRef.current >= 3
    )
      return;
    setIsLoadingMore(true);
    loadMoreCooldownRef.current = true;
    try {
      const response = await videosAPI.getRandomCachedVideos(30);
      if (response?.videos && response.videos.length > 0) {
        const newVideos = response.videos
          .filter((v) => !featuredVideoIdsRef.current.has(v._id || v.id))
          .map(processThumbnail);

        if (newVideos.length > 0) {
          newVideos.forEach((v) =>
            featuredVideoIdsRef.current.add(v._id || v.id),
          );
          setFeaturedVideos((prev) => [...prev, ...newVideos]);
          loadMoreFailCountRef.current = 0;
        }
      }
    } catch (error) {
      loadMoreFailCountRef.current += 1;
    } finally {
      setIsLoadingMore(false);
      // Cooldown: wait 2s before allowing another load
      setTimeout(() => {
        loadMoreCooldownRef.current = false;
      }, 2000);
    }
  }, [isLoadingMore, processThumbnail]);

  // Infinite scroll observer
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (
          entries[0].isIntersecting &&
          featuredVideos.length > 0 &&
          !searchTerm.trim() &&
          !loadMoreCooldownRef.current &&
          loadMoreFailCountRef.current < 3
        ) {
          loadMoreFeaturedVideos();
        }
      },
      { rootMargin: "400px" },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [featuredVideos.length, loadMoreFeaturedVideos, searchTerm]);

  // Load recent searches and featured videos on component mount
  useEffect(() => {
    loadRecentSearches();
    loadFeaturedVideos();
  }, [loadFeaturedVideos]);

  const loadRecentSearches = () => {
    const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    setRecentSearches(recent.slice(0, 5));
  };

  const saveRecentSearch = useCallback((query) => {
    if (query.trim().length < 2) return;

    const recent = JSON.parse(localStorage.getItem("recentSearches") || "[]");
    const filtered = recent.filter((item) => item !== query);
    const updated = [query, ...filtered].slice(0, 10);

    localStorage.setItem("recentSearches", JSON.stringify(updated));
    setRecentSearches(updated.slice(0, 5));
  }, []);

  const performSearch = useCallback(
    async (query) => {
      if (!query || query.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      saveRecentSearch(query);

      try {
        // Search local uploaded videos with basic text matching
        const searchLower = query.toLowerCase();
        const localResults = videos.filter((video) => {
          const titleMatch = video.title?.toLowerCase().includes(searchLower);
          const descMatch = video.description
            ?.toLowerCase()
            .includes(searchLower);
          const categoryMatch = video.category
            ?.toLowerCase()
            .includes(searchLower);
          const tagsMatch = video.tags?.some((tag) =>
            tag.toLowerCase().includes(searchLower),
          );
          return titleMatch || descMatch || categoryMatch || tagsMatch;
        });
        console.log("Local search results:", localResults.length);

        // Search YouTube Shorts (live YouTube API search - NOT from cache)
        let youtubeResults = [];
        try {
          console.log(
            `[Search] Searching YouTube API directly for: "${query}"`,
          );
          console.log("[Search] This is a LIVE search, not from cache");
          youtubeResults = await searchYouTubeVideos(query, 20);
          console.log(
            `[Search] ✅ Found ${youtubeResults.length} YouTube Shorts from live API`,
          );
          if (youtubeResults.length > 0) {
            console.log("[Search] Sample result:", youtubeResults[0]?.title);
          }
        } catch (youtubeError) {
          console.error("[Search] ❌ YouTube API search failed:", youtubeError);
          console.error("[Search] Error details:", youtubeError.message);
        }

        // Combine results - local videos first, then YouTube Shorts
        const combinedResults = [
          ...localResults,
          ...youtubeResults.map((video) => ({ ...video, source: "youtube" })),
        ];

        console.log(
          `Total search results: ${combinedResults.length} (${localResults.length} local, ${youtubeResults.length} YouTube Shorts)`,
        );
        setSearchResults(combinedResults);
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
    [videos, saveRecentSearch],
  );

  const handleSearch = (e) => {
    e.preventDefault();
    performSearch(searchTerm);
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchTerm(suggestion);
    performSearch(suggestion);
  };

  const handleVideoClick = (video) => {
    const videoId = video._id || video.id;
    if (video.videoType === "uploaded") {
      navigate(`/videos?videoId=${videoId}&feedType=similar`, { state: { video } });
    } else {
      navigate(`/videos?videoId=${videoId}`, { state: { video } });
    }
  };

  const handleInputFocus = () => {
    setShowDropdown(true);
  };

  const handleInputBlur = () => {
    // Delay hiding dropdown to allow clicks
    setTimeout(() => {
      setShowDropdown(false);
    }, 200);
  };

  const getSearchPlaceholder = () => {
    return "Search videos...";
  };

  const renderSearchDropdown = () => {
    if (!showDropdown || searchTerm.trim().length > 0) return null;

    return (
      <div className="search__dropdown">
        <div className="search__dropdown-content">
          {/* Recent Searches */}
          {recentSearches.length > 0 ? (
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
          ) : (
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
                  key={video._uniqueKey || video._id || video.id}
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
          {/* Infinite scroll sentinel */}
          <div ref={loadMoreSentinelRef} className="search__load-more-sentinel">
            {isLoadingMore && (
              <div className="search__loading-more">
                <div className="search__loading-spinner">⏳</div>
              </div>
            )}
          </div>
        </div>
      ) : null}

      {/* Popular Educators Carousel - Hidden for now
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
      */}
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
                <p
                  className="search__video-creator"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (video.creator._id || video.creator.id) {
                      navigate(
                        `/profile/${video.creator._id || video.creator.id}`,
                      );
                    }
                  }}
                  style={{ cursor: "pointer" }}
                >
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
                showDropdown ? "search__input-container--dropdown-active" : ""
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
              {renderSearchDropdown()}
            </div>
          </form>
        </div>

        <div className="search__results">
          {!searchTerm.trim() ? renderEmptyState() : renderSearchResults()}
        </div>
      </div>

      {/* Bottom navigation for mobile */}
      <VideoSidebar
        onOpenLogin={onOpenLogin}
        onOpenRegister={onOpenRegister}
        mobileOnly={true}
      />
    </div>
  );
};

export default Search;
