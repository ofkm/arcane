---
sidebar_position: 2
title: Auto Updates
---

Arcane can automatically monitor your running stacks and redeploy them when new versions of their Docker images become available. This feature helps keep your services up-to-date with minimal manual intervention.

## Global Configuration

First, ensure that the global auto-update feature is enabled in Arcane's settings. You can typically find this in the application's main settings or configuration panel. If this global setting is disabled, no stacks will be auto-updated, regardless of their individual configurations.

## Stack-Specific Configuration via Docker Compose Labels

To enable auto-updates for a specific stack, you need to add a special label to at least one of its services within its `docker-compose.yml` or `compose.yaml` file.

The label to use is: `arcane.stack.auto-update: "true"`

**How it works:**

- If Arcane's global auto-update setting is enabled, Arcane will periodically check all running or partially running stacks.
- For each stack, it will inspect its `compose.yaml` (or `docker-compose.yml`) file.
- If **any service** within that compose file contains the label `arcane.stack.auto-update: "true"`, the entire stack is considered eligible for auto-updates.
- Arcane will then proceed to check the images defined in that stack for newer versions (respecting any version tags you've specified).
- If an update is found for one or more images that are configured for auto-updates (e.g., using Watchtower labels or if the image itself is eligible), the entire stack will be pulled and redeployed.

**Example:**

Here's how you would enable auto-updates for a stack named `my-web-app` that has a `web` service:

```yaml
# In your STACKS_DIR/my-web-app/compose.yaml

version: '3.8'

services:
  web:
    image: nginx:latest # This image will be monitored for updates
    ports:
      - '8080:80'
    labels:
      arcane.stack.auto-update: 'true' # Enables auto-update for the 'my-web-app' stack
      # You can also add Watchtower-specific labels here if needed for fine-grained control
      # - "com.centurylinklabs.watchtower.enable=true" # Example if using Watchtower conventions

  # other_service:
  #   image: redis:alpine
  #   # This service does not need the label if 'web' already has it for the stack to be eligible.
  #   # However, its image will also be checked for updates if the stack is redeployed.
```

**Important Notes:**

- **Only one service needs the label:** You only need to add the `arcane.stack.auto-update: "true"` label to one service in the stack's compose file to make the entire stack eligible.
- **Global setting priority:** The global auto-update setting in Arcane must be enabled for this label to have any effect.
- **Image versioning:** Be mindful of the image tags you use (e.g., `latest`, specific versions like `1.2.3`, or rolling tags like `stable`). Auto-updates will pull based on the tag specified. Using `latest` means you'll always get the newest image marked as `latest`.
- **Redeployment:** When an update is triggered, Arcane will typically perform a full stack redeployment (similar to `docker-compose down` followed by `docker-compose up -d --pull`). Ensure your services are designed to handle graceful shutdowns and startups.
- **Checking Interval:** The frequency of checks is determined by Arcane's auto-update service configuration (e.g., a cron job or timed interval).
