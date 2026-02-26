import React, { useCallback, useMemo, useState, useEffect } from 'react';
import VideoUpload from '../VideoUpload/VideoUpload';
import './VideoUploadModal.css';

// Upload pipeline stages
const UPLOAD_STAGES = {
  IDLE: 'idle',
  SELECTING: 'selecting',
  VALIDATING: 'validating',
  COMPRESSING: 'compressing',
  UPLOADING: 'uploading',
  PROCESSING: 'processing',
  THUMBNAIL_GEN: 'generating_thumbnails',
  FINALIZING: 'finalizing',
  COMPLETE: 'complete',
  ERROR: 'error',
};

// Supported video codecs and container formats
const SUPPORTED_FORMATS = {
  'video/mp4': { codecs: ['avc1', 'hev1'], maxSize: 100 * 1024 * 1024 },
  'video/webm': { codecs: ['vp8', 'vp9', 'av01'], maxSize: 100 * 1024 * 1024 },
  'video/quicktime': { codecs: ['avc1'], maxSize: 100 * 1024 * 1024 },
};

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