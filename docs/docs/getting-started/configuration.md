---
sidebar_position: 3
title: Configuration
---

# Configuring Arcane

Arcane offers several ways to configure its behavior, primarily through a JSON configuration file or environment variables when running in Docker.

## Configuration File (`app-settings.json`)

The main configuration for Arcane is managed through the `app-settings.json` file located in the application's data directory (typically `/app/data` inside the container).

Here's the default structure and settings:

```json
// filepath: /app/data/app-settings.json
{
	"dockerHost": "unix:///var/run/docker.sock",
	"autoRefresh": true,
	"pollingInterval": 5,
	"stacksDirectory": "/app/data/stacks"
}
```

### Configuration Options

- **`dockerHost`** (`string`)

  - Specifies the Docker daemon socket or TCP address Arcane should connect to.
  - **Default:** `"unix:///var/run/docker.sock"` (Connects via the standard Unix socket)
  - **Examples:**
    - Unix Socket: `"unix:///var/run/docker.sock"`
    - TCP Host: `"tcp://192.168.1.100:2375"` (Ensure your Docker daemon is configured to listen on TCP)

- **`autoRefresh`** (`boolean`)

  - Determines if the Arcane UI should automatically refresh data periodically.
  - **Default:** `true`
  - Set to `false` to disable automatic refreshing. You will need to manually refresh pages to see updates.

- **`pollingInterval`** (`number`)

  - Specifies the interval (in seconds) at which Arcane polls the Docker daemon for updates when `autoRefresh` is enabled.
  - **Default:** `5` (seconds)
  - A lower value provides more real-time updates but increases load on the Docker daemon. A higher value reduces load but makes the UI less responsive to changes.

- **`stacksDirectory`** (`string`)
  - Defines the directory where Arcane looks for Docker Compose stack files.
  - **Default:** `"/app/data/stacks"`
  - Ensure this directory exists and is accessible by Arcane if you plan to use the stack management features.

## Configuration with Docker

When running Arcane using Docker or Docker Compose (as shown in the example [`docker-compose.yml`](#docker-composeyml)), you can manage configuration in a few ways:

### 1. Mounting the Data Directory

This is the recommended approach as it persists all application data, including the configuration file.

```yaml
# docker-compose.yml excerpt
services:
  arcane:
    # ... other settings
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock # Mount Docker socket
      - ./arcane-data:/app/data # Mount data directory
    # ... other settings
```

With this setup, you can edit the `app-settings.json` file within the `./arcane-data` directory on your host machine. If the file doesn't exist when the container starts, Arcane might create it with default values.

### 2. Mounting the Configuration File Directly (Less Common)

You can mount only the configuration file, but this means other data (like stack definitions) won't be persisted unless you mount those directories separately.

```yaml
# docker-compose.yml excerpt
services:
  arcane:
    # ... other settings
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock
      - ./my-custom-settings.json:/app/app-settings.json # Mount specific config file
    # ... other settings
```

### 3. Environment Variables (Permissions)

The `docker-compose.yml` example also shows environment variables primarily used for setting correct file permissions within the container, especially when mounting volumes:

- **`PUID`** / **`PGID`**: Set these to the user ID and group ID of the user on your host machine that should own the files in the mounted volumes (e.g., `./arcane-data`). Use `id -u` and `id -g` on your host to find these values.
- **`DOCKER_GID`**: Set this to the group ID of the `docker` group on your host machine. This allows the Arcane container process (running as the specified `PUID`/`PGID`) to access the Docker socket (`/var/run/docker.sock`). Find this using `getent group docker | cut -d: -f3` on your host.

```yaml
# docker-compose.yml excerpt
services:
  arcane:
    # ... other settings
    environment:
      - PUID=1000
      - PGID=1000
      - DOCKER_GID=998 # Example GID, replace with yours
    # ... other settings
```

Choose the configuration method that best suits your deployment strategy. For most Docker users, mounting the entire `/app/data` directory is the most straightforward way to manage configuration and persist data.
