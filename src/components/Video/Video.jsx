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
  } = useVideo();

  // Enhanced touch event setup with direct video container handling
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Also add listeners to video container directly for better capture
    const videoContainer = container.querySelector(
      ".video-page__video-container"
    );
    const touchOverlay = container.querySelector(".video-page__touch-overlay");

    console.log("[Touch Setup] Setting up enhanced touch listeners", {
      container: !!container,
      videoContainer: !!videoContainer,
      touchOverlay: !!touchOverlay,
    });

    // Enhanced touch options
    const touchOptions = { passive: false, capture: true };

    // Video container touch handlers (as backup)
    const videoTouchStart = (e) => {
      console.log("[Video Container Direct] Touch start");
      handleTouchStartEnhanced(e);
    };

    const videoTouchMove = (e) => {
      console.log("[Video Container Direct] Touch move");
      handleTouchMoveEnhanced(e);
    };

    const videoTouchEnd = (e) => {
      console.log("[Video Container Direct] Touch end");
      handleTouchEndEnhanced(e);
    };

    if (videoContainer) {
      videoContainer.addEventListener(
        "touchstart",
        videoTouchStart,
        touchOptions
      );
      videoContainer.addEventListener(
        "touchmove",
        videoTouchMove,
        touchOptions
      );
      videoContainer.addEventListener("touchend", videoTouchEnd, touchOptions);
    }

    // Simplified and more lenient touch handler for iPhone debugging
    const handleTouchStartEnhanced = (e) => {
      const touch = e.touches[0];
      const windowHeight = window.innerHeight;
      const bottomNavHeight = 70;

      console.log("[Touch Debug] Touch start detected:", {
        clientX: touch.clientX,
        clientY: touch.clientY,
        windowHeight,
        bottomThreshold: windowHeight - bottomNavHeight - 20,
        target: e.target.className,
      });

      // iPhone-specific: Don't handle touches in bottom navigation area
      if (touch.clientY > windowHeight - bottomNavHeight - 20) {
        console.log("[Touch Debug] Touch in bottom nav area, ignoring");
        return;
      }

      const rect = container.getBoundingClientRect();
      const relativeX = touch.clientX - rect.left;
      const relativeY = touch.clientY - rect.top;

      console.log("[Touch Debug] Container bounds:", {
        rect,
        relativeX,
        relativeY,
      });

      // More lenient touch area detection - focus on center 80% of screen
      const isInVideoArea =
        relativeX > rect.width * 0.1 &&
        relativeX < rect.width * 0.9 &&
        relativeY > rect.height * 0.1 &&
        relativeY < rect.height * 0.8;

      console.log("[Touch Debug] Video area check:", {
        isInVideoArea,
        leftBound: rect.width * 0.1,
        rightBound: rect.width * 0.9,
        topBound: rect.height * 0.1,
        bottomBound: rect.height * 0.8,
      });

      if (isInVideoArea) {
        // Check if touch target is not a button or interactive element
        const isInteractiveElement = e.target.closest(
          "button, .video-page__action, .video-page__mute-btn, .video-page__nav-btn, .bottom-nav"
        );

        // Check if touching video element or touch overlay
        const isVideoOrOverlay = e.target.closest(
          "video, .video-page__touch-overlay, .video-page__video-container"
        );

        console.log("[Touch Debug] Interactive element check:", {
          isInteractiveElement: !!isInteractiveElement,
          isVideoOrOverlay: !!isVideoOrOverlay,
          targetElement: e.target.tagName,
          targetClass: e.target.className,
        });

        // Handle touch if it's not on interactive buttons
        if (!isInteractiveElement) {
          console.log(
            "[Touch Debug] Starting touch handling - target:",
            e.target.tagName
          );
          e.preventDefault();
          e.stopPropagation();
          handleTouchStart(e);
        } else {
          console.log(
            "[Touch Debug] Interactive element detected, not handling touch"
          );
        }
      } else {
        console.log("[Touch Debug] Touch outside video area");
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
      // Clean up video container listeners
      if (videoContainer) {
        videoContainer.removeEventListener(
          "touchstart",
          videoTouchStart,
          touchOptions
        );
        videoContainer.removeEventListener(
          "touchmove",
          videoTouchMove,
          touchOptions
        );
        videoContainer.removeEventListener(
          "touchend",
          videoTouchEnd,
          touchOptions
        );
      }

      // Clean up container listeners
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
        <div
          className="video-page__video-container"
          onTouchStart={(e) => {
            console.log("[Video Container] Touch start on video container");
            handleTouchStartEnhanced(e);
          }}
          onTouchMove={(e) => {
            console.log("[Video Container] Touch move on video container");
            handleTouchMoveEnhanced(e);
          }}
          onTouchEnd={(e) => {
            console.log("[Video Container] Touch end on video container");
            handleTouchEndEnhanced(e);
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
                    autoPlay={isPlaying}
                    muted={isMuted}
                    playsInline
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

                  {/* Touch overlay for swipe detection */}
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
      </div>
    </div>
  );
};

export default Video;
