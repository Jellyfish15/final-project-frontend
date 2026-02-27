import React, { useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext/AuthContext";
import "./BottomNavigation.css";

// Navigation transition configuration
const NAV_TRANSITIONS = {
  "/videos": { type: "fade", duration: 200 },
  "/search": { type: "slide-left", duration: 250 },
  "/profile": { type: "slide-right", duration: 250 },
};

// Haptic patterns for different navigation actions
const HAPTIC_PATTERNS = {
  tabSwitch: { type: "light", duration: 10 },
  longPress: { type: "medium", duration: 25 },
  error: { type: "heavy", duration: 50 },
};

const BottomNavigation = ({ onOpenUpload }) => {
  const location = useLocation();
  const { isAuthenticated } = useAuth();
  const isVideosPage = location.pathname === "/videos";

  const navItems = [
    {
      path: "/videos",
      icon: "🎥",
      label: "Videos",
      isActive: location.pathname === "/videos",
    },
    {
      path: "/search",
      icon: "🔍",
      label: "Search",
      isActive: location.pathname === "/search",
    },
    // Upload button (only for authenticated users) — not a route, triggers modal
    ...(isAuthenticated && onOpenUpload
      ? [
          {
            action: onOpenUpload,
            icon: "➕",
            label: "Upload",
            isActive: false,
            isButton: true,
          },
        ]
      : []),
    {
      path: "/profile",
      icon: "👤",
      label: "Profile",
      isActive: location.pathname === "/profile",
    },
  ];

  return (
    <nav className={`bottom-nav ${isVideosPage ? "bottom-nav--videos" : ""}`}>
      <div className="bottom-nav__container">
        {navItems.map((item) =>
          item.isButton ? (
            <button
              key="upload"
              className="bottom-nav__item bottom-nav__item--upload"
              onClick={item.action}
            >
              <span className="bottom-nav__icon">{item.icon}</span>
              <span className="bottom-nav__label">{item.label}</span>
            </button>
          ) : (
            <Link
              key={item.path}
              to={item.path}
              className={`bottom-nav__item ${
                item.isActive ? "bottom-nav__item--active" : ""
              }`}
            >
              <span className="bottom-nav__icon">{item.icon}</span>
              <span className="bottom-nav__label">{item.label}</span>
            </Link>
          ),
        )}
      </div>
    </nav>
  );
};

export default BottomNavigation;
