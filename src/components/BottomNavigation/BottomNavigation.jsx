import React from "react";
import { Link, useLocation } from "react-router-dom";
import "./BottomNavigation.css";

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
