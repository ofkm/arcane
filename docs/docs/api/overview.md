---
sidebar_position: 1
title: API Overview
---

# API Overview

## Interacting with the Docker Engine API

Arcane functions primarily as a user interface and management layer on top of the **Docker Engine API**. It does not expose its own public REST API for external applications to consume directly.

Instead, Arcane's backend (built with SvelteKit) communicates with the Docker daemon using the [Docker Engine API](https://docs.docker.com/engine/api/) via the [Dockerode](https://github.com/apocas/dockerode) library.

## Internal Communication

The communication between the Arcane frontend (running in your browser) and the Arcane backend (the Node.js server) happens through SvelteKit's built-in mechanisms:

- **Load Functions:** Used for fetching data required to render pages.
- **Form Actions:** Used for handling user submissions like starting/stopping containers or modifying settings.
- **API Routes (Server Endpoints):** Specific endpoints within `src/routes` might be defined for certain backend operations, but these are generally considered internal implementation details of Arcane.

## For External Integrations

If you need programmatic access to manage Docker, you should interact directly with the official **[Docker Engine API](https://docs.docker.com/engine/api/v1.45/)**. Arcane provides a user-friendly interface for this API but does not act as an API gateway itself.

## Future Considerations

While a public API for Arcane is not currently available, it might be considered for future development if there is significant demand for external integrations specific to Arcane's features (beyond standard Docker operations). If you have a use case for such an API, please consider opening a [Feature Request](https://github.com/ofkm/arcane/issues/new?template=feature.yml).
