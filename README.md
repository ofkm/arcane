# Arcane - Docker Management UI

[![Status](https://img.shields.io/badge/status-pre--release-orange)](https://shields.io/)

**⚠️ Note:** Arcane is currently pre-release software. Features may change, and bugs are expected. Use with caution, especially in production environments.

Arcane is a web-based user interface built with SvelteKit designed to simplify interaction with your Docker environment. It provides a clean overview and management capabilities for your containers, images, volumes, and networks.

## Features

- **Containers:** List, inspect, start, stop, restart, and remove containers. View container logs. Create containers (basic implementation).
- **Images:** List, pull, and remove images. Prune unused images.
- **Volumes:** List, create, and remove volumes.
- **Networks:** List and remove networks.
- **Stacks:** Manage Docker Compose stacks (via `docker-compose` CLI integration - requires `docker-compose` accessible in the container/host).
- **Settings:** Configure Docker connection details (Host/Socket Path) and application preferences like polling interval.
- **Responsive UI:** Built with shadcn-svelte and Tailwind CSS for a modern look and feel on various devices.

## Technology Stack

- **Framework:** SvelteKit
- **Language:** TypeScript
- **UI Components:** shadcn-svelte, Bits UI
- **Styling:** Tailwind CSS
- **Docker Interaction:** Dockerode (Node.js client for the Docker Engine API)
- **Deployment:** Docker Compose

## Prerequisites

- **Docker Engine:** Must be installed and running.
- **Docker Compose:** Required for the recommended setup method. (Note: Also used internally for Stack management).
- **Node.js & npm/pnpm/yarn:** Required _only_ for local development.

## Getting Started (Docker Compose - Recommended)

This is the easiest and recommended way to run Arcane.

1.  **Clone the repository:**

    ```bash
    git clone <your-repository-url> arcane
    cd arcane
    ```

2.  **Review Docker Compose Configuration (`docker-compose.yml`):**

    - **Docker Socket:** The service mounts `/var/run/docker.sock` by default. Ensure this path is correct for your system.
      - **Permissions:** The container needs permission to access the Docker socket. The `DOCKER_GID` environment variable is set to `998` in the example. You may need to adjust this to match the group ID of the `docker` group on your host system. Find it using: `getent group docker | cut -d: -f3`
    - **Data Persistence:** The `./arcane-data:/app/data` volume mapping persists stack definitions and potentially other application data outside the container in the `arcane-data` directory.
    - **User/Group IDs:** `PUID` and `PGID` are set for file ownership within the persistent volume. Adjust as needed for your host user.
    - **Port:** The application runs on port `3000` by default.

3.  **Build and Run:**

    ```bash
    docker-compose up -d
    ```

    This will pull the `ghcr.io/ofkm/arcane:latest` image and start the container in the background.

4.  **Access Arcane:**
    Open your web browser and navigate to `http://localhost:3000` (or the port you configured).

## Development (Local)

If you want to contribute or run the application directly using Node.js:

1.  **Clone the repository:**

    ```bash
    git clone <your-repository-url> arcane
    cd arcane
    ```

2.  **Install dependencies:**

    ```bash
    npm install
    # or pnpm install / yarn install
    ```

3.  **Configure Docker Connection:**

    - Arcane attempts to connect to the Docker socket specified in `app-settings.json` (defaults to `/var/run/docker.sock` if the file doesn't exist or the setting is missing).
    - Ensure your local Node.js process has permissions to access the Docker socket.
    - You can modify connection settings via the UI (**Settings** page) once running, which updates `app-settings.json`.

4.  **Start the development server:**
    ```bash
    npm run dev
    # or npm run dev -- --open to open automatically
    ```
    The application will typically be available at `http://localhost:5173`.

## Configuration

- Application settings are managed via the **Settings** page in the UI.
- These settings are stored in `app-settings.json` in the application's root data directory (`/app/data` inside the container, mapped to `./arcane-data` in the default compose setup).
- Key settings include:
  - `dockerHost`: Docker socket path or TCP address (e.g., `unix:///var/run/docker.sock` or `tcp://192.168.1.100:2375`).
  - `pollingInterval`: Auto-refresh interval in seconds (0 to disable).
  - `stacksDirectory`: Path where Docker Compose stack files are stored (relative to `/app/data`).

## Building for Production (Standalone Node.js)

While Docker Compose is recommended, you can build a production version:

1.  **Build the application:**

    ```bash
    npm run build
    ```

    This creates a production-ready Node.js application in the `build` directory (using `adapter-node`).

2.  **Run the application:**

    ```bash
    node build/index.js
    ```

    Ensure the Node.js environment has access to the Docker socket and the `app-settings.json` file (if needed). You might need to set environment variables or manage `app-settings.json` manually in this setup.

3.  **Preview the build locally:**
    ```bash
    npm run preview
    ```

## Important Notes

- **Security:** Mounting the Docker socket (`/var/run/docker.sock`) into any container grants it root-level access to your Docker host. Understand the security implications before running Arcane or any container with socket access.
- **Pre-release:** This software is under active development. Expect breaking changes and bugs.
- **Data:** Stack definitions and application settings are stored in the mapped data volume (`./arcane-data` by default when using Docker Compose). Back up this directory if needed.
