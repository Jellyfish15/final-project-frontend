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

  // Safari-specific touch event setup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Add touch event listeners with proper options for Safari
    const touchStartOptions = { passive: false };
    const touchMoveOptions = { passive: false };
    const touchEndOptions = { passive: true };

    container.addEventListener(
      "touchstart",
      handleTouchStart,
      touchStartOptions
    );
    container.addEventListener("touchmove", handleTouchMove, touchMoveOptions);
    container.addEventListener("touchend", handleTouchEnd, touchEndOptions);
    container.addEventListener(
      "touchcancel",
      handleTouchCancel,
      touchEndOptions
    );

    return () => {
      container.removeEventListener(
        "touchstart",
        handleTouchStart,
        touchStartOptions
      );
      container.removeEventListener(
        "touchmove",
        handleTouchMove,
        touchMoveOptions
      );
      container.removeEventListener(
        "touchend",
        handleTouchEnd,
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
