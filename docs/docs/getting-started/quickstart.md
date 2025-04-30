---
sidebar_position: 1
title: Quick Start
---

# Quick Start Guide

This guide provides the fastest way to get Arcane up and running using Docker Compose, which is the recommended method.

## Prerequisites

- **Docker and Docker Compose:** Installed and running.
- **Git:** Installed (optional only for cloning the repository).

## Steps

1.  **Clone the Repository:**
    Open your terminal and clone the Arcane repository:

    ```bash
    git clone https://github.com/ofkm/arcane
    cd arcane
    ```

2.  **Review Docker Compose Configuration (Optional but Recommended):**
    Take a quick look at the `docker-compose.yml` file provided in the repository. Key things to note:

    - **Docker Socket:** It mounts `/var/run/docker.sock` by default.
    - **Data Persistence:** It maps `./arcane-data` on your host to `/app/data` in the container to store settings and stack definitions.
    - **Permissions:** It uses `PUID`, `PGID`, and `DOCKER_GID` environment variables. You might need to adjust `DOCKER_GID` to match your host's Docker group ID. Find it using:
      ```bash
      getent group docker | cut -d: -f3
      ```
      Update the `DOCKER_GID` value in `docker-compose.yml` if necessary. The default `PUID` and `PGID` of `1000` are often suitable but can be changed if needed.

3.  **Start Arcane:**
    Run the following command from the `arcane` directory:

    ```bash
    docker-compose up -d
    ```

    This command will:

    - Pull the latest `ghcr.io/ofkm/arcane:latest` image.
    - Create and start the Arcane container in the background.
    - Create the `./arcane-data` directory on your host if it doesn't exist.

4.  **Access Arcane:**
    Open your web browser and navigate to:

    `http://localhost:3000`

    You should now see the Arcane UI, connected to your local Docker environment.

## Next Steps

- Explore the Arcane interface to manage your containers, images, volumes, and networks.
- Learn how to customize Arcane's behavior in the **[Configuration](./configuration.md)** guide.
