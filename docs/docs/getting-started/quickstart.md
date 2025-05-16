---
sidebar_position: 1
title: Quick Start
---

# Quick Start Guide

Get Arcane running fast with Docker Compose.

## Prerequisites

- Docker & Docker Compose

## Steps

1. **Create `docker-compose.yml`:**

   ```yaml
   services:
     arcane:
       image: ghcr.io/ofkm/arcane:latest
       container_name: arcane
       ports:
         - '3000:3000'
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock
         - arcane-data:/app/data
       environment:
         - APP_ENV=production # Required
         - PUBLIC_SESSION_SECRET=your_super_strong_random_secret_here # Generate: openssl rand -base64 32
         # Optional: Match your host user for permissions
         - PUID=2000
         - PGID=2000
         # Optional: Set if Docker access fails
         # - DOCKER_GID=998
         # Optional: For local HTTP testing only
         # - PUBLIC_ALLOW_INSECURE_COOKIES=true
       restart: unless-stopped

   volumes:
     arcane-data:
       driver: local
   ```

2. **Review Volumes & Imports:**

   - `/var/run/docker.sock`: Lets Arcane manage Docker.
   - `arcane-data`: Persists settings, stacks, users, etc.
   - To import existing stacks, add a mount where you exsisting stacks are located:
     ```yaml
     - /host/path/to/stacks:/host/path/to/stacks:ro
     ```
     Use `:ro` for read-only access.

3. **Permissions & Environment Variables:**

   - `APP_ENV=production`: Always set for Docker.
   - `PUBLIC_SESSION_SECRET`: Must be a secure random string.
   - `PUID`/`PGID`: Set to your host user/group IDs to avoid permission issues (`id -u`, `id -g`).
   - `DOCKER_GID`: Usually auto-detected. Set only if Arcane can't access Docker (`stat -c '%g' /var/run/docker.sock`).
   - `PUBLIC_ALLOW_INSECURE_COOKIES`: Only for local HTTP testing.

4. **Start Arcane:**

   ```bash
   docker compose up -d
   ```

   _(Use `docker-compose up -d` if needed)_

5. **Access Arcane:**
   Go to [http://localhost:3000](http://localhost:3000) in your browser and follow the setup.

## Next Steps

- Manage containers, images, volumes, and networks in the UI.
- See the [Configuration](./configuration.md) guide for more options.
