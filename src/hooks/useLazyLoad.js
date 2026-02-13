/**
 * Custom Hook for Lazy Loading Images
 * Improves performance by deferring image loading until needed
 */

import { useEffect, useRef, useState } from "react";

export const useLazyImage = (imageUrl, options = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const imgRef = useRef(null);

  useEffect(() => {
    if (!imageUrl) {
      setIsLoaded(false);
      return;
    }

    // Use Intersection Observer for lazy loading
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              const img = new Image();

              img.onload = () => {
                setIsLoaded(true);
                observer.unobserve(imgRef.current);
              };

              img.onerror = () => {
                setError(new Error("Failed to load image"));
                observer.unobserve(imgRef.current);
              };

              img.src = imageUrl;
            }
          });
        },
        {
          rootMargin: options.rootMargin || "50px",
          threshold: options.threshold || 0.01,
        },
      );

      if (imgRef.current) {
        observer.observe(imgRef.current);
      }

      return () => {
        if (imgRef.current) {
          observer.unobserve(imgRef.current);
        }
      };
    } else {
      // Fallback for browsers without Intersection Observer
      const img = new Image();

      img.onload = () => setIsLoaded(true);
      img.onerror = () => setError(new Error("Failed to load image"));

      img.src = imageUrl;
    }
  }, [imageUrl, options.rootMargin, options.threshold]);

  return { isLoaded, error, imgRef };
};

/**
 * Custom Hook for Lazy Loading Videos
 * Preloads video metadata without loading the entire file
 */
export const useLazyVideo = (videoUrl, videoId) => {
  const [isMetadataLoaded, setIsMetadataLoaded] = useState(false);
  const [error, setError] = useState(null);
  const videoRef = useRef(null);

  useEffect(() => {
    if (!videoUrl) {
      setIsMetadataLoaded(false);
      return;
    }

    const video = document.createElement("video");
    video.preload = "metadata";

    const handleLoadedMetadata = () => {
      console.log(`[Performance] Video metadata loaded: ${videoId}`);
      setIsMetadataLoaded(true);
    };

    const handleError = (err) => {
      console.warn(
        `[Performance] Failed to load video metadata: ${videoId}`,
        err,
      );
      setError(err);
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("error", handleError);

    video.src = videoUrl;

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("error", handleError);
      video.src = "";
    };
  }, [videoUrl, videoId]);

  return { isMetadataLoaded, error, videoRef };
};

/**
 * Custom Hook for Batch Lazy Loading
 * Loads multiple images/videos with controlled concurrency
 */
export const useBatchLazyLoad = (urls, maxConcurrent = 3) => {
  const [loadedUrls, setLoadedUrls] = useState(new Set());
  const [errors, setErrors] = useState(new Map());
  const activeLoadsRef = useRef(0);
  const queueRef = useRef([...urls]);

  useEffect(() => {
    const processQueue = () => {
      while (
        queueRef.current.length > 0 &&
        activeLoadsRef.current < maxConcurrent
      ) {
        const url = queueRef.current.shift();
        activeLoadsRef.current++;

        const img = new Image();

        img.onload = () => {
          setLoadedUrls((prev) => new Set([...prev, url]));
          activeLoadsRef.current--;
          processQueue();
        };

        img.onerror = (err) => {
          setErrors((prev) => new Map([...prev, [url, err]]));
          activeLoadsRef.current--;
          processQueue();
        };

        img.src = url;
      }
    };

    processQueue();
  }, [urls, maxConcurrent]);

  return {
    loadedUrls,
    errors,
    loadingProgress: (loadedUrls.size / urls.length) * 100,
  };
};
