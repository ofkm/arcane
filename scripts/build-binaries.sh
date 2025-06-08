#!/bin/bash

set -e

VERSION=${VERSION:-"0.15.0"}
REVISION=${REVISION:-$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")}
LDFLAGS="-w -s -X main.version=$VERSION -X main.revision=$REVISION"

echo "Building Arcane static binary v$VERSION ($REVISION)..."

# Build frontend
echo "Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Build backend with frontend embedded
echo "Building backend..."
cd backend

# Copy frontend build to backend
rm -rf frontend/dist
mkdir -p frontend/dist
cp -r ../frontend/build/* frontend/dist/

# Build static binary
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 go build \
    -ldflags="$LDFLAGS -extldflags '-static'" \
    -a -installsuffix cgo \
    -o ../bin/arcane-linux-amd64 \
    ./cmd/main.go

# Build for other platforms
echo "Building for multiple platforms..."

# macOS (Intel)
CGO_ENABLED=0 GOOS=darwin GOARCH=amd64 go build \
    -ldflags="$LDFLAGS" \
    -o ../bin/arcane-darwin-amd64 \
    ./cmd/main.go

# macOS (Apple Silicon)
CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 go build \
    -ldflags="$LDFLAGS" \
    -o ../bin/arcane-darwin-arm64 \
    ./cmd/main.go

# Windows
CGO_ENABLED=0 GOOS=windows GOARCH=amd64 go build \
    -ldflags="$LDFLAGS" \
    -o ../bin/arcane-windows-amd64.exe \
    ./cmd/main.go

cd ..

echo "Static binaries built successfully:"
ls -la bin/