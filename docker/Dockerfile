# Tags passed to "go build"
ARG BUILD_TAGS=""

# Stage 1: Build Frontend
FROM node:24-alpine AS frontend-builder
RUN corepack enable
WORKDIR /build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY frontend ./frontend
RUN --mount=type=cache,target=/root/.pnpm-store pnpm -C frontend install --frozen-lockfile

ENV BUILD_PATH=dist
RUN pnpm -C frontend build

# Stage 2: Build Backend
FROM golang:1.25-alpine AS backend-builder
ARG BUILD_TAGS
ARG VERSION
ARG REVISION
WORKDIR /build
RUN apk add --no-cache ca-certificates curl git tzdata
COPY ./backend/go.mod ./backend/go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod go mod download
COPY ./backend ./
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist
RUN --mount=type=cache,target=/root/.cache/go-build CGO_ENABLED=0 \
    GOOS=linux \
    go build \
    -tags "${BUILD_TAGS}" \
    -ldflags "-w -s -X github.com/ofkm/arcane-backend/internal/config.Version=${VERSION} -X github.com/ofkm/arcane-backend/internal/config.Revision=${REVISION}" \
    -trimpath \
    -o /build/arcane \
    ./cmd/main.go

# Stage 3: Production Image
FROM alpine:3 AS runner
ARG VERSION="dev"
ARG REVISION="unknown"
RUN apk upgrade && apk --no-cache add ca-certificates curl shadow su-exec tzdata
RUN delgroup ping && apk del iputils || true
ENV DOCKER_GID=998 PUID=2000 PGID=2000
ENV GIN_MODE=release
ENV PORT=3552
ENV ENVIRONMENT=production
WORKDIR /app
RUN mkdir -p /app/data && chmod 755 /app/data
COPY --from=backend-builder /build/arcane .
COPY --chmod=755 scripts/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
EXPOSE 3552
VOLUME ["/app/data"]
LABEL org.opencontainers.image.authors="OFKM Technologies" \
org.opencontainers.image.url="https://github.com/ofkm/arcane" \
org.opencontainers.image.documentation="https://github.com/ofkm/arcane/blob/main/README.md" \
org.opencontainers.image.source="https://github.com/ofkm/arcane" \
org.opencontainers.image.version=${VERSION} \
org.opencontainers.image.revision=${REVISION} \
org.opencontainers.image.licenses="BSD-3-Clause" \
org.opencontainers.image.ref.name="arcane" \
org.opencontainers.image.title="Arcane" \
org.opencontainers.image.description="Modern Docker Management, Made for Everyone" \
com.ofkm.arcane.updater="false" \
com.ofkm.arcane.server="true"
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["./arcane"]