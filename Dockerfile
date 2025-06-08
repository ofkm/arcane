# Stage 1: Build Frontend Dependencies
FROM node:22-alpine AS frontend-deps
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci

# Stage 2: Build Frontend
FROM node:22-alpine AS frontend-builder
WORKDIR /app/frontend

# Copy dependencies from previous stage
COPY --from=frontend-deps /app/frontend/node_modules ./node_modules
COPY frontend/ .

# Build the frontend for static serving
RUN npm run build

# Stage 3: Build Go Backend
FROM golang:1.24-alpine AS backend-builder
WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git ca-certificates tzdata gcc musl-dev

# Copy go mod files
COPY backend/go.mod backend/go.sum ./
RUN go mod download

# Copy backend source
COPY backend/ .


# Build the Go binary with static linking
# RUN CGO_ENABLED=1 GOOS=linux GOARCH=amd64 go build \
#     -ldflags='-w -s -extldflags "-static"' \
#     -a -installsuffix cgo \
#     -o arcane \
#     ./cmd/main.go

RUN apk add --no-cache gcc musl-dev && \
     CGO_ENABLED=1 go build \
     -ldflags='-w -s' \
     -o arcane \
     ./cmd/main.go

# Stage 4: Production Image
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
COPY --from=backend-builder /app/arcane .

# Copy entrypoint script
COPY --chmod=755 scripts/docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Configure container
EXPOSE 8080
VOLUME ["/app/data"]

# Build arguments for versioning
ARG VERSION="0.15.0"
ARG REVISION="9bc5e5c"

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