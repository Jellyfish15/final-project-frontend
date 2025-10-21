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
