---
sidebar_position: 2
title: Managing Images
---

# Managing Images

This guide explains how to use the Arcane UI to list, pull, inspect, and remove Docker images on your connected Docker host.

## Viewing Images

Navigate to the "Images" section in the Arcane sidebar. This page displays a list of all images currently available locally on your Docker host.

For each image, you'll typically see:

- **Tags:** The repository name(s) and tag(s) associated with the image (e.g., `nginx:latest`, `ubuntu:22.04`). An image might have multiple tags. Untagged images might be shown as `<none>:<none>`.
- **Image ID:** The unique short ID of the image.
- **Size:** The amount of disk space the image occupies.
- **Created:** The date and time the image was built or pulled.
- **Actions:** Buttons or icons for performing actions like Inspect or Remove.

## Pulling an Image

1.  Click the "Pull Image" button, often located near the top of the Images list page.
2.  A dialog box (`pull-image-dialog.svelte`) will appear.
3.  Enter the full name of the image you want to pull, including the tag. If you omit the tag, Docker typically defaults to `latest`.
    - Examples: `redis:latest`, `postgres:15-alpine`, `ghcr.io/ofkm/arcane:latest`
4.  Click "Pull". Arcane will initiate the image download process from the specified registry (Docker Hub by default, unless a different registry is part of the image name).
5.  You might see progress updates in the UI or notifications. Once complete, the new image will appear in the image list.

## Inspecting an Image

1.  Find the image you want to inspect in the list.
2.  Click on its name, ID, or an "Inspect" icon/button associated with it.
3.  A details view or modal will open, displaying comprehensive information about the image, such as:
    - Full Image ID and Tags
    - Creation Date and Architecture
    - Environment Variables defined in the image
    - Exposed Ports
    - Entrypoint and Command
    - Labels
    - Layer history (potentially)

## Removing Images

1.  **Single Image:**
    - Find the image you want to remove in the list.
    - Click the "Remove" or trash can icon associated with that specific image or tag.
2.  **Multiple Images (if supported):**
    - Select the checkboxes next to the images you wish to remove.
    - Click a main "Remove Selected" button.
3.  **Confirmation:** You will likely be asked to confirm the removal.
4.  **Force Option:** Arcane might offer a "Force remove" option. This is necessary if you want to remove an image that is currently used by a stopped container. **Use force removal with caution**, as it can affect containers based on that image. You generally cannot remove images used by _running_ containers.
