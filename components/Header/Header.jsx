import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../AuthContext/AuthContext";
import "./Header.css";
import searchIcon from "../Assets/search.svg";
import profileIcon from "../Assets/profile.svg";

const Header = ({ onOpenLogin, onOpenRegister }) => {
  const location = useLocation();
  const { user, isAuthenticated, logout } = useAuth();

  return (
    <header
      className={`header ${
        location.pathname === "/videos" ? "header--transparent" : ""
      }`}
    >
      <div className="header__container">
        <div className="header__brand">
          <Link to="/videos" className="header__logo">
            <span className="header__logo-icon">🎓</span>
            <span className="header__logo-text">Nudl</span>
          </Link>
        </div>

        <div className="header__center">
          <div className="header__links">
            <Link
              to="/search"
              className={`header__link ${
                location.pathname === "/search" ? "header__link--active" : ""
              }`}
            >
              <img src={searchIcon} alt="Search" className="header__icon" />
              <span>Search</span>
            </Link>

            <Link
              to="/profile"
              className={`header__link ${
                location.pathname === "/profile" ? "header__link--active" : ""
              }`}
            >
              <img src={profileIcon} alt="Profile" className="header__icon" />
              <span>Profile</span>
            </Link>

            <Link
              to="/videos"
              className={`header__link header__link--videos ${
                location.pathname === "/videos" ? "header__link--active" : ""
              }`}
            >
              <span>🎥</span>
              <span>Videos</span>
            </Link>
          </div>
        </div>

        <div className="header__auth">
          {isAuthenticated ? (
            <div className="header__user">
              <div className="header__user-info">
                <img
                  src={
                    user?.avatar || "https://via.placeholder.com/32x32?text=U"
                  }
                  alt={user?.username}
                  className="header__user-avatar"
                />
                <span className="header__username">@{user?.username}</span>
              </div>
              <button className="header__logout-btn" onClick={logout}>
                Logout
              </button>
            </div>
          ) : (
            <div className="header__auth-buttons">
              <button
                className="header__auth-btn header__auth-btn--login"
                onClick={onOpenLogin}
              >
                Log in
              </button>
              <button
                className="header__auth-btn header__auth-btn--register"
                onClick={onOpenRegister}
              >
                Sign up
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
