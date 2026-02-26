# Copy-Paste Code Solutions for Each Option

## OPTION 2: Disable Animations (QUICKEST FIX)

### File: `src/components/Video/Video.css`

Find this section:

```css
.video-page__container {
  /* ... other properties ... */
  transition: transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

Replace with:

```css
.video-page__container {
  /* ... other properties ... */
  transition: none; /* Disable animation for mobile performance */
}
```

**OR** for a lighter animation:

```css
.video-page__container {
  /* ... other properties ... */
  transition: transform 0.05s linear; /* Nearly instant, light animation */
}
```

---

## OPTION 1: Memoize Components

### File: `src/components/Video/Video.jsx`

At the END of the file, find:

```javascript
export default Video;
```

Change to:

```javascript
export default React.memo(Video);
```

### File: `src/contexts/VideoContext.jsx`

Find the section where you RETURN the provider (around line 900):

```javascript
return (
  <VideoContext.Provider
    value={{
      currentVideo,
      currentIndex,
      videos,
      isPlaying,
      // ... all other values
    }}
  >
    {children}
  </VideoContext.Provider>
);
```

Change to use `useMemo` (import at top if not already there):

```javascript
// Add at top with other imports
import { useMemo } from "react";

// Then in the component, replace the return with:
const contextValue = useMemo(
  () => ({
    currentVideo,
    currentIndex,
    videos,
    isPlaying,
    isLiked,
    isMuted,
    isLoading,
    isVideoSwitching,
    videoRef,
    likeCount,
    commentCount,
    isCommentModalOpen,
    setIsCommentModalOpen,
    isShareModalOpen,
    setIsShareModalOpen,
    scrollToVideo,
    setVideoById,
    setCustomFeed,
    resetToFullFeed,
    isFocusedFeed,
    focusedVideos,
    togglePlay,
    toggleMute,
    handleLike,
    handleShare,
    handleComment,
    handleWheel,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    handleTouchCancel,
    showSwipeIndicator,
    swipeIndicator,
  }),
  [
    currentVideo,
    currentIndex,
    videos,
    isPlaying,
    isLiked,
    isMuted,
    isLoading,
    isVideoSwitching,
    likeCount,
    commentCount,
    isCommentModalOpen,
    isShareModalOpen,
    isFocusedFeed,
    focusedVideos,
    swipeIndicator,
  ],
);

