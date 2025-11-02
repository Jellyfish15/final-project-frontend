import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
  useEffect,
} from "react";
import { triggerSwipeHaptic } from "../utils/hapticFeedback";
import { logTouchEvent, isSafari } from "../utils/touchDebug";
import userInteractionService from "../services/userInteractionService";
import { videosAPI } from "../services/api";

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
  const [isMuted, setIsMuted] = useState(false);
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
  const [touchState, setTouchState] = useState({
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

  // Debug current video changes
  useEffect(() => {
    console.log("[VideoContext] Current index changed to:", currentIndex);
    console.log(
      "[VideoContext] Current video is now:",
      currentVideo
        ? { id: currentVideo._id, title: currentVideo.title }
        : "none"
    );
  }, [currentIndex, currentVideo]);

  const scrollToVideo = useCallback(
    (direction) => {
      let newIndex = currentIndex;

      if (direction === "next" && currentIndex < videos.length - 1) {
        newIndex = currentIndex + 1;
      } else if (direction === "previous" && currentIndex > 0) {
        newIndex = currentIndex - 1;
      }

      if (newIndex !== currentIndex) {
        // Clean up previous watch tracker
        if (watchTracker) {
          watchTracker.complete();
        }

        setIsVideoSwitching(true);
        setTimeout(() => {
          setCurrentIndex(newIndex);
          setIsVideoSwitching(false);
        }, 300);

        // Track navigation
        userInteractionService.trackNavigation(
          `video_${currentIndex}`,
          `video_${newIndex}`,
          { method: "swipe", direction }
        );
      }
    },
    [currentIndex, videos.length, watchTracker]
  );

  const setVideoById = useCallback(
    (videoId, createFocusedFeed = false) => {
      console.log(
        "[VideoContext] setVideoById called with:",
        videoId,
        "createFocusedFeed:",
        createFocusedFeed
      );
      console.log("[VideoContext] Available videos:", initialVideos.length);

      const videoIndex = initialVideos.findIndex(
        (video) => video._id === videoId || video.id === videoId
      );
      console.log("[VideoContext] Found video at index:", videoIndex);

      if (videoIndex !== -1) {
        if (createFocusedFeed) {
          // Create a focused feed where the target video appears FIRST (index 0)
          const focusedFeedSize = 10;
          const targetVideoPosition = 0; // Put target video at index 0 (first position) for immediate visibility

          // Calculate start and end indices for the focused feed
          let startIndex = Math.max(0, videoIndex - targetVideoPosition);
          let endIndex = Math.min(
            initialVideos.length,
            startIndex + focusedFeedSize
          );

          // Adjust if we don't have enough videos after our target
          if (endIndex - startIndex < focusedFeedSize && startIndex > 0) {
            startIndex = Math.max(0, endIndex - focusedFeedSize);
          }

          const focusedVideosFeed = initialVideos.slice(startIndex, endIndex);
          const newCurrentIndex = videoIndex - startIndex;

          console.log("[VideoContext] Creating focused feed:", {
            originalIndex: videoIndex,
            totalVideos: initialVideos.length,
            targetVideoPosition: targetVideoPosition,
            feedStart: startIndex,
            feedEnd: endIndex,
            focusedFeedSize: focusedVideosFeed.length,
            newCurrentIndex: newCurrentIndex,
            targetVideoInFeed: focusedVideosFeed[newCurrentIndex]?._id,
            targetVideoTitle: focusedVideosFeed[newCurrentIndex]?.title,
            targetVideoUrl: focusedVideosFeed[newCurrentIndex]?.videoUrl,
            targetVideoType: focusedVideosFeed[newCurrentIndex]?.videoType,
            allFeedVideos: focusedVideosFeed.map((v) => ({
              id: v._id,
              title: v.title,
              type: v.videoType,
            })),
          });

          // Set the focused feed and current index to the target video
          setFocusedVideos(focusedVideosFeed);
          setCurrentIndex(newCurrentIndex);
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
        console.log(
          "[VideoContext] Video with ID not found in current feed:",
          videoId
        );
        console.log(
          "[VideoContext] Attempting to fetch video directly from API..."
        );

        // Try to fetch the specific video from the API
        fetchSingleVideo(videoId, createFocusedFeed);
      }
    },
    [initialVideos, currentIndex]
  );

  // Function to fetch a single video by ID and add it to the context
  const fetchSingleVideo = useCallback(
    async (videoId, createFocusedFeed = false) => {
      try {
        const videosAPI = (await import("../services/api")).videosAPI;
        const response = await videosAPI.getVideo(videoId);

        if (response.success && response.video) {
          console.log(
            "[VideoContext] Successfully fetched video:",
            response.video
          );

          // Fix video URLs for uploaded videos
          const backendURL = "http://localhost:5000";
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

            console.log(
              "[VideoContext] Creating focused feed with fetched video at index 0"
            );
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
          console.error("[VideoContext] Failed to fetch video:", response);
        }
      } catch (error) {
        console.error("[VideoContext] Error fetching single video:", error);
      }
    },
    [initialVideos]
  );

  const resetToFullFeed = useCallback(() => {
    console.log("[VideoContext] Resetting to full feed");
    setFocusedVideos(null);
    setCurrentIndex(0);
  }, []);

  // New function to set a custom feed of videos
  const setCustomFeed = useCallback((videos, startIndex = 0) => {
    console.log("[VideoContext] Setting custom feed:", {
      videoCount: videos.length,
      startIndex: startIndex,
      firstVideo: videos[0]?.title,
      allVideoIds: videos.map(v => v._id || v.id),
    });
    
    // Deduplicate videos by ID
    const uniqueVideos = [];
    const seenIds = new Set();
    
    for (const video of videos) {
      const videoId = video._id || video.id;
      if (!seenIds.has(videoId)) {
        seenIds.add(videoId);
        uniqueVideos.push(video);
      } else {
        console.log("[VideoContext] Removing duplicate video:", video.title, videoId);
      }
    }
    
    console.log("[VideoContext] After deduplication:", {
      originalCount: videos.length,
      uniqueCount: uniqueVideos.length,
    });
    
    setFocusedVideos(uniqueVideos);
    setCurrentIndex(startIndex);
    setIsVideoSwitching(true);
    setTimeout(() => {
      setIsVideoSwitching(false);
    }, 300);
  }, []);

  const togglePlay = () => {
    if (currentVideo?.videoType === "youtube") {
      // For YouTube videos, just toggle the state - YouTubePlayer will handle it
      setIsPlaying(!isPlaying);
    } else if (videoRef.current) {
      // For uploaded videos, control the video element directly
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current && currentVideo?.videoType !== "youtube") {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    } else {
      setIsMuted(!isMuted);
    }
  };

  const handleLike = async () => {
    if (!currentVideo) return;

    // Don't allow liking YouTube videos (they're not in our database)
    if (currentVideo.videoType === "youtube") {
      console.log("Cannot like YouTube videos");
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
      { source: "video_player" }
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
              : v
          )
        );
      }
    } catch (error) {
      console.error("Failed to update like:", error);
      // Revert on error
      setIsLiked(!newLikedState);
      setLikeCount((prev) =>
        newLikedState ? Math.max(0, prev - 1) : prev + 1
      );
    }
  };

  const handleShare = () => {
    if (!currentVideo) return;

    setIsShareModalOpen(true);

    // Don't track shares for YouTube videos in our database
    if (currentVideo.videoType === "youtube") {
      console.log("Sharing YouTube video (not tracked in database)");
      return;
    }

    // Track engagement
    userInteractionService.trackVideoEngagement(
      currentVideo._id || currentVideo.id,
      "share",
      { source: "video_player" }
    );

    // Call backend API to increment share count
    const videoId = currentVideo._id || currentVideo.id;
    videosAPI.shareVideo(videoId).catch((error) => {
      console.error("Failed to track share:", error);
    });
  };

  const handleComment = () => {
    if (!currentVideo) return;

    // Don't allow commenting on YouTube videos (they're not in our database)
    if (currentVideo.videoType === "youtube") {
      console.log("Cannot comment on YouTube videos");
      return;
    }

    setIsCommentModalOpen(true);

    // Track engagement
    userInteractionService.trackVideoEngagement(
      currentVideo._id || currentVideo.id,
      "comment",
      { source: "video_player" }
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
    logTouchEvent("touchstart", e);
    const touch = e.touches[0];

    console.log("[VideoContext] Touch start:", {
      clientX: touch.clientX,
      clientY: touch.clientY,
      timestamp: Date.now(),
    });

    setTouchState({
      startY: touch.clientY,
      startX: touch.clientX,
      startTime: Date.now(),
      isDragging: true,
      currentY: touch.clientY,
    });
  }, []);

  const handleTouchMove = useCallback(
    (event) => {
      if (!touchState.isDragging) return;

      logTouchEvent("touchmove", event);
      const touch = event.touches[0];
      const deltaY = touch.clientY - touchState.startY;
      const deltaX = touch.clientX - touchState.startX;

      // iPhone/Safari-optimized: More aggressive preventDefault
      const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX) * 1.2;
      const hasAnyMovement = Math.abs(deltaY) > 5; // Lower threshold

      // For iPhone, prevent default on any potential vertical swipe
      if (isVerticalSwipe && hasAnyMovement) {
        event.preventDefault();
        event.stopPropagation();

        // iPhone-specific: Also prevent body scroll
        if (typeof document !== "undefined") {
          document.body.style.overflow = "hidden";
          setTimeout(() => {
            document.body.style.overflow = "";
          }, 100);
        }

        if (isSafari()) {
          console.log("[Safari] Aggressive preventDefault for vertical swipe", {
            deltaY,
            deltaX,
            isVerticalSwipe,
          });
        }
      }

      setTouchState((prev) => ({
        ...prev,
        currentY: touch.clientY,
      }));
    },
    [touchState.isDragging, touchState.startY, touchState.startX]
  );

  const handleTouchEnd = useCallback(
    (event) => {
      if (!touchState.isDragging) return;

      logTouchEvent("touchend", event);

      const deltaY = touchState.currentY - touchState.startY;
      const deltaX = Math.abs(touchState.startX - touchState.currentY); // Fixed calculation
      const actualDeltaX = Math.abs(
        touchState.startX -
          (event.changedTouches?.[0]?.clientX || touchState.startX)
      );
      const deltaTime = Date.now() - touchState.startTime;
      const velocity = Math.abs(deltaY) / deltaTime;

      // Very lenient swipe detection for debugging
      const minSwipeDistance = 15; // Much lower threshold
      const maxSwipeTime = 2000; // More time allowed
      const minVelocity = 0.01; // Very low velocity requirement

      // More lenient vertical detection
      const isVertical = Math.abs(deltaY) > actualDeltaX * 0.8;

      const isValidSwipe =
        Math.abs(deltaY) > minSwipeDistance &&
        deltaTime < maxSwipeTime &&
        velocity > minVelocity &&
        isVertical;

      // Simple fallback - just check for basic vertical movement
      const isBasicSwipe = Math.abs(deltaY) > 30;

      console.log("[Touch Debug] Swipe analysis:", {
        deltaY,
        deltaX,
        actualDeltaX,
        deltaTime,
        velocity,
        isVertical,
        isValidSwipe,
        isBasicSwipe,
        minSwipeDistance,
        maxSwipeTime,
        minVelocity,
        isSafari: isSafari(),
        touchState: touchState,
        currentIndex,
        videosLength: videos.length,
      });

      // Use either the sophisticated detection or the basic fallback
      if (isValidSwipe || isBasicSwipe) {
        if (deltaY > 0) {
          // Swipe down - go to previous video
          if (currentIndex > 0) {
            triggerSwipeHaptic("previous", true);
            scrollToVideo("previous");
          } else {
            triggerSwipeHaptic("previous", false);
          }
        } else {
          // Swipe up - go to next video
          if (currentIndex < videos.length - 1) {
            triggerSwipeHaptic("next", true);
            scrollToVideo("next");
          } else {
            triggerSwipeHaptic("next", false);
          }
        }
      }

      // Reset touch state
      setTouchState({
        startY: 0,
        startX: 0,
        startTime: 0,
        isDragging: false,
        currentY: 0,
      });
    },
    [touchState, currentIndex, videos.length, scrollToVideo, showSwipeIndicator]
  );

  const handleTouchCancel = useCallback(() => {
    setTouchState({
      startY: 0,
      startX: 0,
      startTime: 0,
      isDragging: false,
      currentY: 0,
    });
  }, []);

  const value = {
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
    touchState,
    swipeIndicator,
    showSwipeIndicator,
    refreshVideos,
  };

  return (
    <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
  );
};

export default VideoContext;
