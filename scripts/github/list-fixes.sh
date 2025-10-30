#!/usr/bin/env bash
set -euo pipefail

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get the latest release tag
LATEST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [ -z "$LATEST_TAG" ]; then
    echo -e "${YELLOW}No previous release tag found. Showing all fix commits:${NC}"
    RANGE="HEAD"
else
    echo -e "${GREEN}Latest release: ${LATEST_TAG}${NC}"
    RANGE="${LATEST_TAG}..HEAD"
fi

echo ""
echo -e "${BLUE}=== Fix commits on main branch since ${LATEST_TAG:-beginning} ===${NC}"
echo ""

# List all fix commits
FIX_COMMITS=$(git log "$RANGE" \
    --oneline \
    --no-merges \
    --grep="^fix:" \
    --grep="^hotfix:" \
    --regexp-ignore-case \
    --pretty=format:"%C(yellow)%h%Creset %C(green)%ai%Creset %s %C(dim)(%an)%Creset" || echo "")

if [ -z "$FIX_COMMITS" ]; then
    echo "No fix commits found."
else
    echo "$FIX_COMMITS"
fi

echo ""
echo ""
echo -e "${BLUE}=== How to create a hotfix release ===${NC}"
echo ""
echo "1. Start the hotfix release process:"
echo -e "   ${GREEN}./scripts/github/create-hotfix-release.sh${NC}"
echo ""
echo "2. Cherry-pick the fixes you want:"
echo -e "   ${GREEN}git cherry-pick <commit-hash>${NC}"
echo ""
echo "3. Finalize the release:"
echo -e "   ${GREEN}./scripts/github/finalize-hotfix-release.sh <tag>${NC}"
echo ""
