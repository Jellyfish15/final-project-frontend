import React, {
  createContext,
  useState,
  useRef,
  useCallback,
  useEffect,
  useMemo,
} from "react";

import { triggerSwipeHaptic } from "../utils/hapticFeedback";
// touchDebug import removed — debug logging disabled for performance
import userInteractionService from "../services/userInteractionService";
import performanceOptimizationService from "../services/performanceOptimizationService";
import { videosAPI, engagementAPI, feedAPI } from "../services/api";
import { API_BASE_URL } from "../services/config";

const VideoContext = createContext();

export const VideoProvider = ({
  children,
  videos: initialVideos = [],
  isLoadingVideos = false,
  videosError = null,
  refreshVideos,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(false); // Start unmuted — always play with sound
  const userWantsMutedRef = useRef(false); // Track user's mute preference across videos
  const [isVideoSwitching, setIsVideoSwitching] = useState(false);
  const [focusedVideos, setFocusedVideos] = useState(null); // New state for focused feed
  const videoRef = useRef(null);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Initialize user interaction tracking on mount
  useEffect(() => {
    userInteractionService.initializeSession();
  }, []);

  // ── Engagement tracking ──
  // Track how long users watch each video so the ranking algorithm improves.
  const engagementRef = useRef({
    videoId: null,
    startTime: null,
    pauseCount: 0,
    seekCount: 0,
    replays: 0,
  });
  const sessionIdRef = useRef(
    `session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  );

  // Flush current engagement data to the backend
  const flushEngagement = useCallback(() => {
    const e = engagementRef.current;
    if (!e.videoId || !e.startTime) return;

    const watchTime = (Date.now() - e.startTime) / 1000; // seconds
    const totalDuration = currentVideo?.duration || 0;
    const completionRate =
      totalDuration > 0
        ? Math.min(Math.round((watchTime / totalDuration) * 100), 100)
        : 0;

    // Fire-and-forget — don't block UI
    engagementAPI
      .track({
        videoId: e.videoId,
        watchTime: Math.round(watchTime),
        totalDuration,
        completionRate,
        pauseCount: e.pauseCount,
        seekCount: e.seekCount,
        replays: e.replays,
        category: currentVideo?.category || currentVideo?.subject || "",
        sessionId: sessionIdRef.current,
        ...(watchTime < 3 && totalDuration > 10
          ? { skippedAt: Math.round(watchTime), skipReason: "not-interested" }
          : {}),
      })
      .catch(() => {}); // silent

    // Reset
    engagementRef.current = {
      videoId: null,
      startTime: null,
      pauseCount: 0,
      seekCount: 0,
      replays: 0,
    };
  }, [currentVideo]);

  // Start tracking whenever the current video changes
  useEffect(() => {
    if (!currentVideo) return;
    // Flush previous video's engagement
    flushEngagement();
    // Start tracking new video
    engagementRef.current = {
      videoId: currentVideo._id || currentVideo.id || currentVideo.videoId,
      startTime: Date.now(),
      pauseCount: 0,
      seekCount: 0,
      replays: 0,
    };
  }, [currentVideo?._id, currentVideo?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Flush engagement when the page is about to unload
  useEffect(() => {
    const handleBeforeUnload = () => flushEngagement();
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      flushEngagement();
    };
  }, [flushEngagement]);

  // Touch handling state
  const touchStateRef = useRef({
    startY: 0,
    startX: 0,
    startTime: 0,
    isDragging: false,
    currentY: 0,
  });
  const touchMoveAnimationFrameRef = useRef(null);
  const latestTouchYRef = useRef(0);

  // Swipe feedback state
  const [swipeIndicator, setSwipeIndicator] = useState({
    show: false,
    direction: "",
    message: "",
  });

  // Use focused videos if available, otherwise use all videos
  const videos = focusedVideos || initialVideos;
  const isLoading = isLoadingVideos;
  const error = videosError;

  const currentVideo = videos[currentIndex] || null;

  // Sync like state and counts with current video
  useEffect(() => {
    if (currentVideo) {
      setIsLiked(currentVideo.isLiked || false);
      setLikeCount(currentVideo.likes || 0);
      setCommentCount(currentVideo.comments || 0);
    }
  }, [currentVideo]);

  // Preload upcoming videos for faster transitions
  useEffect(() => {
    if (videos.length > 0) {
      // Preload a smaller window on mobile to reduce memory pressure
      const upcomingVideos = videos.slice(currentIndex + 1, currentIndex + 3);

      if (upcomingVideos.length > 0) {
        performanceOptimizationService.batchPreloadThumbnails(
          upcomingVideos,
          2,
        );
        performanceOptimizationService.batchPreloadVideoMetadata(
          upcomingVideos,
          1,
        );
      }
    }
  }, [currentIndex, videos]);

  useEffect(() => {
    return () => {
      if (touchMoveAnimationFrameRef.current !== null) {
        cancelAnimationFrame(touchMoveAnimationFrameRef.current);
      }
    };
  }, []);

  // Sync play/pause state with the video element.
  // We always call play() programmatically instead of relying on the autoPlay
  // HTML attribute, which is unreliable across browsers.
  // Videos start unmuted. If the browser blocks unmuted autoplay, we fall back
  // to muted playback and let the user tap the unmute button.
  useEffect(() => {
    if (!videoRef.current || currentVideo?.videoType === "youtube") return;

    const videoElement = videoRef.current;

    if (isPlaying) {
      if (videoElement.paused) {
        const doPlay = () => {
          videoElement.muted = isMuted;
          videoElement.play().catch(() => {
            // Browser blocked unmuted autoplay — fall back to muted
            if (!videoElement.muted) {
              videoElement.muted = true;
              setIsMuted(true);
              videoElement.play().catch(() => {});
            }
          });
        };
        // Wait for enough data before playing
        if (videoElement.readyState >= 3) {
          doPlay();
        } else {
          videoElement.addEventListener("canplay", doPlay, { once: true });
          return () => videoElement.removeEventListener("canplay", doPlay);
        }
      }
    } else {
      if (!videoElement.paused) {
        videoElement.pause();
      }
    }
  }, [isPlaying, currentVideo?._id, currentVideo?.videoType, isMuted]);

  // After a new video starts playing (via autoPlay), restore the user's mute preference.
  // iOS Safari requires videos to start muted for autoplay to work.
  // Once playing, we can safely unmute via JavaScript (user gesture propagates).
  useEffect(() => {
    if (!videoRef.current || currentVideo?.videoType === "youtube") return;
    if (userWantsMutedRef.current) return; // User wants muted, nothing to do

    const videoElement = videoRef.current;

    const unmuteAfterPlay = () => {
      if (!userWantsMutedRef.current && videoElement.muted) {
        videoElement.muted = false;
        setIsMuted(false);
      }
    };

    // If already playing, unmute now
    if (!videoElement.paused && videoElement.readyState >= 3) {
      unmuteAfterPlay();
    } else {
      // Wait for the video to start playing, then unmute
      videoElement.addEventListener("playing", unmuteAfterPlay, { once: true });
      return () => videoElement.removeEventListener("playing", unmuteAfterPlay);
    }
  }, [currentVideo?._id, currentVideo?.videoType]);

  const scrollToVideo = useCallback(
    async (direction) => {
      let newIndex = currentIndex;

      if (direction === "next" && currentIndex < videos.length - 1) {
        newIndex = currentIndex + 1;
      } else if (direction === "previous" && currentIndex > 0) {
        newIndex = currentIndex - 1;
      } else if (
        direction === "next" &&
        currentIndex === videos.length - 1 &&
        focusedVideos
      ) {
        // Reached end of custom feed, append more videos from cache

        // Get videos from full feed that aren't already in the custom feed
        const customFeedIds = new Set(focusedVideos.map((v) => v._id || v.id));
        const additionalVideos = initialVideos.filter(
          (v) => !customFeedIds.has(v._id || v.id),
        );

        if (additionalVideos.length > 0) {
          // Append the first batch (e.g., 10 videos) to the custom feed
          const videosToAdd = additionalVideos.slice(0, 10);
          const expandedFeed = [...focusedVideos, ...videosToAdd];

          setFocusedVideos(expandedFeed);
          newIndex = currentIndex + 1; // Move to the first newly added video
        } else {
          // No more videos in initialVideos, try fetching more from unified feed or cache

          try {
            // Try unified feed first, fall back to cache
            let newBatch = [];
            try {
              const feedRes = await feedAPI.getUnifiedFeed(1, 50);
              if (feedRes?.videos?.length > 0) {
                newBatch = feedRes.videos;
              }
            } catch {
              const response = await videosAPI.getRandomCachedVideos(50);
              if (response?.videos) newBatch = response.videos;
            }

            if (newBatch.length > 0) {
              // Filter out videos already in the focused feed
              const newVideos = newBatch.filter(
                (v) => !customFeedIds.has(v._id || v.id),
              );

              if (newVideos.length > 0) {
                const expandedFeed = [...focusedVideos, ...newVideos];

                setFocusedVideos(expandedFeed);
                newIndex = currentIndex + 1;
              } else {
                // All videos were duplicates, try fetching another batch
                try {
                  const response2 = await videosAPI.getRandomCachedVideos(50);
                  if (response2?.videos && response2.videos.length > 0) {
                    const newVideos2 = response2.videos.filter(
                      (v) => !customFeedIds.has(v._id || v.id),
                    );

                    if (newVideos2.length > 0) {
                      const expandedFeed = [...focusedVideos, ...newVideos2];
                      setFocusedVideos(expandedFeed);
                      newIndex = currentIndex + 1;
                    } else {
                      return;
                    }
                  } else {
                    return;
                  }
                } catch {
                  return;
                }
              }
            } else {
              return;
            }
          } catch (error) {
            return;
          }
        }
      }

      if (newIndex !== currentIndex) {
        // Pause and release the old video immediately to free memory/CPU
        if (videoRef.current && currentVideo?.videoType !== "youtube") {
          videoRef.current.pause();
        }

        // Ensure isPlaying is true so the sync effect will call play()
        setIsPlaying(true);

        // Restore user's mute preference for the new video
        setIsMuted(userWantsMutedRef.current);

        // Switch video immediately — no artificial delay
        setIsVideoSwitching(true);
        setCurrentIndex(newIndex);

        // Clear the switching flag after a paint cycle
        requestAnimationFrame(() => {
          setIsVideoSwitching(false);
        });

        // Track navigation
        userInteractionService.trackNavigation(
          `video_${currentIndex}`,
          `video_${newIndex}`,
          { method: "swipe", direction },
        );
      }
    },
    [
      currentIndex,
      videos.length,
      focusedVideos,
      initialVideos,
      currentVideo?.videoType,
    ],
  );

  // Function to fetch a single video by ID and add it to the context
  const fetchSingleVideo = useCallback(
    async (videoId, createFocusedFeed = false) => {
      try {
        const response = await videosAPI.getVideo(videoId);

        if (response.success && response.video) {
          const backendURL = API_BASE_URL.replace(/\/api\/?$/, "");
          let video = response.video;

          if (video.id && !video._id) {
            video._id = video.id;
          }

          if (video.videoUrl && !video.videoUrl.startsWith("http")) {
            const videoUrl = video.videoUrl.startsWith("/api/")
              ? video.videoUrl.replace("/api/", "/")
              : video.videoUrl;
            video.videoUrl = `${backendURL}${videoUrl}`;
          }

          if (video.thumbnailUrl && !video.thumbnailUrl.startsWith("http")) {
            const thumbnailUrl = video.thumbnailUrl.startsWith("/api/")
              ? video.thumbnailUrl.replace("/api/", "/")
              : video.thumbnailUrl;
            video.thumbnailUrl = `${backendURL}${thumbnailUrl}`;
          }

          video.videoType = "uploaded";

          if (createFocusedFeed) {
            const contextVideos = initialVideos.slice(0, 9);
            const focusedVideosFeed = [video, ...contextVideos];

            setFocusedVideos(focusedVideosFeed);
            setCurrentIndex(0);
          } else {
            const updatedVideos = [video, ...initialVideos];
            setFocusedVideos(updatedVideos);
            setCurrentIndex(0);
          }

          setIsVideoSwitching(true);
          setTimeout(() => {
            setIsVideoSwitching(false);
          }, 300);
        }
      } catch (error) {
        // Keep current feed if the fetch fails.
      }
    },
    [initialVideos],
  );

  const setVideoById = useCallback(
    async (videoId, createFocusedFeed = false) => {
      const videoIndex = initialVideos.findIndex(
        (video) => video._id === videoId || video.id === videoId,
      );

      if (videoIndex !== -1) {
        if (createFocusedFeed) {
          // Create a focused feed starting with the clicked video, then add random cached videos
          const clickedVideo = initialVideos[videoIndex];

          // Start with just the clicked video
          let focusedVideosFeed = [clickedVideo];

          // Fetch random videos from cache to fill the feed
          try {
            const response = await videosAPI.getRandomCachedVideos(50);

            if (response?.videos && response.videos.length > 0) {
              // Filter out the clicked video
              const additionalVideos = response.videos.filter(
                (v) => (v._id || v.id) !== videoId,
              );

              // Add the random videos after the clicked video
              focusedVideosFeed = [clickedVideo, ...additionalVideos];
            }
          } catch (error) {
            // Continue with just the clicked video if fetch fails
          }

          // Set the focused feed with clicked video at index 0
          setFocusedVideos(focusedVideosFeed);
          setCurrentIndex(0);
        } else {
          // Clear focused feed and use full list
          setFocusedVideos(null);
          setCurrentIndex(videoIndex);
        }

        setIsVideoSwitching(true);
        setTimeout(() => {
          setIsVideoSwitching(false);
        }, 300);
      } else {
        // Try to fetch the specific video from the API
        fetchSingleVideo(videoId, createFocusedFeed);
      }
    },
    [initialVideos, fetchSingleVideo],
  );

  const resetToFullFeed = useCallback(() => {
    setFocusedVideos(null);
    setCurrentIndex(0);
  }, []);

  // New function to set a custom feed of videos
  const setCustomFeed = useCallback((videos, startIndex = 0) => {
    // Deduplicate videos by ID
    const uniqueVideos = [];
    const seenIds = new Set();

    for (const video of videos) {
      const videoId = video._id || video.id;
      if (!seenIds.has(videoId)) {
        seenIds.add(videoId);
        uniqueVideos.push(video);
      }
    }

    setFocusedVideos(uniqueVideos);
    setCurrentIndex(startIndex);
    setIsVideoSwitching(true);
    setTimeout(() => {
      setIsVideoSwitching(false);
    }, 300);
  }, []);

  const togglePlay = useCallback(() => {
    if (currentVideo?.videoType === "youtube") {
      setIsPlaying((prev) => !prev);
    } else if (videoRef.current) {
      const videoElement = videoRef.current;

      if (videoElement.paused) {
        videoElement
          .play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(() => {
            setIsPlaying(true);
          });
      } else {
        videoElement.pause();
        setIsPlaying(false);
        // Track pause for engagement
        engagementRef.current.pauseCount += 1;
      }
    }
  }, [currentVideo?.videoType]);

  const toggleMute = useCallback(() => {
    if (videoRef.current && currentVideo?.videoType !== "youtube") {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
      userWantsMutedRef.current = videoRef.current.muted;
    } else {
      setIsMuted((prev) => {
        userWantsMutedRef.current = !prev;
        return !prev;
      });
    }
  }, [currentVideo?.videoType]);

  const handleLike = useCallback(async () => {
    if (!currentVideo) return;

    // Don't allow liking YouTube videos (they're not in our database)
    if (currentVideo.videoType === "youtube") {
      return;
    }

    const newLikedState = !isLiked;
    const videoId = currentVideo._id || currentVideo.id;

    // Optimistic update
    setIsLiked(newLikedState);
    setLikeCount((prev) => (newLikedState ? prev + 1 : Math.max(0, prev - 1)));

    // Track engagement
    userInteractionService.trackVideoEngagement(
      videoId,
      newLikedState ? "like" : "unlike",
      { source: "video_player" },
    );

    // Call backend API
    try {
      if (newLikedState) {
        await videosAPI.likeVideo(videoId);
      } else {
        await videosAPI.unlikeVideo(videoId);
      }

      // Update the video in the videos array
      if (focusedVideos) {
        setFocusedVideos((prev) =>
          prev.map((v) =>
            (v._id || v.id) === videoId
              ? {
                  ...v,
                  isLiked: newLikedState,
                  likes: newLikedState
                    ? (v.likes || 0) + 1
                    : Math.max(0, (v.likes || 0) - 1),
                }
              : v,
          ),
        );
      }
    } catch (error) {
      // Revert on error
      setIsLiked(!newLikedState);
      setLikeCount((prev) =>
        newLikedState ? Math.max(0, prev - 1) : prev + 1,
      );
    }
  }, [currentVideo, isLiked, focusedVideos]);

  const handleShare = useCallback(() => {
    if (!currentVideo) return;

    setIsShareModalOpen(true);

    // Don't track shares for YouTube videos in our database
    if (currentVideo.videoType === "youtube") {
      return;
    }

    // Track engagement
    userInteractionService.trackVideoEngagement(
      currentVideo._id || currentVideo.id,
      "share",
      { source: "video_player" },
    );

    // Call backend API to increment share count
    const videoId = currentVideo._id || currentVideo.id;
    videosAPI.shareVideo(videoId).catch(() => {});
  }, [currentVideo]);

  const handleComment = useCallback(() => {
    if (!currentVideo) return;

    // Don't allow commenting on YouTube videos (they're not in our database)
    if (currentVideo.videoType === "youtube") {
      return;
    }

    setIsCommentModalOpen(true);

    // Track engagement
    userInteractionService.trackVideoEngagement(
      currentVideo._id || currentVideo.id,
      "comment",
      { source: "video_player" },
    );
  }, [currentVideo]);

  const handleWheel = useCallback(
    (e) => {
      e.preventDefault();
      if (e.deltaY > 0) {
        scrollToVideo("next");
      } else {
        scrollToVideo("previous");
      }
    },
    [scrollToVideo],
  );

  // Show swipe feedback indicator
  const showSwipeIndicator = useCallback((direction, message) => {
    setSwipeIndicator({
      show: true,
      direction,
      message,
    });

    // Hide indicator after 1.5 seconds
    setTimeout(() => {
      setSwipeIndicator({
        show: false,
        direction: "",
        message: "",
      });
    }, 1500);
  }, []);

  // Touch event handlers for mobile swipe gestures
  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    latestTouchYRef.current = touch.clientY;
    touchStateRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      startTime: Date.now(),
      isDragging: true,
      currentY: touch.clientY,
    };
  }, []);

  const handleTouchMove = useCallback((event) => {
    if (!touchStateRef.current.isDragging) return;

    const touch = event.touches[0];
    latestTouchYRef.current = touch.clientY;
    const deltaY = touch.clientY - touchStateRef.current.startY;
    const deltaX = touch.clientX - touchStateRef.current.startX;

    // Only preventDefault on vertical swipes to avoid blocking horizontal scroll
    const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) * 1.2;
    const hasAnyMovement = Math.abs(deltaY) > 5;

    if (isVerticalSwipe && hasAnyMovement) {
      event.preventDefault();
      event.stopPropagation();
    }

    if (touchMoveAnimationFrameRef.current !== null) return;

    touchMoveAnimationFrameRef.current = requestAnimationFrame(() => {
      touchMoveAnimationFrameRef.current = null;
      if (!touchStateRef.current.isDragging) return;
      touchStateRef.current.currentY = latestTouchYRef.current;
    });
  }, []);

  const handleTouchEnd = useCallback(
    (event) => {
      if (!touchStateRef.current.isDragging) return;

      if (touchMoveAnimationFrameRef.current !== null) {
        cancelAnimationFrame(touchMoveAnimationFrameRef.current);
        touchMoveAnimationFrameRef.current = null;
      }

      const ts = touchStateRef.current;
      ts.currentY = latestTouchYRef.current;
      const deltaY = ts.currentY - ts.startY;
      const actualDeltaX = Math.abs(
        ts.startX - (event.changedTouches?.[0]?.clientX || ts.startX),
      );
      const deltaTime = Date.now() - ts.startTime;
      const velocity = Math.abs(deltaY) / deltaTime;

      const minSwipeDistance = 15;
      const maxSwipeTime = 2000;
      const minVelocity = 0.01;

      const isVertical = Math.abs(deltaY) > actualDeltaX * 0.8;

      const isValidSwipe =
        Math.abs(deltaY) > minSwipeDistance &&
        deltaTime < maxSwipeTime &&
        velocity > minVelocity &&
        isVertical;

      const isBasicSwipe = Math.abs(deltaY) > 30;

      if (isValidSwipe || isBasicSwipe) {
        if (deltaY > 0) {
          if (currentIndex > 0) {
            triggerSwipeHaptic("previous", true);
            scrollToVideo("previous");
          } else {
            triggerSwipeHaptic("previous", false);
          }
        } else {
          if (currentIndex < videos.length - 1) {
            triggerSwipeHaptic("next", true);
            scrollToVideo("next");
          } else {
            triggerSwipeHaptic("next", false);
          }
        }
      }

      // Reset touch state via ref — no re-render
      touchStateRef.current = {
        startY: 0,
        startX: 0,
        startTime: 0,
        isDragging: false,
        currentY: 0,
      };
    },
    [currentIndex, videos.length, scrollToVideo],
  );

  const handleTouchCancel = useCallback(() => {
    if (touchMoveAnimationFrameRef.current !== null) {
      cancelAnimationFrame(touchMoveAnimationFrameRef.current);
      touchMoveAnimationFrameRef.current = null;
    }

    touchStateRef.current = {
      startY: 0,
      startX: 0,
      startTime: 0,
      isDragging: false,
      currentY: 0,
    };
  }, []);

  const value = useMemo(
    () => ({
      videos,
      currentVideo,
      currentIndex,
      isPlaying,
      isLiked,
      isMuted,
      isLoading,
      isVideoSwitching,
      error,
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
      isFocusedFeed: focusedVideos !== null,
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
      showSwipeIndicator,
      refreshVideos,
    }),
    [
      videos,
      currentVideo,
      currentIndex,
      isPlaying,
      isLiked,
      isMuted,
      isLoading,
      isVideoSwitching,
      error,
      likeCount,
      commentCount,
      isCommentModalOpen,
      isShareModalOpen,
      scrollToVideo,
      setVideoById,
      setCustomFeed,
      resetToFullFeed,
      focusedVideos,
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
      showSwipeIndicator,
      refreshVideos,
    ],
  );

  return (
    <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
  );
};

export default VideoContext;
