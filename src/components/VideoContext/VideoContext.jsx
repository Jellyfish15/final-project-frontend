import React, {
  createContext,
  useContext,
  useState,
  useRef,
  useEffect,
} from "react";
import { getEducationalVideoFeed } from "../../../services/youtubeService.js";

const VideoContext = createContext();

export const useVideo = () => {
  const context = useContext(VideoContext);
  if (!context) {
    throw new Error("useVideo must be used within a VideoProvider");
  }
  return context;
};

export const VideoProvider = ({ children }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [videos, setVideos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isVideoSwitching, setIsVideoSwitching] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    const loadVideos = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const educationalVideos = await getEducationalVideoFeed(10);

        if (educationalVideos && educationalVideos.length > 0) {
          setVideos(educationalVideos);
        } else {
          setVideos(getFallbackVideos());
          console.warn(
            "No videos returned from YouTube API, using fallback videos"
          );
        }
      } catch (err) {
        console.error("Error loading videos:", err);
        setError(err.message);
        setVideos(getFallbackVideos());
      } finally {
        setIsLoading(false);
      }
    };

    loadVideos();
  }, []);

  const getFallbackVideos = () => [
    {
      id: 1,
      title: "Quick Math Tip: Mental Addition",
      creator: "@MathHacks",
      avatar: "https://via.placeholder.com/40x40?text=MH",
      videoUrl: "https://www.youtube.com/embed/dQw4w9WgXcQ",
      videoType: "youtube",
      likes: "8.4K",
      comments: "345",
      shares: "156",
      description:
        "Learn this amazing mental math trick to add numbers faster! Perfect 30-second tip for students 🧮✨ #math #quicktips #education #mentalmath",
      isVerified: true,
    },
    {
      id: 2,
      title: "Science Quick Fact: Why Sky is Blue",
      creator: "@ScienceSnacks",
      avatar: "https://via.placeholder.com/40x40?text=SS",
      videoUrl: "https://www.youtube.com/embed/jHbyQ_AQP8c",
      videoType: "youtube",
      likes: "5.2K",
      comments: "156",
      shares: "89",
      description:
        "Ever wondered why the sky is blue? Here's the 45-second science explanation! 🌌🔬 #science #physics #quickfacts #education",
      isVerified: true,
    },
    {
      id: 3,
      title: "Coding Tip: Your First Function",
      creator: "@CodeInSeconds",
      avatar: "https://via.placeholder.com/40x40?text=CS",
      videoUrl: "https://www.youtube.com/embed/W6NZfCO5SIk",
      videoType: "youtube",
      likes: "12.1K",
      comments: "432",
      shares: "298",
      description:
        "Learn to write your first JavaScript function in under 60 seconds! Perfect for beginners 💻⚡ #coding #javascript #programming #tutorial",
      isVerified: true,
    },
  ];

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
  };

  return (
    <VideoContext.Provider value={value}>{children}</VideoContext.Provider>
  );
};

export default VideoContext;
