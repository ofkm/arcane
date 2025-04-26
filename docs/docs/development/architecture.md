---
sidebar_position: 1
title: Architecture Overview
---

# Architecture Overview

This document provides a high-level overview of the technical architecture of Arcane.

## Core Technologies

Arcane is built primarily using the following technologies:

- **Framework:** [SvelteKit](https://kit.svelte.dev/) (using Svelte 5) - A full-stack web framework used for both the frontend UI and the backend server logic.
- **Language:** [TypeScript](https://www.typescriptlang.org/) - Provides static typing for improved code quality and maintainability.
- **Docker Interaction:** [Dockerode](https://github.com/apocas/dockerode) - A Node.js library used to interact with the Docker Engine API (via socket or TCP).
- **Docker Compose Interaction:** [dockerode-compose](https://github.com/BretFisher/dockerode-compose) - Used for managing Docker Compose stacks.
- **Styling:** [Tailwind CSS](https://tailwindcss.com/) (v4) - A utility-first CSS framework for building the user interface.
- **UI Components:** Various Svelte libraries including [Bits UI](https://www.bits-ui.com/), [Lucide Svelte](https://lucide.dev/), [Formsnap](https://formsnap.dev/), [Mode Watcher](https://mode-watcher.vercel.app/), and [Svelte Sonner](https://svelte-sonner.vercel.app/).
- **Build Tool:** [Vite](https://vitejs.dev/) - Provides a fast development server and optimized production builds.
- **Runtime:** [Node.js](https://nodejs.org/) - Arcane runs as a Node.js application, facilitated by `@sveltejs/adapter-node`.
- **Data Handling (Potential):** [Redis/Valkey](https://redis.io/) - The presence of `redis` dependency and `valkey-service.ts` suggests potential use for caching, session management, or other state persistence, although its exact role needs further investigation.

## Structure

The project follows a standard SvelteKit structure:

- **`src/routes`**: Contains the application's pages and API endpoints. SvelteKit's file-based routing is used here.
- **`src/lib`**: Contains reusable components, utilities, and core services.
  - **`src/lib/components`**: Reusable Svelte UI components.
  - **`src/lib/services`**: Backend services responsible for business logic and external interactions.
    - `docker/`: Services interacting with Docker Engine (using Dockerode). Includes `stack-service.ts` for Compose operations.
    - `settings-service.ts`: Likely handles application settings persistence or retrieval.
    - `app-config-service.ts`: Potentially manages application-level configuration.
    - `valkey-service.ts`: Service for interacting with the Redis/Valkey instance.
  - **`src/lib/utils`**: General utility functions.
- **`static`**: Static assets like images or fonts.
- **`hooks.server.ts`**: SvelteKit server hooks, used here to initialize services like the `ComposeService`.

## Data Flow

1.  **User Interaction:** The user interacts with the Svelte components rendered in their browser.
2.  **Client-Side Logic:** Svelte components handle UI state and basic interactions.
3.  **Server Request (Load Functions / Form Actions):** For data fetching or actions requiring backend logic (like interacting with Docker), the frontend makes requests to SvelteKit's server-side endpoints or uses `load` functions and form actions.
4.  **SvelteKit Backend:** The server-side part of SvelteKit (running on Node.js) receives the request.
5.  **Service Layer:** The request handler calls appropriate functions within the `src/lib/services` directory.
6.  **Docker Interaction:** Services in `src/lib/services/docker/` use `dockerode` and `dockerode-compose` to communicate with the Docker daemon via its API (e.g., listing containers, starting/stopping, managing stacks).
7.  **Configuration/State:** Services might read configuration from `app-settings.json` (managed by `app-config-service.ts` or `settings-service.ts`) or interact with Redis/Valkey (`valkey-service.ts`) for caching or state.
8.  **Response:** The service layer returns data to the SvelteKit backend handler.
9.  **SSR / API Response:** SvelteKit either server-renders the page with the fetched data or returns a JSON response to the client.
10. **UI Update:** The frontend Svelte components update based on the received data.

## Key Architectural Decisions

- **Full-Stack SvelteKit:** Leverages SvelteKit for both frontend and backend, simplifying the tech stack.
- **Node.js Backend:** Uses `@sveltejs/adapter-node` for deployment flexibility as a standard Node.js application, suitable for containerization.
- **Direct Docker API Interaction:** Uses `dockerode` to communicate directly with the Docker API, providing fine-grained control.
- **Service-Oriented Backend:** Organizes backend logic into distinct services within `src/lib/services`.
- **TypeScript:** Enhances code reliability and developer experience.

This architecture aims for a balance between simplicity (using a unified framework) and capability (direct Docker API access).
