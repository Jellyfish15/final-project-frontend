import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  forwardRef,
  useImperativeHandle,
} from "react";
import VideoLoader from "../VideoLoader/VideoLoader";

// YT Player state machine constants
const PLAYER_STATES = {
  UNSTARTED: -1,
  ENDED: 0,
  PLAYING: 1,
  PAUSED: 2,
  BUFFERING: 3,
  CUED: 5,
};

const PLAYER_ERROR_CODES = {
  INVALID_PARAM: 2,
  HTML5_ERROR: 5,
  NOT_FOUND: 100,
  EMBED_DISABLED: 101,
  EMBED_DISABLED_ALT: 150,
};

const YouTubePlayer = forwardRef(
  ({ videoId, isMuted, isPlaying, className, onPlayingChange }, ref) => {
    const playerRef = useRef(null);
    const playerInstanceRef = useRef(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(true);
    const [playerError, setPlayerError] = useState(null);
    const retryCountRef = useRef(0);
    const playbackQualityRef = useRef("auto");
    const bufferingStartRef = useRef(null);
    const totalBufferTimeRef = useRef(0);

    // Expose imperative methods so the parent overlay can toggle playback
    // directly — critical on mobile where playVideo() must be in a user-gesture.
    useImperativeHandle(
      ref,
      () => ({
        togglePlayback: () => {
          const player = playerInstanceRef.current;
          if (!player || !isPlayerReady) return;
          try {
            const state = player.getPlayerState();
            if (state === window.YT.PlayerState.PLAYING) {
              player.pauseVideo();
            } else {
              player.playVideo();
            }
          } catch {
            // Player not ready yet
          }
        },
        play: () => playerInstanceRef.current?.playVideo(),
        pause: () => playerInstanceRef.current?.pauseVideo(),
      }),
      [isPlayerReady],
    );

    // Calculate optimal player dimensions based on container
    const playerDimensions = useMemo(() => {
      const aspectRatio = 9 / 16; // Vertical video
      const maxWidth = window.innerWidth;
      const maxHeight = window.innerHeight;
      return {
        width: Math.min(maxWidth, maxHeight / aspectRatio),
        height: Math.min(maxHeight, maxWidth * aspectRatio),
      };
    }, []);

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
              mute: 1, // Start muted to guarantee autoplay on all browsers
              preload: "auto",
            },
            events: {
              onReady: (event) => {
                console.log("[YouTubePlayer] Player ready");
                setIsPlayerReady(true);
                setIsVideoLoading(false);
                // Unmute and play immediately
                if (!isMuted) {
                  event.target.unMute();
                }

                // Try to play immediately
                try {
                  event.target.playVideo();
                  console.log("[YouTubePlayer] Attempted autoplay");
                } catch (error) {
                  console.error("[YouTubePlayer] Autoplay failed:", error);
                }
              },
              onStateChange: (event) => {
                // Handle loading states
                if (event.data === window.YT.PlayerState.BUFFERING) {
                  setIsVideoLoading(true);
                } else if (event.data === window.YT.PlayerState.PLAYING) {
                  setIsVideoLoading(false);
                  onPlayingChange?.(true);
                  // Try to auto-unmute after video starts playing
                  try {
                    if (!isMuted) {
                      event.target.unMute();
                    }
                  } catch (error) {
                    // Auto-unmute blocked by browser
                  }
                } else if (event.data === window.YT.PlayerState.PAUSED) {
                  setIsVideoLoading(false);
                  onPlayingChange?.(false);
                } else if (event.data === window.YT.PlayerState.ENDED) {
                  onPlayingChange?.(false);
                } else if (event.data === window.YT.PlayerState.UNSTARTED) {
                  // On mobile, YouTube often stays UNSTARTED (no autoplay)
                  onPlayingChange?.(false);
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
                    "[YouTubePlayer] Video playback disabled on other sites, skipping...",
                  );
                  // Trigger skip to next video
                  window.dispatchEvent(
                    new CustomEvent("skipUnplayableVideo", {
                      detail: { videoId },
                    }),
                  );
                } else if (event.data === 100) {
                  console.log(
                    "[YouTubePlayer] Video not found or private, skipping...",
                  );
                  window.dispatchEvent(
                    new CustomEvent("skipUnplayableVideo", {
                      detail: { videoId },
                    }),
                  );
                }
              },
            },
          });
        }
      };

      if (!window.YT || !window.YT.Player) {
        // YT API not loaded yet — load script if needed, wait for ready
        if (
          !document.querySelector(
            'script[src="https://www.youtube.com/iframe_api"]',
          )
        ) {
          const tag = document.createElement("script");
          tag.src = "https://www.youtube.com/iframe_api";
          const firstScriptTag = document.getElementsByTagName("script")[0];
          firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        }
        // Always (re)set the callback — previous mounts may have consumed it
        const prevCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevCallback) prevCallback();
          initializePlayer();
        };
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
      if (
        playerInstanceRef.current?.mute &&
        playerInstanceRef.current?.unMute
      ) {
        if (isMuted) {
          playerInstanceRef.current.mute();
        } else {
          playerInstanceRef.current.unMute();
        }
      }
    }, [isMuted]);

    // Handle play/pause state changes — no setTimeout so playVideo()
    // stays within the user-gesture window on mobile browsers.
    useEffect(() => {
      if (playerInstanceRef.current && isPlayerReady) {
        if (isPlaying) {
          playerInstanceRef.current.playVideo();
        } else {
          playerInstanceRef.current.pauseVideo();
        }
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
  },
);

YouTubePlayer.displayName = "YouTubePlayer";
export default YouTubePlayer;
