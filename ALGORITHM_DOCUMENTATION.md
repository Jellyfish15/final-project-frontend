# Adaptive Video Recommendation Algorithm

## Overview
This algorithm tracks user engagement in real-time and adapts content recommendations to maintain viewer interest while prioritizing educational content.

## Key Features

### 1. **Engagement Tracking**
Monitors multiple signals of user attention:
- **Watch Time**: Tracks how much of each video is watched
- **Completion Rate**: Percentage of video completed (0-100%)
- **Interactions**: Likes, comments, shares
- **Attention Signals**: 
  - Pause count (frequent pausing = confusion/boredom)
  - Seek count (skipping = disinterest)
  - Replays (rewatching = high interest)
  - Skip behavior (when and why user skips)

### 2. **Disengagement Detection**
Automatically detects when users are losing interest based on:
- **Low Completion Rate** (<30% watched)
- **Excessive Skipping** (>60% of recent videos skipped)
- **Low Engagement Score** (<30 points)
- **Rapid Scrolling** (spending <10 seconds per video)

Severity levels:
- **0-30**: Engaged
- **31-60**: Moderate disengagement
- **61-100**: High disengagement

### 3. **Adaptive Content Strategy**

#### When User is Engaged:
- Serves content based on learned preferences
- Prioritizes categories with highest engagement scores
- Balances new content with familiar topics
- Maintains educational focus

#### When User is Disengaging:
- **Immediate Response**: Switches to more entertaining content
- **Entertainment Ratio**: Proportional to disengagement severity
  - 40% disengaged → 40% entertainment, 60% educational
  - 80% disengaged → 70% entertainment, 30% educational (max)
- **Content Mix**:
  - Popular videos (high views/likes)
  - Shorter videos (<3 minutes)
  - Lighter categories (art, music, sports, cooking)
  - Simpler educational content

### 4. **Engagement Score Calculation**
Each video interaction gets a score (0-100):

**Positive Factors:**
- Completion rate: Up to 40 points
- Liked: +15 points
- Commented: +20 points
- Shared: +25 points
- Replays: +3 points each (max 10)

**Negative Factors:**
- Frequent pausing (>3 times): -5 points
- Excessive seeking (>5 times): -10 points
- Early skip (<30% watched): -15 points

### 5. **Category Preference Learning**
- Analyzes last 50 videos watched
- Calculates average engagement score per category
- Builds weighted preference profile
- Updates dynamically with each interaction

## Implementation

### Backend Components

#### 1. **Engagement Model** (`models/Engagement.js`)
Stores detailed engagement data per video:
```javascript
{
  userId, videoId, sessionId,
  watchTime, completionRate, engagementScore,
  liked, commented, shared,
  replays, pauseCount, seekCount, skippedAt,
  category, timestamps
}
```

#### 2. **Recommendation Algorithm** (`services/RecommendationAlgorithm.js`)
Core logic for:
- Calculating engagement scores
- Detecting disengagement
- Building user preference profiles
- Generating personalized feeds
- Predicting video engagement

#### 3. **API Routes** (`routes/recommendations.js`)
Endpoints:
- `GET /api/recommendations/feed` - Get personalized videos
- `POST /api/recommendations/track` - Track engagement
- `GET /api/recommendations/preferences` - Get user preferences
- `GET /api/recommendations/disengagement-check` - Check engagement status
- `GET /api/recommendations/stats` - Get engagement statistics

### Frontend Components

#### 1. **useVideoEngagement Hook** (`hooks/useEngagement.js`)
Automatically tracks video interactions:
- Time updates
- Pauses
- Seeks
- Skips
- Sends data to backend every 5 seconds

#### 2. **useRecommendations Hook** (`hooks/useEngagement.js`)
Manages recommendation feed:
- Generates unique session IDs
- Fetches personalized videos
- Monitors disengagement
- Auto-refreshes when disengagement detected

## Usage Example

### In Video Component:
```javascript
import { useVideoEngagement, useRecommendations } from '../hooks/useEngagement';

function VideoPlayer({ video }) {
  const videoRef = useRef(null);
  const { recommendations, sessionId } = useRecommendations();
  const { engagementData, handleSkip } = useVideoEngagement(
    videoRef,
    video,
    sessionId
  );

  // Video automatically tracked!
  return <video ref={videoRef} />;
}
```

### In Videos Feed:
```javascript
const { 
  recommendations, 
  disengagement, 
  preferences,
  fetchRecommendations 
} = useRecommendations();

useEffect(() => {
  fetchRecommendations(20); // Get 20 personalized videos
}, []);

// recommendations array now contains optimized content
```

## Algorithm Flow

```
1. User starts watching videos
   ↓
2. Track engagement metrics in real-time
   ↓
3. Calculate engagement score for each video
   ↓
4. Check for disengagement signals
   ↓
5a. [Engaged] → Serve content based on preferences
5b. [Disengaging] → Mix in entertaining content
   ↓
6. Update user preference profile
   ↓
7. Refine recommendations
   ↓
8. Loop back to step 2
```

## Key Benefits

1. **Maintains Engagement**: Prevents user drop-off by adapting content
2. **Educational Priority**: Keeps focus on learning when user is engaged
3. **Hook Strategy**: Uses entertaining content strategically to re-engage
4. **Personalization**: Learns individual preferences over time
5. **Real-time Adaptation**: Responds immediately to engagement changes
6. **Data-Driven**: Makes decisions based on actual behavior, not guesses

## Metrics Dashboard

Track algorithm performance:
- Average engagement score
- Completion rates by category
- Disengagement frequency
- Content mix distribution
- User retention over time

## Future Enhancements

1. **ML Integration**: Use machine learning for better predictions
2. **A/B Testing**: Test different engagement thresholds
3. **Social Signals**: Factor in peer engagement
4. **Time of Day**: Adapt to when users prefer certain content
5. **Difficulty Levels**: Match content complexity to user knowledge
6. **Collaborative Filtering**: Recommend based on similar users

## Testing

To test the algorithm:
1. Create multiple test accounts with different viewing patterns
2. Track how recommendations change based on engagement
3. Monitor disengagement detection accuracy
4. Verify entertainment content kicks in when needed
5. Check preference learning over time

## Configuration

Adjust algorithm sensitivity in `RecommendationAlgorithm.js`:
- `disengagementThreshold`: Currently 30 (0-100)
- `entertainmentMaxRatio`: Currently 0.7 (70%)
- `recentVideosLimit`: Currently 50
- `trackingInterval`: Currently 5 seconds

## Privacy & Data

All engagement data:
- Stored per user session
- Used only for personalization
- Not shared with third parties
- Can be cleared by user
- GDPR compliant
