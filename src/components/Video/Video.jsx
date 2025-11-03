import React, { useEffect, useRef } from "react";
import "./Video.css";
import { useVideo } from "../../contexts/VideoContext";
import { useLocation } from "react-router-dom";
import YouTubePlayer from "../YouTubePlayer/YouTubePlayer";
import VideoLoader from "../VideoLoader/VideoLoader";
import VideoSidebar from "../VideoSidebar/VideoSidebar";
import CommentModal from "../CommentModal/CommentModal";
import ShareModal from "../ShareModal/ShareModal";
import {
  useVideoEngagement,
  useRecommendations,
} from "../../hooks/useEngagement";
import { videosAPI } from "../../services/api";

const Video = ({ onOpenLogin, onOpenRegister }) => {
  const containerRef = useRef(null);
  const processingVideoChange = useRef(false); // Prevent multiple simultaneous video changes
  const loadedFeedRef = useRef(null); // Track which custom feed has been loaded
  const location = useLocation();
  const {
    currentVideo,
    currentIndex,
    videos,
    isPlaying,
    isLiked,
    isMuted,
    isLoading,
    isVideoSwitching,
    videoRef,
    likeCount,
    commentCount,
    isCommentModalOpen,
    setIsCommentModalOpen,
    isShareModalOpen,
    setIsShareModalOpen,
    scrollToVideo,
    setVideoById,
    setCustomFeed,
    resetToFullFeed,
    isFocusedFeed,
    togglePlay,
    toggleMute,
    handleLike,
    handleShare,
    handleComment,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
  } = useVideo();

  // Initialize engagement tracking and recommendations
  const { recommendations, sessionId, disengagement, fetchRecommendations } =
    useRecommendations();
  const { engagementData, trackEngagement, handleSkip } = useVideoEngagement(
    videoRef,
    currentVideo,
    sessionId
  );

  // Handle custom feed types (profile or similar)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const feedType = searchParams.get("feedType");
    const videoId = searchParams.get("videoId");
    const username = searchParams.get("username");

    // Create a unique key for this feed
    const feedKey = `${feedType}-${videoId}-${username}`;

    const loadCustomFeed = async () => {
      // Skip if no feedType or already processing or already loaded this exact feed
      if (
        !feedType ||
        processingVideoChange.current ||
        loadedFeedRef.current === feedKey
      ) {
        console.log("[Video] Skipping custom feed load:", {
          feedType,
          processing: processingVideoChange.current,
          alreadyLoaded: loadedFeedRef.current === feedKey,
        });
        return;
      }

      processingVideoChange.current = true;
      loadedFeedRef.current = feedKey;

      try {
        if (feedType === "profile" && username) {
          // Load profile feed
          console.log("[Video] Loading profile feed for:", username);
          const response = await videosAPI.getProfileFeed(username, 10);

          if (response.success && response.videos) {
            console.log("[Video] Profile feed loaded:", {
              total: response.videos.length,
              userVideos: response.feedInfo.userVideos,
              similarVideos: response.feedInfo.similarVideos,
            });

            // Find the clicked video's index
            const startIndex = response.videos.findIndex(
              (v) => (v.id || v._id) === videoId
            );

            setCustomFeed(response.videos, Math.max(0, startIndex));
          }
        } else if (feedType === "similar" && videoId) {
          // Load similar videos feed
          console.log("[Video] Loading similar videos for:", videoId);
          const response = await videosAPI.getSimilarVideos(videoId, 20);

          if (response.success && response.videos) {
            console.log(
              "[Video] Similar videos loaded:",
              response.videos.length
            );

            // Fetch the source video and add it to the beginning
            try {
              const sourceResponse = await videosAPI.getVideo(videoId);
              if (sourceResponse.success) {
                const feedVideos = [sourceResponse.video, ...response.videos];
                setCustomFeed(feedVideos, 0);
              }
            } catch (error) {
              // If source video fetch fails, just use similar videos
              setCustomFeed(response.videos, 0);
            }
          }
        }
      } catch (error) {
        console.error("[Video] Error loading custom feed:", error);
        loadedFeedRef.current = null; // Reset on error
      } finally {
        setTimeout(() => {
          processingVideoChange.current = false;
        }, 1000);
      }
    };

    loadCustomFeed();
  }, [location.search, setCustomFeed]);

  // Handle video ID from URL parameters (for non-custom feeds)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const videoId = searchParams.get("videoId");
    const feedType = searchParams.get("feedType");

    // Skip if it's a custom feed (handled by previous useEffect)
    if (feedType) return;

    // Reset loaded feed ref when switching to non-custom feed
    if (loadedFeedRef.current) {
      console.log("[Video] Resetting custom feed tracking");
      loadedFeedRef.current = null;
    }

    console.log("[Video] URL changed:", location.search);
    console.log("[Video] Extracted videoId:", videoId);
    console.log("[Video] Videos available:", videos.length);
    console.log(
      "[Video] Processing video change:",
      processingVideoChange.current
    );

    if (videoId && videos.length > 0 && !processingVideoChange.current) {
      // Check if we're already showing the requested video to prevent unnecessary calls
      const currentVideoId = currentVideo?._id || currentVideo?.id;
      if (currentVideoId !== videoId) {
        console.log(
          "[Video] Calling setVideoById with focused feed for:",
          videoId
        );
        processingVideoChange.current = true;
        // Create focused feed when navigating from thumbnail click
        setVideoById(videoId, true);

        // Reset the flag after a short delay
        setTimeout(() => {
          processingVideoChange.current = false;
        }, 1000);
      } else {
        console.log("[Video] Already showing requested video:", videoId);
      }
    } else if (videoId && videos.length === 0) {
      console.log("[Video] VideoId found but no videos loaded yet");
    }
  }, [location.search, setVideoById, videos.length, currentVideo]); // Removed currentIndex and currentVideo to prevent infinite loop

  // Debug current video changes
  useEffect(() => {
    console.log("[Video] Current video changed:", {
      index: currentIndex,
      id: currentVideo?._id,
      title: currentVideo?.title,
      url: currentVideo?.videoUrl,
      type: currentVideo?.videoType,
      isFocused: isFocusedFeed,
      totalVideos: videos.length,
    });

    // Additional debugging for video URLs
    if (currentVideo?.videoType === "uploaded") {
      console.log("[Video] Uploaded video details:", {
        originalVideoUrl: currentVideo.videoUrl,
        isFullUrl: currentVideo.videoUrl.startsWith("http"),
        backendUrl: import.meta.env.VITE_API_URL || "http://localhost:5000",
      });
    }
  }, [currentVideo, currentIndex, isFocusedFeed, videos]);

  // Fetch personalized recommendations on mount
  useEffect(() => {
    if (sessionId && !isFocusedFeed) {
      console.log("[Recommendations] Fetching personalized feed");
      fetchRecommendations(20);
    }
  }, [sessionId, fetchRecommendations, isFocusedFeed]);

  // Track interactions (likes, comments, shares)
  useEffect(() => {
    if (isLiked || isCommentModalOpen || isShareModalOpen) {
      trackEngagement({
        liked: isLiked,
        commented: isCommentModalOpen,
        shared: isShareModalOpen,
      });
    }
  }, [isLiked, isCommentModalOpen, isShareModalOpen, trackEngagement]);

  // Log disengagement status
  useEffect(() => {
    if (disengagement?.isDisengaging) {
      console.log(
        `[Engagement] User disengaging - Severity: ${disengagement.severity}%`,
        disengagement.reason
      );
    }
  }, [disengagement]);

  return (
    <div className="video-page">
      {/* Sidebar Navigation for Desktop */}
      <VideoSidebar onOpenLogin={onOpenLogin} onOpenRegister={onOpenRegister} />

      <div
        ref={containerRef}
        className="video-page__container"
        onWheel={handleWheel}
      >
        <div
          className="video-page__video-container"
          onTouchStart={(e) => {
            console.log("[Video Container] Touch start on video container");
            handleTouchStart(e);
          }}
          onTouchMove={(e) => {
            console.log("[Video Container] Touch move on video container");
            handleTouchMove(e);
          }}
          onTouchEnd={(e) => {
            console.log("[Video Container] Touch end on video container");
            handleTouchEnd(e);
          }}
        >
          {(isLoading || isVideoSwitching) && <VideoLoader />}

          {currentVideo && (
            <>
              <button
                className="video-page__mute-btn"
                onClick={toggleMute}
                aria-label={isMuted ? "Unmute video" : "Mute video"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>

              {currentVideo.videoType === "youtube" ? (
                <div
                  className="video-page__youtube-wrapper"
                  style={{
                    position: "relative",
                    width: "100%",
                    height: "100%",
                  }}
                >
                  <YouTubePlayer
                    videoId={currentVideo.videoUrl.split("/").pop()}
                    isMuted={isMuted}
                    isPlaying={isPlaying}
                    className="video-page__video"
                  />
                  {/* Transparent overlay to capture clicks on YouTube iframe */}
                  <div
                    onClick={togglePlay}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: "100%",
                      cursor: "pointer",
                      zIndex: 1,
                    }}
                  />
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="video-page__video"
                    loop
                    autoPlay
                    muted={isMuted}
                    playsInline
                    controls={false}
                    onClick={togglePlay}
                    onLoadStart={() =>
                      console.log("[Video] Load start:", currentVideo?.videoUrl)
                    }
                    onLoadedData={() =>
                      console.log("[Video] Loaded data successfully")
                    }
                    onError={(e) =>
                      console.error(
                        "[Video] Error loading video:",
                        e.target.error,
                        currentVideo?.videoUrl
                      )
                    }
                    onCanPlay={() => console.log("[Video] Can play")}
                    onPlay={() => console.log("[Video] Started playing")}
                    onPause={() => console.log("[Video] Paused")}
                    onLoadedMetadata={() =>
                      console.log("[Video] Metadata loaded")
                    }
                  >
                    <source
                      src={currentVideo.videoUrl}
                      type="video/mp4"
                      onError={() =>
                        console.error(
                          "[Video] Source error for:",
                          currentVideo.videoUrl
                        )
                      }
                    />
                    <source
                      src={currentVideo.videoUrl}
                      type="video/webm"
                      onError={() =>
                        console.error(
                          "[Video] WebM source error for:",
                          currentVideo.videoUrl
                        )
                      }
                    />
                    <div className="video-page__video-placeholder">
                      <div className="video-page__placeholder-content">
                        <div className="video-page__placeholder-icon">🎥</div>
                        <p>Educational Video</p>
                        <p className="video-page__placeholder-title">
                          {currentVideo.title}
                        </p>
                      </div>
                    </div>
                  </video>

                  {/* Touch overlay temporarily disabled for debugging */}
                  {/*
                  <div
                    className="video-page__touch-overlay"
                    onClick={(e) => {
                      console.log("[Touch Overlay] Click detected");
                      togglePlay();
                    }}
                    onTouchStart={(e) => {
                      console.log(
                        "[Touch Overlay] Touch start on overlay - WORKING!"
                      );
                      // Add visual feedback
                      e.target.style.backgroundColor = "rgba(255,0,0,0.1)";
                      setTimeout(() => {
                        e.target.style.backgroundColor = "transparent";
                      }, 200);

                      e.preventDefault();
                      e.stopPropagation();
                      handleTouchStartEnhanced(e);
                    }}
                    onTouchMove={(e) => {
                      console.log(
                        "[Touch Overlay] Touch move on overlay - WORKING!"
                      );
                      e.preventDefault();
                      e.stopPropagation();
                      handleTouchMoveEnhanced(e);
                    }}
                    onTouchEnd={(e) => {
                      console.log(
                        "[Touch Overlay] Touch end on overlay - WORKING!"
                      );
                      e.preventDefault();
                      e.stopPropagation();
                      handleTouchEndEnhanced(e);
                    }}
                  />
                  */}
                </>
              )}

              {/* Show play button overlay when paused for both video types */}
              {!isPlaying && (
                <div
                  className="video-page__play-overlay"
                  onClick={togglePlay}
                  style={{ zIndex: 2, position: "absolute" }}
                >
                  <div className="video-page__play-button">▶</div>
                </div>
              )}
            </>
          )}
        </div>

        {currentVideo && (
          <>
            <div className="video-page__actions">
              {/* Only show like/comment buttons for uploaded videos, not YouTube videos */}
              {currentVideo.videoType !== "youtube" && (
                <>
                  <button
                    className={`video-page__action ${
                      isLiked ? "video-page__action--liked" : ""
                    }`}
                    onClick={handleLike}
                  >
                    <span className="video-page__action-icon">
                      {isLiked ? "❤️" : "🤍"}
                    </span>
                    <span className="video-page__action-count">
                      {likeCount}
                    </span>
                  </button>

                  <button
                    className="video-page__action"
                    onClick={handleComment}
                  >
                    <span className="video-page__action-icon">💬</span>
                    <span className="video-page__action-count">
                      {commentCount}
                    </span>
                  </button>
                </>
              )}

              <button className="video-page__action" onClick={handleShare}>
                <span className="video-page__action-icon">↗</span>
                <span className="video-page__action-count">
                  {currentVideo.shares || 0}
                </span>
              </button>
            </div>

            <div className="video-page__bottom-info">
              <h3 className="video-page__video-title">{currentVideo.title}</h3>
            </div>
          </>
        )}

        <div className="video-page__navigation">
          <button
            className="video-page__nav-btn"
            onClick={() => scrollToVideo("previous")}
            disabled={currentIndex === 0}
          >
            ↑
          </button>
          <button
            className="video-page__nav-btn"
            onClick={() => scrollToVideo("next")}
            disabled={currentIndex === videos.length - 1}
          >
            ↓
          </button>
        </div>
      </div>

      {/* Comment Modal */}
      <CommentModal
        isOpen={isCommentModalOpen}
        onClose={() => setIsCommentModalOpen(false)}
        video={currentVideo}
        onOpenLogin={onOpenLogin}
      />

      {/* Share Modal */}
      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        video={currentVideo}
      />
    </div>
  );
};

export default Video;
