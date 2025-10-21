import React, { useEffect, useRef } from "react";
import "./Video.css";
import { useVideo } from "../../contexts/VideoContext";
import YouTubePlayer from "../YouTubePlayer/YouTubePlayer";
import VideoLoader from "../VideoLoader/VideoLoader";

const Video = () => {
  const containerRef = useRef(null);
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
    scrollToVideo,
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
    swipeIndicator,
  } = useVideo();

  // Enhanced touch event setup - focus on video area only
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Enhanced iPhone-optimized touch handler
    const handleTouchStartEnhanced = (e) => {
      // Immediately prevent any potential interference with bottom navigation
      const touch = e.touches[0];
      const windowHeight = window.innerHeight;
      const bottomNavHeight = 70; // Height of bottom navigation

      // iPhone-specific: Don't handle touches in bottom navigation area
      if (touch.clientY > windowHeight - bottomNavHeight - 20) {
        return; // Let bottom navigation handle this touch
      }

      const rect = container.getBoundingClientRect();
      const relativeX = touch.clientX - rect.left;
      const relativeY = touch.clientY - rect.top;

      // Calculate video area bounds (excluding UI elements)
      const videoContainer = container.querySelector(
        ".video-page__video-container"
      );

      if (videoContainer) {
        const videoRect = videoContainer.getBoundingClientRect();

        // iPhone-optimized touch area detection
        const isInVideoArea =
          touch.clientX >= videoRect.left - 30 &&
          touch.clientX <= videoRect.right + 30 &&
          touch.clientY >= videoRect.top &&
          touch.clientY <= videoRect.bottom - 20; // Extra margin from bottom

        if (isInVideoArea) {
          // Check if touch target is not a button or interactive element
          const isInteractiveElement = e.target.closest(
            "button, .video-page__action, .video-page__mute-btn, .video-page__nav-btn, .bottom-nav, .video-page__bottom-info"
          );

          if (!isInteractiveElement) {
            // Prevent default to stop any scroll behavior
            e.preventDefault();
            e.stopPropagation();
            handleTouchStart(e);
          }
        }
      } else {
        // Fallback: more conservative area detection for iPhone
        const isInVideoArea =
          relativeX > 30 &&
          relativeX < rect.width - 80 && // Exclude right side for actions
          relativeY > 20 &&
          relativeY < rect.height - 60; // Exclude bottom area

        if (isInVideoArea) {
          const isInteractiveElement = e.target.closest(
            "button, .video-page__action, .video-page__mute-btn, .video-page__nav-btn, .bottom-nav, .video-page__bottom-info"
          );

          if (!isInteractiveElement) {
            e.preventDefault();
            e.stopPropagation();
            handleTouchStart(e);
          }
        }
      }
    };

    const handleTouchMoveEnhanced = (e) => {
      // iPhone-specific: Aggressively prevent default for vertical moves
      const touch = e.touches[0];
      if (touch) {
        const deltaY = Math.abs(
          touch.clientY - (touch.startY || touch.clientY)
        );
        const deltaX = Math.abs(
          touch.clientX - (touch.startX || touch.clientX)
        );

        // If it's more vertical than horizontal, prevent default
        if (deltaY > deltaX && deltaY > 10) {
          e.preventDefault();
          e.stopPropagation();
        }
      }

      handleTouchMove(e);
    };

    const handleTouchEndEnhanced = (e) => {
      // Ensure we don't interfere with other elements
      e.stopPropagation();
      handleTouchEnd(e);
    };

    // Add touch event listeners with proper options for Safari
    const touchStartOptions = { passive: false };
    const touchMoveOptions = { passive: false };
    const touchEndOptions = { passive: true };

    container.addEventListener(
      "touchstart",
      handleTouchStartEnhanced,
      touchStartOptions
    );
    container.addEventListener(
      "touchmove",
      handleTouchMoveEnhanced,
      touchMoveOptions
    );
    container.addEventListener(
      "touchend",
      handleTouchEndEnhanced,
      touchEndOptions
    );
    container.addEventListener(
      "touchcancel",
      handleTouchCancel,
      touchEndOptions
    );

    return () => {
      container.removeEventListener(
        "touchstart",
        handleTouchStartEnhanced,
        touchStartOptions
      );
      container.removeEventListener(
        "touchmove",
        handleTouchMoveEnhanced,
        touchMoveOptions
      );
      container.removeEventListener(
        "touchend",
        handleTouchEndEnhanced,
        touchEndOptions
      );
      container.removeEventListener(
        "touchcancel",
        handleTouchCancel,
        touchEndOptions
      );
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd, handleTouchCancel]);

  return (
    <div className="video-page">
      <div
        ref={containerRef}
        className="video-page__container"
        onWheel={handleWheel}
      >
        <div className="video-page__video-container">
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
                <video
                  ref={videoRef}
                  className="video-page__video"
                  loop
                  autoPlay={isPlaying}
                  muted={isMuted}
                  playsInline
                  onClick={togglePlay}
                >
                  <source src={currentVideo.videoUrl} type="video/mp4" />
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
                <span className="video-page__action-count">
                  {currentVideo.likes}
                </span>
              </button>

              <button className="video-page__action" onClick={handleComment}>
                <span className="video-page__action-icon">💬</span>
                <span className="video-page__action-count">
                  {currentVideo.comments}
                </span>
              </button>

              <button className="video-page__action" onClick={handleShare}>
                <span className="video-page__action-icon">↗</span>
                <span className="video-page__action-count">
                  {currentVideo.shares}
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

        {/* Swipe feedback indicator */}
        {swipeIndicator.show && (
          <div
            className={`video-page__swipe-indicator ${
              swipeIndicator.show ? "video-page__swipe-indicator--show" : ""
            }`}
          >
            {swipeIndicator.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default Video;
