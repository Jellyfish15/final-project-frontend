'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import VideoFeed from '@/components/VideoFeed';

function FeedContent() {
  const searchParams = useSearchParams();
  const searchQuery = searchParams.get('search') || undefined;

  return <VideoFeed searchQuery={searchQuery} />;
}

function LoadingSkeleton() {
  return (
    <div className="h-screen bg-black flex items-center justify-center">
      <div className="text-white text-center">
        <div className="animate-spin w-8 h-8 border-2 border-white border-t-transparent rounded-full mx-auto mb-4"></div>
        <p>Loading...</p>
      </div>
    </div>
  );
}

export default function FeedPage() {
  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <FeedContent />
    </Suspense>
  );
}