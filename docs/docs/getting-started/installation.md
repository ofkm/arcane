---
sidebar_position: 2
title: Manual Installation
---

# Installing Arcane

This guide will walk you through the installation of Arcane.

## Prerequisites

Before installing Arcane, ensure you have:

- Docker installed (version 20.10.0 or higher)
- Node.js (version 16 or higher)

## Installation Methods

### Using Docker Compose

```yaml
services:
  arcane:
    image: ghcr.io/ofkm/arcane:latest
    container_name: arcane
    ports:
      - '3000:3000'
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./arcane-data:/app/data

    environment:
      - PUID=1000
      - PGID=1000
      - DOCKER_GID=998 # getent group docker | cut -d: -f3
    restart: unless-stopped
# Optional: Define the volume if you want Docker to manage it
# volumes:
#   arcane-data:
```

Start the container

```bash
docker compose up -d
```

Once installed, you can access Arcane at [http://localhost:3000](http://localhost:3000).
