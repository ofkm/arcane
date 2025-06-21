# This file uses multi-stage builds to build the application from source, including the front-end

# Tags passed to "go build"
ARG BUILD_TAGS=""

# Stage 1: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /build
COPY ./frontend/package*.json ./
RUN npm ci
COPY ./frontend ./
RUN BUILD_PATH=dist npm run build

# Stage 2: Build Backend
FROM golang:1.24-alpine AS backend-builder
ARG BUILD_TAGS
WORKDIR /build

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata gcc musl-dev

COPY ./backend/go.mod ./backend/go.sum ./
RUN go mod download

COPY ./backend ./
COPY --from=frontend-builder /build/dist ./frontend/dist

RUN CGO_ENABLED=1 \
    GOOS=linux \
    go build \
    -tags "${BUILD_TAGS}" \
    -ldflags='-w -s' \
    -trimpath \
    -o /build/arcane \
    ./cmd/main.go

# Stage 3: Production Image
FROM alpine:latest AS runner

# Install runtime dependencies
RUN apk upgrade && apk --no-cache add ca-certificates tzdata curl shadow su-exec

RUN delgroup ping && apk del iputils

# Set up environment variables
ENV DOCKER_GID=998 PUID=2000 PGID=2000
ENV GIN_MODE=release
ENV PORT=8080

WORKDIR /app

# Create necessary directories
RUN mkdir -p /app/data && chmod 755 /app/data

# Copy the binary from builder
COPY --from=backend-builder /build/arcane .

# Copy entrypoint script
COPY --chmod=755 scripts/docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Configure container
EXPOSE 8080
VOLUME ["/app/data"]

ARG VERSION="0.15.1"
ARG REVISION="c052902"

# Add OCI standard labels
LABEL org.opencontainers.image.authors="OFKM Technologies"
LABEL org.opencontainers.image.url="https://github.com/ofkm/arcane"
LABEL org.opencontainers.image.documentation="https://github.com/ofkm/arcane/blob/main/README.md"
LABEL org.opencontainers.image.source="https://github.com/ofkm/arcane"
LABEL org.opencontainers.image.version=$VERSION
LABEL org.opencontainers.image.revision=$REVISION
LABEL org.opencontainers.image.licenses="BSD-3-Clause"
LABEL org.opencontainers.image.ref.name="arcane"
LABEL org.opencontainers.image.title="Arcane"
LABEL org.opencontainers.image.description="Simple and Elegant Docker Management UI with Go backend and SvelteKit frontend"

# Set the entrypoint and command
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["./arcane"]