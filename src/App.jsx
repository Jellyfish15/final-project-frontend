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
import VideoUploadModal from "./components/VideoUploadModal/VideoUploadModal";
import { AuthProvider } from "./components/AuthContext/AuthContext";
import { VideoProvider } from "./contexts/VideoContext";
import { videosAPI, feedAPI } from "./services/api.js";
import { API_BASE_URL } from "./services/config.js";
import "./App.css";

// Application-level performance metrics
const performanceMetrics = {
  appStartTime: performance.now(),
  firstContentfulPaint: null,
  timeToInteractive: null,
  videoLoadTimes: [],
  apiCallDurations: [],
};

// Network-aware resource loading strategy
const getLoadingStrategy = () => {
  const connection = navigator.connection || navigator.mozConnection;
  if (!connection) return { initialBatch: 8, prefetchCount: 3 };

  switch (connection.effectiveType) {
    case "4g":
      return { initialBatch: 12, prefetchCount: 5 };
    case "3g":
      return { initialBatch: 6, prefetchCount: 2 };
    case "2g":
      return { initialBatch: 3, prefetchCount: 1 };
    default:
      return { initialBatch: 8, prefetchCount: 3 };
  }
};

// Service worker communication bridge
const notifyServiceWorker = (message) => {
  if ("serviceWorker" in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage(message);
  }
};

