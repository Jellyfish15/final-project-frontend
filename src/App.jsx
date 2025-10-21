import React, { useState, useEffect, useCallback } from "react";
import {
  HashRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Profile from "./components/Profile/Profile";
import Search from "./components/Search/Search";
import Video from "./components/Video/Video";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import BottomNavigation from "./components/BottomNavigation/BottomNavigation";
import LoginModal from "./components/LoginModal/LoginModal";
import RegisterModal from "./components/RegisterModal/RegisterModal";
import { AuthProvider } from "./components/AuthContext/AuthContext";
import { VideoProvider } from "./contexts/VideoContext";
import { getEducationalVideoFeed } from "../services/youtubeService.js";
import "./App.css";

function App() {
  const [modals, setModals] = useState({
    login: false,
    register: false,
  });

  const [videos, setVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(true);
  const [videosError, setVideosError] = useState(null);

  const loadVideos = useCallback(async () => {
    try {
      setIsLoadingVideos(true);
      setVideosError(null);
      console.log("Loading educational videos from API...");

      const educationalVideos = await getEducationalVideoFeed(10);

      if (educationalVideos && educationalVideos.length > 0) {
        setVideos(educationalVideos);
        console.log("Successfully loaded", educationalVideos.length, "videos");
      } else {
        setVideos(getFallbackVideos());
        console.warn(
          "No videos returned from YouTube API, using fallback videos"
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

  useEffect(() => {
    loadVideos();
  }, [loadVideos]);

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
      console.log("Processing login for:", userData.username);

      console.log(" User logged in:", userData);
      closeModal("login");
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const handleRegister = async (userData) => {
    try {
      console.log("Processing registration for:", userData.username);

      console.log(" User registered:", userData);
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

  return (
    <AuthProvider>
      <VideoProvider {...videoApiProps}>
        <Router>
          <div className="app">
            <Header
              onOpenLogin={() => openModal("login")}
              onOpenRegister={() => openModal("register")}
            />
            <main className="app__main">
              <Routes>
                <Route path="/" element={<Navigate to="/videos" replace />} />
                <Route path="/search" element={<Search />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/videos" element={<Video />} />
              </Routes>
            </main>
            <Footer />
            <BottomNavigation />

            <LoginModal
              isOpen={modals.login}
              onClose={() => closeModal("login")}
              onLogin={handleLogin}
              onSwitchToRegister={switchToRegister}
            />

            <RegisterModal
              isOpen={modals.register}
              onClose={() => closeModal("register")}
              onRegister={handleRegister}
              onSwitchToLogin={switchToLogin}
            />
          </div>
        </Router>
      </VideoProvider>
    </AuthProvider>
  );
}

export default App;
