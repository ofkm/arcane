---
sidebar_position: 2
title: Managing Containers
---

# Managing Containers

This guide explains how to use the Arcane UI to list, create, control the state of, and remove individual Docker containers.

## Viewing Containers

Navigate to the "Containers" section in the Arcane sidebar. This page displays a table (`#attachment_page_svelte`) listing all containers on your connected Docker host.

Key information displayed typically includes:

- **Name:** The container's name.
- **State:** The current status (e.g., `running`, `exited`).
- **Image:** The image the container is based on.
- **IP Address:** The container's IP address within its Docker network.
- **Ports:** Mappings between host and container ports.
- **Actions:** Buttons for common operations like Start, Stop, Restart, and Remove (`#attachment_ContainerActions_svelte`).

You can usually filter or sort this list based on different criteria.

## Creating a New Container

1.  Click the "Create Container" or "+" button, typically located near the top of the container list.
2.  A detailed dialog (`#attachment_create_container_dialog_svelte`) will appear, allowing you to configure the new container. Key sections include:
    - **General:** Name, Image (you can search/select available images).
    - **Ports:** Define port mappings (Host Port : Container Port).
    - **Volumes:** Map host directories or named volumes to paths inside the container.
    - **Environment:** Add environment variables (KEY=VALUE).
    - **Network:** Choose the Docker network, set hostname, and potentially assign a static IP address within user-defined networks.
    - **Restart Policy:** Define when the container should automatically restart (e.g., `unless-stopped`, `on-failure`).
    - **Labels:** Add custom metadata labels.
    - **Advanced:** May include options for command overrides, user specification, healthchecks, and resource limits (CPU/Memory).
3.  Fill in the desired configuration options.
4.  Click "Create" or "Deploy". Arcane will use the provided configuration (`ContainerConfig`) to create and start the new container via the Docker API (`#attachment_container_service_ts`).

## Controlling Container State

You can control the state of containers directly from the list view or potentially from the container's details page using the action buttons (`#attachment_ContainerActions_svelte`):

- **Start:** Select a stopped container and click the "Start" button. Arcane will execute the start command (`#attachment_container_service_ts`).
- **Stop:** Select a running container and click the "Stop" button. Arcane will send a stop signal to the container (`#attachment_container_service_ts`).
- **Restart:** Select a running container and click the "Restart" button. Arcane will stop and then immediately start the container again (`#attachment_container_service_ts`).

## Removing Containers

1.  **Ensure the container is stopped.** You generally cannot remove a running container unless using a "force" option.
2.  Select the stopped container(s) you wish to remove.
3.  Click the "Remove" or trash can icon (`#attachment_ContainerActions_svelte`).
4.  **Confirmation:** You will likely be asked to confirm the removal.
5.  **Force Option:** If available, the "Force" option allows removing a running container. This is equivalent to `docker rm -f` and should be used cautiously as it doesn't allow the container to shut down gracefully.

Removing a container deletes its writable layer; associated volumes are typically _not_ removed automatically unless specifically configured (e.g., anonymous volumes with `docker run --rm`).
