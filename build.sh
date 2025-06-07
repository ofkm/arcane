#!/bin/bash

set -e

echo "🚀 Building Arcane..."

# Build the frontend
echo "📦 Building frontend..."
cd frontend
npm i
npm run build

cd ..

# Build the backend
echo "🔧 Building backend..."
cd backend
go mod tidy
go build -o arcane ./cmd/main.go

echo "✅ Build complete! Binary: backend/arcane"
echo "🌐 To run: cd backend && ./arcane"