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
      console.log("[Video] Skipping unplayable video:", event.detail.videoId);
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
          videoElement.play().catch((err) => {
            console.log("[Video] Could not play:", err.message);
          });
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

    // For non-first videos, auto-unmute and ensure playback
    // Only do this if the user has unmuted at least once (indicated by isFirstVideoEverRef being false)
    if (currentVideo && !isFirstVideoEverRef.current && videoRef.current) {
      if (currentVideo?.videoType !== "youtube") {
        const videoElement = videoRef.current;
        
        // Auto-unmute non-first videos
        if (videoElement.muted) {
          videoElement.muted = false;
          // Update React state to match the video element's actual muted state
          toggleMute();
          console.log("[Video] Auto-unmuting non-first video:", currentVideo?.title);
          
          // Ensure the video plays after unmuting
          // Use a tiny delay to let the mute update process
          setTimeout(() => {
            if (videoElement.paused) {
              videoElement.play().catch((err) => {
                console.log("[Video] Could not autoplay after unmute:", err.message);
              });
            }
          }, 5);
        }
      }
    }
  }, [currentVideo, toggleMute]);

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
      processedVideoIdRef.current = videoId; // Mark this videoId as processed for custom feeds too

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
              (v) => (v.id || v._id) === videoId,
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
              response.videos.length,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]); // setCustomFeed is stable, don't need it in deps

  // Handle video ID from URL parameters (for non-custom feeds)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const videoId = searchParams.get("videoId");
    const feedType = searchParams.get("feedType");

    // Skip if it's a custom feed (handled by previous useEffect)
    if (feedType) return;

    // Skip if we're already in a focused feed - don't let URL override it
    if (isFocusedFeed) {
      console.log("[Video] Already in focused feed, ignoring URL videoId");
      return;
    }

    // Skip if video is currently switching to avoid conflicts
    if (isVideoSwitching) {
      console.log("[Video] Video is switching, skipping URL processing");
      return;
    }

    // Reset loaded feed ref when switching to non-custom feed
    if (loadedFeedRef.current) {
      console.log("[Video] Resetting custom feed tracking");
      loadedFeedRef.current = null;
    }

    console.log("[Video] URL changed:", location.search);
    console.log("[Video] Extracted videoId:", videoId);
    console.log(
      "[Video] Previously processed videoId:",
      processedVideoIdRef.current,
    );
    console.log("[Video] Videos available:", videos.length);
    console.log(
      "[Video] Processing video change:",
      processingVideoChange.current,
    );

    // Only process if this is a NEW videoId that we haven't processed before
    if (
      videoId &&
      videos.length > 0 &&
      !processingVideoChange.current &&
      videoId !== processedVideoIdRef.current
    ) {
      console.log(
        "[Video] Calling setVideoById with focused feed for:",
        videoId,
      );
      processingVideoChange.current = true;
      processedVideoIdRef.current = videoId; // Mark this videoId as processed

      // Create focused feed when navigating from thumbnail click
      setVideoById(videoId, true);

      // Reset the flag after a short delay
      setTimeout(() => {
        processingVideoChange.current = false;
      }, 1000);
    } else if (videoId && videos.length === 0) {
      console.log("[Video] VideoId found but no videos loaded yet");
    } else if (videoId === processedVideoIdRef.current) {
      console.log(
        "[Video] VideoId already processed, skipping to avoid jumping back",
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, videos.length, isFocusedFeed, isVideoSwitching]); // setVideoById is stable, removed from deps to prevent re-runs

  // Reset processed video ID when component unmounts or URL changes to a non-video page
  useEffect(() => {
    return () => {
      // Cleanup when leaving the video page
      console.log("[Video] Component unmounting, resetting processed video ID");
      processedVideoIdRef.current = null;
    };
  }, []);

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

  // Handle autoplay for uploaded videos when they load
  useEffect(() => {
    if (
      videoRef.current &&
      currentVideo?.videoType !== "youtube" &&
      isPlaying
    ) {
      // Simply ensure the video is playing when it's the current one
      const ensurePlayback = async () => {
        try {
          // Play the video if it exists
          const playPromise = videoRef.current.play();
          if (playPromise !== undefined) {
            await playPromise;
            console.log("[Video] Video is now playing");
          }
        } catch (error) {
          console.log("[Video] Could not autoplay:", error.message);
        }
      };

      // Wait a tiny bit for the video element to be ready, then play
      const timeoutId = setTimeout(ensurePlayback, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [currentVideo, isPlaying]);

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
                  console.log("[Video] YouTube video ID:", {
                    id: currentVideo.id,
                    videoUrl: currentVideo.videoUrl,
                    extracted: extractedVideoId,
                    title: currentVideo.title,
                  });
                  return (
                    <div
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
                    ref={videoRef}
                    className="video-page__video"
                    loop
                    autoPlay
                    muted={isMuted}
                    playsInline
                    preload="auto"
                    controls={false}
                    crossOrigin="anonymous"
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
                    onLoadStart={() =>
                      console.log("[Video] Load start:", currentVideo?.videoUrl)
                    }
                    onLoadedData={() => {
                      console.log("[Video] Loaded data successfully");
                      console.log(
                        "[Video] Duration:",
                        videoRef.current?.duration,
                      );
                      console.log(
                        "[Video] Has audio:",
                        videoRef.current?.mozHasAudio !== false,
                      );
                    }}
                    onError={(e) => {
                      const error = e.target.error;
                      console.error(
                        "[Video] Error loading video:",
                        {
                          code: error?.code,
                          message: error?.message,
                          MEDIA_ERR_ABORTED: error?.code === 1,
                          MEDIA_ERR_NETWORK: error?.code === 2,
                          MEDIA_ERR_DECODE: error?.code === 3,
                          MEDIA_ERR_SRC_NOT_SUPPORTED: error?.code === 4,
                        },
                        currentVideo?.videoUrl,
                      );
                    }}
                    onCanPlay={async () => {
                      console.log("[Video] Can play - video is ready");
                    }}
                    onPlay={() => console.log("[Video] Started playing")}
                    onPause={() => console.log("[Video] Paused")}
                    onLoadedMetadata={() =>
                      console.log("[Video] Metadata loaded")
                    }
                  >
                    <source
                      src={currentVideo.videoUrl}
                      type={
                        currentVideo.videoUrl?.endsWith(".webm")
                          ? "video/webm"
                          : currentVideo.videoUrl?.endsWith(".mov")
                            ? "video/mp4"
                            : "video/mp4"
                      }
                      onError={(e) => {
                        console.error(
                          "[Video] Source error for:",
                          currentVideo.videoUrl,
                          "Error:",
                          e.target.error,
                        );
                      }}
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
