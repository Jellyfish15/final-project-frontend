import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../AuthContext/AuthContext";
import { usersAPI, videosAPI, uploadAPI } from "../../services/api";
import LoadingSpinner from "../LoadingSpinner/LoadingSpinner";
import VideoUploadModal from "../VideoUploadModal/VideoUploadModal";
import VideoSidebar from "../VideoSidebar/VideoSidebar";
import "./Profile.css";

const Profile = ({ onOpenLogin, onOpenRegister }) => {
  const { user, isAuthenticated, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("videos");
  const [userVideos, setUserVideos] = useState([]);
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // Store video ID to delete
  const [deleting, setDeleting] = useState(false);
  const [profileStats, setProfileStats] = useState({
    videoCount: 0,
    totalLikes: 0,
    followersCount: 0,
    followingCount: 0,
  });
  const [profileData, setProfileData] = useState({
    username: "",
    displayName: "",
    description: "",
    avatar: "",
  });

  // Initialize profile data when user changes
  useEffect(() => {
    if (user) {
      setProfileData({
        username: user.username || "",
        displayName: user.displayName || "",
        description: user.description || "",
        avatar: user.avatar || "",
      });
    }
  }, [user]);

  // Load user videos on component mount
  useEffect(() => {
    if (isAuthenticated && user) {
      loadUserVideos();
    }
  }, [isAuthenticated, user]);

  // Reload videos when user returns to the profile page
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated && user) {
        loadUserVideos();
      }
    };

    const handleFocus = () => {
      if (isAuthenticated && user) {
        loadUserVideos();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
    };
  }, [isAuthenticated, user]);

  const loadUserVideos = async () => {
    try {
      setIsLoadingVideos(true);

      // Load videos and user stats in parallel
      const [videosResponse, userStatsResponse] = await Promise.allSettled([
        uploadAPI.getMyVideos(),
        user?._id ? usersAPI.getProfile(user._id) : Promise.resolve(null),
      ]);

      // Process videos
      if (
        videosResponse.status === "fulfilled" &&
        videosResponse.value?.success
      ) {
        const response = videosResponse.value;
        console.log("getMyVideos response:", response);

        // Process thumbnail URLs similar to Search.jsx
        const processedVideos = response.videos.map((video) => {
          const processedVideo = { ...video };

          // Process thumbnail URL
          let thumbnailUrl = video.thumbnailUrl || video.thumbnail;

          console.log(`Processing video "${video.title}":`, {
            original: video.thumbnailUrl,
            thumbnail: video.thumbnail,
            final: thumbnailUrl,
          });

          if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
            const backendURL = "http://localhost:5000";
            thumbnailUrl = thumbnailUrl.startsWith("/api/")
              ? thumbnailUrl.replace("/api/", "/")
              : thumbnailUrl;
            thumbnailUrl = `${backendURL}${thumbnailUrl}`;
          }

          processedVideo.thumbnailUrl = thumbnailUrl;
          console.log(
            `Final thumbnail URL for "${video.title}":`,
            thumbnailUrl
          );

          return processedVideo;
        });

        setUserVideos(processedVideos);

        // Calculate stats from videos
        const totalLikes = processedVideos.reduce(
          (sum, video) => sum + (video.likes || 0),
          0
        );
        const videoCount = processedVideos.length;

        // Get follower/following counts from user profile
        let followersCount = 0;
        let followingCount = 0;

        if (
          userStatsResponse.status === "fulfilled" &&
          userStatsResponse.value?.success
        ) {
          const userProfile = userStatsResponse.value.user;
          followersCount = userProfile.followers?.length || 0;
          followingCount = userProfile.following?.length || 0;
        }

        setProfileStats({
          videoCount,
          totalLikes,
          followersCount,
          followingCount,
        });
      }
    } catch (error) {
      console.error("Error loading user videos:", error);
    } finally {
      setIsLoadingVideos(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfileData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file
    if (!file.type.startsWith("image/")) {
      alert("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      // 5MB limit
      alert("Image size must be less than 5MB");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append("avatar", file);

      const response = await uploadAPI.uploadAvatar(formData);
      if (response.success) {
        // Update local state
        setProfileData((prev) => ({
          ...prev,
          avatar: response.avatarUrl,
        }));

        // Update global auth context
        await updateUser({ avatar: response.avatarUrl });

        alert("Avatar updated successfully!");
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      alert("Failed to upload avatar. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveProfile = async () => {
    try {
      setUploading(true);

      // Only send fields that can be updated and are not empty
      const updateData = {};

      if (profileData.displayName && profileData.displayName.trim()) {
        updateData.displayName = profileData.displayName.trim();
      }

      if (profileData.description !== undefined) {
        updateData.description = profileData.description.trim();
      }

      // Only include username if it's changed and not empty
      if (profileData.username && profileData.username !== user.username) {
        updateData.username = profileData.username.trim();
      }

      console.log("Sending profile update:", updateData);

      const result = await updateUser(updateData);
      if (result.success) {
        setIsEditing(false);
        alert("Profile updated successfully!");
      } else {
        console.error("Update failed:", result.message);
        alert(result.message || "Failed to update profile");
      }
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteVideo = async (videoId) => {
    setDeleting(true);
    try {
      await uploadAPI.deleteVideo(videoId);

      // Remove video from state
      setUserVideos((prev) => prev.filter((video) => video._id !== videoId));
      setDeleteConfirm(null);

      console.log("Video deleted successfully");
    } catch (error) {
      console.error("Failed to delete video:", error);
      alert("Failed to delete video. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelEdit = () => {
    // Reset to original user data
    if (user) {
      setProfileData({
        username: user.username || "",
        displayName: user.displayName || "",
        description: user.description || "",
        avatar: user.avatar || "",
      });
    }
    setIsEditing(false);
  };

  const handleUploadSuccess = (video) => {
    // Process thumbnail URL before adding to list
    let thumbnailUrl = video.thumbnailUrl || video.thumbnail;

    if (thumbnailUrl && !thumbnailUrl.startsWith("http")) {
      const backendURL = "http://localhost:5000";
      thumbnailUrl = thumbnailUrl.startsWith("/api/")
        ? thumbnailUrl.replace("/api/", "/")
        : thumbnailUrl;
      thumbnailUrl = `${backendURL}${thumbnailUrl}`;
    }

    const processedVideo = {
      ...video,
      thumbnailUrl: thumbnailUrl,
    };

    // Add the new video to the list
    setUserVideos((prev) => [processedVideo, ...prev]);
    setShowUploadModal(false);

    // Reload videos from backend to ensure we have the latest data
    setTimeout(() => {
      loadUserVideos();
    }, 1000);
  };

  const handleVideoClick = async (video) => {
    console.log("[Profile] Video clicked:", {
      id: video._id,
      title: video.title,
    });
    
    try {
      // Fetch the profile feed (all profile videos + 10 similar videos)
      const response = await videosAPI.getProfileFeed(user.username, 10);
      
      if (response.success && response.videos) {
        console.log("[Profile] Loaded profile feed:", {
          totalVideos: response.videos.length,
          userVideos: response.feedInfo.userVideos,
          similarVideos: response.feedInfo.similarVideos,
        });
        
        // Find the clicked video's index in the feed
        const videoIndex = response.videos.findIndex(
          v => (v.id || v._id) === video._id
        );
        
        // Navigate to videos page with custom feed
        navigate(`/videos?videoId=${video._id}&feedType=profile&username=${user.username}`);
      } else {
        // Fallback to simple navigation if feed fetch fails
        navigate(`/videos?videoId=${video._id}`);
      }
    } catch (error) {
      console.error("[Profile] Error loading profile feed:", error);
      // Fallback to simple navigation
      navigate(`/videos?videoId=${video._id}`);
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + "M";
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + "K";
    }
    return num.toString();
  };

  if (!isAuthenticated) {
    return (
      <div className="profile">
        <div className="profile__container">
          <div className="profile__no-auth">
            <h2>Please log in to view your profile</h2>
            <p>You need to be logged in to access profile features.</p>
            <div className="profile__auth-buttons">
              <button
                className="profile__auth-btn profile__auth-btn--login"
                onClick={onOpenLogin}
              >
                Log In
              </button>
              <button
                className="profile__auth-btn profile__auth-btn--signup"
                onClick={onOpenRegister}
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>

        {/* Bottom navigation for mobile */}
        <VideoSidebar
          onOpenLogin={onOpenLogin}
          onOpenRegister={onOpenRegister}
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="profile">
        <div className="profile__container">
          <LoadingSpinner />
        </div>

        {/* Bottom navigation for mobile */}
        <VideoSidebar
          onOpenLogin={onOpenLogin}
          onOpenRegister={onOpenRegister}
        />
      </div>
    );
  }

  return (
    <div className="profile">
      <div className="profile__container">
        <div className="profile__header">
          <div className="profile__avatar">
            {isEditing ? (
              <div className="profile__avatar-upload">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="profile__avatar-input"
                />
                <label
                  htmlFor="avatar-upload"
                  className="profile__avatar-label"
                >
                  <img
                    src={
                      profileData.avatar ||
                      "https://via.placeholder.com/120x120?text=Upload"
                    }
                    alt="Avatar"
                    className="profile__avatar-image"
                  />
                  <div className="profile__avatar-overlay">
                    {uploading ? <LoadingSpinner size="small" /> : "📷"}
                  </div>
                </label>
              </div>
            ) : (
              <img
                src={
                  profileData.avatar ||
                  "https://via.placeholder.com/120x120?text=User"
                }
                alt="Profile Avatar"
                className="profile__avatar-image"
              />
            )}
          </div>
          <div className="profile__info">
            {isEditing ? (
              <div className="profile__edit-form">
                <input
                  type="text"
                  name="username"
                  value={profileData.username}
                  onChange={handleInputChange}
                  placeholder="@username"
                  className="profile__input profile__input--username"
                  maxLength={50}
                />
                <input
                  type="text"
                  name="displayName"
                  value={profileData.displayName}
                  onChange={handleInputChange}
                  placeholder="Display Name"
                  className="profile__input profile__input--display-name"
                  maxLength={100}
                />
                <textarea
                  name="description"
                  value={profileData.description}
                  onChange={handleInputChange}
                  placeholder="Tell people about yourself..."
                  className="profile__input profile__input--description"
                  rows={3}
                  maxLength={500}
                />
              </div>
            ) : (
              <>
                <h1 className="profile__username">@{profileData.username}</h1>
                <h2 className="profile__display-name">
                  {profileData.displayName}
                </h2>
                <p className="profile__bio">{profileData.description}</p>
              </>
            )}
          </div>
        </div>

        <div className="profile__stats">
          <div key="videos" className="profile__stat">
            <span className="profile__stat-number">
              {formatNumber(profileStats.videoCount)}
            </span>
            <span className="profile__stat-label">Videos</span>
          </div>
          <div key="followers" className="profile__stat">
            <span className="profile__stat-number">
              {formatNumber(profileStats.followersCount)}
            </span>
            <span className="profile__stat-label">Followers</span>
          </div>
          <div key="following" className="profile__stat">
            <span className="profile__stat-number">
              {formatNumber(profileStats.followingCount)}
            </span>
            <span className="profile__stat-label">Following</span>
          </div>
          <div key="likes" className="profile__stat">
            <span className="profile__stat-number">
              {formatNumber(profileStats.totalLikes)}
            </span>
            <span className="profile__stat-label">Likes</span>
          </div>
        </div>

        <div className="profile__actions">
          {isEditing ? (
            <>
              <button
                className="profile__button profile__button--primary"
                onClick={handleSaveProfile}
                disabled={uploading}
              >
                {uploading ? "Saving..." : "Save Changes"}
              </button>
              <button
                className="profile__button profile__button--secondary"
                onClick={handleCancelEdit}
                disabled={uploading}
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              className="profile__button profile__button--primary"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </button>
          )}
        </div>

        <div className="profile__content">
          <div className="profile__tabs">
            <button
              className={`profile__tab ${
                activeTab === "videos" ? "profile__tab--active" : ""
              }`}
              onClick={() => setActiveTab("videos")}
            >
              My Videos
            </button>
            <button
              className={`profile__tab ${
                activeTab === "liked" ? "profile__tab--active" : ""
              }`}
              onClick={() => setActiveTab("liked")}
            >
              Liked
            </button>
            <button
              className="profile__upload-btn"
              onClick={() => setShowUploadModal(true)}
              title="Upload new video"
            >
              + Upload
            </button>
          </div>

          <div className="profile__tab-content">
            {activeTab === "videos" && (
              <div className="profile__videos">
                {isLoadingVideos ? (
                  <LoadingSpinner />
                ) : userVideos.length > 0 ? (
                  <div className="profile__video-grid">
                    {userVideos.map((video, idx) => (
                      <div
                        key={video._id || video.id || idx}
                        className="profile__video-item"
                      >
                        <div
                          className="profile__video-thumbnail"
                          onClick={() => handleVideoClick(video)}
                          style={{ cursor: "pointer" }}
                        >
                          <img
                            src={
                              video.thumbnailUrl ||
                              "https://via.placeholder.com/200x300?text=Video"
                            }
                            alt={video.title}
                          />
                          <div className="profile__video-overlay">
                            <div className="profile__video-stats">
                              <span>👁 {formatNumber(video.views || 0)}</span>
                              <span>❤️ {formatNumber(video.likes || 0)}</span>
                              <span>
                                💬 {formatNumber(video.comments || 0)}
                              </span>
                            </div>
                            <div className="profile__video-play-icon">▶️</div>
                          </div>
                        </div>
                        <h4 className="profile__video-title">{video.title}</h4>
                        <div className="profile__video-meta">
                          <span
                            className={`profile__video-status profile__video-status--${video.status}`}
                          >
                            {video.status}
                          </span>
                          <span className="profile__video-date">
                            {new Date(video.uploadedAt).toLocaleDateString()}
                          </span>
                          <button
                            className="profile__video-delete-btn"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteConfirm(video._id);
                            }}
                            disabled={deleting}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="profile__no-videos">
                    <div className="profile__no-videos-content">
                      <div className="profile__no-videos-icon">🎥</div>
                      <h3 className="profile__no-videos-title">
                        No videos yet
                      </h3>
                      <p className="profile__no-videos-text">
                        Start creating and sharing your educational content!
                      </p>
                      <button
                        className="profile__button profile__button--primary"
                        onClick={() => setShowUploadModal(true)}
                      >
                        Upload Your First Video
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === "liked" && (
              <div className="profile__liked-videos">
                <div className="profile__no-videos">
                  <div className="profile__no-videos-content">
                    <div className="profile__no-videos-icon">❤️</div>
                    <h3 className="profile__no-videos-title">Liked videos</h3>
                    <p className="profile__no-videos-text">
                      Videos you've liked will appear here
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUploadSuccess={handleUploadSuccess}
      />

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="modal-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Video</h3>
            <p>
              Are you sure you want to delete this video? This action cannot be
              undone.
            </p>
            <div className="modal-buttons">
              <button
                className="btn-secondary"
                onClick={() => setDeleteConfirm(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button
                className="btn-danger"
                onClick={() => handleDeleteVideo(deleteConfirm)}
                disabled={deleting}
              >
                {deleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom navigation for mobile */}
      <VideoSidebar onOpenLogin={onOpenLogin} onOpenRegister={onOpenRegister} />
    </div>
  );
};

export default Profile;
