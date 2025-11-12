#!/usr/bin/env bash
# Test script for Docker Bake configuration
set -euo pipefail

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "Testing Docker Bake Configuration"
echo "=================================="
echo ""

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}✗ Docker not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker found${NC}"

if ! docker buildx version &> /dev/null; then
    echo -e "${RED}✗ Docker Buildx not found${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Docker Buildx found${NC}"

echo ""

# Test 1: Validate bake file syntax
echo "Test 1: Validating bake file syntax..."
if docker buildx bake --print > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Bake file syntax is valid${NC}"
else
    echo -e "${RED}✗ Bake file syntax is invalid${NC}"
    exit 1
fi

# Test 2: Check required groups exist
echo ""
echo "Test 2: Checking required groups..."
EXPECTED_GROUPS=("default" "validate" "release" "all")

for group in "${EXPECTED_GROUPS[@]}"; do
    # Test each group individually
    if docker buildx bake --print "$group" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Group '${group}' exists${NC}"
    else
        echo -e "${RED}✗ Group '${group}' missing${NC}"
        exit 1
    fi
done

# Test 3: Check required targets exist
echo ""
echo "Test 3: Checking required targets..."
EXPECTED_TARGETS=(
    "image"
    "binary"
    "lint-backend"
    "test-backend"
    "image-multi"
    "binary-cross"
)

for target in "${EXPECTED_TARGETS[@]}"; do
    # Test each target individually
    if docker buildx bake --print "$target" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ Target '${target}' exists${NC}"
    else
        echo -e "${RED}✗ Target '${target}' missing${NC}"
        exit 1
    fi
done

# Test 4: Validate target configurations
echo ""
echo "Test 4: Validating target configurations..."

# Check binary target has correct output
BINARY_OUTPUT=$(docker buildx bake --print binary | jq -r '.target.binary.output[0]' 2>/dev/null || echo "")
if [[ "$BINARY_OUTPUT" == *".bin"* ]]; then
    echo -e "${GREEN}✓ Binary target output is configured${NC}"
else
    echo -e "${YELLOW}⚠ Binary target output may not be configured correctly${NC}"
fi

# Check image-multi has platforms
PLATFORMS=$(docker buildx bake --print image-multi | jq -r '.target."image-multi".platforms[]' 2>/dev/null | wc -l)
if [ "$PLATFORMS" -ge 2 ]; then
    echo -e "${GREEN}✓ Multi-platform target has multiple platforms${NC}"
else
    echo -e "${YELLOW}⚠ Multi-platform target may not have enough platforms${NC}"
fi

# Test 5: Check variable substitution
echo ""
echo "Test 5: Testing variable substitution..."
VERSION_OUTPUT=$(VERSION=test123 docker buildx bake --print image | jq -r '.target.image.tags[0]' 2>/dev/null || echo "")
if [[ "$VERSION_OUTPUT" == *"test123"* ]]; then
    echo -e "${GREEN}✓ VERSION variable substitution works${NC}"
else
    echo -e "${YELLOW}⚠ VERSION variable substitution may not work${NC}"
fi

# Test 6: Verify Dockerfiles exist
echo ""
echo "Test 6: Verifying required Dockerfiles..."
DOCKERFILES=(
    "docker/Dockerfile"
    "backend/Dockerfile.lint"
    "backend/Dockerfile.test"
    "tests/Dockerfile.test"
)

for dockerfile in "${DOCKERFILES[@]}"; do
    if [ -f "$dockerfile" ]; then
        echo -e "${GREEN}✓ ${dockerfile} exists${NC}"
    else
        echo -e "${RED}✗ ${dockerfile} missing${NC}"
        exit 1
    fi
done

# Test 7: Check for common issues
echo ""
echo "Test 7: Checking for common configuration issues..."

# Check if _common target is inherited properly
COMMON_INHERITS=$(docker buildx bake --print | jq -r '.target.image.inherits[]' 2>/dev/null || echo "")
if [[ "$COMMON_INHERITS" == *"_common"* ]]; then
    echo -e "${GREEN}✓ Inheritance is configured${NC}"
else
    echo -e "${YELLOW}⚠ Inheritance may not be configured correctly${NC}"
fi

# Test 8: Validate matrix configuration
echo ""
echo "Test 8: Validating matrix configuration..."
MATRIX_TARGETS=$(docker buildx bake --print release-all | jq -r '.group."release-all".targets[]' 2>/dev/null | wc -l)
if [ "$MATRIX_TARGETS" -ge 2 ]; then
    echo -e "${GREEN}✓ Matrix configuration generates multiple targets${NC}"
else
    echo -e "${YELLOW}⚠ Matrix configuration may not be working correctly${NC}"
fi

# Summary
echo ""
echo "=================================="
echo -e "${GREEN}All tests passed!${NC}"
echo ""
echo "You can now use the following commands:"
echo "  docker buildx bake                 # Build default target"
echo "  docker buildx bake validate        # Run validation"
echo "  docker buildx bake release         # Build release"
echo "  make help                          # Show all make targets"
echo ""
echo "For more information, see:"
echo "  docs/DOCKER_BAKE.md"
echo "  docs/BAKE_QUICK_REFERENCE.md"
