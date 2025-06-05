#!/bin/bash
# filepath: /Users/kylemendell/dev/ofkm/arcane/build.sh

set -e

echo "🚀 Building Arcane..."

# Build the frontend
echo "📦 Building frontend..."
cd frontend
npm ci
npm run build

# Copy built files to backend static directory
echo "📋 Copying frontend build to backend..."
rm -rf ../backend/static
mkdir -p ../backend/static
cp -r build/* ../backend/static/

cd ..

# Build the backend
echo "🔧 Building backend..."
cd backend
go mod tidy
go build -o arcane ./cmd/main.go

echo "✅ Build complete! Binary: backend/arcane"
echo "🌐 To run: cd backend && ./arcane"