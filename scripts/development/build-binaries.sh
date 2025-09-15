#!/usr/bin/env bash
set -euo pipefail

cd backend
mkdir -p .bin

# Read version from repo root .version (trim whitespace), fallback to "dev"
VERSION=$(cat ../.version | sed 's/^\s*\|\s*$//g')
REVISION=$(cat ../.revision 2>/dev/null || git rev-parse --short HEAD 2>/dev/null || echo "unknown")

LDFLAGS="-w -s -buildid=${VERSION} \
  -X github.com/ofkm/arcane-backend/internal/config.Version=${VERSION} \
  -X github.com/ofkm/arcane-backend/internal/config.Revision=${REVISION}" 

DOCKER_ONLY=false
AGENT_BUILD=false

for arg in "${@:-}"; do
  case "$arg" in
    --docker) DOCKER_ONLY=true ;;
    --agent)  AGENT_BUILD=true ;;
    *) ;;
  esac
done

# Decide binary base name and build tags
BINARY_BASENAME="arcane"
BUILD_TAGS=""
if [ "$AGENT_BUILD" = true ]; then
  BINARY_BASENAME="arcane-agent"
  BUILD_TAGS="exclude_frontend"
fi

build_platform() {
  local target="$1" os="$2" arch="$3" arm_version="${4:-}"

  local ext=""
  local output_path=".bin/${BINARY_BASENAME}-${target}${ext}"

  if [ -n "$arm_version" ]; then
    printf "Building %s (GOOS=%s GOARCH=%s GOARM=%s)%s ... " \
      "$output_path" "$os" "$arch" "$arm_version" "${BUILD_TAGS:+ tags=$BUILD_TAGS}"
  else
    printf "Building %s (GOOS=%s GOARCH=%s)%s ... " \
      "$output_path" "$os" "$arch" "${BUILD_TAGS:+ tags=$BUILD_TAGS}"
  fi

  local build_flags=()
  if [ -n "$BUILD_TAGS" ]; then
    build_flags=(-tags "$BUILD_TAGS")
  fi

  if [ -n "$arm_version" ]; then
    GOARM="$arm_version" CGO_ENABLED=0 GOOS="$os" GOARCH="$arch" \
      go build "${build_flags[@]}" -ldflags="$LDFLAGS" -trimpath -o "$output_path" ./cmd/main.go
  else
    CGO_ENABLED=0 GOOS="$os" GOARCH="$arch" \
      go build "${build_flags[@]}" -ldflags="$LDFLAGS" -trimpath -o "$output_path" ./cmd/main.go
  fi

  echo "Done"
}

if [ "$DOCKER_ONLY" = true ]; then
  echo "Version: ${VERSION}"
  if [ "$AGENT_BUILD" = true ]; then
    echo "Building agent binaries for Docker platforms only (linux/amd64, linux/arm64)..."
  else
    echo "Building binaries for Docker platforms only (linux/amd64, linux/arm64)..."
  fi
  build_platform "linux-amd64" "linux" "amd64"
  build_platform "linux-arm64" "linux" "arm64"
else
  echo "Version: ${VERSION}"
  if [ "$AGENT_BUILD" = true ]; then
    echo "Building agent binaries for all platforms..."
  else
    echo "Building binaries for all platforms..."
  fi
  build_platform "linux-amd64" "linux" "amd64"
  build_platform "linux-386"   "linux" "386"
  build_platform "linux-arm64" "linux" "arm64"
  build_platform "linux-armv7" "linux" "arm" "7"
  build_platform "macos-x64"   "darwin" "amd64"
  build_platform "macos-arm64" "darwin" "arm64"
fi

echo "Compilation done"