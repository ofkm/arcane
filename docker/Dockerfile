# Tags passed to "go build"
ARG BUILD_TAGS=""

# Stage 1: Build Frontend
FROM node:24 AS frontend-builder
RUN corepack enable && corepack prepare pnpm@10.15.0 --activate
WORKDIR /build
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY frontend/package.json ./frontend/package.json
COPY frontend ./frontend
ENV NODE_OPTIONS="--max-old-space-size=3072"
RUN pnpm -C frontend install --frozen-lockfile
ENV BUILD_PATH=dist
RUN pnpm -C frontend build

# Stage 2: Build Backend
FROM golang:1.25-alpine AS backend-builder
ARG BUILD_TAGS
WORKDIR /build
RUN apk add --no-cache git ca-certificates tzdata curl
COPY ./backend/go.mod ./backend/go.sum ./
RUN go mod download
COPY ./backend ./
COPY --from=frontend-builder /build/frontend/dist ./frontend/dist

RUN CGO_ENABLED=0 \
    GOOS=linux \
    go build \
    -tags "${BUILD_TAGS}" \
    -ldflags='-w -s' \
    -trimpath \
    -o /build/arcane \
    ./cmd/main.go

ARG COMPOSE_VERSION=2.39.2
ARG TARGETARCH
COPY ../scripts/development/download-compose.sh /tmp/download-compose.sh
RUN set -eux; install -d /out; chmod +x /tmp/download-compose.sh; \
    /tmp/download-compose.sh "${COMPOSE_VERSION}" "/out/docker-compose" "${TARGETARCH}"

# Stage 3: Production Image
FROM alpine:3 AS runner
RUN apk upgrade && apk --no-cache add ca-certificates tzdata curl shadow su-exec
RUN delgroup ping && apk del iputils || true

ENV DOCKER_GID=998 PUID=2000 PGID=2000
ENV GIN_MODE=release
ENV PORT=3552
ENV ENVIRONMENT=production

WORKDIR /app
RUN mkdir -p /app/data && chmod 755 /app/data

COPY --from=backend-builder /build/arcane .
COPY --from=backend-builder /out/docker-compose /usr/local/bin/docker-compose
COPY --chmod=755 ../scripts/docker/entrypoint.sh /usr/local/bin/entrypoint.sh

EXPOSE 3552
VOLUME ["/app/data"]

ARG VERSION="1.0.1"
ARG REVISION="b3b9f715"
LABEL org.opencontainers.image.authors="OFKM Technologies"
LABEL org.opencontainers.image.url="https://github.com/ofkm/arcane"
LABEL org.opencontainers.image.documentation="https://github.com/ofkm/arcane/blob/main/README.md"
LABEL org.opencontainers.image.source="https://github.com/ofkm/arcane"
LABEL org.opencontainers.image.version=$VERSION
LABEL org.opencontainers.image.revision=$REVISION
LABEL org.opencontainers.image.licenses="BSD-3-Clause"
LABEL org.opencontainers.image.ref.name="arcane"
LABEL org.opencontainers.image.title="Arcane"
LABEL org.opencontainers.image.description="Modern Docker Management, Made for Everyone"

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["./arcane"]