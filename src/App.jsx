import React, { useState, useEffect, useCallback } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
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
import LandingPage from "./components/LandingPage/LandingPage";
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

// Large pool of educational YouTube Shorts — randomly sampled each visit
const FALLBACK_POOL = [
  { id: "GhWnZ9jExk4", title: "What Happens Inside a Black Hole?", creator: "@SpaceExplained", category: "science", description: "A mind-bending look at what physics tells us about the interior of a black hole 🕳️🌌 #space #physics #blackhole" },
  { id: "dFCbJmgeHmA", title: "The Fibonacci Sequence in Nature", creator: "@MathVisuals", category: "math", description: "See the golden ratio everywhere — from sunflowers to galaxies 🌻🔢 #math #fibonacci #nature" },
  { id: "wgbV6DLVezo", title: "How Does Wi-Fi Actually Work?", creator: "@TechDecoded", category: "technology", description: "The invisible signals all around you, explained in 60 seconds 📶💡 #wifi #technology #explained" },
  { id: "yKP7jQknGvI", title: "Why Do We Dream?", creator: "@BrainBites", category: "science", description: "Neuroscience still doesn't fully know — but here's our best theory 🧠💤 #dreams #neuroscience #brain" },
  { id: "JGwWNGJdvx8", title: "The History of the Internet in 60 Seconds", creator: "@HistoryByte", category: "history", description: "From ARPANET to TikTok in under a minute ⏳🌐 #internet #history #technology" },
  { id: "pTn6Bvkr2FU", title: "What is DNA?", creator: "@BioBasics", category: "science", description: "Your body's instruction manual, explained simply 🧬✨ #DNA #biology #genetics" },
  { id: "QXeEoD0pR0Q", title: "Why is the Ocean Salty?", creator: "@EarthScience", category: "science", description: "Rivers carry minerals to the sea — but that's just the start 🌊🧂 #ocean #science #earth" },
  { id: "gWPFJgLAzu4", title: "How Do Airplanes Stay in the Air?", creator: "@PhysicsFun", category: "science", description: "Bernoulli's principle and Newton's 3rd law working together ✈️🔬 #physics #flight #aviation" },
  { id: "1ZXugicgn6U", title: "What Causes Thunder and Lightning?", creator: "@WeatherWiz", category: "science", description: "Electrical charges in clouds create nature's most dramatic light show ⚡🌩️ #weather #lightning #science" },
  { id: "sI8NsYIyQ2A", title: "The Pythagorean Theorem Explained", creator: "@MathMadeEasy", category: "math", description: "a² + b² = c² — here's why it works and where you'll use it 📐✏️ #math #geometry #pythagorean" },
  { id: "3JQ3hYko51Y", title: "How Vaccines Work", creator: "@HealthMinute", category: "science", description: "Training your immune system to fight before you get sick 💉🛡️ #vaccines #health #immunology" },
  { id: "hFZFjoX2cGg", title: "What is Gravity Really?", creator: "@SpaceExplained", category: "science", description: "Einstein said it's curved spacetime — here's what that means 🌍🍎 #gravity #physics #einstein" },
  { id: "sMb00lz-IfE", title: "How Do Computers Think?", creator: "@CodeBrief", category: "technology", description: "Binary, logic gates, and billions of tiny switches ⚡💻 #computers #binary #tech" },
  { id: "bXk3teJpzGU", title: "Why Do Leaves Change Color in Fall?", creator: "@NaturePulse", category: "science", description: "Chlorophyll breaks down and reveals hidden pigments 🍂🍁 #autumn #biology #nature" },
  { id: "1Bc9UY30gTc", title: "What Is an Algorithm?", creator: "@CodeInSeconds", category: "technology", description: "Step-by-step problem solving — you already use them every day 🤖📝 #coding #algorithms #cs" },
  { id: "MO0L_LY2hRA", title: "How Sound Travels", creator: "@ScienceSnacks", category: "science", description: "Vibrations through air, water, and solids — sound is a wave 🔊🌊 #sound #physics #waves" },
  { id: "HVT3Y3_gHGg", title: "The Water Cycle Simplified", creator: "@EarthScience", category: "science", description: "Evaporation, condensation, precipitation — and repeat ♻️💧 #water #cycle #earth" },
  { id: "Y6ljFaKRTrI", title: "How Do Magnets Work?", creator: "@PhysicsFun", category: "science", description: "Electron spin and magnetic domains — it's quantum all the way down 🧲⚛️ #magnets #physics #quantum" },
  { id: "TNKWgcFPHqw", title: "Ancient Egypt in 60 Seconds", creator: "@HistoryByte", category: "history", description: "3000 years of pharaohs, pyramids, and the Nile 🏛️🐫 #egypt #history #ancient" },
  { id: "xuCn8ux2gbs", title: "Photosynthesis: How Plants Eat Sunlight", creator: "@BioBasics", category: "science", description: "CO₂ + water + light = food + oxygen 🌱☀️ #photosynthesis #biology #plants" },
  { id: "UsApY5BnckE", title: "How Do Touchscreens Detect Your Finger?", creator: "@TechDecoded", category: "technology", description: "Capacitive sensing — your body is part of the circuit 📱👆 #touchscreen #technology #howthingswork" },
  { id: "kP15q815Saw", title: "The Speed of Light Explained", creator: "@SpaceExplained", category: "science", description: "299,792,458 m/s — nothing travels faster, and here's why it matters 💡🚀 #light #physics #space" },
  { id: "bJMYoj4hHqU", title: "What Causes Earthquakes?", creator: "@EarthScience", category: "science", description: "Tectonic plates grinding against each other deep underground 🌎💥 #earthquakes #geology #tectonics" },
  { id: "Xzv84ZdYlSQ", title: "How Does Your Heart Pump Blood?", creator: "@HealthMinute", category: "science", description: "4 chambers, 100,000 beats a day — your body's tireless engine ❤️🩺 #heart #anatomy #health" },
  { id: "WFCvkkDSfIU", title: "Why is Pi Important?", creator: "@MathVisuals", category: "math", description: "3.14159… — the ratio that connects circles to everything 🥧🔵 #pi #math #geometry" },
  { id: "SzJ46YA_RaA", title: "How Do Batteries Store Energy?", creator: "@TechDecoded", category: "technology", description: "Chemical reactions that push electrons through a circuit 🔋⚡ #batteries #energy #chemistry" },
  { id: "KUdQ3nh_wFM", title: "What Is Climate Change?", creator: "@EarthScience", category: "science", description: "Greenhouse gases trap heat — the science behind global warming 🌡️🌍 #climate #environment #science" },
  { id: "qCrVpRBBSvY", title: "The Roman Empire in 60 Seconds", creator: "@HistoryByte", category: "history", description: "From a small city to ruling the Mediterranean 🏟️⚔️ #rome #history #empire" },
  { id: "SV-cgBh3rGA", title: "How Do Clouds Form?", creator: "@WeatherWiz", category: "science", description: "Water vapor rises, cools, and condenses around tiny particles ☁️🌤️ #clouds #weather #atmosphere" },
  { id: "0Puv0Pss33M", title: "Variables in Programming Explained", creator: "@CodeInSeconds", category: "technology", description: "Think of them as labeled boxes that hold data 📦💾 #coding #variables #programming" },
];

