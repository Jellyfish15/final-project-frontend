import React, { useState, useRef } from "react";
import { uploadAPI } from "../../services/api";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import "./VideoUpload.css";
import { useEffect } from "react";

const VideoUpload = ({ onUploadSuccess, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "education",
    tags: [],
    isPrivate: false,
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [tagInput, setTagInput] = useState("");
  const fileInputRef = useRef(null);
  const videoPreviewRef = useRef(null);
  const [thumbnailOptions, setThumbnailOptions] = useState([]);
  const [selectedThumbnail, setSelectedThumbnail] = useState(0);
  const [generatingThumbnails, setGeneratingThumbnails] = useState(false);

  const categories = [
    { value: "education", label: "Education" },
    { value: "science", label: "Science" },
    { value: "math", label: "Mathematics" },
    { value: "coding", label: "Programming" },
    { value: "language", label: "Language Learning" },
    { value: "history", label: "History" },
    { value: "art", label: "Art & Design" },
    { value: "music", label: "Music" },
    { value: "sports", label: "Sports" },
    { value: "cooking", label: "Cooking" },
    { value: "technology", label: "Technology" },
    { value: "business", label: "Business" },
    { value: "health", label: "Health & Wellness" },
    { value: "other", label: "Other" },
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "video/mp4",
      "video/mpeg",
      "video/quicktime",
      "video/webm",
      "video/x-msvideo", // AVI
      "video/x-matroska", // MKV
      "video/ogg",
      "video/3gpp",
      "video/x-m4v",
    ];

    // Also check file extension for .mov files (sometimes browsers don't set the correct MIME type)
    const fileName = file.name.toLowerCase();
    const hasValidExtension =
      /\.(mp4|mov|mpeg|mpg|webm|avi|mkv|ogg|3gp|m4v)$/.test(fileName);

    if (!allowedTypes.includes(file.type) && !hasValidExtension) {
      alert(
        "Please select a valid video file (MP4, MOV, MPEG, WebM, AVI, MKV, etc.)"
      );
      return;
    }

    // Validate file size (100MB max)
    const maxSize = 100 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size must be less than 100MB");
      return;
    }

    // Validate duration (5 minutes max) - Note: This would require a more complex check
    // For now, we'll rely on backend validation

    setSelectedFile(file);
    // Generate thumbnails after file is selected
    generateThumbnails(file);
  };

  const generateThumbnails = async (videoFile) => {
    setGeneratingThumbnails(true);
    setThumbnailOptions([]);
    setSelectedThumbnail(0);

    try {
      const video = document.createElement("video");
      video.preload = "metadata";

      const objectURL = URL.createObjectURL(videoFile);
      video.src = objectURL;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = resolve;
        video.onerror = reject;
      });

      const duration = video.duration;
      const thumbnails = [];

      // Generate 3 thumbnails at 25%, 50%, and 75% of video duration
      const timePoints = [0.25, 0.5, 0.75];

      for (const timePoint of timePoints) {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        // Set canvas size (16:9 aspect ratio) - larger resolution to capture more detail
        const canvasWidth = 1280;
        const canvasHeight = 720;
        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        // Seek to specific time
        video.currentTime = duration * timePoint;

        await new Promise((resolve) => {
          video.onseeked = resolve;
        });

        // First, draw blurred background (stretched to fill canvas)
        ctx.filter = "blur(20px)";
        ctx.drawImage(video, 0, 0, canvasWidth, canvasHeight);

        // Reset filter for main image
        ctx.filter = "none";

        // Calculate dimensions to fit entire video while maintaining aspect ratio
        const videoAspectRatio = video.videoWidth / video.videoHeight;
        const canvasAspectRatio = canvasWidth / canvasHeight;

        let drawWidth, drawHeight, drawX, drawY;

        if (videoAspectRatio > canvasAspectRatio) {
          // Video is wider - fit to width
          drawWidth = canvasWidth;
          drawHeight = canvasWidth / videoAspectRatio;
          drawX = 0;
          drawY = (canvasHeight - drawHeight) / 2;
        } else {
          // Video is taller - fit to height
          drawHeight = canvasHeight;
          drawWidth = canvasHeight * videoAspectRatio;
          drawX = (canvasWidth - drawWidth) / 2;
          drawY = 0;
        }

        // Draw the full video frame centered on top of blurred background
        ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);

        // Convert canvas to blob
        const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.8);
        thumbnails.push(thumbnailDataUrl);
      }

      setThumbnailOptions(thumbnails);
      setSelectedThumbnail(0); // Select first thumbnail by default

      // Clean up
      URL.revokeObjectURL(objectURL);
    } catch (error) {
      console.error("Error generating thumbnails:", error);
      alert("Failed to generate thumbnails. You can still upload the video.");
    } finally {
      setGeneratingThumbnails(false);
    }
  };

  const handleThumbnailSelect = (index) => {
    setSelectedThumbnail(index);
  };

  const handleTagAdd = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();

      if (tag && !formData.tags.includes(tag) && formData.tags.length < 10) {
        setFormData((prev) => ({
          ...prev,
          tags: [...prev.tags, tag],
        }));
        setTagInput("");
      }
    }
  };
  // Removed misplaced closing tags and stray JSX. Only one export default at the end.

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!selectedFile) {
      alert("Please select a video file");
      return;
    }

    if (!formData.title.trim()) {
      alert("Please enter a title");
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      const uploadFormData = new FormData();
      uploadFormData.append("video", selectedFile);
      uploadFormData.append("title", formData.title.trim());
      uploadFormData.append("description", formData.description.trim());
      uploadFormData.append("category", formData.category);
      uploadFormData.append("tags", JSON.stringify(formData.tags));
      uploadFormData.append("isPrivate", formData.isPrivate);

      // Store selected thumbnail index for later use
      // We'll upload the thumbnail separately after the video is uploaded
      const selectedThumbnailData =
        thumbnailOptions.length > 0
          ? thumbnailOptions[selectedThumbnail]
          : null;

      // Simulate upload progress (in real implementation, you'd use XMLHttpRequest or a library like axios)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
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

      console.log("Video upload response:", response);

      if (response.success) {
        let videoData = response.video;

        console.log("Video data from response:", videoData);
        console.log("Video ID:", videoData._id || videoData.id);

        // If we have a thumbnail and the video was uploaded successfully, upload thumbnail separately
        const videoId = videoData._id || videoData.id;
        if (selectedThumbnailData && videoId) {
          try {
            const thumbnailBlob = await (
              await fetch(selectedThumbnailData)
            ).blob();
            const thumbnailFormData = new FormData();
            thumbnailFormData.append(
              "thumbnail",
              thumbnailBlob,
              "thumbnail.jpg"
            );

            console.log("Uploading thumbnail for video ID:", videoId);

            const thumbnailResponse = await uploadAPI.uploadThumbnail(
              videoId,
              thumbnailFormData
            );

            console.log("Thumbnail upload response:", thumbnailResponse);

            // Update video data with the thumbnail URL from backend
            if (thumbnailResponse.success && thumbnailResponse.thumbnailUrl) {
              videoData = {
                ...videoData,
                thumbnailUrl: thumbnailResponse.thumbnailUrl,
                thumbnail: thumbnailResponse.thumbnailUrl,
              };
              console.log("Updated video data with thumbnail:", videoData);
            } else {
              console.warn(
                "Thumbnail upload succeeded but no thumbnailUrl returned:",
                thumbnailResponse
              );
            }
          } catch (thumbnailError) {
            console.error("Thumbnail upload error:", thumbnailError);
            // Don't fail the whole upload if thumbnail fails
          }
        }

        setTimeout(() => {
          onUploadSuccess(videoData);
        }, 500);
      } else {
        alert(response.message || "Upload failed");
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "education",
      tags: [],
      isPrivate: false,
    });
    setSelectedFile(null);
    setTagInput("");
    setUploadProgress(0);
    setThumbnailOptions([]);
    setSelectedThumbnail(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
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
                    <div className="video-upload__file-name">
                      {selectedFile.name}
                    </div>
                    <div className="video-upload__file-size">
                      {formatFileSize(selectedFile.size)}
                    </div>
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
                  accept="video/mp4,video/mpeg,video/quicktime,video/webm,video/x-msvideo,video/x-matroska,video/ogg,video/3gpp,video/x-m4v,.mp4,.mov,.mpeg,.mpg,.webm,.avi,.mkv,.ogg,.3gp,.m4v"
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
        {/* Thumbnail selection UI */}
        {thumbnailOptions.length > 0 && (
          <div className="video-upload__section">
            <label className="video-upload__label">
              Select Thumbnail {generatingThumbnails && "(Generating...)"}
            </label>
            <div className="video-upload__thumbnail-grid">
              {thumbnailOptions.map((thumbUrl, index) => (
                <div
                  key={index}
                  className={`video-upload__thumbnail-option ${
                    selectedThumbnail === index ? "selected" : ""
                  }`}
                  onClick={() => handleThumbnailSelect(index)}
                >
                  <img
                    src={thumbUrl}
                    alt={`Thumbnail option ${index + 1}`}
                    className="video-upload__thumbnail-image"
                  />
                  {selectedThumbnail === index && (
                    <div className="video-upload__thumbnail-checkmark">✓</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        {generatingThumbnails && (
          <div className="video-upload__section">
            <div className="video-upload__generating">
              Generating thumbnail options...
            </div>
          </div>
        )}
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
            {categories.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>
        {/* Tags */}
        <div className="video-upload__section">
          <label className="video-upload__label">Tags (max 10)</label>
          <div className="video-upload__tags">
            {formData.tags.map((tag) => (
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
              "Upload Video"
            )}
          </button>
        </div>
      </form>
    </div>
  );
  // Removed duplicate and stray code blocks. Component ends here.
};

export default VideoUpload;
