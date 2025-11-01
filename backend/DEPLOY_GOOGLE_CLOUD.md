# Deploying Backend to Google Cloud Run

## Prerequisites

1. Google Cloud account (Free tier available)
2. gcloud CLI installed: https://cloud.google.com/sdk/docs/install
3. Docker installed (optional, Cloud Build can build for you)

## Setup Steps

### 1. Initialize Google Cloud

```bash
# Login to Google Cloud
gcloud auth login

# Create a new project (or use existing)
gcloud projects create nudl-backend --name="Nudl Backend"

# Set the project
gcloud config set project nudl-backend

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

### 2. Set Environment Variables

Create a `.env.yaml` file with your environment variables (DO NOT commit this):

```yaml
MONGODB_URI: "your-mongodb-connection-string"
JWT_SECRET: "your-secret-key"
NODE_ENV: "production"
```

### 3. Deploy to Cloud Run

#### Option A: Deploy with gcloud (Recommended)

```bash
# Navigate to backend directory
cd backend

# Deploy to Cloud Run
gcloud run deploy nudl-backend \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --env-vars-file .env.yaml \
  --memory 512Mi \
  --timeout 300 \
  --max-instances 10

# The deployment will provide a URL like:
# https://nudl-backend-xxxxx-uc.a.run.app
```

#### Option B: Deploy with Docker manually

```bash
# Build the Docker image
docker build -t gcr.io/nudl-backend/api .

# Push to Google Container Registry
docker push gcr.io/nudl-backend/api

# Deploy to Cloud Run
gcloud run deploy nudl-backend \
  --image gcr.io/nudl-backend/api \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### 4. Set Environment Variables via Console

Alternatively, set environment variables in Cloud Run console:

1. Go to Cloud Run: https://console.cloud.google.com/run
2. Click on your service
3. Click "EDIT & DEPLOY NEW REVISION"
4. Under "Container" → "Variables & Secrets"
5. Add:
   - `MONGODB_URI`
   - `JWT_SECRET`
   - `NODE_ENV=production`

### 5. Configure Custom Domain (Optional)

```bash
# Map custom domain
gcloud run domain-mappings create \
  --service nudl-backend \
  --domain api.yourdomain.com \
  --region us-central1
```

### 6. Update Frontend Configuration

After deployment, update your frontend:

1. Copy the Cloud Run URL (e.g., `https://nudl-backend-xxxxx-uc.a.run.app`)
2. Add to GitHub Secrets:
   - Go to GitHub → Settings → Secrets and variables → Actions
   - Add secret: `VITE_API_URL` = `https://nudl-backend-xxxxx-uc.a.run.app/api`
3. Update `.env.production`:
   ```
   VITE_API_URL=https://nudl-backend-xxxxx-uc.a.run.app/api
   ```

### 7. Update CORS in Backend

The CORS configuration is already set to allow GitHub Pages domains.
Make sure `NODE_ENV=production` is set in Cloud Run environment variables.

## Monitoring and Logs

```bash
# View logs
gcloud run services logs read nudl-backend --region us-central1

# View metrics
gcloud run services describe nudl-backend --region us-central1
```

## Cost Estimate

Cloud Run Free Tier includes:

- 2 million requests/month
- 360,000 GB-seconds of memory
- 180,000 vCPU-seconds

Your app should stay within free tier for development/moderate usage.

## Troubleshooting

### Issue: Container fails to start

- Check logs: `gcloud run services logs read nudl-backend`
- Verify PORT environment variable is used in server.js
- Check MongoDB connection string

### Issue: CORS errors

- Ensure `NODE_ENV=production` is set
- Verify GitHub Pages URL is in CORS whitelist
- Check logs for CORS-related errors

### Issue: Database connection fails

- Verify MongoDB Atlas IP whitelist includes `0.0.0.0/0` for Cloud Run
- Check MONGODB_URI format
- Test connection locally with production credentials

## Continuous Deployment (Optional)

Set up automatic deployments from GitHub:

1. Connect Cloud Build to your GitHub repository
2. Create `cloudbuild.yaml` in backend folder
3. Configure build triggers for automatic deployment on push
