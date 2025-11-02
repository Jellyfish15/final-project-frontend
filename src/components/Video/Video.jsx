import React, { useEffect, useRef } from "react";
import "./Video.css";
import { useVideo } from "../../contexts/VideoContext";
import { useLocation } from "react-router-dom";
import YouTubePlayer from "../YouTubePlayer/YouTubePlayer";
import VideoLoader from "../VideoLoader/VideoLoader";
import VideoSidebar from "../VideoSidebar/VideoSidebar";
import CommentModal from "../CommentModal/CommentModal";
import ShareModal from "../ShareModal/ShareModal";
import { useVideoEngagement, useRecommendations } from "../../hooks/useEngagement";

const Video = ({ onOpenLogin, onOpenRegister }) => {
  const containerRef = useRef(null);
  const processingVideoChange = useRef(false); // Prevent multiple simultaneous video changes
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
  const { recommendations, sessionId, disengagement, fetchRecommendations } = useRecommendations();
  const { engagementData, trackEngagement, handleSkip } = useVideoEngagement(
    videoRef,
    currentVideo,
    sessionId
  );

  // Handle video ID from URL parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const videoId = searchParams.get("videoId");

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
  }, [location.search, setVideoById, videos.length]); // Removed currentIndex and currentVideo to prevent infinite loop

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
      console.log(`[Engagement] User disengaging - Severity: ${disengagement.severity}%`, disengagement.reason);
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
                <YouTubePlayer
                  videoId={currentVideo.videoUrl.split("/").pop()}
                  isMuted={isMuted}
                  className="video-page__video"
                />
              ) : (
                <>
                  <video
                    ref={videoRef}
                    className="video-page__video"
                    loop
                    autoPlay
                    muted={isMuted}
                    playsInline
                    controls={true}
                    onClick={(e) => {
                      // Click anywhere on video to toggle mute (TikTok/Instagram style)
                      toggleMute();
                    }}
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

              {!isPlaying && currentVideo.videoType !== "youtube" && (
                <div className="video-page__play-overlay" onClick={togglePlay}>
                  <div className="video-page__play-button">▶</div>
                </div>
              )}
            </>
          )}
        </div>

        {currentVideo && (
          <>
            <div className="video-page__actions">
              <button
                className={`video-page__action ${
                  isLiked ? "video-page__action--liked" : ""
                }`}
                onClick={handleLike}
              >
                <span className="video-page__action-icon">
                  {isLiked ? "❤️" : "🤍"}
                </span>
                <span className="video-page__action-count">{likeCount}</span>
              </button>

              <button className="video-page__action" onClick={handleComment}>
                <span className="video-page__action-icon">💬</span>
                <span className="video-page__action-count">{commentCount}</span>
              </button>

              <button className="video-page__action" onClick={handleShare}>
                <span className="video-page__action-icon">↗</span>
                <span className="video-page__action-count">
                  {currentVideo.shares || 0}
                </span>
              </button>
            </div>

            <div className="video-page__bottom-info">
              <h3 className="video-page__video-title">{currentVideo.title}</h3>
              {isFocusedFeed && (
                <div className="video-page__focused-indicator">
                  <p className="video-page__focused-text">
                    🎯 Your Video Feed ({videos.length} videos)
                  </p>
                  <button
                    className="video-page__return-btn"
                    onClick={resetToFullFeed}
                  >
                    🔄 Return to Full Feed
                  </button>
                </div>
              )}
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
