export interface Video {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  videoUrl: string;
  creator: string;
  platform: 'tiktok' | 'youtube' | 'facebook' | 'instagram';
  duration: number; // in seconds
  tags: string[];
  viewCount: number;
  likeCount: number;
  shareCount: number;
  engagementScore: number;
  createdAt: string;
}

export interface UserEngagement {
  videoId: string;
  liked: boolean;
  shared: boolean;
  viewed: boolean;
  watchTime: number; // in seconds
  timestamp: string;
}

export interface UserPreferences {
  selectedKeywords: string[];
  searchHistory: string[];
  engagements: UserEngagement[];
}

export interface SearchFilters {
  keywords: string[];
  platforms: ('tiktok' | 'youtube' | 'facebook' | 'instagram')[];
  duration?: 'short' | 'medium' | 'long';
  sortBy: 'relevance' | 'recent' | 'popular';
}