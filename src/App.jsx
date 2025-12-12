import React, { useState, useEffect, useCallback } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
  useLocation,
} from "react-router-dom";
import Profile from "./components/Profile/Profile";
import Search from "./components/Search/Search";
import Video from "./components/Video/Video";
import Sidebar from "./components/Sidebar/Sidebar";
import BottomNavigation from "./components/BottomNavigation/BottomNavigation";
import LoginModal from "./components/LoginModal/LoginModal";
import RegisterModal from "./components/RegisterModal/RegisterModal";
import { AuthProvider } from "./components/AuthContext/AuthContext";
import { VideoProvider } from "./contexts/VideoContext";
import { getEducationalVideoFeed } from "../services/youtubeService.js";
import { videosAPI } from "./services/api.js";
import "./App.css";

function App() {
  const [modals, setModals] = useState({
    login: false,
    register: false,
  });

  const [videos, setVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videosError, setVideosError] = useState(null);
  const [youtubeApiDisabled, setYoutubeApiDisabled] = useState(false);

  const loadVideos = useCallback(async () => {
    try {
      setIsLoadingVideos(true);
      setVideosError(null);
      console.log("Loading videos with opportunistic caching...");

      // Try to fetch and cache new videos, or fall back to existing cache
      const [feedResponse, uploadedVideosResponse] = await Promise.allSettled([
        // Try opportunistic caching (attempts to fetch new videos, falls back to cache)
        videosAPI.getFeedWithCaching(28).catch((err) => {
          console.log("Feed with caching unavailable:", err.message);
          // Fall back to just getting cached videos
          return videosAPI
            .getCachedVideos()
            .catch(() => ({ videos: [], count: 0 }));
        }),
        videosAPI.getFeed(1, 20), // Get uploaded videos
      ]);

      let allVideos = [];

      // Handle YouTube videos (either newly cached or from existing cache)
      if (
        feedResponse.status === "fulfilled" &&
        feedResponse.value?.videos?.length > 0
      ) {
        allVideos = [...feedResponse.value.videos];

        // Log the caching status
        if (feedResponse.value.newlyCached > 0) {
          console.log(
            `✅ Successfully cached ${feedResponse.value.newlyCached} new YouTube videos`
          );
        }
        if (feedResponse.value.quotaExceeded) {
          console.log(
            "⚠️ YouTube API quota exceeded. Using cached videos only."
          );
          setYoutubeApiDisabled(true);
        }

        console.log(
          "Successfully loaded",
          feedResponse.value.videos.length,
          "YouTube videos"
        );
      } else {
        console.log("No YouTube videos available");
      }

      // Add uploaded videos
      if (
        uploadedVideosResponse.status === "fulfilled" &&
        uploadedVideosResponse.value?.videos?.length > 0
      ) {
        // Fix video URLs for uploaded videos to include full backend URL
        const backendURL = "http://localhost:5000"; // Direct backend URL without /api
        const uploadedVideos = uploadedVideosResponse.value.videos.map(
          (video) => {
            // Remove /api prefix if it exists in the video URL for static file serving
            let videoUrl = video.videoUrl;
            let thumbnailUrl = video.thumbnailUrl;

            console.log("[App] Processing uploaded video:", {
              id: video.id || video._id,
              title: video.title,
              originalVideoUrl: video.videoUrl,
              originalThumbnailUrl: video.thumbnailUrl,
            });

            if (!videoUrl.startsWith("http")) {
              // Ensure we don't double-add /api prefix for static files
              videoUrl = videoUrl.startsWith("/api/")
                ? videoUrl.replace("/api/", "/")
                : videoUrl;
              videoUrl = `${backendURL}${videoUrl}`;
            }

            if (!thumbnailUrl.startsWith("http")) {
              thumbnailUrl = thumbnailUrl.startsWith("/api/")
                ? thumbnailUrl.replace("/api/", "/")
                : thumbnailUrl;
              thumbnailUrl = `${backendURL}${thumbnailUrl}`;
            }

            console.log("[App] Final video URLs:", {
              finalVideoUrl: videoUrl,
              finalThumbnailUrl: thumbnailUrl,
            });

            return {
              ...video,
              _id: video.id || video._id, // Normalize id field
              videoUrl,
              thumbnailUrl,
              videoType: "uploaded", // Mark as uploaded video for identification
              creator: video.creator?.username || video.creator || "Unknown",
              avatar:
                video.creator?.avatar ||
                "https://via.placeholder.com/40x40?text=U",
              isVerified: video.creator?.isVerified || false,
            };
          }
        );

        allVideos = [...allVideos, ...uploadedVideos];
        console.log(
          "Successfully loaded",
          uploadedVideos.length,
          "uploaded videos"
        );
      }

      if (allVideos.length > 0) {
        setVideos(allVideos);
        console.log("Total videos loaded:", allVideos.length);
        console.log(
          "All video IDs:",
          allVideos.map((v) => ({
            id: v._id,
            title: v.title,
            type: v.videoType || "youtube",
          }))
        );
      } else {
        // If no videos from either source, use fallback videos
        const fallbackVideos = getFallbackVideos();
        setVideos(fallbackVideos);
        console.warn(
          "No videos returned from any source, using",
          fallbackVideos.length,
          "fallback videos"
        );
      }
    } catch (err) {
      console.error("Error loading videos:", err);
      setVideosError(err.message);
      setVideos(getFallbackVideos());
    } finally {
      setIsLoadingVideos(false);
    }
  }, []);

  const getFallbackVideos = () => [
    {
      _id: 1,
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
      _id: 2,
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
      _id: 3,
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

  useEffect(() => {
    loadVideos();
  }, []); // Remove loadVideos dependency to prevent infinite loop

  const openModal = (modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: true }));
  };

  const closeModal = (modalName) => {
    setModals((prev) => ({ ...prev, [modalName]: false }));
  };

  const switchToLogin = () => {
    setModals({ login: true, register: false });
  };

  const switchToRegister = () => {
    setModals({ login: false, register: true });
  };

  const handleLogin = async (userData) => {
    try {
      console.log("Processing login for:", userData.username || userData.email);
      // The actual login is now handled by AuthContext
      // This is just for UI feedback
      closeModal("login");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleRegister = async (userData) => {
    try {
      console.log("Processing registration for:", userData.username);
      // The actual registration is now handled by AuthContext
      // This is just for UI feedback
      closeModal("register");
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const videoApiProps = {
    videos,
    isLoadingVideos,
    videosError,
    refreshVideos: loadVideos,
  };

  // Component to handle location-based styling
  const AppContent = () => {
    const location = useLocation();
    const isVideosPage = location.pathname === "/videos";

    // Update body class based on current page
    useEffect(() => {
      if (isVideosPage) {
        document.body.classList.add("page-body--videos");
      } else {
        document.body.classList.remove("page-body--videos");
      }

      // Cleanup function
      return () => {
        document.body.classList.remove("page-body--videos");
      };
    }, [isVideosPage]);

    return (
      <div className={`app ${isVideosPage ? "app--videos" : ""}`}>
        {/* Hide sidebar on videos page */}
        {!isVideosPage && (
          <Sidebar
            onOpenLogin={() => openModal("login")}
            onOpenRegister={() => openModal("register")}
          />
        )}
        <main
          className={`app__main ${isVideosPage ? "app__main--videos" : ""}`}
        >
          <Routes>
            <Route path="/" element={<Navigate to="/videos" replace />} />
            <Route
              path="/search"
              element={
                <Search
                  onOpenLogin={() => openModal("login")}
                  onOpenRegister={() => openModal("register")}
                />
              }
            />
            <Route
              path="/profile"
              element={
                <Profile
                  onOpenLogin={() => openModal("login")}
                  onOpenRegister={() => openModal("register")}
                />
              }
            />
            <Route
              path="/videos"
              element={
                <Video
                  onOpenLogin={() => openModal("login")}
                  onOpenRegister={() => openModal("register")}
                />
              }
            />
          </Routes>
        </main>
        <BottomNavigation />

        <LoginModal
          isOpen={modals.login}
          onClose={() => closeModal("login")}
          onSwitchToRegister={switchToRegister}
        />

        <RegisterModal
          isOpen={modals.register}
          onClose={() => closeModal("register")}
          onSwitchToLogin={switchToLogin}
        />
      </div>
    );
  };

  return (
    <AuthProvider>
      <VideoProvider {...videoApiProps}>
        <Router>
          <AppContent />
        </Router>
      </VideoProvider>
    </AuthProvider>
  );
}

export default App;
