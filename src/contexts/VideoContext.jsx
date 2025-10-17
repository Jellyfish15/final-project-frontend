import React, { createContext, useContext, useState, useRef } from "react";

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
    refreshVideos,
  };

  return (
    <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
  );
};

export default VideoContext;
