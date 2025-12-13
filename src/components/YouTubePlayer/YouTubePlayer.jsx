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
              setIsPlayerReady(true);
              // Start muted to allow autoplay
              event.target.mute();
              // Use playVideo() instead of loadVideoById() for better autoplay
              event.target.playVideo();
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

              const isLoading =
                event.data === window.YT.PlayerState.BUFFERING ||
                event.data === window.YT.PlayerState.UNSTARTED;
              setIsVideoLoading(isLoading);

              // Unmute once video starts playing (if not muted by user)
              if (event.data === window.YT.PlayerState.PLAYING && !isMuted) {
                event.target.unMute();
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

  return (
    <div className={className} style={{ position: "relative" }}>
      <div ref={playerRef} style={{ width: "100%", height: "100%" }} />
      {(isVideoLoading || !isPlayerReady) && <VideoLoader />}
    </div>
  );
};

export default YouTubePlayer;
