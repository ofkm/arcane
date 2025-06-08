#!/bin/bash

set -e

echo "Building Arcane for development..."

# Build frontend
echo "Building frontend..."
cd frontend
npm install
npm run build
cd ..

# Build backend with frontend embedded
echo "Building backend..."
cd backend
go build -o ../bin/arcane-dev ./cmd/main.go
cd ..

echo "Development build complete! Binary: ./bin/arcane-dev"