#!/usr/bin/env sh
set -eu

# Usage: download-compose.sh <version> <dest-path> [target-arch]
#   version:        e.g. 2.39.2
#   dest-path:      absolute path where the binary will be written
#   target-arch:    buildx TARGETARCH (amd64|arm64). If omitted, inferred.

VERSION="${1:-${COMPOSE_VERSION:-2.39.2}}"
DEST="${2:-/usr/local/bin/docker-compose}"
TARGETARCH_IN="${3:-${TARGETARCH:-}}"

# Normalize architecture
ARCH_GH=""
case "${TARGETARCH_IN}" in
  amd64|"") ARCH_GH="x86_64" ;;
  arm64)    ARCH_GH="aarch64" ;;
  *)
    # Try uname -m as last resort
    UNAME_ARCH="$(uname -m 2>/dev/null || echo x86_64)"
    case "${UNAME_ARCH}" in
      x86_64|amd64) ARCH_GH="x86_64" ;;
      aarch64|arm64) ARCH_GH="aarch64" ;;
      *) ARCH_GH="x86_64" ;;
    esac
    ;;
esac

URL="https://github.com/docker/compose/releases/download/v${VERSION}/docker-compose-linux-${ARCH_GH}"

echo "Downloading docker-compose v${VERSION} (${ARCH_GH}) -> ${DEST}"
mkdir -p "$(dirname "${DEST}")"
curl -fsSL --retry 3 --retry-delay 2 -o "${DEST}" "${URL}"
chmod +x "${DEST}"
echo "docker-compose installed at ${DEST}"