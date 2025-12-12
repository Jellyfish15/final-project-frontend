# Deploying Nudl Backend to Render.com

## Prerequisites
1. MongoDB Atlas account (free tier): https://www.mongodb.com/cloud/atlas
2. Render.com account (free tier): https://render.com
3. Your GitHub repository pushed with latest changes

## Step 1: Set Up MongoDB Atlas (if not already done)

1. Go to https://www.mongodb.com/cloud/atlas
2. Sign up or log in
3. Create a new cluster (Free tier - M0)
4. Click "Connect" → "Connect your application"
5. Copy the connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/nudl?retryWrites=true&w=majority`)
6. Replace `<password>` with your actual database password
7. Keep this connection string - you'll need it for Render

## Step 2: Deploy Backend to Render

1. **Go to Render Dashboard**
   - Visit https://dashboard.render.com
   - Sign in with GitHub

2. **Create New Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository: `Jellyfish15/final-project-frontend`
   - Click "Connect"

3. **Configure Service**
   - **Name**: `nudl-backend` (or any name you prefer)
   - **Region**: Oregon (or closest to you)
   - **Branch**: `stage-1-frontend-and-api`
   - **Root Directory**: `backend`
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: Free

4. **Add Environment Variables**
   Click "Advanced" and add these environment variables:

   | Key | Value | Notes |
   |-----|-------|-------|
   | `NODE_ENV` | `production` | Required |
   | `PORT` | `5000` | Render provides this automatically |
   | `MONGODB_URI` | `mongodb+srv://...` | Paste your MongoDB Atlas connection string |
   | `JWT_SECRET` | Click "Generate" | Render will auto-generate a secure secret |
   | `VITE_YOUTUBE_API_KEY` | `AIzaSyDXO042FUsGMRkt3OiFpyRqPyp_kUiMhA8` | Your YouTube API key |

5. **Deploy**
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment
   - You'll get a URL like: `https://nudl-backend.onrender.com`

## Step 3: Update Frontend Configuration

1. **Update `.env.production`**
   ```env
   VITE_API_URL=https://your-backend-name.onrender.com/api
   ```
   Replace `your-backend-name` with your actual Render service name.

2. **Push to GitHub**
   ```bash
   git add .
   git commit -m "Update production API URL for Render deployment"
   git push origin stage-1-frontend-and-api
   ```

3. **GitHub Pages will auto-rebuild** with the new environment variable

## Step 4: Verify Deployment

1. **Test Backend Health**
   - Visit: `https://your-backend-name.onrender.com/health`
   - Should return: `{"status":"OK","timestamp":"...","environment":"production"}`

2. **Test YouTube Cache API**
   - Visit: `https://your-backend-name.onrender.com/api/youtube-cache/stats`
   - Should return cache statistics

3. **Test Frontend**
   - Visit your GitHub Pages site: `https://jellyfish15.github.io/final-project-frontend/`
   - Videos should now load properly!

## Important Notes

### Free Tier Limitations
- **Render Free Plan**: 
  - Spins down after 15 minutes of inactivity
  - First request after spin-down takes ~30 seconds to wake up
  - 750 hours/month free (enough for continuous operation)

### MongoDB Atlas Free Tier
- 512 MB storage
- Shared CPU
- Perfect for development and small projects

### Keeping Backend Active (Optional)
If you want to keep your backend from spinning down:
1. Use a service like UptimeRobot (free) to ping your health endpoint every 14 minutes
2. Or upgrade to Render paid plan ($7/month)

## Troubleshooting

### Backend won't start
- Check logs in Render dashboard
- Verify all environment variables are set correctly
- Ensure MongoDB Atlas IP whitelist includes `0.0.0.0/0` (allow from anywhere)

### Frontend can't connect to backend
- Check browser console for CORS errors
- Verify `VITE_API_URL` in `.env.production` matches your Render URL
- Ensure backend CORS allows your GitHub Pages domain (already configured)

### Videos not loading
- Check MongoDB connection - go to MongoDB Atlas → Network Access → ensure "0.0.0.0/0" is whitelisted
- Verify YouTube API key is valid
- Check Render logs for errors

## Maintenance

### Viewing Logs
- Go to Render dashboard → Your service → Logs tab

### Updating Backend
- Push changes to GitHub
- Render will auto-deploy (takes 2-3 minutes)

### Manual Deploy
- Render dashboard → Your service → "Manual Deploy" → "Deploy latest commit"

## Cost Breakdown
- **Render Backend**: $0/month (free tier)
- **MongoDB Atlas**: $0/month (free tier)
- **GitHub Pages**: $0/month (free)
- **Total**: $0/month 🎉

## Next Steps After Deployment
1. Set up UptimeRobot to keep backend active (optional)
2. Run the daily cache script: `node backend/scripts/cacheDailyVideos.js 28`
3. Monitor usage and upgrade if needed
