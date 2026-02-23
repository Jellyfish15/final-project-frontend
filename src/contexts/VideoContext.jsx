import React, {
  createContext,
  useContext,
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
import { videosAPI } from "../services/api";
import { API_BASE_URL } from "../services/config";

const VideoContext = createContext();

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideo must be used within a VideoProvider");
  }
  return context;
};

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
  const [isMuted, setIsMuted] = useState(true); // Start muted to allow autoplay
  const userWantsMutedRef = useRef(true); // Track user's mute preference across videos
  const [isVideoSwitching, setIsVideoSwitching] = useState(false);
  const [focusedVideos, setFocusedVideos] = useState(null); // New state for focused feed
  const videoRef = useRef(null);
  const [watchTracker, setWatchTracker] = useState(null);
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  // Initialize user interaction tracking on mount
  useEffect(() => {
    userInteractionService.initializeSession();
  }, []);

  // Touch handling state
  const touchStateRef = useRef({
    startY: 0,
    startX: 0,
    startTime: 0,
    isDragging: false,
    currentY: 0,
  });

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
      // Preload thumbnails for next 3-5 videos
      const upcomingVideos = videos.slice(currentIndex + 1, currentIndex + 5);

      if (upcomingVideos.length > 0) {
        performanceOptimizationService.batchPreloadThumbnails(
          upcomingVideos,
          3,
        );
        performanceOptimizationService.batchPreloadVideoMetadata(
          upcomingVideos,
          2,
        );
      }
    }
  }, [currentIndex, videos]);

  // Track whether currentVideo._id has changed so we can skip
  // the sync effect on initial mount (let autoPlay handle it)
  const lastVideoIdRef = useRef(null);

  // Sync play/pause state with the video element.
  // IMPORTANT: On iOS Safari, we must NOT call play() when a new video mounts
  // because the <video> element already has autoPlay. Calling play() during
  // the browser's autoplay initialization causes a silent abort and freeze.
  // This effect should ONLY act on user-initiated play/pause toggles.
  useEffect(() => {
    if (!videoRef.current || currentVideo?.videoType === "youtube") return;

    const videoId = currentVideo?._id;
    const isNewVideo = videoId !== lastVideoIdRef.current;
    lastVideoIdRef.current = videoId;

    // Skip play() on new video mount — autoPlay attribute handles it
    if (isNewVideo) return;

    const videoElement = videoRef.current;

    if (isPlaying) {
      if (videoElement.paused) {
        videoElement.play().catch(() => {});
      }
    } else {
      if (!videoElement.paused) {
        videoElement.pause();
      }
    }
  }, [isPlaying, currentVideo?._id, currentVideo?.videoType]);

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
          // No more videos in initialVideos, try fetching more from cache

          try {
            const response = await videosAPI.getRandomCachedVideos(50);
            if (response?.videos && response.videos.length > 0) {
              // Filter out videos already in the focused feed
              const newVideos = response.videos.filter(
                (v) => !customFeedIds.has(v._id || v.id),
              );

              if (newVideos.length > 0) {
                const expandedFeed = [...focusedVideos, ...newVideos];


                setFocusedVideos(expandedFeed);
                newIndex = currentIndex + 1;
              } else {
                // All 50 videos were duplicates, try fetching more
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
        // Clean up previous watch tracker
        if (watchTracker) {
          watchTracker.complete();
        }

        // Pause and release the old video immediately to free memory/CPU
        if (videoRef.current && currentVideo?.videoType !== "youtube") {
          videoRef.current.pause();
        }

        // Don't set isPlaying here — let it stay true.
        // The new <video> element's autoPlay attribute handles playback.
        // Calling setIsPlaying would trigger syncPlayback which fights with autoPlay on iOS.

        // iOS Safari BLOCKS autoplay on unmuted videos.
        // Always mount new videos muted so autoPlay works, then unmute after playback starts.
        setIsMuted(true);

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
    [currentIndex, videos.length, watchTracker, focusedVideos, initialVideos],
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

            } else {
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
    [initialVideos],
  );

  // Function to fetch a single video by ID and add it to the context
  const fetchSingleVideo = useCallback(
    async (videoId, createFocusedFeed = false) => {
      try {
        const videosAPI = (await import("../services/api")).videosAPI;
        const response = await videosAPI.getVideo(videoId);

        if (response.success && response.video) {

          // Fix video URLs for uploaded videos
          const backendURL = API_BASE_URL.replace(/\/api\/?$/, "");
          let video = response.video;

          // Ensure the video has the right structure (_id vs id)
          if (video.id && !video._id) {
            video._id = video.id;
          }

          if (video.videoUrl && !video.videoUrl.startsWith("http")) {
            let videoUrl = video.videoUrl.startsWith("/api/")
              ? video.videoUrl.replace("/api/", "/")
              : video.videoUrl;
            video.videoUrl = `${backendURL}${videoUrl}`;
          }

          if (video.thumbnailUrl && !video.thumbnailUrl.startsWith("http")) {
            let thumbnailUrl = video.thumbnailUrl.startsWith("/api/")
              ? video.thumbnailUrl.replace("/api/", "/")
              : video.thumbnailUrl;
            video.thumbnailUrl = `${backendURL}${thumbnailUrl}`;
          }

          video.videoType = "uploaded"; // Mark as uploaded video

          if (createFocusedFeed) {
            // Create a focused feed with just this video and some context from existing videos
            const contextVideos = initialVideos.slice(0, 9); // Get first 9 videos as context
            const focusedVideosFeed = [video, ...contextVideos];

            setFocusedVideos(focusedVideosFeed);
            setCurrentIndex(0);
          } else {
            // Add video to existing feed and navigate to it
            const updatedVideos = [video, ...initialVideos];
            setFocusedVideos(updatedVideos);
            setCurrentIndex(0);
          }

          setIsVideoSwitching(true);
          setTimeout(() => {
            setIsVideoSwitching(false);
          }, 300);
        } else {
        }
      } catch (error) {
      }
    },
    [initialVideos],
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
      } else {
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

  const handleLike = async () => {
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
  };

  const handleShare = () => {
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
    videosAPI.shareVideo(videoId).catch((error) => {
    });
  };

  const handleComment = () => {
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
  };

  const handleWheel = (e) => {
    e.preventDefault();
    if (e.deltaY > 0) {
      scrollToVideo("next");
    } else {
      scrollToVideo("previous");
    }
  };

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
    touchStateRef.current = {
      startY: touch.clientY,
      startX: touch.clientX,
      startTime: Date.now(),
      isDragging: true,
      currentY: touch.clientY,
    };
  }, []);

  const handleTouchMove = useCallback(
    (event) => {
      if (!touchStateRef.current.isDragging) return;

      const touch = event.touches[0];
      const deltaY = touch.clientY - touchStateRef.current.startY;
      const deltaX = touch.clientX - touchStateRef.current.startX;

      // Only preventDefault on vertical swipes to avoid blocking horizontal scroll
      const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) * 1.2;
      const hasAnyMovement = Math.abs(deltaY) > 5;

      if (isVerticalSwipe && hasAnyMovement) {
        event.preventDefault();
        event.stopPropagation();
      }

      // Update ref directly — no re-render
      touchStateRef.current.currentY = touch.clientY;
    },
    [],
  );

  const handleTouchEnd = useCallback(
    (event) => {
      if (!touchStateRef.current.isDragging) return;

      const ts = touchStateRef.current;
      const deltaY = ts.currentY - ts.startY;
      const actualDeltaX = Math.abs(
        ts.startX -
          (event.changedTouches?.[0]?.clientX || ts.startX),
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
