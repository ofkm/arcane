---
sidebar_position: 2
title: API Endpoints
---

# API Endpoints

As outlined in the [API Overview](./overview.md), **Arcane does not currently expose a public REST API with defined endpoints for external consumption.**

The application's backend logic is handled internally by the SvelteKit server, which communicates directly with the Docker Engine API. Any API routes defined within the `src/routes` directory are considered internal implementation details and are subject to change without notice. They are not intended for direct use by external applications or scripts.

## Accessing Docker Programmatically

If you need to interact with Docker programmatically, please refer to the official **[Docker Engine API documentation](https://docs.docker.com/engine/api/v1.45/)**. This is the standard and supported way to automate Docker operations.
