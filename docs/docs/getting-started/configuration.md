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

- **`registryCredentials`** (array) (This is currently not actually working in 0.4.0)
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
      - arcane-data:/app/data # Mount data directory
    # ... other settings
```

With this setup, configuration changes made through the UI are persisted across container restarts.

### 2. Environment Variables

While most application settings are configured via the UI, certain environment variables are crucial for initial setup, permissions, and security, especially when running via Docker.

#### Permissions & Docker Socket Access

- **`DOCKER_GID`**: **Required.** Set this to the group ID of the `docker` group on your host machine (or the group that owns `/var/run/docker.sock`). This grants Arcane permission to interact with the Docker daemon. Find the ID using `getent group docker | cut -d: -f3` or `stat -c '%g' /var/run/docker.sock` on Linux.

#### Application Environment

- **`APP_ENV`**: **Required for Docker.** Controls which file system paths Arcane uses for data storage. When running in Docker, this must be set to `production` to ensure all data is stored in `/app/data` where the volume is mounted. Without this setting, the application may incorrectly use development paths (`.dev-data`) resulting in data not being persisted across container restarts.
  ```yaml
  environment:
    - APP_ENV=production # Ensures proper data paths in Docker
  ```

#### Session Security

- **`PUBLIC_SESSION_SECRET`**: **Required.** This secret is used to sign and encrypt user session cookies, ensuring their integrity and confidentiality. You **must** provide a strong, unique, random string of at least 32 characters. Generate a suitable secret using:

  ```bash
  openssl rand -base64 32
  ```

  Replace the placeholder in your `docker-compose.yml` or environment setup with the generated secret. **Keep this secret confidential.**

- **`PUBLIC_ALLOW_INSECURE_COOKIES`**: **Optional (Use with Caution).** By default (`false` or not set), session cookies are marked `Secure`, requiring an HTTPS connection. For **local development or testing only** where you are accessing Arcane over HTTP (e.g., `http://localhost:3000`) and cannot use HTTPS, you can set this variable to `true`. This allows the session cookie to be sent over insecure HTTP connections.
  **Warning:** Setting this to `true` in a production environment or any environment exposed to untrusted networks is **highly insecure** and strongly discouraged. Always use HTTPS in production.

#### Example `docker-compose.yml` Environment Section

```yaml
# docker-compose.yml excerpt
services:
  arcane:
    # ... other settings
    environment:
      # Application Environment
      - APP_ENV=production # Required for Docker deployment

      # Permissions
      - DOCKER_GID=998 # Example GID, replace with yours

      # Session Security
      - PUBLIC_SESSION_SECRET=your-secure-random-32-character-string-here # Replace with generated secret
      # - PUBLIC_ALLOW_INSECURE_COOKIES=true # Uncomment only for local HTTP testing
    # ... other settings
```

## Important Notes

- **Direct file editing not supported:** Due to encryption, you cannot manually edit the `settings.dat` file.
- **First-run setup:** On first run, Arcane will create default settings and generate encryption keys.
- **Backup considerations:** When backing up your Arcane installation, ensure you include the entire data directory (e.g., `/app/data` inside the container) to preserve settings, stacks, users, sessions, and encryption keys.
- **HTTPS Recommended:** For security, especially if exposing Arcane beyond your local machine, running it behind a reverse proxy with HTTPS enabled is strongly recommended. This protects login credentials and session cookies.

## Initial Setup

When you first access Arcane, you'll be guided through a setup process where you can configure the essential settings. You can modify them later at any time through the Settings page in the web UI.
