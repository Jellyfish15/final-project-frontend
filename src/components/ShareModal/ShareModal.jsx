import React, { useState } from "react";
import "./ShareModal.css";

const ShareModal = ({ isOpen, onClose, video }) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !video) return null;

  const videoUrl = `${window.location.origin}${
    window.location.pathname
  }#/videos?videoId=${video._id || video.id}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(videoUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = videoUrl;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Fallback copy failed:", err);
      }
      document.body.removeChild(textArea);
    }
  };

  const shareOptions = [
    {
      name: "WhatsApp",
      icon: "💬",
      color: "#25D366",
      url: `https://wa.me/?text=${encodeURIComponent(
        `Check out this video: ${video.title}\n${videoUrl}`
      )}`,
    },
    {
      name: "Twitter",
      icon: "🐦",
      color: "#1DA1F2",
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(
        video.title
      )}&url=${encodeURIComponent(videoUrl)}`,
    },
    {
      name: "Facebook",
      icon: "📘",
      color: "#1877F2",
      url: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(
        videoUrl
      )}`,
    },
    {
      name: "LinkedIn",
      icon: "💼",
      color: "#0A66C2",
      url: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(
        videoUrl
      )}`,
    },
    {
      name: "Reddit",
      icon: "🔴",
      color: "#FF4500",
      url: `https://reddit.com/submit?url=${encodeURIComponent(
        videoUrl
      )}&title=${encodeURIComponent(video.title)}`,
    },
    {
      name: "Email",
      icon: "✉️",
      color: "#EA4335",
      url: `mailto:?subject=${encodeURIComponent(
        video.title
      )}&body=${encodeURIComponent(
        `Check out this video:\n${video.title}\n\n${videoUrl}`
      )}`,
    },
  ];

  const handleShare = (platform) => {
    window.open(platform.url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="share-modal-overlay" onClick={onClose}>
      <div className="share-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="share-modal-header">
          <h2 className="share-modal-title">Share Video</h2>
          <button
            className="share-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="share-modal-body">
          <div className="share-video-info">
            <img
              src={video.thumbnailUrl || "https://via.placeholder.com/120x80"}
              alt={video.title}
              className="share-video-thumbnail"
            />
            <div className="share-video-details">
              <h3 className="share-video-title">{video.title}</h3>
              <p className="share-video-creator">
                by {video.creator?.username || video.creator || "Unknown"}
              </p>
            </div>
          </div>

          <div className="share-link-section">
            <label className="share-link-label">Video Link</label>
            <div className="share-link-input-container">
              <input
                type="text"
                className="share-link-input"
                value={videoUrl}
                readOnly
              />
              <button
                className={`share-copy-btn ${
                  copied ? "share-copy-btn--copied" : ""
                }`}
                onClick={handleCopyLink}
              >
                {copied ? "✓ Copied!" : "Copy"}
              </button>
            </div>
          </div>

          <div className="share-options-section">
            <label className="share-options-label">Share to</label>
            <div className="share-options-grid">
              {shareOptions.map((option) => (
                <button
                  key={option.name}
                  className="share-option-btn"
                  onClick={() => handleShare(option)}
                  title={`Share on ${option.name}`}
                >
                  <div
                    className="share-option-icon"
                    style={{ backgroundColor: option.color }}
                  >
                    {option.icon}
                  </div>
                  <span className="share-option-name">{option.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
