# Stage 1: Build the application
FROM node:22-alpine AS builder
WORKDIR /app
RUN mkdir -p /app/data && chown node:node /app/data
COPY package*.json ./
RUN npm install
COPY . .
RUN npm ci
# When building, set NODE_ENV to "build" to prevent connection attempts
RUN NODE_ENV=build npm run build

# Stage 2: Production image
FROM node:22-alpine

# Delete default node user
RUN deluser --remove-home node

# Install necessary packages
RUN apk add --no-cache su-exec curl shadow

WORKDIR /app

# Make sure data directory exists and is writable
RUN mkdir -p /app/data && chmod 755 /app/data

# Copy default settings if starting fresh
COPY app-settings.json /app/data/app-settings.json.default

# Copy entrypoint script
COPY scripts/docker/entrypoint.sh /usr/local/bin/entrypoint.sh
RUN chmod +x /usr/local/bin/entrypoint.sh

# Copy application files
COPY --from=builder /app/build ./build
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/static ./static

# Create docker group with same GID as the host (typically 998 or 999)
# We'll use 998 which is common, but this can be overridden at runtime
ENV DOCKER_GID=998
RUN addgroup -g ${DOCKER_GID} docker

# Create arcane user/group
ENV PUID=1000
ENV PGID=1000
RUN addgroup -g ${PGID} arcane && \
    adduser -D -u ${PUID} -G arcane arcane && \
    # Add arcane user to docker group to allow socket access
    adduser arcane docker && \
    # Set ownership of app files
    chown -R arcane:arcane /app

EXPOSE 3000
LABEL org.opencontainers.image.authors="kmendell"

# Add volume for persistent data
VOLUME ["/app/data"]

ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
CMD ["node", "build"]