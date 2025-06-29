---
sidebar_position: 1
title: Quick Start
---

# Quick Start Guide

Get Arcane running fast with Docker Compose.

## Steps

1. **Create `docker-compose.yml`:**

   ```yaml
   services:
     arcane:
       image: ghcr.io/ofkm/arcane:latest
       container_name: arcane
       ports:
         - '8080:8080'
       volumes:
         - /var/run/docker.sock:/var/run/docker.sock
         - arcane-data:/app/data
       environment:
         - PUID=1000
         - PGID=1000
         - DATABASE_URL=sqlite:///app/data/arcane.db
         - ENCRYPTION_KEY=xxxxxxxxxxxxxxxxxxxxxx
         - JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
         - APP_ENV=TEST
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

3. **Start Arcane:**

   ```bash
   docker compose up -d
   ```

   _(Use `docker-compose up -d` if needed)_

4. **Access Arcane:**
   Go to [http://localhost:8080](http://localhost:8080) in your browser and follow the setup.
