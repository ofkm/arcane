---
sidebar_position: 1
title: Images Overview
---

# Images Overview

The "Images" section in Arcane provides tools to manage the Docker images available on your connected Docker host. Docker images are the blueprints used to create containers.

## Key Concepts

- **Image:** A read-only template containing application code, libraries, dependencies, tools, and other files needed for an application to run.
- **Tag:** A label applied to an image to distinguish different versions or variants (e.g., `latest`, `1.2.0`, `alpine`). An image can have multiple tags.
- **Image ID:** A unique identifier (SHA256 hash) for an image's content.
- **Registry:** A storage and distribution system for Docker images (e.g., Docker Hub, GitHub Container Registry, private registries).
- **Dangling Image:** An image layer that is not associated with any tagged image. These often result from building new versions of an image without removing the old one.

## Core Functionality

Based on the `image-service.ts` and related components, Arcane allows you to perform the following actions on Docker images:

- **List Images:** View all images currently present on the Docker host, including their tags, size, creation date, and ID.
- **Pull Images:** Download new images from a specified registry (like Docker Hub). You can specify the image name and tag (e.g., `nginx:latest`, `redis:7-alpine`). The UI includes a dedicated dialog (`pull-image-dialog.svelte`) for this purpose.
- **Inspect Images:** View detailed information about a specific image, potentially including its layers, environment variables, exposed ports, and command history.
- **Remove Images:** Delete one or more images from the Docker host to free up disk space. You can typically only remove images that are not currently being used by any containers (stopped or running). Arcane might offer options to force removal.
- **Prune Images:** Remove unused images, specifically dangling images (those without tags) and potentially all images not associated with at least one container. This helps reclaim disk space efficiently.

## Image Data

Arcane represents image information using a structure defined in `image.type.ts`, likely including fields such as:

- `Id`: The unique image ID.
- `RepoTags`: A list of repository names and tags associated with the image.
- `Created`: Timestamp of when the image was created.
- `Size`: The virtual size of the image.
- `Labels`: Any metadata labels applied to the image.

## Next Steps

- Learn how to perform specific actions in [Managing Images](./managing-images).
