import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext/AuthContext";
import "./Sidebar.css";
import searchIcon from "../../images/search.svg";
import profileIcon from "../../images/profile.svg";
import noodleLogo from "../../images/noodle-logo.png";

// Sidebar animation and responsive breakpoints
const SIDEBAR_BREAKPOINTS = {
  mobile: 768,
  tablet: 1024,
  desktop: 1280,
};

const SIDEBAR_ANIMATION_MS = 300;
const SIDEBAR_SWIPE_THRESHOLD = 50;

const Sidebar = ({
  onOpenLogin,
  onOpenRegister,
  onOpenUpload,
  className = "",
}) => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <aside
      className={`sidebar ${
        location.pathname === "/videos" ? "sidebar--transparent" : ""
      } ${className}`}
    >
      <div className="sidebar__container">
        <div className="sidebar__brand">
          <Link to="/videos" className="sidebar__logo">
            <img src={noodleLogo} alt="Nudl" className="sidebar__logo-icon" />
            <span className="sidebar__logo-text">Nudl</span>
          </Link>
        </div>

        <div className="sidebar__center">
          <div className="sidebar__links">
            <Link
              to="/search"
              className={`sidebar__link ${
                location.pathname === "/search" ? "sidebar__link--active" : ""
              }`}
            >
              <img src={searchIcon} alt="Search" className="sidebar__icon" />
              <span>Search</span>
            </Link>

            <Link
              to="/profile"
              className={`sidebar__link ${
                location.pathname === "/profile" ? "sidebar__link--active" : ""
              }`}
            >
              <img src={profileIcon} alt="Profile" className="sidebar__icon" />
              <span>Profile</span>
            </Link>

            <Link
              to="/videos"
              className={`sidebar__link sidebar__link--videos ${
                location.pathname === "/videos" ? "sidebar__link--active" : ""
              }`}
            >
              <span>🎥</span>
              <span>Videos</span>
            </Link>

            {isAuthenticated && onOpenUpload && (
              <button
                className="sidebar__link sidebar__link--upload"
                onClick={onOpenUpload}
              >
                <span>➕</span>
                <span>Upload</span>
              </button>
            )}
          </div>
        </div>

        <div className="sidebar__auth">
          {isAuthenticated ? (
            <div className="sidebar__user">
              <Link to="/profile" className="sidebar__user-info">
                <img
                  src={
                    user?.avatar || "https://via.placeholder.com/32x32?text=U"
                  }
                  alt={user?.username}
                  className="sidebar__user-avatar"
                />
                <span className="sidebar__username">@{user?.username}</span>
              </Link>
              <button className="sidebar__logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="sidebar__auth-buttons">
              <button
                className="sidebar__auth-btn sidebar__auth-btn--login"
                onClick={onOpenLogin}
              >
                Log in
              </button>
              <button
                className="sidebar__auth-btn sidebar__auth-btn--register"
                onClick={onOpenRegister}
              >
                Sign up
              </button>
            </div>
          )}

          {/* Copyright */}
          <p className="sidebar__copyright">
            © 2025 Nudl. All rights reserved.
          </p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
