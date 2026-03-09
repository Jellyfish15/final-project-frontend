import React, { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext/AuthContext";
import { useVideo } from "../../contexts/useVideo";
import noodleLogo from "../../images/noodle-logo.png";
import "./LandingPage.css";

const SUBJECTS = [
  { emoji: "🧮", name: "Math" },
  { emoji: "🧬", name: "Science" },
  { emoji: "📜", name: "History" },
  { emoji: "💻", name: "Coding" },
  { emoji: "🎨", name: "Art" },
  { emoji: "🌍", name: "Geography" },
  { emoji: "📖", name: "Literature" },
  { emoji: "🎵", name: "Music" },
];

const LandingPage = ({ onOpenRegister, onOpenLogin }) => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();
  const { videos, setVideoById } = useVideo();
  const heroVideoRef = useRef(null);

  // Pick a random video from the feed to feature in the phone mockup
  const previewVideo = useMemo(() => {
    if (!videos || videos.length === 0) return null;
    return videos[Math.floor(Math.random() * videos.length)];
  }, [videos]);

  // Build a YouTube thumbnail URL for the preview
  const previewThumbnail = useMemo(() => {
    if (!previewVideo) return null;
    if (previewVideo.videoType === "youtube") {
      const ytId = previewVideo.id || previewVideo._id?.replace("fallback-", "");
      return `https://img.youtube.com/vi/${ytId}/0.jpg`;
    }
    if (previewVideo.thumbnailUrl) return previewVideo.thumbnailUrl;
    return null;
  }, [previewVideo]);

  // Redirect authenticated users straight to /videos
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/videos", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleStartWatching = () => {
    navigate("/videos");
  };

  if (isLoading) return null; // Wait for auth check
  if (isAuthenticated) return null; // Will redirect

  return (
    <div className="landing">
      {/* ── Hero (full viewport) ────────────────────────────── */}
      <section className="landing__hero">
        <div className="landing__hero-bg" />

        {/* Logo — top-left corner */}
        <div className="landing__logo">
          <img
            src={noodleLogo}
            alt="Nudl logo"
            className="landing__logo-icon"
          />
          <span className="landing__logo-text">Nudl</span>
        </div>

        {/* Centered CTA block */}
        <div className="landing__hero-center">
          <h1 className="landing__headline">
            Learn anything in{" "}
            <span className="landing__accent">60 seconds</span>
          </h1>
          <p className="landing__subheadline">
            Short educational videos on every subject — swipe, learn, repeat.
          </p>

          <div className="landing__cta-group">
            <button
              className="landing__cta landing__cta--primary"
              onClick={handleStartWatching}
            >
              Start Watching
            </button>
            <button
              className="landing__cta landing__cta--secondary"
              onClick={onOpenRegister}
            >
              Create Account
            </button>
          </div>

          <p className="landing__login-hint">
            Already have an account?{" "}
            <button className="landing__link-btn" onClick={onOpenLogin}>
              Log in
            </button>
          </p>
        </div>

        {/* Phone mockup — shows a real video from the feed */}
        <div
          className="landing__phone-mockup landing__phone-mockup--interactive"
          onClick={() => {
            if (previewVideo) {
              const videoId = previewVideo._id || previewVideo.id;
              setVideoById(videoId);
            }
            navigate("/videos");
          }}
        >
          <div className="landing__phone-frame">
            <div className="landing__phone-screen">
              <div className="landing__phone-content">
                {previewThumbnail ? (
                  <img
                    className="landing__phone-thumbnail"
                    src={previewThumbnail}
                    alt={previewVideo?.title || "Video preview"}
                  />
                ) : (
                  <div className="landing__phone-video-placeholder">
                    <span className="landing__phone-play">▶</span>
                  </div>
                )}
                <div className="landing__phone-play-badge">▶</div>
                <div className="landing__phone-overlay">
                  <span className="landing__phone-title">
                    {previewVideo?.title || "Educational Videos"}
                  </span>
                  <span className="landing__phone-subject">
                    {previewVideo?.category
                      ? previewVideo.category.charAt(0).toUpperCase() +
                        previewVideo.category.slice(1)
                      : "Explore"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Subjects ticker ─────────────────────────────────── */}
      <section className="landing__subjects">
        <h2 className="landing__section-title">Explore every subject</h2>
        <div className="landing__subjects-grid">
          {SUBJECTS.map((s) => (
            <div key={s.name} className="landing__subject-card">
              <span className="landing__subject-emoji">{s.emoji}</span>
              <span className="landing__subject-name">{s.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────── */}
      <section className="landing__features">
        <div className="landing__feature">
          <span className="landing__feature-icon">📱</span>
          <h3 className="landing__feature-title">Swipe to learn</h3>
          <p className="landing__feature-desc">
            TikTok-style feed of bite-sized educational content. Just swipe up
            for the next lesson.
          </p>
        </div>
        <div className="landing__feature">
          <span className="landing__feature-icon">🎬</span>
          <h3 className="landing__feature-title">Create &amp; share</h3>
          <p className="landing__feature-desc">
            Upload your own educational videos and build a following. Share what
            you know with the world.
          </p>
        </div>
        <div className="landing__feature">
          <span className="landing__feature-icon">🧠</span>
          <h3 className="landing__feature-title">Smart feed</h3>
          <p className="landing__feature-desc">
            Our algorithm learns what you like and serves you the most relevant
            content across 17+ subjects.
          </p>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────── */}
      <section className="landing__bottom-cta">
        <h2 className="landing__bottom-headline">Ready to start learning?</h2>
        <p className="landing__bottom-sub">
          Join Nudl today — it's completely free.
        </p>
        <div className="landing__cta-group">
          <button
            className="landing__cta landing__cta--primary"
            onClick={onOpenRegister}
          >
            Sign Up Free
          </button>
          <button
            className="landing__cta landing__cta--ghost"
            onClick={handleStartWatching}
          >
            Browse without account
          </button>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="landing__footer">
        <span className="landing__footer-text">
          © {new Date().getFullYear()} Nudl · Educational Video Platform
        </span>
      </footer>
    </div>
  );
};

export default LandingPage;
