'use client';

import { useState, useEffect } from 'react';
import { Search, Play, TrendingUp, BookOpen } from 'lucide-react';
import { EDUCATIONAL_KEYWORDS, getUserPreferences, saveUserPreferences } from '@/lib/utils';
import { UserPreferences } from '@/types';
import Link from 'next/link';

export default function HomePage() {
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [userPreferences, setUserPreferences] = useState<UserPreferences>({
    selectedKeywords: [],
    searchHistory: [],
    engagements: []
  });

  useEffect(() => {
    const preferences = getUserPreferences();
    setUserPreferences(preferences);
    setSelectedKeywords(preferences.selectedKeywords);
  }, []);

  const handleKeywordToggle = (keyword: string) => {
    const newKeywords = selectedKeywords.includes(keyword)
      ? selectedKeywords.filter(k => k !== keyword)
      : [...selectedKeywords, keyword];
    
    setSelectedKeywords(newKeywords);
    
    const updatedPreferences = {
      ...userPreferences,
      selectedKeywords: newKeywords
    };
    setUserPreferences(updatedPreferences);
    saveUserPreferences(updatedPreferences);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      const updatedPreferences = {
        ...userPreferences,
        searchHistory: [searchQuery, ...userPreferences.searchHistory.slice(0, 9)]
      };
      setUserPreferences(updatedPreferences);
      saveUserPreferences(updatedPreferences);
      
      // Navigate to feed with search query
      window.location.href = `/feed?search=${encodeURIComponent(searchQuery)}`;
    }
  };

  const startWatching = () => {
    if (selectedKeywords.length > 0) {
      window.location.href = '/feed';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center mb-4">
            <BookOpen className="w-12 h-12 text-yellow-400 mr-3" />
            <h1 className="text-6xl font-bold text-white">EduTok</h1>
          </div>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Discover short educational videos curated by AI from TikTok, YouTube, Instagram, and Facebook
          </p>
        </div>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-12">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for educational content..."
              className="w-full px-6 py-4 pr-14 text-lg border-2 border-purple-400 rounded-full bg-white/10 backdrop-blur text-white placeholder-gray-300 focus:outline-none focus:border-yellow-400 transition-colors"
            />
            <button
              type="submit"
              className="absolute right-2 top-2 bottom-2 px-4 bg-yellow-400 text-purple-900 rounded-full hover:bg-yellow-300 transition-colors"
            >
              <Search className="w-6 h-6" />
            </button>
          </form>
        </div>

        {/* Keywords Selection */}
        <div className="max-w-4xl mx-auto mb-12">
          <h2 className="text-2xl font-semibold text-white mb-6 text-center">
            Choose Your Learning Topics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {EDUCATIONAL_KEYWORDS.map((keyword) => (
              <button
                key={keyword}
                onClick={() => handleKeywordToggle(keyword)}
                className={`p-3 rounded-lg text-sm font-medium transition-all transform hover:scale-105 ${
                  selectedKeywords.includes(keyword)
                    ? 'bg-yellow-400 text-purple-900 shadow-lg'
                    : 'bg-white/10 backdrop-blur text-white hover:bg-white/20 border border-purple-300'
                }`}
              >
                {keyword}
              </button>
            ))}
          </div>
          <div className="text-center mt-6">
            <p className="text-gray-300 text-sm">
              Selected: {selectedKeywords.length} topic{selectedKeywords.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="max-w-md mx-auto space-y-4">
          <button
            onClick={startWatching}
            disabled={selectedKeywords.length === 0}
            className={`w-full py-4 px-8 rounded-full text-lg font-semibold transition-all transform hover:scale-105 ${
              selectedKeywords.length > 0
                ? 'bg-gradient-to-r from-yellow-400 to-orange-400 text-purple-900 shadow-lg hover:from-yellow-300 hover:to-orange-300'
                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
            }`}
          >
            <Play className="w-6 h-6 inline-block mr-2" />
            Start Learning
          </button>
          
          <Link
            href="/feed"
            className="block w-full py-4 px-8 rounded-full text-lg font-semibold text-center bg-white/10 backdrop-blur text-white border border-purple-300 hover:bg-white/20 transition-all transform hover:scale-105"
          >
            <TrendingUp className="w-6 h-6 inline-block mr-2" />
            Explore Trending
          </Link>
        </div>

        {/* Recent Searches */}
        {userPreferences.searchHistory.length > 0 && (
          <div className="max-w-2xl mx-auto mt-12">
            <h3 className="text-lg font-medium text-white mb-4">Recent Searches</h3>
            <div className="flex flex-wrap gap-2">
              {userPreferences.searchHistory.slice(0, 5).map((search, index) => (
                <button
                  key={index}
                  onClick={() => setSearchQuery(search)}
                  className="px-3 py-1 bg-white/10 backdrop-blur text-gray-300 rounded-full text-sm hover:bg-white/20 transition-colors"
                >
                  {search}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-20 grid md:grid-cols-3 gap-8 text-center">
          <div className="p-6">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-8 h-8 text-purple-900" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">AI-Curated Content</h3>
            <p className="text-gray-300">
              Gemini AI finds the best educational videos from across social platforms
            </p>
          </div>
          <div className="p-6">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <TrendingUp className="w-8 h-8 text-purple-900" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Personalized Feed</h3>
            <p className="text-gray-300">
              Algorithm adapts based on your interests and engagement patterns
            </p>
          </div>
          <div className="p-6">
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <Play className="w-8 h-8 text-purple-900" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-2">Short & Engaging</h3>
            <p className="text-gray-300">
              Quick, digestible educational content perfect for mobile learning
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}