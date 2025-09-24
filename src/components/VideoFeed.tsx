'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import Link from 'next/link';
import { Video } from '@/types';
import { MOCK_VIDEOS, RecommendationEngine, getUserPreferences } from '@/lib/utils';
import VideoPlayer from '@/components/VideoPlayer';

interface VideoFeedProps {
  searchQuery?: string;
}

export default function VideoFeed({ searchQuery }: VideoFeedProps) {
  const [videos, setVideos] = useState<Video[]>([]);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const touchEndY = useRef(0);

  useEffect(() => {
    // Simulate loading and content curation
    const loadVideos = async () => {
      setIsLoading(true);
      
      // In a real app, this would call the Gemini AI API and social media APIs
      let filteredVideos = [...MOCK_VIDEOS];
      
      // Filter by search query if provided
      if (searchQuery) {
        filteredVideos = filteredVideos.filter(video =>
          video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          video.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
        );
      }

      // Apply recommendation algorithm
      const userPreferences = getUserPreferences();
      const recommendationEngine = new RecommendationEngine(userPreferences);
      const recommendedVideos = recommendationEngine.getRecommendedVideos(filteredVideos);
      
      // Add some random videos to maintain variety
      const remainingVideos = MOCK_VIDEOS.filter(v => !recommendedVideos.find(rv => rv.id === v.id));
      const shuffledRemaining = remainingVideos.sort(() => Math.random() - 0.5);
      
      setVideos([...recommendedVideos, ...shuffledRemaining.slice(0, 10)]);
      setIsLoading(false);
    };

    loadVideos();
  }, [searchQuery]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    touchEndY.current = e.changedTouches[0].clientY;
    handleSwipe();
  };

  const handleSwipe = () => {
    const swipeThreshold = 100;
    const diff = touchStartY.current - touchEndY.current;

    if (Math.abs(diff) > swipeThreshold) {
      if (diff > 0 && currentVideoIndex < videos.length - 1) {
        // Swipe up - next video
        setCurrentVideoIndex(currentVideoIndex + 1);
      } else if (diff < 0 && currentVideoIndex > 0) {
        // Swipe down - previous video
        setCurrentVideoIndex(currentVideoIndex - 1);
      }
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'ArrowUp' && currentVideoIndex > 0) {
      setCurrentVideoIndex(currentVideoIndex - 1);
    } else if (e.key === 'ArrowDown' && currentVideoIndex < videos.length - 1) {
      setCurrentVideoIndex(currentVideoIndex + 1);
    }
  }, [currentVideoIndex, videos.length]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const handleEngagement = (type: 'like' | 'share' | 'view') => {
    // Update video stats (in real app, this would call an API)
    const updatedVideos = [...videos];
    const currentVideo = updatedVideos[currentVideoIndex];
    
    if (type === 'like') {
      currentVideo.likeCount += 1;
    } else if (type === 'share') {
      currentVideo.shareCount += 1;
    } else if (type === 'view') {
      currentVideo.viewCount += 1;
    }
    
    setVideos(updatedVideos);
  };

  if (isLoading) {
    return (
      <div className="h-screen bg-black flex items-center justify-center">
        <div className="text-white text-center">
          <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
          <p>Curating your educational content...</p>
        </div>
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="h-screen bg-black flex items-center justify-center text-white text-center p-8">
        <div>
          <h2 className="text-2xl font-bold mb-4">No videos found</h2>
          <p className="text-gray-400 mb-8">
            {searchQuery ? `No results for "${searchQuery}"` : 'No videos match your preferences'}
          </p>
          <Link 
            href="/"
            className="inline-flex items-center px-6 py-3 bg-yellow-400 text-black rounded-full font-semibold hover:bg-yellow-300 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center justify-between text-white">
          <Link 
            href="/"
            className="flex items-center space-x-2 hover:opacity-80 transition-opacity"
          >
            <ArrowLeft className="w-6 h-6" />
            <span>Back</span>
          </Link>
          
          {searchQuery && (
            <div className="flex items-center space-x-2 bg-white/10 backdrop-blur rounded-full px-3 py-1">
              <Search className="w-4 h-4" />
              <span className="text-sm">{searchQuery}</span>
            </div>
          )}
          
          <div className="text-sm">
            {currentVideoIndex + 1} / {videos.length}
          </div>
        </div>
      </div>

      {/* Video Container */}
      <div 
        ref={containerRef}
        className="video-container hide-scrollbar"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {videos.map((video, index) => (
          <div 
            key={video.id}
            className={`video-item ${index === currentVideoIndex ? 'block' : 'hidden'}`}
          >
            <VideoPlayer
              video={video}
              isVisible={index === currentVideoIndex}
              onEngagement={handleEngagement}
            />
          </div>
        ))}
      </div>

      {/* Navigation hints */}
      <div className="absolute bottom-20 right-4 text-white/60 text-xs space-y-1">
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 border border-white/40 rounded-sm"></div>
          <span>Swipe up for next</span>
        </div>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 border border-white/40 rounded-sm"></div>
          <span>Swipe down for previous</span>
        </div>
      </div>
    </div>
  );
}