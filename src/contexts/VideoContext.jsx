import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useCallback,
} from "react";
import { triggerSwipeHaptic } from "../utils/hapticFeedback";
import { logTouchEvent, isSafari } from "../utils/touchDebug";

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
  const [isMuted, setIsMuted] = useState(true);
  const [isVideoSwitching, setIsVideoSwitching] = useState(false);
  const videoRef = useRef(null);

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

  // Use videos from props (App component handles API calls)
  const videos = initialVideos;
  const isLoading = isLoadingVideos;
  const error = videosError;

  const currentVideo = videos[currentIndex] || null;

  const scrollToVideo = useCallback(
    (direction) => {
      let newIndex = currentIndex;

      if (direction === "next" && currentIndex < videos.length - 1) {
        newIndex = currentIndex + 1;
      } else if (direction === "previous" && currentIndex > 0) {
        newIndex = currentIndex - 1;
      }

      if (newIndex !== currentIndex) {
        setIsVideoSwitching(true);
        setTimeout(() => {
          setCurrentIndex(newIndex);
          setIsVideoSwitching(false);
        }, 300);
      }
    },
    [currentIndex, videos.length]
  );

  const togglePlay = () => {
    if (videoRef.current && currentVideo?.videoType !== "youtube") {
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

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleShare = () => {
    console.log("Sharing video:", currentVideo?.title);
  };

  const handleComment = () => {
    console.log("Opening comments for:", currentVideo?.title);
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

      // Enhanced swipe detection - more responsive thresholds
      const minSwipeDistance = isSafari() ? 25 : 35;
      const maxSwipeTime = isSafari() ? 1200 : 1000;
      const minVelocity = isSafari() ? 0.02 : 0.04;

      // Ensure it's more vertical than horizontal - use proper deltaX calculation
      const isVertical = Math.abs(deltaY) > actualDeltaX * 1.2;

      const isValidSwipe =
        Math.abs(deltaY) > minSwipeDistance &&
        deltaTime < maxSwipeTime &&
        velocity > minVelocity &&
        isVertical;

      console.log("[Touch Debug] Swipe analysis:", {
        deltaY,
        deltaX,
        deltaTime,
        velocity,
        isVertical,
        isValidSwipe,
        isSafari: isSafari(),
      });

      if (isValidSwipe) {
        if (deltaY > 0) {
          // Swipe down - go to previous video
          if (currentIndex > 0) {
            triggerSwipeHaptic("previous", true);
            showSwipeIndicator("previous", "↑ Previous Video");
            scrollToVideo("previous");
          } else {
            triggerSwipeHaptic("previous", false);
            showSwipeIndicator("blocked", "First Video");
          }
        } else {
          // Swipe up - go to next video
          if (currentIndex < videos.length - 1) {
            triggerSwipeHaptic("next", true);
            showSwipeIndicator("next", "↓ Next Video");
            scrollToVideo("next");
          } else {
            triggerSwipeHaptic("next", false);
            showSwipeIndicator("blocked", "Last Video");
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
