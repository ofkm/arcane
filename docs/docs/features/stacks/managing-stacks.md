---
sidebar_position: 2
title: Managing Stacks
---

# Managing Stacks

This guide explains how to use the Arcane UI to create, inspect, control, and remove Docker Compose stacks.

## Viewing Stacks

Navigate to the "Stacks" section in the Arcane sidebar. Here you will see a list of:

- **Managed Stacks:** Stacks whose definitions are stored and managed by Arcane.
- **External Stacks:** Stacks detected running on the Docker host but not yet managed by Arcane. These are typically identified by the `com.docker.compose.project` label on their containers.

Each stack entry usually displays its name, status (`running`, `partially running`, `stopped`), and the number of running services/containers.

## Creating a New Stack

1.  Click the "Create Stack" or "+" button (the exact UI element may vary).
2.  A form or modal will appear asking for:
    - **Stack Name:** A unique name for your stack (e.g., `my-app`, `monitoring`). This name will be used as the Compose project name.
    - **Compose Definition:** A text editor area where you can paste or write your `docker-compose.yml` content.
3.  Review your Compose definition for correctness.
4.  Click "Create" or "Deploy". Arcane will save the definition and attempt to start the stack using `compose up`.

## Inspecting a Stack

Click on the name of any stack (managed or external) in the list to view its details page. This page typically shows:

- **Stack Name and Status:** The current state of the stack.
- **Services:** A list of services defined in the `docker-compose.yml`, along with the status and count of running containers for each service.
- **Compose Definition:** The content of the `docker-compose.yml` file associated with the stack.
- **Action Buttons:** Controls available for the stack (see below).

## Controlling Managed Stacks

On the details page for a **managed stack**, you will find several action buttons:

- **Start:** Starts all services defined in the stack (`compose up -d`). If the stack is already running, this might recreate services whose configuration or image has changed.
- **Stop:** Stops and removes the containers associated with the stack (`compose down`). Persistent volumes are typically _not_ removed by this action.
- **Restart:** Stops the stack (`compose down`) and then starts it again (`compose up -d`). Useful for applying changes or refreshing the application state.
- **Redeploy:** Stops the stack (`compose down`), attempts to pull the latest images for all services defined in the compose file (`compose pull`), and then starts the stack again (`compose up -d`). This is useful for updating your application services to their newest image versions.
- **Update:** Allows you to modify the stack's name or edit its `docker-compose.yml` definition. After saving changes, you might need to manually Redeploy or Restart the stack for them to take effect.
- **Remove:** Stops the stack (`compose down`) and permanently deletes the stack's definition (`docker-compose.yml` and `meta.json`) from Arcane's storage (`/app/data/stacks`). **Use with caution!**

## Importing External Stacks

If Arcane detects an external stack running on your Docker host, it will typically appear in the Stacks list with an "Import" option.

1.  Find the external stack in the list.
2.  Click the "Import" button associated with it.
3.  Arcane will attempt to retrieve the `docker-compose.yml` content (if possible, though this might not always be feasible depending on how the stack was deployed) and pre-fill the creation form.
4.  Review the retrieved name and Compose definition. You may need to manually paste the correct `docker-compose.yml` content if it couldn't be retrieved automatically.
5.  Click "Import" or "Save". The stack will now be listed as a managed stack, and its definition will be stored by Arcane. You can now use all the control actions available for managed stacks.