const getFallbackVideos = (count = 10) => {
  // Fisher-Yates shuffle on a copy, then pick `count` videos
  const pool = [...FALLBACK_POOL];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, count).map((v) => ({
    _id: `fallback-${v.id}`,
    id: v.id,
    title: v.title,
    creator: v.creator,
    avatar: `https://via.placeholder.com/40x40?text=${v.creator.charAt(1)}${v.creator.charAt(2)}`,
    videoUrl: `https://www.youtube.com/embed/${v.id}`,
    videoType: "youtube",
    category: v.category,
    likes: `${(Math.random() * 15 + 1).toFixed(1)}K`,
    comments: String(Math.floor(Math.random() * 500 + 50)),
    shares: String(Math.floor(Math.random() * 300 + 20)),
    description: v.description,
    isVerified: true,
    isFallback: true,
  }));
};

function App() {
  const [modals, setModals] = useState({
    login: false,
    register: false,
  });
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Show random fallback YouTube videos instantly (no waiting for backend)
  const [initialFallback] = useState(() => getFallbackVideos(10));
  const [videos, setVideos] = useState(initialFallback);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [videosError, setVideosError] = useState(null);
  const [youtubeApiDisabled, setYoutubeApiDisabled] = useState(false);

  // Remove the warm-up splash screen once the app mounts
  useEffect(() => {
    const warmup = document.getElementById("warmup-screen");
    if (warmup) {
      warmup.style.transition = "opacity 0.3s ease";
      warmup.style.opacity = "0";
      setTimeout(() => warmup.remove(), 300);
    }
  }, []);

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

      // ── PHASE 2: Replace fallback with real videos ──
      if (allVideos.length > 0) {
        setVideos(allVideos);
        setIsLoadingVideos(false);
        console.log(
          `[App] ✅ Real videos loaded in ${((performance.now() - startTime) / 1000).toFixed(2)}s: ${allVideos.length} (replaced fallback)`,
        );
      } else {
        // Keep existing fallback videos — don't overwrite
        setIsLoadingVideos(false);
        console.warn("[App] No videos from backend, keeping fallback");
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
      // Keep existing fallback videos — don't overwrite
      setIsLoadingVideos(false);
    }
  }, []);

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
    const isLandingPage = location.pathname === "/";

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

    // Landing page gets its own full-screen layout — no app shell
    if (isLandingPage) {
      return (
        <>
          <LandingPage
            onOpenRegister={() => openModal("register")}
            onOpenLogin={() => openModal("login")}
          />

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
        </>
      );
    }

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
            <Route
              path="/"
              element={
                <LandingPage
                  onOpenRegister={() => openModal("register")}
                  onOpenLogin={() => openModal("login")}
                />
              }
            />
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
