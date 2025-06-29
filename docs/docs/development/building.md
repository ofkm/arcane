---
sidebar_position: 2
title: Building from Source
---

# Building Arcane from Source

This guide explains how to build the Arcane application from its source code. This is useful if you want to contribute to development, test unreleased features, or create custom builds.

## Prerequisites

- Node.js: Version 22 or higher.
- Go: v1.24 or higher.
- npm, yarn, pnpm, or bun: A Node.js package manager. Examples will use `npm`.
- Git: Required to clone the repository.
- Docker Engine: Required if you intend to build the Docker image, and test functionality locally.

## Steps

1.  **Clone the Repository:**
    Open your terminal and clone the Arcane repository:

    ```bash
    git clone https://github.com/ofkm/arcane
    cd arcane
    ```

2.  **Install Dependencies:**
    Run the build script located in the root of the repo. This will build the frontend and embded it in the backend.

    ```bash
    ./build.sh
    ```

3.  **Linting and Formatting:**
    Before building, you might want to check for code style issues:

    ```bash
    cd frontend
    npm run lint
    npm run format
    ```

## Building the Docker Image

The repository includes a `Dockerfile` to containerize the application.

1.  **Ensure Docker is Running:** Make sure your Docker daemon is active.
2.  **Build the Image:** From the root of the project directory, run:

    ```bash
    docker buildx build -tag arcane --platform linux/amd64,linux/arm64 .
    ```

    You can replace `arcane` with your preferred image tag.

3.  **Run the Docker Container:**

    See the [Quickstart](/docs/getting-started/quickstart) guide on how to run the docker container.
