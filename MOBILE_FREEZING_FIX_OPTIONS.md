# Mobile Video Freezing Issue - Fix Options

## Problem Analysis

Videos freeze when scrolling on mobile because of:

- Heavy re-renders during scroll transitions
- Large video files being loaded simultaneously
- Memory not being freed between video changes
- Inefficient touch event handling
- Unoptimized animations and CSS

---

## Option 1: Optimize Rendering Performance (HIGHEST IMPACT)

**Difficulty: Medium | Impact: Very High**

### Issue

The `Video` and `VideoContext` components re-render too frequently during scroll/swipe transitions, causing the UI thread to block.

### Solution Steps

1. **Memoize the Video component** to prevent re-renders from parent changes:
   - Wrap `Video` export with `React.memo`
   - This prevents re-rendering when parent re-renders

2. **Memoize VideoContext values** to prevent child re-renders:
   - In `VideoContext.jsx`, wrap the provider value object with `useMemo`
   - Only update when specific dependencies change

3. **Debounce touch events** to reduce event handler frequency:
   - Add a debounce hook to touch handlers
   - Reduces from 60+ events/second to 10-15/second

### Code Changes Needed

```javascript
// In Video.jsx
export default React.memo(Video);

// In VideoContext.jsx - wrap the provider value
const value = useMemo(
  () => ({
    // all context values here
  }),
  [
    /* only essential deps */
  ],
);

// Add touch event debouncing
const debouncedHandleTouchMove = useCallback(
  debounce((e) => handleTouchMove(e), 16), // ~60fps
  [handleTouchMove],
);
```

---

## Option 2: Disable Heavy Animations During Scroll (QUICK WIN)

**Difficulty: Easy | Impact: Medium**

### Issue

The CSS transition animations cause janky scrolling on mobile.

### Solution Steps

1. **Remove or reduce transition timing** on `.video-page__container`:
   - Current: `transition: transform 0.3s cubic-bezier(...)`
   - Change to: `transition: none` or `0.05s`

2. **Disable animations while user is swiping**:
   - Add a state flag `isUserSwiping`
   - Remove transitions when true, re-add when false

### Code Changes Needed

```css
/* In Video.css */
.video-page__container {
  transition: none; /* Or add a flag-based class */
}

.video-page__container.is-swiping {
  transition: none !important;
}

.video-page__container.is-settled {
  transition: transform 0.2s ease; /* Lighter animation */
}
```

---

## Option 3: Implement Aggressive Video Cleanup (MEDIUM IMPACT)

**Difficulty: Medium | Impact: High**

### Issue

Video elements aren't being properly cleaned up between scrolls, causing memory to accumulate and performance to degrade.

### Solution Steps

1. **Stop and unload previous video** immediately when switching:
   - Call `pause()` on old video
   - Set `src=""` to unload data
   - Reset video element properties

2. **Clear video preload cache** periodically:
   - Only keep 2-3 videos preloaded instead of 5
   - Remove preload data for videos far from current

3. **Implement video pooling**:
   - Reuse same video element instead of creating new ones
   - Clear src and reload it with new video URL

### Code Changes Needed

```javascript
// In VideoContext.jsx - in scrollToVideo function, add:
const oldVideo = videoRef.current;
if (oldVideo) {
  oldVideo.pause();
  oldVideo.src = ""; // Unload video data
  oldVideo.currentTime = 0;
  oldVideo.load(); // Clear buffered data
}

// In preload function, reduce aggressive preloading
const upcomingVideos = videos.slice(currentIndex + 1, currentIndex + 3); // Changed from 5 to 3
```

---

## Option 4: Reduce Video/Image Sizes (FOUNDATIONAL FIX)

**Difficulty: Easy | Impact: High**

### Issue

Large video files (10-50MB+) cause network bottlenecks and memory issues on mobile.

### Solution Steps

1. **Compress video files on backend**:
   - Reduce bitrate: 500-1000kbps for mobile
   - Reduce resolution: 480p-720p max
   - Use efficient codec: H.264 or HEVC

2. **Serve mobile-optimized versions**:
   - Detect mobile and serve lower-quality files
   - Create thumbnail/preview versions

3. **Optimize thumbnails**:
   - Limit to 50-100KB per image
   - Use WebP format for better compression
   - Serve different sizes for mobile/desktop

### Backend Changes (Node.js)

```javascript
// In backend/routes/videos.js - before sending video
const isMobile =
  req.query.mobile === "true" || /mobile/i.test(req.get("user-agent"));

if (isMobile) {
  // Serve lower quality or compressed version
  res.sendFile(path.join(__dirname, `${videoId}_mobile.mp4`));
} else {
  res.sendFile(path.join(__dirname, `${videoId}.mp4`));
}
```

---

