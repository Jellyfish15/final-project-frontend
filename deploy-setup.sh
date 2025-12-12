#!/bin/bash

# Quick Deployment Setup Script
# This script helps you prepare for Render deployment

echo "🚀 Nudl Backend Deployment Setup"
echo "================================="
echo ""

# Check if MongoDB Atlas connection string is available
echo "📝 Prerequisites Checklist:"
echo ""
echo "✓ MongoDB Atlas account created? (https://mongodb.com/cloud/atlas)"
echo "✓ Database user and password created in Atlas?"
echo "✓ Network Access set to 0.0.0.0/0 in Atlas?"
echo "✓ Render.com account created? (https://render.com)"
echo "✓ GitHub repository up to date?"
echo ""

# Commit current changes
echo "💾 Committing deployment configuration..."
git add render.yaml DEPLOYMENT.md backend/server.js
git status

echo ""
echo "Ready to commit? (Press Enter to continue, Ctrl+C to cancel)"
read -r

git commit -m "Add Render deployment configuration

- Added render.yaml for automated deployment
- Added DEPLOYMENT.md with step-by-step guide
- Added /health endpoint for Render health checks
- Ready for production deployment to Render.com"

echo ""
echo "📤 Push to GitHub? (Press Enter to push, Ctrl+C to cancel)"
read -r

git push origin stage-1-frontend-and-api

echo ""
echo "✅ Configuration pushed to GitHub!"
echo ""
echo "📋 Next Steps:"
echo "1. Go to https://dashboard.render.com"
echo "2. Click 'New +' → 'Web Service'"
echo "3. Connect your GitHub repo: Jellyfish15/final-project-frontend"
echo "4. Follow the DEPLOYMENT.md guide for configuration"
echo ""
echo "📖 Full guide: See DEPLOYMENT.md in your project root"
echo ""
