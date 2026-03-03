import React, {
  useEffect,
  useRef,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
import VideoLoader from "../VideoLoader/VideoLoader";

/**
 * Singleton YouTube player.
 *
 * Instead of destroying / recreating a YT.Player on every video change,
 * we keep ONE player alive and swap videos via `loadVideoById()`.
 * This preserves the user-gesture activation context so subsequent
 * videos autoplay with sound on mobile.
 */
const YouTubePlayer = forwardRef(
  ({ videoId, isMuted, isPlaying, className, onPlayingChange }, ref) => {
    const containerRef = useRef(null);
    const playerInstanceRef = useRef(null);
    const [isPlayerReady, setIsPlayerReady] = useState(false);
    const [isVideoLoading, setIsVideoLoading] = useState(true);

    // Track what the player is currently showing so we don't double-load.
    const activeVideoIdRef = useRef(null);
    // Store the initial videoId so the constructor knows what to load.
    const initialVideoIdRef = useRef(videoId);
    // True while loadVideoById is in flight — suppresses spurious
    // PAUSED / UNSTARTED / ENDED events from the outgoing video.
    const isTransitioningRef = useRef(false);

    // Keep latest prop values in refs so event-handler closures always
    // read the freshest value (they close over the initial render otherwise).
    const isMutedRef = useRef(isMuted);
    isMutedRef.current = isMuted;
    const onPlayingChangeRef = useRef(onPlayingChange);
    onPlayingChangeRef.current = onPlayingChange;

    // ── Imperative API for parent (Video.jsx overlay) ──────────────
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

    // ── Create the YT.Player exactly ONCE ──────────────────────────
    useEffect(() => {
      const startId = initialVideoIdRef.current;
      if (!startId || typeof startId !== "string" || startId.length < 5) {
        setIsVideoLoading(false);
        return;
      }

      // If the player already exists (React strict-mode double-mount), skip.
      if (playerInstanceRef.current) return;

      setIsVideoLoading(true);
      setIsPlayerReady(false);

      const initializePlayer = () => {
        if (!containerRef.current) return;

        playerInstanceRef.current = new window.YT.Player(containerRef.current, {
          videoId: startId,
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
            loop: 0, // We handle looping ourselves via ENDED → loadVideoById
            mute: 1, // Start muted to guarantee first autoplay
            preload: "auto",
          },
          events: {
            onReady: (event) => {
              setIsPlayerReady(true);
              setIsVideoLoading(false);
              activeVideoIdRef.current = startId;

              if (!isMutedRef.current) {
                event.target.unMute();
              }
              try {
                event.target.playVideo();
              } catch {
                // Autoplay blocked — user will tap
              }
            },

            onStateChange: (event) => {
              const state = event.data;

              if (state === window.YT.PlayerState.BUFFERING) {
                setIsVideoLoading(true);
              } else if (state === window.YT.PlayerState.PLAYING) {
                // Transition complete — new video is actually playing
                isTransitioningRef.current = false;
                setIsVideoLoading(false);
                onPlayingChangeRef.current?.(true);
                // Ensure unmute stays applied after loadVideoById
                if (!isMutedRef.current) {
                  try {
                    event.target.unMute();
                  } catch {
                    /* browser blocked */
                  }
                }
              } else if (state === window.YT.PlayerState.PAUSED) {
                setIsVideoLoading(false);
                // During a loadVideoById transition the outgoing video
                // fires PAUSED — ignore it so React doesn't call pauseVideo().
                if (!isTransitioningRef.current) {
                  onPlayingChangeRef.current?.(false);
                }
              } else if (state === window.YT.PlayerState.ENDED) {
                // During transition the old video may fire ENDED — ignore.
                if (!isTransitioningRef.current) {
                  // Loop: reload the same video
                  const currentId = activeVideoIdRef.current;
                  if (currentId) {
                    isTransitioningRef.current = true;
                    event.target.loadVideoById(currentId);
                  }
                }
              } else if (state === window.YT.PlayerState.UNSTARTED) {
                if (!isTransitioningRef.current) {
                  onPlayingChangeRef.current?.(false);
                }
              }
            },

            onError: (event) => {
              console.error("[YouTubePlayer] Error:", event.data);
              if (
                event.data === 101 ||
                event.data === 150 ||
                event.data === 100
              ) {
                window.dispatchEvent(
                  new CustomEvent("skipUnplayableVideo", {
                    detail: { videoId: activeVideoIdRef.current },
                  }),
                );
              }
            },
          },
        });
      };

      // Ensure YT API is loaded
      if (!window.YT || !window.YT.Player) {
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
        const prevCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
          if (prevCallback) prevCallback();
          initializePlayer();
        };
      } else {
        initializePlayer();
      }

      // Cleanup: destroy only on real unmount
      return () => {
        if (playerInstanceRef.current) {
          try {
            playerInstanceRef.current.destroy();
          } catch {
            /* already destroyed */
          }
          playerInstanceRef.current = null;
          activeVideoIdRef.current = null;
          setIsPlayerReady(false);
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // ← empty deps: player lives for the component's entire lifetime

    // ── Swap video when videoId prop changes ───────────────────────
    useEffect(() => {
      if (
        !videoId ||
        typeof videoId !== "string" ||
        videoId.length < 5 ||
        !playerInstanceRef.current ||
        !isPlayerReady
      ) {
        return;
      }

      // Don't reload if it's already the active video
      if (videoId === activeVideoIdRef.current) return;

      activeVideoIdRef.current = videoId;
      setIsVideoLoading(true);

      // Mark transition so onStateChange ignores spurious PAUSED/ENDED
      // events fired by the outgoing video.
      isTransitioningRef.current = true;

      // loadVideoById preserves the user-gesture context → autoplay
      // with sound works on mobile without a fresh tap.
      playerInstanceRef.current.loadVideoById(videoId);
    }, [videoId, isPlayerReady]);

    // ── Mute / unmute ──────────────────────────────────────────────
    useEffect(() => {
      const p = playerInstanceRef.current;
      if (p?.mute && p?.unMute) {
        if (isMuted) {
          p.mute();
        } else {
          p.unMute();
        }
      }
    }, [isMuted]);

    // ── External play / pause (from React state) ──────────────────
    useEffect(() => {
      if (playerInstanceRef.current && isPlayerReady) {
        if (isPlaying) {
          playerInstanceRef.current.playVideo();
        } else {
          playerInstanceRef.current.pauseVideo();
        }
      }
    }, [isPlaying, isPlayerReady]);

    // Fallback click handler if the overlay doesn't fire
    const handleClick = () => {
      if (playerInstanceRef.current && isPlayerReady) {
        const state = playerInstanceRef.current.getPlayerState();
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
        <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
        {(isVideoLoading || !isPlayerReady) && <VideoLoader />}
      </div>
    );
  },
);

YouTubePlayer.displayName = "YouTubePlayer";
export default YouTubePlayer;
