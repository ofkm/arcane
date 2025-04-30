---
sidebar_position: 2
title: Configuration
---

# Configuring Arcane

Arcane offers several ways to configure its behavior, with the recommended approach being through the web UI. Configuration is stored securely using encryption.

## Configuration Storage

Arcane stores its configuration in an encrypted format in `settings.dat` located in the application's data directory (typically `/app/data/settings` inside the container). Due to the encryption, **directly editing this file is not possible or recommended**.

## Recommended Configuration Method: Web UI

The recommended way to configure Arcane is through the built-in web interface:

1. Access the Arcane web interface
2. Navigate to the Settings page
3. Update your configuration as needed
4. Save your changes

This approach ensures all settings are properly validated and securely stored.

## Configuration Options

- **`dockerHost`** (`string`)

  - Specifies the Docker daemon socket or TCP address Arcane should connect to.
  - **Default:** `"unix:///var/run/docker.sock"` (Connects via the standard Unix socket)
  - **Examples:**
    - Unix Socket: `"unix:///var/run/docker.sock"`
    - Windows: `"npipe:////./pipe/docker_engine"`
    - TCP Host: `"tcp://192.168.1.100:2375"` (Ensure your Docker daemon is configured to listen on TCP)

- **`autoUpdate`** (`boolean`)

  - Enables automatic updating of containers when new images are available.
  - **Default:** `false`

- **`autoUpdateInterval`** (`number`)

  - Interval in minutes between checks for container updates when `autoUpdate` is enabled.
  - **Default:** `60` (1 hour)
  - **Range:** 5-1440 minutes (1 day)

- **`pollingEnabled`** (`boolean`)

  - Enables periodic polling of the Docker daemon for container status updates.
  - **Default:** `true`

- **`pollingInterval`** (`number`)

  - Interval in minutes between Docker status polls.
  - **Default:** `10`
  - **Range:** 5-60 minutes

- **`pruneMode`** (`string`)

  - Controls how image pruning operates.
  - **Values:** `"all"` (removes all unused images) or `"dangling"` (removes only untagged images)
  - **Default:** `"all"`

- **`stacksDirectory`** (`string`)

  - Defines the directory where Arcane stores and manages Docker Compose stack files.
  - **Default:** `"/app/data/stacks"`

- **`auth`** (object)

  - **`localAuthEnabled`** (`boolean`): Enables/disables local authentication.
    - **Default:** `true`
  - **`sessionTimeout`** (`number`): Session timeout in minutes.
    - **Default:** `60`
  - **`passwordPolicy`** (`string`): Password complexity requirements.
    - **Default:** `"medium"`

- **`registryCredentials`** (array)
  - List of registry credentials for pulling private images.

## Configuration with Docker

When running Arcane using Docker or Docker Compose, you configure the application by:

### 1. Mounting the Data Directory

This is the recommended approach as it persists all application data, including the encrypted configuration.

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

With this setup, configuration changes made through the UI are persisted across container restarts.

### 2. Environment Variables (Permissions)

The `docker-compose.yml` example includes environment variables for setting correct file permissions:

- **`PUID`** / **`PGID`**: Set these to the user ID and group ID of the user on your host machine.
- **`DOCKER_GID`**: Set this to the group ID of the `docker` group on your host machine.

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

## Important Notes

- **Direct file editing not supported:** Due to encryption, you cannot manually edit the `settings.dat` file.
- **First-run setup:** On first run, Arcane will create default settings and generate encryption keys.
- **Backup considerations:** When backing up your Arcane installation, ensure you include the entire data directory to preserve both settings and encryption keys.

## Initial Setup

When you first access Arcane, you'll be guided through a setup process where you can configure these settings. You can modify them later at any time through the Settings page in the web UI.
