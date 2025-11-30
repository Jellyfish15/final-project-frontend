const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? "/api" : "https://your-backend-app.herokuapp.com/api");

// API utility class for handling HTTP requests
class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Get auth token from localStorage
  getAuthToken() {
    return localStorage.getItem("authToken");
  }

  // Set auth token in localStorage
  setAuthToken(token) {
    localStorage.setItem("authToken", token);
  }

  // Remove auth token from localStorage
  removeAuthToken() {
    localStorage.removeItem("authToken");
  }

  // Create headers with auth token if available
  getHeaders(includeAuth = true) {
    const headers = {
      "Content-Type": "application/json",
    };

    if (includeAuth) {
      const token = this.getAuthToken();
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
    }

    return headers;
  }

  // Create headers for file uploads
  getFileUploadHeaders() {
    const headers = {};
    const token = this.getAuthToken();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return headers;
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      ...options,
      headers: {
        ...this.getHeaders(options.includeAuth !== false),
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        // Include validation errors if present
        const errorMessage =
          data.message || `HTTP error! status: ${response.status}`;
        const error = new Error(errorMessage);
        if (data.errors) {
          error.validationErrors = data.errors;
          console.error("Validation errors:", data.errors);
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error(`API request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  // GET request
  async get(endpoint, options = {}) {
    return this.request(endpoint, {
      method: "GET",
      ...options,
    });
  }

  // POST request
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: "POST",
      body: JSON.stringify(data),
      ...options,
    });
  }

  // PUT request
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      method: "PUT",
      body: JSON.stringify(data),
      ...options,
    });
  }

  // DELETE request
  async delete(endpoint, options = {}) {
    return this.request(endpoint, {
      method: "DELETE",
      ...options,
    });
  }

  // File upload request
  async upload(endpoint, formData) {
    const url = `${this.baseURL}${endpoint}`;

    try {
      const response = await fetch(url, {
        method: "POST",
        headers: this.getFileUploadHeaders(),
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || `HTTP error! status: ${response.status}`
        );
      }

      return data;
    } catch (error) {
      console.error(`File upload failed for ${endpoint}:`, error);
      throw error;
    }
  }
}

// Create singleton instance
const apiService = new ApiService();

// Authentication API
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await apiService.post("/auth/register", userData);
    if (response.success && response.token) {
      apiService.setAuthToken(response.token);
    }
    return response;
  },

  // Login user
  login: async (credentials) => {
    const response = await apiService.post("/auth/login", credentials);
    if (response.success && response.token) {
      apiService.setAuthToken(response.token);
    }
    return response;
  },

  // Logout user
  logout: () => {
    apiService.removeAuthToken();
    localStorage.removeItem("nudlUser");
  },

  // Get current user profile
  getCurrentUser: () => apiService.get("/auth/me"),

  // Change password
  changePassword: (passwordData) =>
    apiService.put("/auth/change-password", passwordData),

  // Forgot password
  forgotPassword: (email) =>
    apiService.post("/auth/forgot-password", { email }, { includeAuth: false }),

  // Reset password
  resetPassword: (token, newPassword) =>
    apiService.post(
      "/auth/reset-password",
      { token, newPassword },
      { includeAuth: false }
    ),
};

// Users API
export const usersAPI = {
  // Get user profile
  getProfile: (userId) => apiService.get(`/users/${userId}`),

  // Update user profile
  updateProfile: (updateData) => apiService.put("/users/profile", updateData),

  // Search users
  searchUsers: (query, page = 1, limit = 20) =>
    apiService.get(
      `/users/search?q=${encodeURIComponent(query)}&page=${page}&limit=${limit}`
    ),

  // Follow user
  followUser: (userId) => apiService.post(`/users/${userId}/follow`),

  // Unfollow user
  unfollowUser: (userId) => apiService.delete(`/users/${userId}/follow`),

  // Get user followers
  getFollowers: (userId, page = 1, limit = 20) =>
    apiService.get(`/users/${userId}/followers?page=${page}&limit=${limit}`),

  // Get user following
  getFollowing: (userId, page = 1, limit = 20) =>
    apiService.get(`/users/${userId}/following?page=${page}&limit=${limit}`),

  // Get user statistics
  getStatistics: () => apiService.get("/users/statistics"),
};

// Videos API
export const videosAPI = {
  // Get video feed
  getFeed: (page = 1, limit = 10, category = null) => {
    let url = `/videos/feed?page=${page}&limit=${limit}`;
    if (category) {
      url += `&category=${category}`;
    }
    return apiService.get(url);
  },

  // Get video by ID
  getVideo: (videoId) => apiService.get(`/videos/${videoId}`),

  // Get user's videos
  getUserVideos: (userId, page = 1, limit = 12) =>
    apiService.get(`/videos/user/${userId}?page=${page}&limit=${limit}`),

  // Like video
  likeVideo: (videoId) => apiService.post(`/videos/${videoId}/like`),

  // Unlike video
  unlikeVideo: (videoId) => apiService.delete(`/videos/${videoId}/like`),

  // Add view
  addView: (videoId) => apiService.post(`/videos/${videoId}/view`),

  // Share video
  shareVideo: (videoId) => apiService.post(`/videos/${videoId}/share`),

  // Update video
  updateVideo: (videoId, updateData) =>
    apiService.put(`/videos/${videoId}`, updateData),

  // Delete video
  deleteVideo: (videoId) => apiService.delete(`/videos/${videoId}`),

  // Get video comments
  getComments: (videoId, page = 1, limit = 20) =>
    apiService.get(`/videos/${videoId}/comments?page=${page}&limit=${limit}`),

  // Add comment
  addComment: (videoId, comment) =>
    apiService.post(`/videos/${videoId}/comment`, { text: comment }),

  // Delete comment
  deleteComment: (videoId, commentId) =>
    apiService.delete(`/videos/${videoId}/comments/${commentId}`),

  // Search videos
  searchVideos: (query, page = 1, limit = 20, category = null) => {
    let url = `/videos/search?q=${encodeURIComponent(
      query
    )}&page=${page}&limit=${limit}`;
    if (category) {
      url += `&category=${category}`;
    }
    return apiService.get(url);
  },

  // Get similar videos
  getSimilarVideos: (videoId, limit = 10) =>
    apiService.get(`/videos/${videoId}/similar?limit=${limit}`),

  // Get profile feed (all user videos + similar based on most engaged)
  getProfileFeed: (username, similarLimit = 10) =>
    apiService.get(
      `/videos/profile/${username}/feed?similarLimit=${similarLimit}`
    ),

  // Get cached YouTube videos
  getCachedVideos: (count = 10) =>
    apiService.get(`/youtube-cache/diverse?count=${count}`),
};

// Upload API
export const uploadAPI = {
  // Upload video
  uploadVideo: (formData) => apiService.upload("/upload/video", formData),

  // Upload thumbnail
  uploadThumbnail: (videoId, formData) =>
    apiService.upload(`/upload/thumbnail/${videoId}`, formData),

  // Upload avatar
  uploadAvatar: (formData) => apiService.upload("/upload/avatar", formData),

  // Get my uploaded videos
  getMyVideos: (page = 1, limit = 12, status = null) => {
    let url = `/upload/my-videos?page=${page}&limit=${limit}`;
    if (status) {
      url += `&status=${status}`;
    }
    return apiService.get(url);
  },

  // Delete a video
  deleteVideo: (videoId) => apiService.delete(`/upload/video/${videoId}`),
};

// Health check
export const healthAPI = {
  check: () => apiService.get("/health", { includeAuth: false }),
};

// Export default service
export default apiService;
