import React from 'react';
import VideoUpload from '../VideoUpload/VideoUpload';
import './VideoUploadModal.css';

const VideoUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  if (!isOpen) return null;

  const handleUploadSuccess = (video) => {
    onUploadSuccess(video);
    onClose();
  };

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div className="video-upload-modal" onClick={handleOverlayClick}>
      <VideoUpload
        onUploadSuccess={handleUploadSuccess}
        onCancel={onClose}
      />
    </div>
  );
};

export default VideoUploadModal;