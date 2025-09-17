#!/usr/bin/env sh
set -eu

# Usage: download-docker.sh <platform> <arch> <version>
PLATFORM_IN="${1:-}"
ARCH_IN="${2:-}"
VERSION_IN="${3:-}"

if [ -z "${PLATFORM_IN}" ] || [ -z "${ARCH_IN}" ] || [ -z "${VERSION_IN}" ]; then
  echo "Usage: $0 <platform> <arch> <version>" >&2
  exit 1
fi

# strip leading 'v' if present
DOCKER_VERSION="${VERSION_IN#v}"

PLATFORM="${PLATFORM_IN}"
case "${PLATFORM}" in
  darwin) PLATFORM="mac" ;;
esac

ARCH="${ARCH_IN}"
case "${ARCH}" in
  amd64) ARCH="x86_64" ;;
  arm)   ARCH="armhf" ;;
  arm64) ARCH="aarch64" ;;
  ppc64le|s390x)
    DOCKER_VERSION="28.4.0"
    ;;
  *)
    # try to infer from uname as a last resort
    UNAME_ARCH="$(uname -m 2>/dev/null || echo x86_64)"
    case "${UNAME_ARCH}" in
      x86_64|amd64) ARCH="x86_64" ;;
      aarch64|arm64) ARCH="aarch64" ;;
      *) ARCH="x86_64" ;;
    esac
    ;;
esac

DOWNLOAD_FOLDER=".tmp/download"
DEST_DIR="dist"

rm -rf "${DOWNLOAD_FOLDER}"
mkdir -p "${DOWNLOAD_FOLDER}"
mkdir -p "${DEST_DIR}"

TARGZ_PATH="${DOWNLOAD_FOLDER}/docker-binaries.tgz"
URL="https://download.docker.com/${PLATFORM}/static/stable/${ARCH}/docker-${DOCKER_VERSION}.tgz"

echo "Downloading docker ${DOCKER_VERSION} for ${PLATFORM}/${ARCH} -> ${TARGZ_PATH}"
curl -fsSL --retry 3 --retry-delay 2 -o "${TARGZ_PATH}" "${URL}"
tar -xf "${TARGZ_PATH}" -C "${DOWNLOAD_FOLDER}"

# extracted layout: docker/docker
if [ -f "${DOWNLOAD_FOLDER}/docker/docker" ]; then
  mv "${DOWNLOAD_FOLDER}/docker/docker" "${DEST_DIR}/docker"
  chmod +x "${DEST_DIR}/docker"
  echo "docker installed at ${DEST_DIR}/docker"
else
  echo "Expected docker binary not found in archive" >&2
  exit 2
fi

# cleanup
rm -rf "${DOWNLOAD_FOLDER}"