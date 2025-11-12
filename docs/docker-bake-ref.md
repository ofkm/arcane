# Docker Bake Quick Reference

## Common Commands

```bash
# Build & Test
docker buildx bake validate          # Run lint + backend tests
docker buildx bake                   # Build local image
docker buildx bake test-backend      # Run backend unit tests only
docker buildx bake lint-backend      # Run golangci-lint only

# Release
docker buildx bake release           # Build cross-platform binaries + multi-arch images
docker buildx bake release-all       # Build & push all variants (standard, agent, static, agent-static)

# Binaries
docker buildx bake binary            # Build binary for local platform
docker buildx bake binary-cross      # Build binaries for all platforms (linux, darwin, arm64, amd64, etc.)

# Images
docker buildx bake image             # Build standard image for local platform
docker buildx bake image-multi       # Build multi-platform standard image
docker buildx bake image-push        # Build and push multi-platform image to registry
docker buildx bake image-agent       # Build agent image (no frontend)
docker buildx bake image-static      # Build static image (no Docker socket required)

# Utilities
docker buildx bake --print           # Preview configuration without building
docker buildx bake --print <target>  # Preview specific target configuration
docker buildx bake dev               # Build dev image with caching
```

## Quick Start

1. **Install Prerequisites**

   ```bash
   # Docker with BuildKit (included in Docker Desktop)
   docker --version
   docker buildx version
   ```

2. **Build Local Image**

   ```bash
   docker buildx bake
   # or explicitly
   docker buildx bake image
   ```

3. **Run Validation (Lint + Tests)**

   ```bash
   docker buildx bake validate
   ```

4. **Build Release**
   ```bash
   VERSION=$(cat .version) docker buildx bake release-all
   ```

## Target Reference

### Groups

| Group         | Targets                    | Purpose              | Command                          |
| ------------- | -------------------------- | -------------------- | -------------------------------- |
| `default`     | image                      | Standard local build | `docker buildx bake`             |
| `validate`    | lint-backend, test-backend | Code quality checks  | `docker buildx bake validate`    |
| `release`     | binary-cross, image-multi  | Release artifacts    | `docker buildx bake release`     |
| `all`         | validate + release         | Everything           | `docker buildx bake all`         |
| `release-all` | 4 release variants         | All image variants   | `docker buildx bake release-all` |

### Individual Targets

| Target                     | Output                           | Platforms                              | Command                                       |
| -------------------------- | -------------------------------- | -------------------------------------- | --------------------------------------------- |
| `lint-backend`             | Cache only                       | N/A                                    | `docker buildx bake lint-backend`             |
| `test-backend`             | `backend/.coverage/coverage.out` | N/A                                    | `docker buildx bake test-backend`             |
| `binary`                   | `backend/.bin/`                  | Local                                  | `docker buildx bake binary`                   |
| `binary-cross`             | `backend/.bin/`                  | linux/darwin × amd64/arm64/arm         | `docker buildx bake binary-cross`             |
| `binary-agent`             | `backend/.bin/`                  | Local                                  | `docker buildx bake binary-agent`             |
| `binary-agent-cross`       | `backend/.bin/`                  | Multiple                               | `docker buildx bake binary-agent-cross`       |
| `image`                    | Docker image                     | Local                                  | `docker buildx bake image`                    |
| `image-multi`              | Docker image                     | linux/amd64, linux/arm64, linux/arm/v7 | `docker buildx bake image-multi`              |
| `image-push`               | Registry                         | Multiple                               | `docker buildx bake image-push`               |
| `image-load`               | Docker daemon                    | Multiple                               | `docker buildx bake image-load`               |
| `image-agent`              | Docker image (no frontend)       | Local                                  | `docker buildx bake image-agent`              |
| `image-agent-multi`        | Docker image                     | Multiple                               | `docker buildx bake image-agent-multi`        |
| `image-agent-push`         | Registry                         | Multiple                               | `docker buildx bake image-agent-push`         |
| `image-static`             | Docker image (no Docker socket)  | Local                                  | `docker buildx bake image-static`             |
| `image-static-multi`       | Docker image                     | linux/amd64, linux/arm64               | `docker buildx bake image-static-multi`       |
| `image-agent-static`       | Docker image                     | Local                                  | `docker buildx bake image-agent-static`       |
| `image-agent-static-multi` | Docker image                     | Multiple                               | `docker buildx bake image-agent-static-multi` |
| `dev`                      | Docker image with cache          | Local                                  | `docker buildx bake dev`                      |
| `release-standard`         | Registry + attestations          | Multiple                               | `docker buildx bake release-standard`         |
| `release-agent`            | Registry + attestations          | Multiple                               | `docker buildx bake release-agent`            |
| `release-static`           | Registry + attestations          | Multiple                               | `docker buildx bake release-static`           |
| `release-agent-static`     | Registry + attestations          | Multiple                               | `docker buildx bake release-agent-static`     |

## Variables