## Option 5: Implement Virtual Scrolling (ADVANCED)

**Difficulty: Hard | Impact: Very High**

### Issue

React is maintaining DOM elements for videos that aren't visible, wasting memory and CPU.

### Solution Steps

1. **Use a virtual scroll library** (react-window or react-virtualized):
   - Only render videos currently visible + 1 above/below
   - Unmount/remount videos as user scrolls
   - Saves 60%+ memory and CPU

2. **Or implement manual virtual scrolling**:
   - Track which video indices should be rendered
   - Only render 2-3 videos at a time
   - Use placeholder/skeleton for off-screen videos

### Code Installation

```bash
npm install react-window
```

### Code Changes

```javascript
// In App.jsx or Video.jsx
import { FixedSizeList as List } from "react-window";

<List
  height={window.innerHeight}
  itemCount={videos.length}
  itemSize={window.innerHeight}
  width="100%"
>
  {({ index, style }) => (
    <VideoItem key={index} video={videos[index]} style={style} />
  )}
</List>;
```

---

## Option 6: Use Passive Touch Event Listeners (QUICK FIX)

**Difficulty: Easy | Impact: Low-Medium**

### Issue

Non-passive touch listeners can block scroll thread during event processing.

### Solution Steps

1. **Make touch event listeners passive**:
   - Passive listeners allow browser to scroll immediately
   - Doesn't block on preventDefault()

### Code Changes Needed

```javascript
// In VideoContext.jsx
container.addEventListener("touchstart", handleTouchStart, { passive: true });
container.addEventListener("touchmove", handleTouchMove, { passive: false }); // Only if preventDefault is needed
container.addEventListener("touchend", handleTouchEnd, { passive: true });
```

---

## Option 7: Reduce Context Update Frequency (MEDIUM IMPACT)

**Difficulty: Medium | Impact: Medium**

### Issue

The VideoContext updates every frame during scroll, causing all subscribed components to re-render.

### Solution Steps

1. **Separate animation state from data state**:
   - Scroll position/animation in local component state (not context)
   - Video data in context only
2. **Use useTransition hook** (React 18+):
   - Non-blocking state updates for scroll
   - Lets browser repaint between updates

3. **Batch state updates**:
   - Combine multiple setState calls
   - Update context less frequently

### Code Changes

```javascript
// In VideoContext.jsx
const [isPending, startTransition] = useTransition();

const scrollToVideo = useCallback(async (direction) => {
  startTransition(() => {
    // State updates won't block UI
    setCurrentIndex(newIndex);
    setIsVideoSwitching(true);
  });
}, []);
```

---

## Recommended Fix Strategy

### Phase 1: Quick Wins (Start Here)

1. **Option 2**: Disable heavy animations during scroll
2. **Option 6**: Add passive touch listeners
3. **Option 4**: Reduce video file sizes (if not already optimized)

**Expected improvement: 30-50%**

### Phase 2: Medium Effort

1. **Option 1**: Memoize components and context
2. **Option 3**: Implement aggressive video cleanup
3. **Option 7**: Reduce context update frequency

**Expected improvement: Additional 40-70%**

### Phase 3: Ultimate Fix (If needed)

1. **Option 5**: Virtual scrolling implementation

**Expected improvement: 80%+ total**

---

## Testing & Measuring Progress

### How to test on mobile:

```bash
# Use mobile Chrome DevTools
# 1. Right-click → Inspect → Toggle device toolbar
# 2. Performance tab → Record while scrolling
# 3. Look for dropped frames and jank

# Or test on real device
# Connect phone via USB, open chrome://inspect
```

### Key metrics to watch:

- **FPS during scroll**: Should stay 50+fps (60fps ideal)
- **Memory usage**: Should not exceed 50MB on mobile
- **Frame rate drops**: Should be <1% of total frames
- **Time to interactive**: <2s for next video

---

## Which Option Should You Choose?

| Situation                                    | Best Option                      |
| -------------------------------------------- | -------------------------------- |
| Videos freeze for 1-2 seconds when scrolling | Option 1, Option 3               |
| Smooth scroll but janky transition animation | Option 2                         |
| Memory usage increases over time             | Option 3, Option 4               |
| Very large video files                       | Option 4                         |
| Extreme freezing even on desktop             | Option 5 (Virtual Scrolling)     |
| Multiple quick swipes cause lag              | Option 2, Option 7               |
| Need comprehensive fix                       | All options in recommended order |

---

## Implementation Priority Order

1. **Option 2** (easiest, quick win)
2. **Option 1** (memoization, high impact)
3. **Option 3** (aggressive cleanup)
4. **Option 4** (if videos are large)
5. **Option 7** (optimization)
6. **Option 6** (passive listeners)
7. **Option 5** (if everything else doesn't fix it)
