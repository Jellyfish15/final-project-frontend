import React from "react";
import "./LoadingSpinner.css";

const LoadingSpinner = ({
  message = "Loading educational videos...",
  size,
}) => {
  if (size === "small") {
    return (
      <span className="loading-spinner--inline">
        <span className="spinner spinner--small" />
      </span>
    );
  }

  return (
    <div className="loading-container">
      <div className="loading-spinner">
        <div className="spinner"></div>
        <p className="loading-message">{message}</p>
      </div>
    </div>
  );
};

export default LoadingSpinner;
