import React, { useEffect, useRef, useState } from "react";
import VideoLoader from "../VideoLoader/VideoLoader";

const YouTubePlayer = ({ videoId, isMuted, isPlaying, className }) => {
  const playerRef = useRef(null);
  const playerInstanceRef = useRef(null);
  const [isPlayerReady, setIsPlayerReady] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(true);

  useEffect(() => {
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
            mute: isMuted ? 1 : 0,
          },
          events: {
            onReady: (event) => {
              setIsPlayerReady(true);
              if (isMuted) {
                event.target.mute();
              } else {
                event.target.unMute();
              }
            },
            onStateChange: (event) => {
              const isLoading =
                event.data === window.YT.PlayerState.UNSTARTED ||
                event.data === window.YT.PlayerState.CUED;
              setIsVideoLoading(isLoading);
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
      if (isPlaying) {
        playerInstanceRef.current.playVideo();
      } else {
        playerInstanceRef.current.pauseVideo();
      }
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
