#!/usr/bin/env bash
set -euo pipefail

echo "[test-release] Dry-run release script (no files mutated)"

# Preconditions
if [ ! -f .version ] || [ ! -f frontend/package.json ] || [ ! -f CHANGELOG.md ]; then
  echo "Error: run from project root."
  exit 1
fi

need() {
  if ! command -v "$1" &>/dev/null; then
    echo "Missing required tool: $1"
    exit 1
  fi
}

need git
need jq
need awk
need sed

if ! command -v git-cliff &>/dev/null && ! command -v git\ cliff &>/dev/null; then
  if ! command -v git-cliff &>/dev/null; then
    echo "Error: git-cliff (git cliff) not installed."
    exit 1
  fi
fi

if ! command -v gh &>/dev/null; then
  echo "Warning: gh not installed"
fi

git fetch --tags --quiet || true

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$BRANCH" != "main" ]; then
  echo "Error: must be on main (current: $BRANCH)."
  exit 1
fi

CURRENT_VERSION=$(cat .version)
echo "[test-release] Current version: $CURRENT_VERSION"

increment_version() {
  local version=$1 part=$2
  IFS='.' read -r -a p <<<"$version"
  case "$part" in
    major) p[0]=$((p[0]+1)); p[1]=0; p[2]=0 ;;
    minor) p[1]=$((p[1]+1)); p[2]=0 ;;
    patch) p[2]=$((p[2]+1)) ;;
    *) echo "Invalid part '$part'"; exit 1 ;;
  esac
  echo "${p[0]}.${p[1]}.${p[2]}"
}

FORCE_MAJOR=false
for arg in "$@"; do
  case $arg in
    --major) FORCE_MAJOR=true ;;
    *) echo "Ignoring unknown arg: $arg" ;;
  esac
done

LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
RELEASE_TYPE="minor"

if [ "$FORCE_MAJOR" = true ]; then
  RELEASE_TYPE="major"
else
  if [ -z "$LATEST_TAG" ]; then
    RELEASE_TYPE="minor"
    echo "[test-release] No prior tag found -> default minor."
  else
    SUBJECTS=$(git log --no-merges --format=%s "${LATEST_TAG}..HEAD")
    if echo "$SUBJECTS" | grep -Eiq '^feat(\([^)]+\))?: '; then
      RELEASE_TYPE="minor"
    elif echo "$SUBJECTS" | grep -Eiq '^fix(\([^)]+\))?: '; then
      RELEASE_TYPE="patch"
    else
      echo "[test-release] No feat/fix since ${LATEST_TAG}. Would abort real release."
      RELEASE_TYPE="none"
    fi
  fi
fi

if [ "$RELEASE_TYPE" = "none" ]; then
  echo "[test-release] Exiting (nothing to release)."
  exit 0
fi

NEW_VERSION=$(increment_version "$CURRENT_VERSION" "$RELEASE_TYPE")
echo "[test-release] Detected release type: $RELEASE_TYPE"
echo "[test-release] Proposed new version: $NEW_VERSION"

LATEST_REVISION=$(git rev-parse --short HEAD)
echo "[test-release] Current revision: $LATEST_REVISION"

echo "[test-release] Simulating changelog generation..."

CLIFF_BIN="git-cliff"
if ! command -v git-cliff &>/dev/null && command -v git &>/dev/null; then
  CLIFF_BIN="git cliff"
fi

CLIFF_TOKEN_OPT=""
if command -v gh &>/dev/null; then
  TOKEN=$(gh auth token 2>/dev/null || true)
  if [ -n "${TOKEN}" ]; then
    CLIFF_TOKEN_OPT="--github-token=${TOKEN}"
  fi
fi

if command -v git-cliff &>/dev/null; then
  CHANGELOG_FRAGMENT=$(git-cliff ${CLIFF_TOKEN_OPT} --tag "v${NEW_VERSION}" --unreleased || true)
else
  CHANGELOG_FRAGMENT=""
fi

if [ -z "${CHANGELOG_FRAGMENT}" ]; then
  echo "Warning: git-cliff produced empty output (maybe no new conventional commits)."
else
  echo "----------- BEGIN CHANGELOG PREVIEW (v${NEW_VERSION}) -----------"
  echo "${CHANGELOG_FRAGMENT}"
  echo "------------ END CHANGELOG PREVIEW ------------------------------"
fi

echo
echo "[test-release] WOULD UPDATE FILES:"
echo "  .version -> ${NEW_VERSION}"
echo "  frontend/package.json version -> ${NEW_VERSION}"
echo "  .revision -> ${LATEST_REVISION}"
echo "  CHANGELOG.md (prepend new section)"
echo "[test-release] WOULD COMMIT: release: ${NEW_VERSION}"
echo "[test-release] WOULD TAG: v${NEW_VERSION}"
echo "[test-release] WOULD CREATE DRAFT GH RELEASE"
echo
echo "[test-release] Dry run complete. No changes were made."