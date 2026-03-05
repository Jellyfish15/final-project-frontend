import React, { useState, useRef } from "react";
import { uploadAPI } from "../../services/api";
import { API_BASE_URL } from "../../services/config";
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
  const [uploadedVideoData, setUploadedVideoData] = useState(null);
  const [isClientThumbnails, setIsClientThumbnails] = useState(false);
  const [videoUploading, setVideoUploading] = useState(false);
  const isClientThumbnailsRef = useRef(false);
  const thumbnailOptionsRef = useRef([]);

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

  // Generate thumbnails client-side using <video> + <canvas> — instant, no server needed
  const generateClientThumbnails = (file) => {
    return new Promise((resolve, reject) => {
      console.log(
        "[Thumbnails] Starting client-side generation for:",
        file.name,
        file.type,
        file.size,
      );
      const video = document.createElement("video");
      // "auto" is critical on mobile — "metadata" doesn't load frame data,
      // which means seeking produces blank canvases on iOS Safari / Android Chrome.
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = "anonymous";
      // Some mobile browsers need these attributes
      video.setAttribute("webkit-playsinline", "true");
      video.setAttribute("playsinline", "true");

      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      let settled = false;

      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      // Mobile browsers need more time for frame decode after seeking
      const FRAME_CAPTURE_DELAY = isMobile ? 400 : 150;

      const cleanup = () => {
        try {
          video.pause();
          video.removeAttribute("src");
          video.load(); // release resources
          URL.revokeObjectURL(objectUrl);
        } catch (e) {
          /* ignore */
        }
      };

      const done = (result) => {
        if (settled) return;
        settled = true;
        cleanup();
        console.log(
          "[Thumbnails] Successfully generated",
          result.length,
          "thumbnails",
        );
        resolve(result);
      };

      const fail = (err) => {
        if (settled) return;
        settled = true;
        cleanup();
        console.warn("[Thumbnails] Generation failed:", err.message);
        reject(err);
      };

      const startCapture = (duration) => {
        console.log(
          "[Thumbnails] Starting capture. Duration:",
          duration,
          "Resolution:",
          video.videoWidth,
          "x",
          video.videoHeight,
          "Mobile:",
          isMobile,
        );

        if (!duration || !isFinite(duration) || duration <= 0) {
          fail(new Error("Could not read video duration: " + duration));
          return;
        }

        // Use safe timestamps, avoiding the very start/end
        const timestamps = [
          Math.max(0.1, duration * 0.25),
          Math.max(0.2, duration * 0.5),
          Math.max(0.3, duration * 0.75),
        ];
        const thumbnails = [];
        let currentIndex = 0;

        const captureFrame = () => {
          if (currentIndex >= timestamps.length) {
            // If we got at least one thumbnail, succeed
            if (thumbnails.length > 0) {
              done(thumbnails);
            } else {
              fail(new Error("All frame captures produced blank data"));
            }
            return;
          }
          console.log(
            "[Thumbnails] Seeking to",
            timestamps[currentIndex].toFixed(2),
            "s",
          );
          video.currentTime = timestamps[currentIndex];
        };

        video.onseeked = () => {
          try {
            // Wait for the frame to actually render — mobile needs longer
            setTimeout(() => {
              try {
                const canvas = document.createElement("canvas");
                const maxWidth = 640;
                const vw = video.videoWidth || 640;
                const vh = video.videoHeight || 360;
                const scale = Math.min(1, maxWidth / vw);
                canvas.width = Math.round(vw * scale);
                canvas.height = Math.round(vh * scale);

                const ctx = canvas.getContext("2d");
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

                const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
                // Verify we got actual image data (not a blank canvas)
                if (dataUrl && dataUrl.length > 500) {
                  thumbnails.push(dataUrl);
                  console.log(
                    "[Thumbnails] Captured frame",
                    currentIndex + 1,
                    "(",
                    dataUrl.length,
                    "bytes)",
                  );
                } else {
                  console.warn(
                    "[Thumbnails] Frame",
                    currentIndex + 1,
                    "produced empty/small data, skipping",
                  );
                }

                currentIndex++;
                captureFrame();
              } catch (err) {
                // Don't fail entirely — skip this frame and try the next
                console.warn(
                  "[Thumbnails] Frame capture error, skipping:",
                  err.message,
                );
                currentIndex++;
                captureFrame();
              }
            }, FRAME_CAPTURE_DELAY);
          } catch (err) {
            fail(err);
          }
        };

        captureFrame();
      };

      // On mobile, we need enough data loaded to seek. Use canplaythrough
      // which fires when the browser estimates it can play without buffering.
      // Also listen to loadeddata as a fallback (fires when first frame is ready).
      let captureStarted = false;
      const tryStartCapture = () => {
        if (captureStarted || settled) return;
        const duration = video.duration;
        if (!duration || !isFinite(duration) || duration <= 0) return;
        captureStarted = true;
        startCapture(duration);
      };

      video.addEventListener("canplaythrough", () => {
        console.log("[Thumbnails] canplaythrough fired");
        tryStartCapture();
      });

      video.addEventListener("loadeddata", () => {
        console.log("[Thumbnails] loadeddata fired");
        // On mobile, try play+pause to "unlock" the decoder, then capture
        if (isMobile && !captureStarted) {
          const playPromise = video.play();
          if (playPromise !== undefined) {
            playPromise
              .then(() => {
                video.pause();
                console.log("[Thumbnails] Mobile play/pause unlock succeeded");
                tryStartCapture();
              })
              .catch(() => {
                console.log(
                  "[Thumbnails] Mobile play/pause failed, trying capture anyway",
                );
                tryStartCapture();
              });
          } else {
            video.pause();
            tryStartCapture();
          }
        }
      });

      // Desktop fallback — loadedmetadata is usually enough on desktop
      video.addEventListener("loadedmetadata", () => {
        console.log(
          "[Thumbnails] Video metadata loaded. Duration:",
          video.duration,
          "Resolution:",
          video.videoWidth,
          "x",
          video.videoHeight,
        );
        if (!isMobile) {
          // On desktop, give a short delay for data to buffer then start
          setTimeout(tryStartCapture, 200);
        }
      });

      video.onerror = (e) => {
        console.error("[Thumbnails] Video element error:", e, video.error);
        fail(
          new Error(
            "Failed to load video: " +
              (video.error?.message || "unknown error"),
          ),
        );
      };

      // CRITICAL: Explicitly trigger loading — many mobile browsers won't start without this
      video.load();

      // Timeout fallback — generous for slow mobile devices
      setTimeout(() => {
        fail(new Error("Thumbnail generation timed out after 30s"));
      }, 30000);
    });
  };

  const handleFileSelect = async (e) => {
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
        "Please select a valid video file (MP4, MOV, MPEG, WebM, AVI, MKV, etc.)",
      );
      return;
    }

    // Validate file size (200MB max)
    const maxSize = 200 * 1024 * 1024;
    if (file.size > maxSize) {
      alert("File size must be less than 200MB");
      return;
    }

    // Validate duration (5 minutes max) - Note: This would require a more complex check
    // For now, we'll rely on backend validation

    setSelectedFile(file);

    // Step 1: Generate thumbnails client-side (instant — no upload needed)
    setGeneratingThumbnails(true);
    setThumbnailOptions([]);
    setSelectedThumbnail(0);
    setIsClientThumbnails(false);

    try {
      const clientThumbs = await generateClientThumbnails(file);
      console.log(
        `Generated ${clientThumbs.length} client-side thumbnails instantly`,
      );
      setThumbnailOptions(clientThumbs);
      thumbnailOptionsRef.current = clientThumbs;
      setIsClientThumbnails(true);
      isClientThumbnailsRef.current = true;
    } catch (err) {
      console.warn("Client-side thumbnail generation failed:", err.message);
      // Will fall back to server-side thumbnails during upload
    } finally {
      setGeneratingThumbnails(false);
    }

    // Step 2: Upload video in background (for server storage)
    autoUploadVideo(file);
  };

  const autoUploadVideo = async (file) => {
    console.log("Uploading video to server in background...");
    setVideoUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append("video", file);

      const response = await uploadAPI.tempVideoUpload(formData, (progress) => {
        setUploadProgress(progress);
      });
      console.log("Temp upload response:", response);

      if (response.success && response.videoData) {
        setUploadedVideoData(response.videoData);

        // If client-side thumbnails failed, use server-generated ones
        if (
          !isClientThumbnailsRef.current ||
          thumbnailOptionsRef.current.length === 0
        ) {
          const resolvedThumbnails = response.videoData.thumbnailUrls.map(
            (url) => {
              if (url && !url.startsWith("http")) {
                return `${API_BASE_URL.replace(/\/api\/?$/, "")}${url}`;
              }
              return url;
            },
          );
          setThumbnailOptions(resolvedThumbnails);
          setIsClientThumbnails(false);
          console.log("Using server-generated thumbnails:", resolvedThumbnails);
        }
      } else {
        console.error("Response was not successful:", response);
        alert(
          "Failed to upload video: " + (response.message || "Unknown error"),
        );
      }
    } catch (error) {
      console.error("Auto-upload error:", error);
      console.error("Error details:", error.message);
      alert("Error uploading video: " + error.message);
    } finally {
      setVideoUploading(false);
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

  const handleTagRemove = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!uploadedVideoData) {
      alert("Please wait for video to finish uploading before submitting.");
      return;
    }

    if (!formData.title.trim()) {
      alert("Please enter a title");
      return;
    }

    try {
      setUploading(true);

      let selectedThumbnailUrl = "";

      // If using client-side thumbnails, upload the selected one to the server first
      if (isClientThumbnails && thumbnailOptions.length > 0) {
        const dataUrl = thumbnailOptions[selectedThumbnail];
        try {
          console.log("Uploading client-generated thumbnail to server...");
          const thumbnailBlob = await fetch(dataUrl).then((r) => r.blob());
          const thumbFormData = new FormData();
          thumbFormData.append(
            "thumbnail",
            thumbnailBlob,
            `thumb-${Date.now()}.jpg`,
          );

          const thumbResponse =
            await uploadAPI.uploadTempThumbnail(thumbFormData);
          if (thumbResponse.success && thumbResponse.thumbnailUrl) {
            selectedThumbnailUrl = thumbResponse.thumbnailUrl;
            console.log("Thumbnail uploaded:", selectedThumbnailUrl);
          }
        } catch (thumbErr) {
          console.warn(
            "Failed to upload client thumbnail, falling back:",
            thumbErr,
          );
        }
      }

      // Fall back to server-generated or raw thumbnailUrls
      if (!selectedThumbnailUrl) {
        selectedThumbnailUrl =
          thumbnailOptions.length > 0
            ? thumbnailOptions[selectedThumbnail]
            : uploadedVideoData.thumbnailUrls?.[0] || "";
      }

      console.log("Finalizing video with data:", {
        videoFilename: uploadedVideoData.filename,
        title: formData.title,
        selectedThumbnailUrl,
      });

      // Call finalize-video endpoint
      const finalizeData = {
        videoFilename: uploadedVideoData.cloudinary
          ? uploadedVideoData.videoUrl
          : uploadedVideoData.filename,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        tags: JSON.stringify(formData.tags),
        isPrivate: formData.isPrivate,
        selectedThumbnailUrl,
        ...(uploadedVideoData.cloudinary
          ? { cloudinary: "true", videoUrl: uploadedVideoData.videoUrl }
          : {}),
      };

      const response = await uploadAPI.finalizeVideo(finalizeData);
      console.log("Video finalize response:", response);

      if (response.success) {
        const videoData = response.video;

        setTimeout(() => {
          onUploadSuccess(videoData);
        }, 500);
      } else {
        console.error("Finalize failed with response:", response);
        alert(
          response.message || "Failed to finalize video. Please try again.",
        );
      }
    } catch (error) {
      console.error("Finalize error details:", {
        message: error.message,
        response: error.response,
        stack: error.stack,
      });

      let errorMessage = "Failed to finalize video. ";
      if (error.response?.status === 401) {
        errorMessage += "Please log in to upload videos.";
      } else if (error.response?.data?.message) {
        errorMessage += error.response.data.message;
      } else {
        errorMessage += "Please check your connection and try again.";
      }

      alert(errorMessage);
    } finally {
      setUploading(false);
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
    setUploadedVideoData(null);
    setIsClientThumbnails(false);
    isClientThumbnailsRef.current = false;
    thumbnailOptionsRef.current = [];
    setVideoUploading(false);
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
                  onClick={() => {
                    setSelectedFile(null);
                    setThumbnailOptions([]);
                    thumbnailOptionsRef.current = [];
                    setSelectedThumbnail(0);
                    setUploadedVideoData(null);
                    setIsClientThumbnails(false);
                    isClientThumbnailsRef.current = false;
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
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
                    MP4, MOV, WebM (max 200MB, 5 minutes)
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
              Generating thumbnail previews...
            </div>
          </div>
        )}
        {videoUploading && !generatingThumbnails && (
          <div className="video-upload__section">
            <div className="video-upload__generating">
              📤 Uploading video to server{uploadProgress > 0 ? ` (${uploadProgress}%)` : "..."}
              {uploadProgress >= 100 ? " — Processing video..." : " You can fill in details while waiting."}
            </div>
            {uploadProgress > 0 && (
              <div className="video-upload__progress-bar" style={{ marginTop: "8px" }}>
                <div
                  className="video-upload__progress-fill"
                  style={{ width: `${Math.min(uploadProgress, 100)}%` }}
                />
              </div>
            )}
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
            disabled={!uploadedVideoData || !formData.title.trim() || uploading}
          >
            {uploading ? (
              <>
                <LoadingSpinner size="small" />
                Finalizing...
              </>
            ) : videoUploading ? (
              <>
                <LoadingSpinner size="small" />
                Uploading Video...
              </>
            ) : !uploadedVideoData ? (
              "Select Video First"
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