function App() {
  const [modals, setModals] = useState({
    login: false,
    register: false,
  });
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [videos, setVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videosError, setVideosError] = useState(null);
  const [youtubeApiDisabled, setYoutubeApiDisabled] = useState(false);

  const loadVideos = useCallback(async () => {
    try {
      setIsLoadingVideos(true);
      setVideosError(null);

      const startTime = performance.now();
      const isMobile = /iPhone|iPad|Android|Mobile/i.test(navigator.userAgent);
      console.log(
        `[App] Loading videos on ${isMobile ? "MOBILE" : "DESKTOP"}...`,
      );

      const INITIAL_QUICK_LOAD = isMobile ? 10 : 20;
      const FULL_LOAD_COUNT = isMobile ? 20 : 40;

      // Derive backend server root from API_BASE_URL (strip trailing /api)
      const backendURL = API_BASE_URL.replace(/\/api\/?$/, "");

      // Helper: resolve local URLs to full backend URLs
      const resolveUrl = (url) => {
        if (!url) return url;
        if (url.startsWith("http")) return url;
        const cleaned = url.startsWith("/api/")
          ? url.replace("/api/", "/")
          : url;
        return `${backendURL}${cleaned}`;
      };

      // Helper: normalise a video from the unified feed response
      const normalizeVideo = (video) => {
        let avatarUrl =
          video.avatar || "https://via.placeholder.com/40x40?text=U";
        if (
          avatarUrl &&
          !avatarUrl.startsWith("http") &&
          !avatarUrl.includes("placeholder")
        ) {
          avatarUrl = resolveUrl(avatarUrl);
        }

        return {
          ...video,
          _id: video._id || video.id || video.videoId,
          videoUrl:
            video.videoType === "uploaded"
              ? resolveUrl(video.videoUrl)
              : video.videoUrl,
          thumbnailUrl: resolveUrl(video.thumbnailUrl),
          avatar: avatarUrl,
        };
      };

      // ── PHASE 1: Try unified feed (merges user uploads + YouTube cache) ──
      let allVideos = [];
      let usedUnifiedFeed = false;

      try {
        const unifiedResponse = await feedAPI.getUnifiedFeed(
          1,
          INITIAL_QUICK_LOAD,
        );

        if (unifiedResponse?.success && unifiedResponse.videos?.length > 0) {
          allVideos = unifiedResponse.videos.map(normalizeVideo);
          usedUnifiedFeed = true;
          console.log(
            `[App] Unified feed loaded ${allVideos.length} videos (${unifiedResponse.meta?.uploadedCount || 0} uploaded, ${unifiedResponse.meta?.youtubeCount || 0} YouTube)`,
          );
        }
      } catch (err) {
        console.log(
          "[App] Unified feed unavailable, falling back to legacy:",
          err.message,
        );
      }

      // ── PHASE 1b: Fallback to legacy endpoints if unified feed failed ──
      if (!usedUnifiedFeed) {
        const [initialFeedResponse, uploadedVideosResponse] =
          await Promise.allSettled([
            videosAPI.getFeedWithCaching(INITIAL_QUICK_LOAD).catch((err) => {
              console.log("Feed with caching unavailable:", err.message);
              return videosAPI
                .getCachedVideos(INITIAL_QUICK_LOAD)
                .catch(() => ({ videos: [], count: 0 }));
            }),
            videosAPI.getFeed(1, 20),
          ]);

        let initialVideos = [];
        if (
          initialFeedResponse.status === "fulfilled" &&
          initialFeedResponse.value?.videos?.length > 0
        ) {
          initialVideos = initialFeedResponse.value.videos;
          if (initialFeedResponse.value.quotaExceeded) {
            setYoutubeApiDisabled(true);
          }
        }

        let uploadedVideos = [];
        if (
          uploadedVideosResponse.status === "fulfilled" &&
          uploadedVideosResponse.value?.videos?.length > 0
        ) {
          uploadedVideos = uploadedVideosResponse.value.videos.map((video) => ({
            ...video,
            _id: video.id || video._id,
            videoUrl: resolveUrl(video.videoUrl),
            thumbnailUrl: resolveUrl(video.thumbnailUrl),
            videoType: "uploaded",
            creator: video.creator?.username || video.creator || "Unknown",
            avatar: resolveUrl(
              video.creator?.avatar ||
                "https://via.placeholder.com/40x40?text=U",
            ),
            isVerified: video.creator?.isVerified || false,
          }));
        }

        allVideos = [...initialVideos, ...uploadedVideos];
      }

      // ── PHASE 2: Set initial videos immediately ──
      if (allVideos.length > 0) {
        setVideos(allVideos);
        setIsLoadingVideos(false);
        console.log(
          `[App] ✅ Initial videos displayed in ${((performance.now() - startTime) / 1000).toFixed(2)}s: ${allVideos.length}`,
        );
      } else {
        setVideos(getFallbackVideos());
        setIsLoadingVideos(false);
        console.warn("[App] No videos available, showing fallback");
      }

      // ── PHASE 3: Load more in background ──
      if (allVideos.length < FULL_LOAD_COUNT) {
        try {
          let moreVideos = [];

          if (usedUnifiedFeed) {
            const moreResponse = await feedAPI.getUnifiedFeed(
              2,
              FULL_LOAD_COUNT,
            );
            if (moreResponse?.videos?.length > 0) {
              moreVideos = moreResponse.videos.map(normalizeVideo);
            }
          } else {
            const additionalFeed = await videosAPI
              .getFeedWithCaching(FULL_LOAD_COUNT)
              .catch(() =>
                videosAPI
                  .getCachedVideos(FULL_LOAD_COUNT)
                  .catch(() => ({ videos: [] })),
              );
            if (additionalFeed?.videos?.length > 0) {
              moreVideos = additionalFeed.videos;
            }
          }

          if (moreVideos.length > 0) {
            const existingIds = new Set(allVideos.map((v) => v._id || v.id));
            const newVideos = moreVideos.filter(
              (v) => !existingIds.has(v._id || v.id),
            );
            if (newVideos.length > 0) {
              const combined = [...allVideos, ...newVideos];
              setVideos(combined);
              console.log(
                `[App] ✅ Background load complete, total: ${combined.length}`,
              );
            }
          }
        } catch (err) {
          console.log("[App] Background load failed:", err.message);
        }
      }
    } catch (err) {
      console.error("Error loading videos:", err);
      setVideosError(err.message);
      setVideos(getFallbackVideos());
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
      closeModal("register");
    } catch (error) {
      console.error("Registration failed:", error);
    }
  };

  const handleUploadSuccess = (video) => {
    console.log("[App] Video uploaded successfully:", video?.title);
    setShowUploadModal(false);
    // Refresh the feed so the new video appears
    loadVideos();
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
            onOpenUpload={() => setShowUploadModal(true)}
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
        <BottomNavigation onOpenUpload={() => setShowUploadModal(true)} />

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

        <VideoUploadModal
          isOpen={showUploadModal}
          onClose={() => setShowUploadModal(false)}
          onUploadSuccess={handleUploadSuccess}
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
