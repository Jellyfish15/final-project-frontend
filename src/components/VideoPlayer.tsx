'use client';

import { useState, useEffect, useRef } from 'react';
import { Heart, MessageCircle, Share2, Bookmark, Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { Video } from '@/types';
import { addEngagement } from '@/lib/utils';

interface VideoPlayerProps {
  video: Video;
  isVisible: boolean;
  onEngagement: (type: 'like' | 'share' | 'view') => void;
}

export default function VideoPlayer({ video, isVisible, onEngagement }: VideoPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLiked, setIsLiked] = useState(false);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [watchTime, setWatchTime] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const watchTimeRef = useRef(0);

  useEffect(() => {
    if (isVisible && videoRef.current) {
      setIsPlaying(true);
      onEngagement('view');
      
      // Start tracking watch time
      const startTime = Date.now();
      const interval = setInterval(() => {
        watchTimeRef.current = (Date.now() - startTime) / 1000;
        setWatchTime(watchTimeRef.current);
      }, 1000);

      return () => {
        clearInterval(interval);
        // Record engagement when leaving video
        addEngagement({
          videoId: video.id,
          liked: isLiked,
          shared: false,
          viewed: true,
          watchTime: watchTimeRef.current,
          timestamp: new Date().toISOString()
        });
      };
    } else {
      setIsPlaying(false);
    }
  }, [isVisible, video.id, isLiked, onEngagement]);

  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
    onEngagement('like');
  };

  const handleShare = () => {
    onEngagement('share');
    // In a real app, this would open a share dialog
    navigator.share?.({
      title: video.title,
      text: video.description,
      url: window.location.href
    }).catch(() => {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    });
  };

  const getPlatformColor = (platform: string) => {
    switch (platform) {
      case 'tiktok': return 'bg-black text-white';
      case 'youtube': return 'bg-red-600 text-white';
      case 'instagram': return 'bg-gradient-to-r from-purple-500 to-pink-500 text-white';
      case 'facebook': return 'bg-blue-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  return (
    <div className="relative w-full h-screen bg-black flex items-center justify-center">
      {/* Video placeholder - in real app this would be actual video */}
      <div className="relative w-full h-full max-w-sm bg-gray-900 rounded-lg overflow-hidden">
        <div 
          className="w-full h-full bg-gradient-to-br from-blue-600 to-purple-700 flex items-center justify-center cursor-pointer"
          onClick={togglePlayPause}
        >
          <img 
            src={video.thumbnail}
            alt={video.title}
            className="w-full h-full object-cover"
          />
          
          {/* Play/Pause overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            {!isPlaying && (
              <Play className="w-16 h-16 text-white opacity-80" />
            )}
          </div>
          
          {/* Controls */}
          <div className="absolute top-4 right-4 space-y-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="w-10 h-10 bg-black/50 backdrop-blur rounded-full flex items-center justify-center text-white"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
          </div>

          {/* Progress indicator */}
          <div className="absolute bottom-20 left-4 right-4">
            <div className="w-full bg-white/20 h-1 rounded-full">
              <div 
                className="bg-white h-1 rounded-full transition-all duration-1000"
                style={{ width: `${Math.min((watchTime / video.duration) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Video info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/40 to-transparent text-white">
          <div className="flex items-start justify-between">
            <div className="flex-1 mr-4">
              <div className="flex items-center mb-2">
                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getPlatformColor(video.platform)}`}>
                  {video.platform.toUpperCase()}
                </span>
                <span className="ml-2 text-sm text-gray-300">@{video.creator}</span>
              </div>
              <h3 className="font-semibold text-lg mb-1">{video.title}</h3>
              <p className="text-sm text-gray-300 mb-2 line-clamp-2">{video.description}</p>
              <div className="flex flex-wrap gap-2">
                {video.tags.slice(0, 3).map((tag) => (
                  <span key={tag} className="text-xs bg-white/20 px-2 py-1 rounded-full">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col items-center space-y-4">
              <button
                onClick={handleLike}
                className={`flex flex-col items-center space-y-1 ${isLiked ? 'text-red-500' : 'text-white'}`}
              >
                <Heart className={`w-8 h-8 ${isLiked ? 'fill-current' : ''}`} />
                <span className="text-xs">{(video.likeCount + (isLiked ? 1 : 0)).toLocaleString()}</span>
              </button>

              <button
                onClick={() => {}}
                className="flex flex-col items-center space-y-1 text-white"
              >
                <MessageCircle className="w-8 h-8" />
                <span className="text-xs">Comment</span>
              </button>

              <button
                onClick={handleShare}
                className="flex flex-col items-center space-y-1 text-white"
              >
                <Share2 className="w-8 h-8" />
                <span className="text-xs">{video.shareCount.toLocaleString()}</span>
              </button>

              <button
                onClick={() => setIsBookmarked(!isBookmarked)}
                className={`flex flex-col items-center space-y-1 ${isBookmarked ? 'text-yellow-400' : 'text-white'}`}
              >
                <Bookmark className={`w-8 h-8 ${isBookmarked ? 'fill-current' : ''}`} />
                <span className="text-xs">Save</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}