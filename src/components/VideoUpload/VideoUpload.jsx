import React, { useState, useRef } from 'react';
import { uploadAPI } from '../../services/api';
import LoadingSpinner from '../LoadingSpinner/LoadingSpinner';
import './VideoUpload.css';

const VideoUpload = ({ onUploadSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'education',
    tags: [],
    isPrivate: false
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tagInput, setTagInput] = useState('');
  const fileInputRef = useRef(null);

  const categories = [
    { value: 'education', label: 'Education' },
    { value: 'science', label: 'Science' },
    { value: 'math', label: 'Mathematics' },
    { value: 'coding', label: 'Programming' },
    { value: 'language', label: 'Language Learning' },
    { value: 'history', label: 'History' },
    { value: 'art', label: 'Art & Design' },
    { value: 'music', label: 'Music' },
    { value: 'sports', label: 'Sports' },
    { value: 'cooking', label: 'Cooking' },
    { value: 'technology', label: 'Technology' },
    { value: 'business', label: 'Business' },
    { value: 'health', label: 'Health & Wellness' },
    { value: 'other', label: 'Other' }
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['video/mp4', 'video/mpeg', 'video/quicktime', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      alert('Please select a valid video file (MP4, MPEG, MOV, or WebM)');
      return;
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File size must be less than 100MB');
      return;
    }

    // Validate duration (5 minutes max) - Note: This would require a more complex check
    // For now, we'll rely on backend validation

    setSelectedFile(file);
  };

  const handleTagAdd = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      
      if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, tag]
        }));
        setTagInput('');
      }
    }
  };

  const handleTagRemove = (tagToRemove) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert('Please select a video file');
      return;
    }

    if (!formData.title.trim()) {
      alert('Please enter a title');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadFormData = new FormData();
      uploadFormData.append('video', selectedFile);
      uploadFormData.append('title', formData.title.trim());
      uploadFormData.append('description', formData.description.trim());
      uploadFormData.append('category', formData.category);
      uploadFormData.append('tags', JSON.stringify(formData.tags));
      uploadFormData.append('isPrivate', formData.isPrivate);

      // Simulate upload progress (in real implementation, you'd use XMLHttpRequest or a library like axios)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return prev;
          }
          return prev + Math.random() * 10;
        });
      }, 500);

      const response = await uploadAPI.uploadVideo(uploadFormData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.success) {
        setTimeout(() => {
          onUploadSuccess(response.video);
        }, 500);
      } else {
        alert(response.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'education',
      tags: [],
      isPrivate: false
    });
    setSelectedFile(null);
    setTagInput('');
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCancel = () => {
    resetForm();
    onCancel();
  };

  return (
    <div className="video-upload">
      <div className="video-upload__header">
        <h2 className="video-upload__title">Upload New Video</h2>
        <button 
          className="video-upload__close"
          onClick={handleCancel}
          disabled={uploading}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="video-upload__form">
        {/* File Selection */}
        <div className="video-upload__section">
          <label className="video-upload__label">Video File</label>
          <div className="video-upload__file-area">
            {selectedFile ? (
              <div className="video-upload__file-selected">
                <div className="video-upload__file-info">
                  <div className="video-upload__file-icon">🎥</div>
                  <div className="video-upload__file-details">
                    <div className="video-upload__file-name">{selectedFile.name}</div>
                    <div className="video-upload__file-size">{formatFileSize(selectedFile.size)}</div>
                  </div>
                </div>
                <button
                  type="button"
                  className="video-upload__file-remove"
                  onClick={() => setSelectedFile(null)}
                  disabled={uploading}
                >
                  Remove
                </button>
              </div>
            ) : (
              <div className="video-upload__file-drop">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/mpeg,video/quicktime,video/webm"
                  onChange={handleFileSelect}
                  className="video-upload__file-input"
                  disabled={uploading}
                />
                <div className="video-upload__file-content">
                  <div className="video-upload__file-icon">📁</div>
                  <div className="video-upload__file-text">
                    Click to select video file
                  </div>
                  <div className="video-upload__file-subtext">
                    MP4, MOV, WebM (max 100MB, 5 minutes)
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Title */}
        <div className="video-upload__section">
          <label htmlFor="title" className="video-upload__label">
            Title *
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            className="video-upload__input"
            maxLength={150}
            placeholder="Enter video title..."
            disabled={uploading}
            required
          />
          <div className="video-upload__char-count">
            {formData.title.length}/150
          </div>
        </div>

        {/* Description */}
        <div className="video-upload__section">
          <label htmlFor="description" className="video-upload__label">
            Description
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            className="video-upload__textarea"
            rows={4}
            maxLength={2000}
            placeholder="Describe your video content..."
            disabled={uploading}
          />
          <div className="video-upload__char-count">
            {formData.description.length}/2000
          </div>
        </div>

        {/* Category */}
        <div className="video-upload__section">
          <label htmlFor="category" className="video-upload__label">
            Category *
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="video-upload__select"
            disabled={uploading}
            required
          >
            {categories.map(cat => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="video-upload__section">
          <label className="video-upload__label">
            Tags (max 10)
          </label>
          <div className="video-upload__tags">
            {formData.tags.map(tag => (
              <span key={tag} className="video-upload__tag">
                #{tag}
                <button
                  type="button"
                  onClick={() => handleTagRemove(tag)}
                  className="video-upload__tag-remove"
                  disabled={uploading}
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleTagAdd}
            className="video-upload__input"
            placeholder="Type tag and press Enter..."
            disabled={uploading || formData.tags.length >= 10}
          />
        </div>

        {/* Privacy */}
        <div className="video-upload__section">
          <label className="video-upload__checkbox-label">
            <input
              type="checkbox"
              name="isPrivate"
              checked={formData.isPrivate}
              onChange={handleInputChange}
              className="video-upload__checkbox"
              disabled={uploading}
            />
            Make this video private
          </label>
        </div>

        {/* Upload Progress */}
        {uploading && (
          <div className="video-upload__progress">
            <div className="video-upload__progress-label">
              Uploading... {Math.round(uploadProgress)}%
            </div>
            <div className="video-upload__progress-bar">
              <div 
                className="video-upload__progress-fill"
                style={{ width: `${uploadProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="video-upload__actions">
          <button
            type="button"
            onClick={handleCancel}
            className="video-upload__button video-upload__button--secondary"
            disabled={uploading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="video-upload__button video-upload__button--primary"
            disabled={!selectedFile || !formData.title.trim() || uploading}
          >
            {uploading ? (
              <>
                <LoadingSpinner size="small" />
                Uploading...
              </>
            ) : (
              'Upload Video'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default VideoUpload;