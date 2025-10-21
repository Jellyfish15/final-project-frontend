import React, { createContext, useContext, useState, useRef } from "react";
import { triggerSwipeHaptic } from "../utils/hapticFeedback";
import { throttle } from "../utils/touchUtils";

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

  const scrollToVideo = (direction) => {
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
  };

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

  // Touch event handlers for mobile swipe gestures
  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    setTouchState({
      startY: touch.clientY,
      startX: touch.clientX,
      startTime: Date.now(),
      isDragging: true,
      currentY: touch.clientY,
    });
  };

  const handleTouchMove = throttle((event) => {
    if (!touchState.isDragging) return;

    const touch = event.touches[0];
    const deltaY = touch.clientY - touchState.startY;

    // Only prevent default for vertical swipes to maintain horizontal scrolling
    if (
      Math.abs(deltaY) > 15 &&
      Math.abs(deltaY) > Math.abs(touch.clientX - touchState.startX)
    ) {
      event.preventDefault();
    }

    setTouchState((prev) => ({
      ...prev,
      currentY: touch.clientY,
    }));
  }, 16); // ~60fps throttling

  const handleTouchEnd = () => {
    if (!touchState.isDragging) return;

    const deltaY = touchState.currentY - touchState.startY;
    const deltaTime = Date.now() - touchState.startTime;
    const velocity = Math.abs(deltaY) / deltaTime;

    // Determine if it's a valid swipe gesture
    const minSwipeDistance = 50; // Minimum distance for swipe
    const maxSwipeTime = 500; // Maximum time for swipe (ms)
    const minVelocity = 0.1; // Minimum velocity for swipe

    const isValidSwipe =
      Math.abs(deltaY) > minSwipeDistance &&
      deltaTime < maxSwipeTime &&
      velocity > minVelocity;

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
  };

  const handleTouchCancel = () => {
    setTouchState({
      startY: 0,
      startX: 0,
      startTime: 0,
      isDragging: false,
      currentY: 0,
    });
  };

  // Show swipe feedback indicator
  const showSwipeIndicator = (direction, message) => {
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
  };

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
