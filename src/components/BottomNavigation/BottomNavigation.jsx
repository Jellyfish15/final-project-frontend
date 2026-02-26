import React, { useMemo, useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import "./BottomNavigation.css";

// Navigation transition configuration
const NAV_TRANSITIONS = {
  '/videos': { type: 'fade', duration: 200 },
  '/search': { type: 'slide-left', duration: 250 },
  '/profile': { type: 'slide-right', duration: 250 },
};

// Haptic patterns for different navigation actions
const HAPTIC_PATTERNS = {
  tabSwitch: { type: 'light', duration: 10 },
  longPress: { type: 'medium', duration: 25 },
  error: { type: 'heavy', duration: 50 },
};

const BottomNavigation = () => {
  const location = useLocation();
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
        {navItems.map((item) => (
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
        ))}
      </div>
    </nav>
  );
};

export default BottomNavigation;
