#!/bin/bash

# Quick deploy script for Google Cloud Run
# Make sure you have gcloud CLI installed and configured

set -e

echo "🚀 Deploying Nudl Backend to Google Cloud Run..."

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ gcloud CLI not found. Please install it first:"
    echo "https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set project ID (replace with your project ID)
PROJECT_ID="nudl-backend"
SERVICE_NAME="nudl-backend"
REGION="us-central1"

echo "📦 Project: $PROJECT_ID"
echo "🌍 Region: $REGION"

# Prompt for environment variables if not set
if [ -z "$MONGODB_URI" ]; then
    read -p "Enter MongoDB URI: " MONGODB_URI
fi

if [ -z "$JWT_SECRET" ]; then
    read -p "Enter JWT Secret: " JWT_SECRET
fi

# Deploy to Cloud Run
echo "🔨 Building and deploying..."
gcloud run deploy $SERVICE_NAME \
  --source . \
  --platform managed \
  --region $REGION \
  --allow-unauthenticated \
  --set-env-vars="MONGODB_URI=$MONGODB_URI,JWT_SECRET=$JWT_SECRET,NODE_ENV=production" \
  --memory 512Mi \
  --timeout 300 \
  --max-instances 10 \
  --project $PROJECT_ID

echo "✅ Deployment complete!"
echo ""
echo "Your backend is now running at:"
gcloud run services describe $SERVICE_NAME --region $REGION --project $PROJECT_ID --format='value(status.url)'
echo ""
echo "📝 Next steps:"
echo "1. Copy the URL above"
echo "2. Add it to GitHub Secrets as VITE_API_URL (with /api suffix)"
echo "3. Update .env.production file"
echo "4. Push changes to trigger frontend deployment"
