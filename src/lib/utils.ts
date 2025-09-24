import { Video, UserEngagement, UserPreferences } from '@/types';

// Educational keywords for the homepage
export const EDUCATIONAL_KEYWORDS = [
  'Mathematics', 'Science', 'History', 'Literature', 'Physics', 'Chemistry',
  'Biology', 'Geography', 'Art', 'Music', 'Programming', 'Psychology',
  'Philosophy', 'Economics', 'Politics', 'Language Learning', 'Study Tips',
  'Test Prep', 'Career Advice', 'Health & Wellness'
];

// Mock video data for development
export const MOCK_VIDEOS: Video[] = [
  {
    id: '1',
    title: 'Quick Math: Understanding Derivatives',
    description: 'Learn the basics of derivatives in calculus in under 60 seconds!',
    thumbnail: 'https://via.placeholder.com/400x600?text=Math+Video',
    videoUrl: '#',
    creator: '@mathwiz',
    platform: 'youtube',
    duration: 58,
    tags: ['Mathematics', 'Calculus', 'Study Tips'],
    viewCount: 12500,
    likeCount: 890,
    shareCount: 124,
    engagementScore: 85,
    createdAt: '2024-01-15T10:30:00Z'
  },
  {
    id: '2',
    title: 'History Hack: Fall of Rome',
    description: 'Why did the Roman Empire collapse? Quick explanation!',
    thumbnail: 'https://via.placeholder.com/400x600?text=History+Video',
    videoUrl: '#',
    creator: '@historybuff',
    platform: 'tiktok',
    duration: 45,
    tags: ['History', 'Roman Empire', 'Ancient History'],
    viewCount: 8750,
    likeCount: 654,
    shareCount: 89,
    engagementScore: 78,
    createdAt: '2024-01-14T15:20:00Z'
  },
  {
    id: '3',
    title: 'Physics Fun: Gravity Explained',
    description: 'Understanding gravity with everyday examples',
    thumbnail: 'https://via.placeholder.com/400x600?text=Physics+Video',
    videoUrl: '#',
    creator: '@physicsphun',
    platform: 'instagram',
    duration: 62,
    tags: ['Physics', 'Gravity', 'Science'],
    viewCount: 15200,
    likeCount: 1100,
    shareCount: 203,
    engagementScore: 92,
    createdAt: '2024-01-13T09:45:00Z'
  },
  {
    id: '4',
    title: 'Study Better: Memory Palace Technique',
    description: 'Boost your memory with this ancient technique!',
    thumbnail: 'https://via.placeholder.com/400x600?text=Study+Tips',
    videoUrl: '#',
    creator: '@studymaster',
    platform: 'youtube',
    duration: 75,
    tags: ['Study Tips', 'Memory', 'Learning'],
    viewCount: 20100,
    likeCount: 1456,
    shareCount: 312,
    engagementScore: 96,
    createdAt: '2024-01-12T14:15:00Z'
  },
  {
    id: '5',
    title: 'Chemistry Quick: Periodic Table Trends',
    description: 'Master periodic trends in 60 seconds!',
    thumbnail: 'https://via.placeholder.com/400x600?text=Chemistry+Video',
    videoUrl: '#',
    creator: '@chemguru',
    platform: 'facebook',
    duration: 59,
    tags: ['Chemistry', 'Periodic Table', 'Science'],
    viewCount: 9800,
    likeCount: 723,
    shareCount: 156,
    engagementScore: 81,
    createdAt: '2024-01-11T11:30:00Z'
  }
];

// Recommendation algorithm
export class RecommendationEngine {
  private userPreferences: UserPreferences;

  constructor(preferences: UserPreferences) {
    this.userPreferences = preferences;
  }

  calculateVideoScore(video: Video): number {
    let score = video.engagementScore;

    // Boost score for matching keywords
    const keywordMatches = video.tags.filter(tag => 
      this.userPreferences.selectedKeywords.some(keyword => 
        keyword.toLowerCase().includes(tag.toLowerCase()) ||
        tag.toLowerCase().includes(keyword.toLowerCase())
      )
    ).length;
    score += keywordMatches * 15;

    // Boost score for recently engaged content types
    const recentEngagements = this.userPreferences.engagements
      .filter(eng => new Date(eng.timestamp) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    
    if (recentEngagements.length > 0) {
      const avgWatchTime = recentEngagements.reduce((sum, eng) => sum + eng.watchTime, 0) / recentEngagements.length;
      if (video.duration <= avgWatchTime * 1.2) {
        score += 10;
      }
    }

    return score;
  }

  getRecommendedVideos(videos: Video[], limit: number = 10): Video[] {
    return videos
      .map(video => ({ ...video, score: this.calculateVideoScore(video) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  }
}

// Local storage utilities
export const StorageKeys = {
  USER_PREFERENCES: 'edutok_user_preferences',
  RECENT_SEARCHES: 'edutok_recent_searches'
} as const;

export function saveUserPreferences(preferences: UserPreferences): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(StorageKeys.USER_PREFERENCES, JSON.stringify(preferences));
  }
}

export function getUserPreferences(): UserPreferences {
  if (typeof window === 'undefined') {
    return { selectedKeywords: [], searchHistory: [], engagements: [] };
  }
  
  const stored = localStorage.getItem(StorageKeys.USER_PREFERENCES);
  if (!stored) {
    return { selectedKeywords: [], searchHistory: [], engagements: [] };
  }
  
  try {
    return JSON.parse(stored);
  } catch {
    return { selectedKeywords: [], searchHistory: [], engagements: [] };
  }
}

export function addEngagement(engagement: UserEngagement): void {
  const preferences = getUserPreferences();
  preferences.engagements.push(engagement);
  
  // Keep only last 100 engagements
  if (preferences.engagements.length > 100) {
    preferences.engagements = preferences.engagements.slice(-100);
  }
  
  saveUserPreferences(preferences);
}