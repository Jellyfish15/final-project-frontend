import React, { useEffect, useRef, useState } from "react";
import VideoLoader from "../VideoLoader/VideoLoader";

const YouTubePlayer = ({ videoId, isMuted, isPlaying, className }) => {
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  useEffect(() => {
    // Validate videoId before attempting to load
    if (!videoId || typeof videoId !== "string" || videoId.length < 5) {
      console.error("[YouTubePlayer] Invalid video ID:", videoId);
      setIsVideoLoading(false);
      return;
    }

    setIsVideoLoading(true);
    setIsPlayerReady(false);

    const initializePlayer = () => {
      if (playerRef.current && videoId) {
        playerInstanceRef.current = new window.YT.Player(playerRef.current, {
          videoId: videoId,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            controls: 0,
            disablekb: 1,
            fs: 0,
            iv_load_policy: 3,
            modestbranding: 1,
            playsinline: 1,
            rel: 0,
            showinfo: 0,
            loop: 1,
            playlist: videoId,
            mute: 1, // Start muted to allow autoplay
            preload: "auto",
          },
          events: {
            onReady: (event) => {
              console.log("[YouTubePlayer] Player ready");
              setIsPlayerReady(true);
              setIsVideoLoading(false);
              // Start muted and try to play
              event.target.mute();

              // Try to play immediately
              try {
                event.target.playVideo();
                console.log("[YouTubePlayer] Attempted autoplay");
              } catch (error) {
                console.error("[YouTubePlayer] Autoplay failed:", error);
              }
            },
            onStateChange: (event) => {
              console.log("[YouTubePlayer] State changed:", {
                state: event.data,
                UNSTARTED: window.YT.PlayerState.UNSTARTED,
                ENDED: window.YT.PlayerState.ENDED,
                PLAYING: window.YT.PlayerState.PLAYING,
                PAUSED: window.YT.PlayerState.PAUSED,
                BUFFERING: window.YT.PlayerState.BUFFERING,
                CUED: window.YT.PlayerState.CUED,
              });

              // Handle loading states
              if (event.data === window.YT.PlayerState.BUFFERING) {
                setIsVideoLoading(true);
              } else if (event.data === window.YT.PlayerState.PLAYING) {
                setIsVideoLoading(false);
                // Try to auto-unmute after video starts playing
                // This might work if user has interacted with the page before
                setTimeout(() => {
                  try {
                    if (!isMuted) {
                      event.target.unMute();
                      console.log("[YouTubePlayer] Auto-unmuted successfully");
                    }
                  } catch (error) {
                    console.log(
                      "[YouTubePlayer] Auto-unmute blocked by browser"
                    );
                  }
                }, 500);
              } else if (event.data === window.YT.PlayerState.PAUSED) {
                setIsVideoLoading(false);
              }
            },
            onError: (event) => {
              console.error("[YouTubePlayer] Error:", event.data);
              // Error codes:
              // 2 - Invalid parameter (bad video ID)
              // 5 - HTML5 player error
              // 100 - Video not found or private
              // 101 - Video owner doesn't allow embedding
              // 150 - Same as 101

              if (event.data === 101 || event.data === 150) {
                console.log(
                  "[YouTubePlayer] Video playback disabled on other sites, skipping..."
                );
                // Trigger skip to next video
                window.dispatchEvent(
                  new CustomEvent("skipUnplayableVideo", {
                    detail: { videoId },
                  })
                );
              } else if (event.data === 100) {
                console.log(
                  "[YouTubePlayer] Video not found or private, skipping..."
                );
                window.dispatchEvent(
                  new CustomEvent("skipUnplayableVideo", {
                    detail: { videoId },
                  })
                );
              }
            },
          },
        });
      }
    };

    if (!window.YT) {
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName("script")[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
      window.onYouTubeIframeAPIReady = initializePlayer;
    } else {
      initializePlayer();
    }

    return () => {
      if (playerInstanceRef.current) {
        playerInstanceRef.current.destroy();
      }
    };
  }, [videoId]);

  useEffect(() => {
    if (playerInstanceRef.current?.mute && playerInstanceRef.current?.unMute) {
      if (isMuted) {
        playerInstanceRef.current.mute();
      } else {
        playerInstanceRef.current.unMute();
      }
    }
  }, [isMuted]);

  // Handle play/pause state changes
  useEffect(() => {
    if (playerInstanceRef.current && isPlayerReady) {
      // Add small delay to ensure player is fully ready
      const timer = setTimeout(() => {
        if (isPlaying) {
          playerInstanceRef.current.playVideo();
        } else {
          playerInstanceRef.current.pauseVideo();
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [isPlaying, isPlayerReady]);

  // Handle click to play if video is frozen
  const handleClick = () => {
    if (playerInstanceRef.current && isPlayerReady) {
      const state = playerInstanceRef.current.getPlayerState();
      // If video is not playing (paused, unstarted, etc), play it
      if (state !== window.YT.PlayerState.PLAYING) {
        playerInstanceRef.current.playVideo();
      }
    }
  };

  return (
    <div
      className={className}
      style={{ position: "relative", cursor: "pointer" }}
      onClick={handleClick}
    >
      <div ref={playerRef} style={{ width: "100%", height: "100%" }} />
      {(isVideoLoading || !isPlayerReady) && <VideoLoader />}
    </div>
  );
};

export default YouTubePlayer;