return (
  <VideoContext.Provider value={contextValue}>{children}</VideoContext.Provider>
);
```

---

## OPTION 3: Aggressive Video Cleanup

### File: `src/contexts/VideoContext.jsx`

Find the `scrollToVideo` function (around line 225). Inside the function, right AFTER you set the new index but BEFORE you call any play functions, add this cleanup code:

```javascript
// CLEANUP OLD VIDEO
const oldVideo = videoRef.current;
if (oldVideo) {
  console.log("[VideoContext] Cleaning up old video element");

  // Stop playback
  oldVideo.pause();

  // Remove all data to free memory
  oldVideo.src = "";
  oldVideo.currentTime = 0;

  // Remove event listeners that were on this video
  oldVideo.onplay = null;
  oldVideo.onpause = null;
  oldVideo.onended = null;
  oldVideo.ontimeupdate = null;
  oldVideo.onloadedmetadata = null;
  oldVideo.onerror = null;

  // Force browser to release decoder
  oldVideo.load();

  console.log("[VideoContext] Old video cleaned up");
}
```

Also reduce aggressive preloading. Find this section (around line 115):

```javascript
useEffect(() => {
  if (videos.length > 0) {
    // Preload thumbnails for next 3-5 videos
    const upcomingVideos = videos.slice(currentIndex + 1, currentIndex + 5);
```

Change to:

```javascript
useEffect(() => {
  if (videos.length > 0) {
    // Preload thumbnails for next 2-3 videos only (reduced from 5)
    const upcomingVideos = videos.slice(currentIndex + 1, currentIndex + 3);
```

---

## OPTION 4: Reduce Video File Sizes

### File: `src/App.jsx`

Find the section where videos are being loaded (around line 45):

```javascript
const INITIAL_QUICK_LOAD = isMobile ? 3 : 5;
const FULL_LOAD_COUNT = isMobile ? 12 : 28;
```

To add a query parameter for mobile optimization:

```javascript
// Add this near the load calls
const qualityParam = isMobile ? "?quality=mobile" : "";

// Then in your API calls, add the parameter:
videosAPI.getFeedWithCaching(INITIAL_QUICK_LOAD, qualityParam);
```

### File: `backend/routes/videos.js`

Find where you serve videos. Add this optimization:

```javascript
router.get("/videos/:id/play", async (req, res) => {
  try {
    const { id } = req.params;
    const quality = req.query.quality || "standard"; // Get quality param

    // Detect mobile
    const isMobile =
      quality === "mobile" || /mobile/i.test(req.get("user-agent"));

    const video = await Video.findById(id);
    if (!video) return res.status(404).json({ error: "Video not found" });

    // If mobile, check for mobile-optimized version
    if (isMobile && existsSync(video.videoUrl.replace(".mp4", "_mobile.mp4"))) {
      res.sendFile(video.videoUrl.replace(".mp4", "_mobile.mp4"));
    } else {
      res.sendFile(video.videoUrl);
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

---

## OPTION 6: Passive Touch Listeners

### File: `src/components/Video/Video.jsx`

Find where touch events are attached to the DOM. Look for addEventListener calls and add `{ passive: true }`:

```javascript
// Find existing code like:
containerRef.current.addEventListener("touchstart", handleTouchStart);

// Change to:
containerRef.current.addEventListener("touchstart", handleTouchStart, {
  passive: true,
});
containerRef.current.addEventListener("touchend", handleTouchEnd, {
  passive: true,
});
containerRef.current.addEventListener("touchcancel", handleTouchCancel, {
  passive: true,
});

// Only touchmove stays non-passive if you need preventDefault
containerRef.current.addEventListener("touchmove", handleTouchMove, {
  passive: false,
});
```

---

## OPTION 7: Reduce Context Update Frequency

### File: `src/contexts/VideoContext.jsx`

Add this import at the top (React 18+):

```javascript
import { useTransition } from "react";
```

In the VideoProvider component, add:

```javascript
const [isPending, startTransition] = useTransition();
```

Then in your `scrollToVideo` function, wrap state updates:

```javascript
const scrollToVideo = useCallback(
  async (direction) => {
    // ... calculation logic ...

    // Wrap state updates in startTransition
    startTransition(() => {
      setCurrentIndex(newIndex);
      setIsVideoSwitching(true);

      // These state updates won't block the UI
      setTimeout(() => {
        startTransition(() => {
          setIsVideoSwitching(false);
        });
      }, 300);
    });
  },
  [currentIndex, videos, focusedVideos, initialVideos],
);
```

---

## OPTION 5: Virtual Scrolling (ADVANCED)

### Step 1: Install library

```bash
npm install react-window
```

### Step 2: File: `src/App.jsx`

Replace your video rendering section:

```javascript
import { FixedSizeList as List } from "react-window";
import VideoItem from "./components/Video/VideoItem";

// In your render:
<List
  height={window.innerHeight}
  itemCount={videos.length}
  itemSize={window.innerHeight}
  width="100%"
  overscanCount={1} // Render 1 video off-screen in each direction
>
  {({ index, style }) => (
    <div style={style}>
      <VideoItem key={videos[index]?._id || index} video={videos[index]} />
    </div>
  )}
</List>;
```

### Step 3: Create: `src/components/Video/VideoItem.jsx`

```javascript
import React from "react";
import Video from "./Video";

const VideoItem = React.memo(({ video, style }) => {
  if (!video) return <div style={style} />;

  return (
    <div style={{ ...style, overflow: "hidden" }}>
      <Video onOpenLogin={() => {}} onOpenRegister={() => {}} />
    </div>
  );
});

export default VideoItem;
```

---

## BONUS: Add Performance Monitoring

Add this to track what's actually happening:

### File: `src/hooks/useRenderCount.js`

```javascript
import { useRef, useEffect } from "react";

export const useRenderCount = (componentName) => {
  const renderCount = useRef(0);

  useEffect(() => {
    renderCount.current++;
    console.log(`[${componentName}] Render #${renderCount.current}`);
  });

  return renderCount.current;
};
```

### Usage in components:

```javascript
import { useRenderCount } from "../hooks/useRenderCount";

function Video(props) {
  useRenderCount("Video"); // Logs each render
  // ... rest of component
}
```

---

## Step-by-Step Implementation Guide

1. **Start with OPTION 2** (Takes 2 minutes)
   - Just comment out one CSS line
   - Test if it helps
2. **Then add OPTION 1** (Takes 5 minutes)
   - Add React.memo wrapper
   - Add useMemo to context value
3. **Then add OPTION 3** (Takes 10 minutes)
   - Add cleanup code in scrollToVideo
   - Reduce preload count
4. **Test each step** with the diagnostic checklist
   - Does it feel smoother?
   - Does memory stay stable?
   - Are there fewer dropped frames?

5. **If still not fixed, try OPTION 4** (Takes 15 minutes)
   - Add video compression on backend
   - Add quality parameters

6. **If still freezing, consider OPTION 5** (Takes 30 minutes)
   - Virtual scrolling is the nuclear option
   - Should fix all remaining issues

---

## How to Verify Each Fix Works

After EACH change:

```javascript
// Add to your Video component temporarily
useEffect(() => {
  console.time("video-swap");
  return () => console.timeEnd("video-swap");
}, [currentVideo?._id]);
```

### Check these metrics:

- **Time between log entries** should be <500ms
- **Console logs** should be cleaner (fewer renders)
- **Memory usage** should be stable
- **FPS** should stay above 50fps