```bash
# Version & Registry
export VERSION=1.8.2
export REVISION=$(git rev-parse --short HEAD)
export REGISTRY=ghcr.io
export IMAGE_NAME=ofkm/arcane

# Build Configuration
export GO_VERSION=1.25
export NODE_VERSION=24
export BUILD_TAGS=""

# Output Directory
export DESTDIR=./dist

# Use in bake
docker buildx bake
```

## Platform Support

### Standard Builds

- linux/amd64
- linux/arm64
- linux/arm/v7

### Static Builds

- linux/amd64
- linux/arm64

### Binary Targets

- linux/amd64
- linux/arm64
- linux/arm/v7
- darwin/amd64
- darwin/arm64

## Examples

### Development Workflow

```bash
# 1. Make changes
# 2. Validate
docker buildx bake validate

# 3. Build locally
docker buildx bake image

# 4. Test manually
docker run --rm -p 3552:3552 ghcr.io/ofkm/arcane:latest
```

### CI/CD Workflow

```bash
# Validation (runs in parallel: lint + tests)
docker buildx bake validate

# Build multi-platform images
VERSION=$(cat .version) docker buildx bake image-multi

# Push to registry
VERSION=$(cat .version) docker buildx bake image-push
```

### Release Workflow

```bash
# 1. Update version
echo "1.8.2" > .version

# 2. Build and push all variants (standard, agent, static, agent-static)
VERSION=1.8.2 docker buildx bake release-all

# 3. Verify
docker pull ghcr.io/ofkm/arcane:1.8.2
docker pull ghcr.io/ofkm/arcane:1.8.2-agent
docker pull ghcr.io/ofkm/arcane:1.8.2-static
docker pull ghcr.io/ofkm/arcane:1.8.2-agent-static
```

### Custom Build

```bash
# Override specific properties
docker buildx bake \
  --set "image.tags=custom:tag" \
  --set "image.platforms=linux/amd64" \
  image

# Override for all targets
docker buildx bake \
  --set "*.args.GO_VERSION=1.26" \
  validate
```

## Caching

### Local Cache

```bash
# Export cache
docker buildx bake \
  --set "*.cache-to=type=local,dest=/tmp/.buildx-cache" \
  image

# Import cache
docker buildx bake \
  --set "*.cache-from=type=local,src=/tmp/.buildx-cache" \
  image
```

### GitHub Actions Cache

```yaml
- uses: docker/bake-action@v5
  with:
    targets: image-multi
    set: |
      *.cache-from=type=gha
      *.cache-to=type=gha,mode=max
```

### Registry Cache

```bash
docker buildx bake \
  --set "*.cache-from=type=registry,ref=ghcr.io/ofkm/arcane:buildcache" \
  --set "*.cache-to=type=registry,ref=ghcr.io/ofkm/arcane:buildcache,mode=max" \
  image-push
```

## Troubleshooting

### View Full Configuration

```bash
docker buildx bake --print | jq
docker buildx bake --print image | jq
```

### Check Buildx Setup

```bash
docker buildx ls
docker buildx inspect
```

### Enable Debug Output

```bash
BUILDX_EXPERIMENTAL=1 docker buildx bake --progress=plain validate
```

### Clean Everything

```bash
make clean-all
docker buildx prune -af
```

## Tips

1. **Always preview first**: `docker buildx bake --print <target>`
2. **Use groups for efficiency**: `validate` runs lint + tests in parallel
3. **Cache aggressively**: Use `type=gha` in GitHub Actions
4. **Version everything**: Set `VERSION` environment variable
5. **Multi-platform needs time**: Be patient with `image-multi` targets
6. **E2E tests**: Run separately with `cd tests && pnpm test` (requires dev environment)

## Target Descriptions

- **validate**: Runs backend linting (golangci-lint) and unit tests (with race detector and coverage)
- **lint-backend**: Go code linting with golangci-lint, outputs to cache only
- **test-backend**: Go unit tests with race detector, outputs coverage to `backend/.coverage/coverage.out`
- **binary**: Builds Go binary for your local platform
- **binary-cross**: Builds Go binaries for all supported platforms in parallel
- **image**: Builds standard Docker image with frontend and backend for local platform
- **image-multi**: Builds multi-platform Docker images (amd64, arm64, arm/v7)
- **image-agent**: Builds agent-only image without frontend (smaller, for headless use)
- **image-static**: Builds image without Docker socket dependency
- **dev**: Builds development image with local cache for faster rebuilds
- **release**: Builds both cross-platform binaries and multi-arch images
- **release-all**: Builds and pushes all 4 image variants with SBOM and provenance attestations

## Migration from Existing Scripts

| Old Command                          | New Command                       | What It Does                    |
| ------------------------------------ | --------------------------------- | ------------------------------- |
| `./scripts/build-docker.sh`          | `docker buildx bake image`        | Build standard Docker image     |
| `./scripts/github/build-binaries.sh` | `docker buildx bake binary-cross` | Build cross-platform binaries   |
| Manual lint setup                    | `docker buildx bake lint-backend` | Run golangci-lint               |
| Manual test setup                    | `docker buildx bake test-backend` | Run Go unit tests with coverage |
| Combined validation                  | `docker buildx bake validate`     | Run lint + tests in parallel    |
