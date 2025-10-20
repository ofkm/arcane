#!/usr/bin/env bash
set -euo pipefail

# Read version from .version file (trim whitespace), fallback to "dev"
VERSION=$(cat .version | sed 's/^\s*\|\s*$//g' || echo "dev")

# Get git revision (short commit hash), fallback to "unknown"
REVISION=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

# Parse optional arguments
TAG="${1:-arcane:latest}"
PULL="${2:---pull}"

echo "Building Docker image: ${TAG}"
echo "  VERSION: ${VERSION}"
echo "  REVISION: ${REVISION}"
echo ""

docker build ${PULL} --rm \
  -f 'docker/Dockerfile' \
  --build-arg VERSION="${VERSION}" \
  --build-arg REVISION="${REVISION}" \
  -t "${TAG}" \
  .

echo ""
echo "✓ Build complete: ${TAG}"
