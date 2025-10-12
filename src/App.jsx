import React, { useState } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Profile from "../components/Profile/Profile";
import Search from "../components/Search/Search";
import Video from "../components/Video/Video";
import Header from "../components/Header/Header";
import Footer from "../components/Footer/Footer";
import LoginModal from "../components/LoginModal/LoginModal";
import RegisterModal from "../components/RegisterModal/RegisterModal";
import { AuthProvider } from "../components/AuthContext/AuthContext";
import { VideoProvider } from "../components/VideoContext/VideoContext";
import "./App.css";

function App() {
  const [modals, setModals] = useState({
    login: false,
    register: false,
  });

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

  const handleLogin = (userData) => {
    console.log("User logged in:", userData);
    closeModal("login");
  };

  const handleRegister = (userData) => {
    console.log("User registered:", userData);
    closeModal("register");
  };

  return (
    <AuthProvider>
      <VideoProvider>
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

            {/* Modals */}
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
