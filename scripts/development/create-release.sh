#!/usr/bin/env bash
set -euo pipefail

# Check if the script is being run from the root of the project
if [ ! -f .version ] || [ ! -f frontend/package.json ] || [ ! -f CHANGELOG.md ]; then
    echo "Error: This script must be run from the root of the project."
    exit 1
fi

# Check if conventional-changelog is installed, if not install it
if ! command -v conventional-changelog &>/dev/null; then
    echo "conventional-changelog not found, installing..."
    npm install -g conventional-changelog-cli
    if ! command -v conventional-changelog &>/dev/null; then
        echo "Error: Failed to install conventional-changelog-cli."
        exit 1
    fi
fi

# Check if GitHub CLI is installed
if ! command -v gh &>/dev/null; then
    echo "Error: GitHub CLI (gh) is not installed. Please install it and authenticate using 'gh auth login'."
    exit 1
fi

# Ensure local tags are up to date (don't fail if no remote)
git fetch --tags --quiet || true

# Check if we're on the main branch
if [ "$(git rev-parse --abbrev-ref HEAD)" != "main" ]; then
    echo "Error: This script must be run on the main branch."
    exit 1
fi

# Read the current version from .version
VERSION=$(cat .version)

# Function to increment the version
increment_version() {
    local version=$1
    local part=$2

    IFS='.' read -r -a parts <<<"$version"
    if [ "$part" == "major" ]; then
        parts[0]=$((parts[0] + 1))
        parts[1]=0
        parts[2]=0
    elif [ "$part" == "minor" ]; then
        parts[1]=$((parts[1] + 1))
        parts[2]=0
    elif [ "$part" == "patch" ]; then
        parts[2]=$((parts[2] + 1))
    fi
    echo "${parts[0]}.${parts[1]}.${parts[2]}"
}

# Parse command line arguments
FORCE_MAJOR=false
for arg in "$@"; do
    case $arg in
    --major)
        FORCE_MAJOR=true
        shift
        ;;
    *)
        ;;
    esac
done

# Determine the release type
if [ "$FORCE_MAJOR" == true ]; then
    RELEASE_TYPE="major"
else
    LATEST_TAG=$(git describe --tags --abbrev=0 || echo "")
    if [ -z "$LATEST_TAG" ]; then
        RELEASE_TYPE="minor"
    else
        # Look only at commit subjects since the last tag (exclude merges)
        SUBJECTS=$(git log --no-merges --format=%s "${LATEST_TAG}..HEAD")

        if echo "$SUBJECTS" | grep -Eiq '^feat(\([^)]+\))?: '; then
            RELEASE_TYPE="minor"
        elif echo "$SUBJECTS" | grep -Eiq '^fix(\([^)]+\))?: '; then
            RELEASE_TYPE="patch"
        else
            echo "No 'fix' or 'feat' commits found since the latest release (${LATEST_TAG}). No new release will be created."
            echo "Commits since ${LATEST_TAG}:"
            git log --oneline --no-merges "${LATEST_TAG}..HEAD" || true
            exit 0
        fi
    fi
fi

# Increment the version based on the release type
if [ "$RELEASE_TYPE" == "major" ]; then
    echo "Performing major release..."
    NEW_VERSION=$(increment_version "$VERSION" major)
elif [ "$RELEASE_TYPE" == "minor" ]; then
    echo "Performing minor release..."
    NEW_VERSION=$(increment_version "$VERSION" minor)
elif [ "$RELEASE_TYPE" == "patch" ]; then
    echo "Performing patch release..."
    NEW_VERSION=$(increment_version "$VERSION" patch)
else
    echo "Invalid release type. Please enter either 'major', 'minor', or 'patch'."
    exit 1
fi

# Confirm release creation
read -p "This will create a new $RELEASE_TYPE release with version $NEW_VERSION. Do you want to proceed? (y/n) " CONFIRM
if [[ "$CONFIRM" != "y" ]]; then
    echo "Release process canceled."
    exit 1
fi

# Update the .version file with the new version
echo "$NEW_VERSION" > .version
git add .version

# Update version in frontend/package.json
jq --arg new_version "$NEW_VERSION" '.version = $new_version' frontend/package.json > frontend/package_tmp.json && mv frontend/package_tmp.json frontend/package.json
git add frontend/package.json

# Create/Update .revision file with the latest commit short hash
echo "Creating/Updating .revision file..."
LATEST_REVISION=$(git rev-parse --short HEAD)
echo "$LATEST_REVISION" > .revision
git add .revision

# Generate changelog
echo "Generating changelog..."
conventional-changelog -p conventionalcommits -i CHANGELOG.md -s
git add CHANGELOG.md

# Commit the changes with the new version
git commit -m "release: $NEW_VERSION"

# Create a Git tag with the new version
git tag "v$NEW_VERSION"

# Push the commit and the tag to the repository
git push
git push --tags

# Extract the changelog content for the latest release
echo "Extracting changelog content for version $NEW_VERSION..."
CHANGELOG=$(awk '/^## / {if (NR > 1) exit} NR > 1 {print}' CHANGELOG.md | awk 'NR > 2 || NF {print}')

if [ -z "$CHANGELOG" ]; then
    echo "Error: Could not extract changelog for version $NEW_VERSION."
    exit 1
fi

# Create the draft release on GitHub
echo "Creating GitHub draft release..."
gh release create "v$NEW_VERSION" --title "v$NEW_VERSION" --notes "$CHANGELOG" --draft

if [ $? -eq 0 ]; then
    echo "GitHub draft release created successfully."
else
    echo "Error: Failed to create GitHub release."
    exit 1
fi

echo "Release process complete. New version: $NEW_VERSION"
