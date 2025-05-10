---
sidebar_position: 1
title: Quick Start
---

# Quick Start Guide

This guide provides the fastest way to get Arcane up and running using Docker Compose, the recommended method.

## Prerequisites

- `Docker and Docker Compose`

## Steps

1.  Create a `docker-compose.yml` file with the following content:

    ```yaml
    services:
      arcane:
        image: ghcr.io/ofkm/arcane:latest
        container_name: arcane
        ports:
          - '3000:3000'
        volumes:
          - /var/run/docker.sock:/var/run/docker.sock
          - ./arcane-data:/app/data # Persists Arcane's data
        environment:
          - APP_ENV=production # Required for Docker
          - PUBLIC_SESSION_SECRET=your_super_strong_random_secret_here # Generate with: openssl rand -base64 32
          # --- Optional: For matching volume permissions to your host user ---
          - PUID=1000
          - PGID=1000
          # --- Optional: Usually auto-detected, set if Docker access fails ---
          # - DOCKER_GID=998 # GID of the 'docker' group or docker.sock
          # --- Optional: For local HTTP testing ONLY ---
          # - PUBLIC_ALLOW_INSECURE_COOKIES=true
        restart: unless-stopped

    volumes:
      arcane-data: # Defines the named volume used above
        driver: local
    ```

2.  **Review Configuration & Permissions:**
    Before starting, review the `docker-compose.yml` file:

    - **Docker Socket:** Mounts `/var/run/docker.sock` to allow Arcane to manage Docker.
    - **Data Persistence:** Uses a volume named `arcane-data` (or a host path like `./arcane-data`) mapped to `/app/data` inside the container. This stores Arcane's settings, stacks, users, sessions, and encryption keys.

    - **Permissions & Environment Variables (Important):**

      - **`APP_ENV=production`**: **Required when running in Docker.** This ensures Arcane uses the correct data paths (`/app/data`) for persistent storage.

      - **`PUBLIC_SESSION_SECRET`**: **You MUST set this** to a secure random 32-character string. Generate one using `openssl rand -base64 32` in your terminal. This secret is crucial for securing user login sessions.

      - **`PUID` and `PGID` (Optional but Recommended):**

        - These variables set the User ID (`PUID`) and Group ID (`PGID`) for the `arcane` user inside the container.
        - **Why?** To avoid permission issues with files Arcane creates in the mounted `/app/data` volume. Matching these to your host user's UID/GID ensures you can easily access these files on your host machine.
        - **Find your IDs (Linux/Mac):** `id -u` (for PUID) and `id -g` (for PGID).
        - Defaults if not set: `PUID=1000`, `PGID=1000`.

      - **`DOCKER_GID` (Usually Handled Automatically):**

        - Arcane needs to communicate with the Docker daemon, typically via the Docker socket.
        - The entrypoint script inside the Arcane container is smart: it usually **auto-detects and sets the correct Group ID for Docker access** based on the GID of the mounted `/var/run/docker.sock`.
        - **You generally do not need to set `DOCKER_GID` manually.**
        - If, in rare cases, Arcane cannot access Docker, you can try setting `DOCKER_GID` to the GID of the `docker` group on your host or the GID of the `/var/run/docker.sock` file.
          - Find it with: `stat -c '%g' /var/run/docker.sock` or `getent group docker | cut -d: -f3` (Linux).

      - **`PUBLIC_ALLOW_INSECURE_COOKIES=true` (For Local HTTP Testing Only):**
        - Uncomment this **only** if you are testing Arcane locally using `http://localhost:3000` and cannot use HTTPS.
        - **Never use this in a production environment or if Arcane is accessible over a network, as it's insecure.**

3.  **Start Arcane:**
    Open your terminal, navigate to the directory where you saved `docker-compose.yml`, and run:

    ```bash
    docker compose up -d
    ```

    _(Note: some older systems might use `docker-compose up -d`)_

4.  **Access Arcane:**
    Open your web browser and navigate to:

    `http://localhost:3000`

    You should now see the Arcane UI. The first time you access it, you'll be guided through the initial setup.

## Next Steps

- Explore the Arcane interface to manage your containers, images, volumes, and networks.
- Learn more about advanced settings in the **[Configuration](./configuration.md)** guide.
