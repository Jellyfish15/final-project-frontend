import React from "react";
import "./VideoLoader.css";

const VideoLoader = ({ message = "Loading video..." }) => {
  return (
    <div className="video-loader">
      <div className="video-loader__content">
        <div className="video-loader__spinner"></div>
        <p className="video-loader__message">{message}</p>
      </div>
    </div>
  );
};

export default VideoLoader;
