---
sidebar_position: 1
title: Image Management
---

# Image Management

## What Can You Do With Images in Arcane?

- **View Images:** See a list of all Docker images on your system, including their tags, size, and when they were created.
- **Pull Images:** Download new images from Docker Hub or another registry by entering the image name and tag (like `nginx:latest`).
- **Inspect Images:** Click on an image to see more details, such as its ID, tags, creation date, and configuration.
- **Remove Images:** Delete images you no longer need. Arcane will warn you if an image is in use by a container.
- **Prune Images:** Clean up unused images to free up disk space. You can remove dangling images (those without tags) or all images not used by any container.

## How to Use

### Viewing Images

1. Go to the **Images** section in the sidebar.
2. You’ll see a table listing all your Docker images with their tags, size, and creation date.

### Pulling a New Image

1. Click the **Pull Image** button.
2. Enter the image name and tag (for example, `redis:latest`).
3. Click **Pull**. The image will be downloaded and added to your list.

### Inspecting an Image

1. Find the image you want to inspect in the list.
2. Click on its name, ID, or the **Inspect** button to see more details.

### Removing an Image

1. In the images list, find the image you want to remove.
2. Click the **Remove** button (trash icon) next to it.
3. Confirm the deletion in the dialog.
   > **Note:** You cannot remove images that are currently used by running containers.

### Pruning Images

1. Click the **Prune Images** button.
2. Choose whether to remove only dangling images or all unused images.
3. Confirm the action to free up disk space.
