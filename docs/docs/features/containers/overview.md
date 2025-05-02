---
sidebar_position: 1
title: Containers Overview
---

# Containers Overview

## What Can You Do With Containers in Arcane?

- **View Containers:** See all containers on your Docker host, including their names, IDs, images, and current status (like running or stopped).
- **Create Containers:** Launch new containers from existing images. You can set the name, image, ports, volumes, environment variables, and more using a guided form.
- **Start/Stop/Restart Containers:** Easily control the state of your containers with one click.
- **Inspect Containers:** Click on a container to see detailed information, including configuration, network settings, mounts, and logs.
- **Remove Containers:** Delete containers you no longer need. You can only remove stopped containers (unless you use the force option).
- **View Logs:** Check the output and error logs for each container to help with troubleshooting.

## How to Use

### Viewing Containers

1. Go to the **Containers** section in the sidebar.
2. You’ll see a table listing all your Docker containers with their names, IDs, images, and status.

### Creating a Container

1. Click the **Create Container** button.
2. Fill out the form with the required details (name, image, etc.).
3. (Optional) Set advanced options like ports, volumes, environment variables, and more.
4. Click **Create** to launch your new container.

### Controlling a Container

- **Start:** Click the **Start** button to run a stopped container.
- **Stop:** Click the **Stop** button to stop a running container.
- **Restart:** Click the **Restart** button to quickly restart a container.

### Inspecting a Container

1. Click on a container’s name or the **Inspect** button.
2. View detailed information about the container’s configuration, state, network, mounts, and logs.

### Removing a Container

1. In the containers list, find the container you want to remove.
2. Click the **Remove** button (trash icon).
3. Confirm the deletion in the dialog.
   > **Note:** You can only remove stopped containers unless you use the force option.

### Viewing Logs

1. Click on a container to open its details.
2. Go to the **Logs** tab to see the container’s output and error logs.
