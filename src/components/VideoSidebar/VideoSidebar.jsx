import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext/AuthContext";
import "./VideoSidebar.css";
import searchIcon from "../../images/search.svg";
import profileIcon from "../../images/profile.svg";
import noodleLogo from "../../images/noodle-logo.png";

const VideoSidebar = ({ onOpenLogin, onOpenRegister }) => {
  const { isAuthenticated, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleNavigation = (path) => {
    navigate(path);
  };

  return (
    <aside className="video-sidebar">
      <div className="video-sidebar__container">
        {/* Logo */}
        <div className="video-sidebar__logo">
          <Link to="/" className="video-sidebar__logo-link">
            <img
              src={noodleLogo}
              alt="Nudl"
              className="video-sidebar__logo-icon"
            />
            <span className="video-sidebar__logo-text">Nudl</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="video-sidebar__nav">
          <Link
            to="/search"
            className={`video-sidebar__nav-item ${
              location.pathname === "/search"
                ? "video-sidebar__nav-item--active"
                : ""
            }`}
          >
            <img
              src={searchIcon}
              alt="Search"
              className="video-sidebar__icon"
            />
            <span className="video-sidebar__nav-label">Search</span>
          </Link>

          <Link
            to="/profile"
            className={`video-sidebar__nav-item ${
              location.pathname === "/profile"
                ? "video-sidebar__nav-item--active"
                : ""
            }`}
          >
            <img
              src={profileIcon}
              alt="Profile"
              className="video-sidebar__icon"
            />
            <span className="video-sidebar__nav-label">Profile</span>
          </Link>

          <Link
            to="/videos"
            className={`video-sidebar__nav-item ${
              location.pathname === "/videos"
                ? "video-sidebar__nav-item--active"
                : ""
            }`}
          >
            <span className="video-sidebar__nav-icon">🎥</span>
            <span className="video-sidebar__nav-label">Videos</span>
          </Link>
        </nav>

        {/* Auth Section */}
        <div className="video-sidebar__auth">
          {isAuthenticated ? (
            <div className="video-sidebar__user">
              <Link to="/profile" className="video-sidebar__user-info">
                <img
                  src={
                    user?.avatar || "https://via.placeholder.com/32x32?text=U"
                  }
                  alt={user?.username}
                  className="video-sidebar__user-avatar"
                />
                <span className="video-sidebar__username">
                  @{user?.username}
                </span>
              </Link>
              <button className="video-sidebar__logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="video-sidebar__auth-buttons">
              <button
                className="video-sidebar__auth-btn video-sidebar__auth-btn--login"
                onClick={onOpenLogin}
              >
                Log in
              </button>
              <button
                className="video-sidebar__auth-btn video-sidebar__auth-btn--register"
                onClick={onOpenRegister}
              >
                Sign up
              </button>
            </div>
          )}

          {/* Copyright */}
          <p className="video-sidebar__copyright">
            © 2025 Nudl. All rights reserved.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default VideoSidebar;
