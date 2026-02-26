import React, {
  useState,
  useEffect,
  useCallback,
} from "react";
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
import { videosAPI } from "./services/api.js";
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
        { startTime },
      );

      // Progressive loading strategy:
      // 1. Load first 3-5 videos immediately for fast display
      // 2. Load rest in background
      const INITIAL_QUICK_LOAD = isMobile ? 3 : 5; // Load 3-5 videos immediately
      const FULL_LOAD_COUNT = isMobile ? 12 : 28; // Full batch size

      console.log(
        `[App] Progressive loading: ${INITIAL_QUICK_LOAD} initial + ${FULL_LOAD_COUNT} total`,
      );

      // First, load initial videos quickly + uploaded videos
      const [initialFeedResponse, uploadedVideosResponse] =
        await Promise.allSettled([
          videosAPI.getFeedWithCaching(INITIAL_QUICK_LOAD).catch((err) => {
            console.log("Feed with caching unavailable:", err.message);
            return videosAPI
              .getCachedVideos(INITIAL_QUICK_LOAD)
              .catch(() => ({ videos: [], count: 0 }));
          }),
          videosAPI.getFeed(1, 20), // Get uploaded videos
        ]);

      let allVideos = [];
      let initialVideos = [];

      // PHASE 1: Process initial quick-loaded videos
      console.log(
        "[App] Initial feed response status:",
        initialFeedResponse.status,
      );
      console.log(
        "[App] Initial feed response value:",
        initialFeedResponse.value,
      );

      if (
        initialFeedResponse.status === "fulfilled" &&
        initialFeedResponse.value?.videos?.length > 0
      ) {
        initialVideos = [...initialFeedResponse.value.videos];

        if (initialFeedResponse.value.newlyCached > 0) {
          console.log(
            `✅ Successfully cached ${initialFeedResponse.value.newlyCached} new YouTube videos`,
          );
        }
        if (initialFeedResponse.value.quotaExceeded) {
          console.log(
            "⚠️ YouTube API quota exceeded. Using cached videos only.",
          );
          setYoutubeApiDisabled(true);
        }

        console.log(
          "Successfully loaded",
          initialFeedResponse.value.videos.length,
          "initial YouTube videos",
        );
      } else {
        console.log("No initial YouTube videos available");
        if (initialFeedResponse.status === "rejected") {
          console.error(
            "[App] Initial feed rejected:",
            initialFeedResponse.reason,
          );
        }
      }

      // Process uploaded videos immediately
      let uploadedVideos = [];
      console.log(
        "[App] Uploaded videos response status:",
        uploadedVideosResponse.status,
      );

      if (
        uploadedVideosResponse.status === "fulfilled" &&
        uploadedVideosResponse.value?.videos?.length > 0
      ) {
        // Derive backend server root from API_BASE_URL (strip trailing /api)
        const backendURL = API_BASE_URL.replace(/\/api\/?$/, "");
        uploadedVideos = uploadedVideosResponse.value.videos.map((video) => {
          let videoUrl = video.videoUrl;
          let thumbnailUrl = video.thumbnailUrl;

          if (!videoUrl.startsWith("http")) {
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

          let avatarUrl =
            video.creator?.avatar || "https://via.placeholder.com/40x40?text=U";
          if (
            avatarUrl &&
            !avatarUrl.startsWith("http") &&
            !avatarUrl.includes("placeholder")
          ) {
            avatarUrl = avatarUrl.startsWith("/api/")
              ? avatarUrl.replace("/api/", "/")
              : avatarUrl;
            avatarUrl = `${backendURL}${avatarUrl}`;
          }

          return {
            ...video,
            _id: video.id || video._id,
            videoUrl,
            thumbnailUrl,
            videoType: "uploaded",
            creator: video.creator?.username || video.creator || "Unknown",
            avatar: avatarUrl,
            isVerified: video.creator?.isVerified || false,
          };
        });

        console.log(
          "Successfully loaded",
          uploadedVideos.length,
          "uploaded videos",
        );
      } else {
        console.log("No uploaded videos available");
      }

      // PHASE 2: Set initial videos immediately so user sees content fast
      allVideos = [...initialVideos, ...uploadedVideos];
      if (allVideos.length > 0) {
        const initialLoadTime = (performance.now() - startTime) / 1000;
        setVideos(allVideos);
        setIsLoadingVideos(false);
        console.log(
          `[App] ✅ Initial videos displayed in ${initialLoadTime.toFixed(2)}s:`,
          allVideos.length,
        );
      } else {
        const fallbackVideos = getFallbackVideos();
        setVideos(fallbackVideos);
        setIsLoadingVideos(false);
        console.warn(
          "No initial videos available, showing",
          fallbackVideos.length,
          "fallback videos",
        );
      }

      // PHASE 3: Load rest of videos in background (if not already loaded)
      const VIDEOS_ALREADY_LOADED = allVideos.length;
      if (VIDEOS_ALREADY_LOADED < FULL_LOAD_COUNT) {
        console.log(
          `[App] Loading additional videos in background... (have ${VIDEOS_ALREADY_LOADED}, need ${FULL_LOAD_COUNT})`,
        );

        // Load more videos asynchronously
        const additionalFeedResponse = await videosAPI
          .getFeedWithCaching(FULL_LOAD_COUNT)
          .catch((err) => {
            console.log("Additional feed unavailable:", err.message);
            return videosAPI
              .getCachedVideos(FULL_LOAD_COUNT)
              .catch(() => ({ videos: [], count: 0 }));
          });

        if (
          additionalFeedResponse?.videos &&
          additionalFeedResponse.videos.length > INITIAL_QUICK_LOAD
        ) {
          // Get videos we haven't already loaded
          const existingIds = new Set(allVideos.map((v) => v._id || v.id));
          const newYoutubeVideos = additionalFeedResponse.videos.filter(
            (v) => !existingIds.has(v._id || v.id),
          );

          if (newYoutubeVideos.length > 0) {
            const updatedVideos = [...allVideos, ...newYoutubeVideos];
            setVideos(updatedVideos);

            const totalTime = (performance.now() - startTime) / 1000;
            console.log(
              `[App] ✅ Additional videos loaded in background (total: ${totalTime.toFixed(2)}s):`,
              updatedVideos.length,
            );
          }
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
