---
sidebar_position: 2
title: Building from Source
---

# Building Arcane from Source

This guide explains how to build the Arcane application from its source code. This is useful if you want to contribute to development, test unreleased features, or create custom builds.

## Prerequisites

Before building Arcane, ensure you have the following installed:

- **Node.js**: Version 24 or higher. Download from [nodejs.org](https://nodejs.org/).
- **yarn**: A Node.js package manager. Install globally with `npm install -g yarn`.
- **Docker**: For containerized deployments. Download from [docker.com](https://www.docker.com/).

## Development Setup

1. **Clone the repository:**

   ```bash
   git clone https://github.com/ofkm/arcane.git
   cd arcane
   ```

2. **Install dependencies:**

   ```bash
   yarn install
   ```

3. **Start the development server:**

   ```bash
   yarn dev
   ```

4. **Code quality checks:**

   ```bash
   yarn lint
   yarn format
   ```

5. **Build for production:**
   ```bash
   yarn build
   ```

## Building the Docker Image

The repository includes a `Dockerfile` to containerize the application.

1.  **Ensure Docker is Running:** Make sure your Docker daemon is active.
2.  **Build the Image:** From the root of the project directory, run:

    ```bash
    docker build -t arcane-local .
    ```

    You can replace `arcane-local` with your preferred image tag.

3.  **Run the Docker Container:**

    See the [Quickstart](/docs/getting-started/quickstart) guide on how to run the docker container.

## Summary

This covers the essential steps for building and running Arcane from its source code, both as a standalone Node.js application and as a Docker image.
