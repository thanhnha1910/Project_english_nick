#!/bin/bash
# Build script for Render deployment
set -e

echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt

echo "📦 Installing frontend dependencies..."
cd ../frontend
npm install

echo "🔨 Building frontend..."
npm run build

echo "📂 Copying frontend build to backend..."
rm -rf ../backend/frontend_dist
cp -r dist ../backend/frontend_dist

echo "✅ Build complete!"
