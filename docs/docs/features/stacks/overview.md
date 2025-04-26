---
sidebar_position: 1
title: Stacks Overview
---

# Stacks Overview

The "Stacks" feature in Arcane allows you to manage multi-container applications defined using Docker Compose files directly within the Arcane UI. It provides a convenient way to deploy, monitor, and control complex applications composed of multiple services.

## Key Concepts

- **Stack:** Represents a multi-container application defined by a `docker-compose.yml` file. Arcane uses the `docker-compose` command-line tool (or equivalent library like `dockerode-compose`) under the hood to manage these.
- **Managed Stack:** A stack created or imported within Arcane. Its definition (`docker-compose.yml` and metadata) is stored within Arcane's configured data directory (see [Storage](#storage)).
- **External Stack:** A stack detected running on the Docker host (identified by the `com.docker.compose.project` label) but whose definition is not stored or managed by Arcane. You can import these to manage them within Arcane.
- **Stack Definition:** Consists primarily of the `docker-compose.yml` content and associated metadata like name and timestamps stored by Arcane.
- **Stack Status:** Arcane determines the status based on the state of the containers belonging to the stack:
  - `running`: All services defined in the compose file are running.
  - `partially running`: Some, but not all, services are running.
  - `stopped`: No services belonging to the stack are running.

## Core Functionality

With the Stacks feature, you can:

- **Create Stacks:** Define and deploy new applications by providing a name and the `docker-compose.yml` content.
- **List Stacks:** View all managed stacks and discovered external stacks.
- **Inspect Stacks:** See details of a stack, including its services, their status, running container count, and the underlying `docker-compose.yml` content.
- **Control Stacks:**
  - **Start:** Bring up all services defined in the stack (`compose up`).
  - **Stop:** Stop and remove the stack's containers (`compose down`).
  - **Restart:** Stop and then start the stack (`compose down` followed by `compose up`).
  - **Redeploy:** Stop the stack, pull the latest images for all services, and then start the stack again (`compose down`, `compose pull`, `compose up`).
- **Update Stacks:** Modify the name or the `docker-compose.yml` content of a managed stack.
- **Remove Stacks:** Stop the stack's services and permanently delete the stack definition from Arcane's storage.
- **Import External Stacks:** Bring an existing, externally managed stack under Arcane's control by saving its definition.

## Storage

Managed stack definitions (`docker-compose.yml` and `meta.json`) are stored within the directory specified by the `stacksDirectory` setting in your `app-settings.json`. By default, this is `/app/data/stacks` inside the Arcane container.

:::tip Persistence
To ensure your stack definitions are not lost when the Arcane container is recreated, it is crucial to mount the `/app/data` directory (or at least `/app/data/stacks`) as a volume, as shown in the recommended [Docker Compose setup](../getting-started/quickstart).
:::

## Next Steps

- Learn how to [Create and Manage Stacks](./managing-stacks).
