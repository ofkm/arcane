# Stage 1: Build dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
# Install dependencies first (better layer caching)
RUN npm ci

# Stage 2: Build the application
FROM node:22-alpine AS builder
WORKDIR /app

# Set OIDC variables to dummy values for build time if they are checked
ARG OIDC_CLIENT_ID_BUILD="dummy_client_id"
ARG OIDC_CLIENT_SECRET_BUILD="dummy_client_secret"
ARG OIDC_REDIRECT_URI_BUILD="http://localhost/dummy_callback"

ENV OIDC_CLIENT_ID=$OIDC_CLIENT_ID_BUILD
ENV OIDC_CLIENT_SECRET=$OIDC_CLIENT_SECRET_BUILD
ENV OIDC_REDIRECT_URI=$OIDC_REDIRECT_URI_BUILD

# Copy dependencies from previous stage
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# When building, set NODE_ENV to "build" to prevent connection attempts
RUN NODE_ENV=build npm run build

# Stage 3: Production image
FROM node:22-alpine AS runner

# Delete default node user first (combine with system upgrade package installation to reduce layers)
RUN deluser --remove-home node && apk upgrade && apk add --no-cache su-exec curl shadow
# Delete ping group and utility as this shouldnt be needed and conflicts with GID 999
RUN delgroup ping && apk del iputils

WORKDIR /app

# Set up environment variables early for better caching
# These will serve as defaults if not overridden in docker-compose.yml
ENV DOCKER_GID=998 PUID=2000 PGID=2000

# Set up directories and permissions
RUN mkdir -p /app/data && chmod 755 /app/data

# Copy only necessary files from builder
COPY --from=builder /app/build ./build
COPY --from=builder /app/static ./static

# Copy entrypoint script
COPY --chmod=755 scripts/docker/entrypoint.sh /usr/local/bin/entrypoint.sh

# Install only production dependencies
COPY package*.json ./
# The chown part is removed as 'arcane' user might not exist here
RUN npm install --omit=dev && npm cache clean --force

# Configure container
EXPOSE 3000
VOLUME ["/app/data"]

ARG VERSION="0.8.0"
ARG REVISION="258c3f8"

# Add OCI standard labels (reading version/revision from files)
LABEL org.opencontainers.image.authors="OFKM Technologies"
LABEL org.opencontainers.image.url="https://github.com/ofkm/arcane"
LABEL org.opencontainers.image.documentation="https://github.com/ofkm/arcane/blob/main/README.md"
LABEL org.opencontainers.image.source="https://github.com/ofkm/arcane"
LABEL org.opencontainers.image.version=$VERSION
LABEL org.opencontainers.image.revision=$REVISION
LABEL org.opencontainers.image.licenses="BSD-3-Clause"
LABEL org.opencontainers.image.ref.name="arcane"
LABEL org.opencontainers.image.title="Arcane"
LABEL org.opencontainers.image.description="Simple and Elegant Docker Management UI written in Typescript and SvelteKit"

# Set the entrypoint and command
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "build"]