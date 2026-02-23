import React, { useEffect, useRef } from "react";
import "./Video.css";
import { useVideo } from "../../contexts/VideoContext";
import { useLocation } from "react-router-dom";
import YouTubePlayer from "../YouTubePlayer/YouTubePlayer";
import VideoLoader from "../VideoLoader/VideoLoader";
import VideoSidebar from "../VideoSidebar/VideoSidebar";
import CommentModal from "../CommentModal/CommentModal";
import ShareModal from "../ShareModal/ShareModal";
import { videosAPI } from "../../services/api";

const Video = ({ onOpenLogin, onOpenRegister }) => {
  const containerRef = useRef(null);
  const processingVideoChange = useRef(false); // Prevent multiple simultaneous video changes
  const loadedFeedRef = useRef(null); // Track which custom feed has been loaded
  const processedVideoIdRef = useRef(null); // Track which videoId from URL has been processed
  const hasBeenUnmutedRef = useRef(false); // Track if video has been unmuted by user click
  const isFirstVideoEverRef = useRef(true); // Track if this is the very first video loaded
  const touchStartRef = useRef({ x: 0, y: 0, time: 0 }); // Track touch start for tap detection
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

  // Handle unplayable videos (embedding disabled, not found, etc.)
  useEffect(() => {
    const handleSkipVideo = (event) => {
      // Automatically move to next video
      scrollToVideo("next");
    };

    window.addEventListener("skipUnplayableVideo", handleSkipVideo);
    return () =>
      window.removeEventListener("skipUnplayableVideo", handleSkipVideo);
  }, [scrollToVideo]);

  // Handle mute button click - unmute and mark as interacted
  const handleMuteClick = () => {
    hasBeenUnmutedRef.current = true;
    // Mark that we've now shown the unmute overlay and user has interacted with it
    // This signals that subsequent videos should auto-unmute for sound autoplay
    isFirstVideoEverRef.current = false;

    if (currentVideo?.videoType !== "youtube" && videoRef.current) {
      // For uploaded videos: unmute and ensure it's playing
      // Important: Do these operations synchronously without waiting for state updates
      const videoElement = videoRef.current;

      // Only proceed if video is actually muted (first time unmute)
      if (videoElement.muted) {
        videoElement.muted = false;

        // Ensure video plays immediately after unmuting
        if (videoElement.paused) {
          videoElement.play().catch((err) => {});
        }

        // Toggle mute state for UI update (button emoji, etc)
        toggleMute();
      }
    } else {
      // For YouTube videos, use the context functions
      toggleMute();
    }
  };

  // Reset interaction tracker when video changes
  useEffect(() => {
    hasBeenUnmutedRef.current = false;
  }, [currentVideo]);

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
        return;
      }

      processingVideoChange.current = true;
      loadedFeedRef.current = feedKey;
      processedVideoIdRef.current = videoId; // Mark this videoId as processed for custom feeds too

      try {
        if (feedType === "profile" && username) {
          const response = await videosAPI.getProfileFeed(username, 10);

          if (response.success && response.videos) {
            // Find the clicked video's index
            const startIndex = response.videos.findIndex(
              (v) => (v.id || v._id) === videoId,
            );

            setCustomFeed(response.videos, Math.max(0, startIndex));
          }
        } else if (feedType === "similar" && videoId) {
          const response = await videosAPI.getSimilarVideos(videoId, 20);

          if (response.success && response.videos) {
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
        loadedFeedRef.current = null; // Reset on error
      } finally {
        setTimeout(() => {
          processingVideoChange.current = false;
        }, 1000);
      }
    };

    loadCustomFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]); // setCustomFeed is stable, don't need it in deps

  // Handle video ID from URL parameters (for non-custom feeds)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const videoId = searchParams.get("videoId");
    const feedType = searchParams.get("feedType");

    // Skip if it's a custom feed (handled by previous useEffect)
    if (feedType) return;

    // Skip if we're already in a focused feed
    if (isFocusedFeed) {
      return;
    }

    // Skip if video is currently switching
    if (isVideoSwitching) {
      return;
    }

    // Reset loaded feed ref when switching to non-custom feed
    if (loadedFeedRef.current) {
      loadedFeedRef.current = null;
    }

    // Only process if this is a NEW videoId that we haven't processed before
    if (
      videoId &&
      videos.length > 0 &&
      !processingVideoChange.current &&
      videoId !== processedVideoIdRef.current
    ) {
      processingVideoChange.current = true;
      processedVideoIdRef.current = videoId;

      // Create focused feed when navigating from thumbnail click
      setVideoById(videoId, true);

      // Reset the flag after a short delay
      setTimeout(() => {
        processingVideoChange.current = false;
      }, 1000);
    }
  }, [location.search, videos.length, isFocusedFeed, isVideoSwitching]);

  // Reset processed video ID when component unmounts or URL changes to a non-video page
  useEffect(() => {
    return () => {
      processedVideoIdRef.current = null;
    };
  }, []);

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
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {(isLoading || isVideoSwitching) && (
            <VideoLoader
              message={
                isVideoSwitching
                  ? "Loading next video..."
                  : "Loading first video..."
              }
            />
          )}

          {currentVideo && (
            <>
              {/* Invisible fullscreen clickable area for first unmute */}
              {isMuted && !hasBeenUnmutedRef.current && (
                <div
                  onClick={handleMuteClick}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    const touch = e.touches[0];
                    touchStartRef.current = {
                      x: touch.clientX,
                      y: touch.clientY,
                      time: Date.now(),
                    };
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const touch = e.changedTouches[0];
                    const deltaX = Math.abs(
                      touch.clientX - touchStartRef.current.x,
                    );
                    const deltaY = Math.abs(
                      touch.clientY - touchStartRef.current.y,
                    );
                    const deltaTime = Date.now() - touchStartRef.current.time;

                    // Only unmute if it's a tap (not a swipe)
                    if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
                      handleMuteClick();
                    }
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    zIndex: 10,
                    cursor: "pointer",
                  }}
                  aria-label="Unmute video"
                />
              )}

              <button
                className="video-page__mute-btn"
                onClick={handleMuteClick}
                aria-label={isMuted ? "Unmute video" : "Mute video"}
              >
                {isMuted ? "🔇" : "🔊"}
              </button>

              {currentVideo.videoType === "youtube" ? (
                (() => {
                  const extractedVideoId =
                    currentVideo.id ||
                    currentVideo.videoUrl?.split("/").pop().split("?")[0];
                  return (
                    <div
                      key={extractedVideoId}
                      className="video-page__youtube-wrapper"
                      style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                      }}
                    >
                      <YouTubePlayer
                        videoId={extractedVideoId}
                        isMuted={isMuted}
                        isPlaying={isPlaying}
                        className="video-page__video"
                      />
                      {/* Transparent overlay to capture clicks on YouTube iframe */}
                      <div
                        onClick={togglePlay}
                        onTouchStart={(e) => {
                          const touch = e.touches[0];
                          touchStartRef.current = {
                            x: touch.clientX,
                            y: touch.clientY,
                            time: Date.now(),
                          };
                        }}
                        onTouchEnd={(e) => {
                          const touch = e.changedTouches[0];
                          const deltaX = Math.abs(
                            touch.clientX - touchStartRef.current.x,
                          );
                          const deltaY = Math.abs(
                            touch.clientY - touchStartRef.current.y,
                          );
                          const deltaTime =
                            Date.now() - touchStartRef.current.time;

                          // Only toggle play if it's a tap (not a swipe)
                          if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
                            e.preventDefault();
                            togglePlay();
                          }
                        }}
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
                  );
                })()
              ) : (
                <>
                  <video
                    key={
                      currentVideo._id ||
                      currentVideo.id ||
                      currentVideo.videoUrl
                    }
                    ref={videoRef}
                    className="video-page__video"
                    src={currentVideo.videoUrl}
                    loop
                    muted={isMuted}
                    playsInline
                    preload="auto"
                    controls={false}
                    onClick={togglePlay}
                    style={{
                      pointerEvents:
                        isMuted && !hasBeenUnmutedRef.current ? "none" : "auto",
                    }}
                    onTouchStart={(e) => {
                      const touch = e.touches[0];
                      touchStartRef.current = {
                        x: touch.clientX,
                        y: touch.clientY,
                        time: Date.now(),
                      };
                    }}
                    onTouchEnd={(e) => {
                      const touch = e.changedTouches[0];
                      const deltaX = Math.abs(
                        touch.clientX - touchStartRef.current.x,
                      );
                      const deltaY = Math.abs(
                        touch.clientY - touchStartRef.current.y,
                      );
                      const deltaTime = Date.now() - touchStartRef.current.time;

                      // Only toggle play if it's a tap (not a swipe)
                      if (deltaX < 10 && deltaY < 10 && deltaTime < 300) {
                        e.preventDefault();
                        togglePlay();
                      }
                    }}
                    onError={(e) => {
                      const error = e.target.error;
                    }}
                  >
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
