import { useState, useEffect, useRef, useCallback } from "react";
import { videosAPI } from "../services/api";
import { useAuth } from "../components/AuthContext/AuthContext";

/**
 * Custom hook to track video engagement and adapt content recommendations
 * Tracks: watch time, completion rate, skips, pauses, seeks, interactions
 */
export const useVideoEngagement = (videoRef, videoData, sessionId) => {
  const { isAuthenticated } = useAuth();
  const [engagementData, setEngagementData] = useState({
    watchTime: 0,
    pauseCount: 0,
    seekCount: 0,
    replays: 0,
    skippedAt: null,
  });

  const lastTimeRef = useRef(0);
  const trackingIntervalRef = useRef(null);
  const hasTrackedRef = useRef(false);

  // Track video progress
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    const duration = videoRef.current.duration;

    // Update watch time (highest point reached)
    setEngagementData((prev) => ({
      ...prev,
      watchTime: Math.max(prev.watchTime, currentTime),
    }));

    // Detect seeks (jumps in time)
    if (Math.abs(currentTime - lastTimeRef.current) > 2) {
      setEngagementData((prev) => ({
        ...prev,
        seekCount: prev.seekCount + 1,
      }));
    }

    lastTimeRef.current = currentTime;

    // Detect replay (went back to beginning after watching)
    if (currentTime < 5 && lastTimeRef.current > duration * 0.8) {
      setEngagementData((prev) => ({
        ...prev,
        replays: prev.replays + 1,
      }));
    }
  }, [videoRef]);

  // Track pause
  const handlePause = useCallback(() => {
    setEngagementData((prev) => ({
      ...prev,
      pauseCount: prev.pauseCount + 1,
    }));
  }, []);

  // Track when video is skipped
  const handleSkip = useCallback(() => {
    if (!videoRef.current) return;

    const currentTime = videoRef.current.currentTime;
    setEngagementData((prev) => ({
      ...prev,
      skippedAt: currentTime,
    }));
  }, [videoRef]);

  // Send engagement data to backend
  const trackEngagement = useCallback(
    async (additionalData = {}) => {
      // Only track if user is authenticated
      if (!isAuthenticated || !videoData || !sessionId) return;

      try {
        const payload = {
          videoId: videoData._id,
          watchTime: engagementData.watchTime,
          totalDuration: videoData.duration || videoRef.current?.duration || 0,
          liked: additionalData.liked || false,
          commented: additionalData.commented || false,
          shared: additionalData.shared || false,
          replays: engagementData.replays,
          pauseCount: engagementData.pauseCount,
          seekCount: engagementData.seekCount,
          skippedAt: engagementData.skippedAt,
          category: videoData.category,
          sessionId,
        };

        await videosAPI.trackEngagement(payload);
        hasTrackedRef.current = true;
      } catch (error) {
        console.error("Failed to track engagement:", error);
      }
    },
    [isAuthenticated, videoData, engagementData, sessionId, videoRef]
  );

  // Set up event listeners
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("pause", handlePause);
    };
  }, [videoRef, handleTimeUpdate, handlePause]);

  // Track engagement periodically (every 5 seconds)
  useEffect(() => {
    trackingIntervalRef.current = setInterval(() => {
      trackEngagement();
    }, 5000);

    return () => {
      if (trackingIntervalRef.current) {
        clearInterval(trackingIntervalRef.current);
      }
      // Final tracking when component unmounts
      if (!hasTrackedRef.current) {
        trackEngagement();
      }
    };
  }, [trackEngagement]);

  return {
    engagementData,
    trackEngagement,
    handleSkip,
  };
};

/**
 * Hook to get personalized video recommendations
 */
export const useRecommendations = () => {
  const { isAuthenticated } = useAuth();
  const [recommendations, setRecommendations] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [disengagement, setDisengagement] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(false);

  // Generate session ID on mount
  useEffect(() => {
    const id = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setSessionId(id);
  }, []);

  // Fetch recommendations
  const fetchRecommendations = useCallback(
    async (limit = 20) => {
      // Only fetch if user is authenticated
      if (!isAuthenticated || !sessionId) return;

      setLoading(true);
      try {
        const response = await videosAPI.getRecommendations(sessionId, limit);
        if (response.success) {
          setRecommendations(response.videos);
          setDisengagement(response.disengagement);
          setPreferences(response.preferences);
        }
      } catch (error) {
        console.error("Failed to fetch recommendations:", error);
      } finally {
        setLoading(false);
      }
    },
    [isAuthenticated, sessionId]
  );

  // Check disengagement status
  const checkDisengagement = useCallback(async () => {
    // Only check if user is authenticated
    if (!isAuthenticated || !sessionId) return;

    try {
      const response = await videosAPI.checkDisengagement(sessionId);
      if (response.success) {
        setDisengagement(response);
      }
    } catch (error) {
      console.error("Failed to check disengagement:", error);
    }
  }, [isAuthenticated, sessionId]);

  // Refresh recommendations when user shows disengagement
  useEffect(() => {
    if (isAuthenticated && disengagement?.isDisengaging) {
      console.log("User disengaging, refreshing recommendations...");
      fetchRecommendations();
    }
  }, [isAuthenticated, disengagement, fetchRecommendations]);

  return {
    recommendations,
    sessionId,
    disengagement,
    preferences,
    loading,
    fetchRecommendations,
    checkDisengagement,
  };
};

export default { useVideoEngagement, useRecommendations };
