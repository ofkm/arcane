# Arcane — Copilot / AI agent quick instructions

Purpose: Get an AI coding agent productive quickly. Make small, well-scoped edits, follow repository wiring, and run the provided dev script for integrated testing, dont make useless comments that dont help the codebase.

Quick architecture summary

- Backend: Go (cmd/main.go) + Gin. App wiring and DI live in `internal/bootstrap/`. DB via GORM; models under `internal/models/`. Handlers in `internal/api/*_handler.go`, services in `internal/services/*_service.go`.
- Frontend: SvelteKit (frontend/src) using Svelte 5 syntax (runes). Routes: `frontend/src/routes/`. Shared components: `frontend/src/lib/components/`.
- Integration: Docker + local containers. Entry scripts: `scripts/docker/entrypoint.sh` and `docker/entrypoint.sh`.

Essential workflows (commands)

- Start dev env (recommended): `./scripts/development/dev.sh start` (VS Code task "Start").
- Stop / Restart / Rebuild: same script with `stop|restart|rebuild|clean`.
- Frontend local build: use `frontend/package.json` scripts (or run inside the dev containers).
- Tests: Playwright E2E specs in `tests/spec/*.ts`; helpers in `tests/` and `setup/`.

Project-specific conventions (follow exactly)

- Keep HTTP handlers thin — push business logic into `internal/services/*_service.go`.
- File naming: `*_handler.go`, `*_service.go`, DTOs in `internal/dto/`.
- Use DTOs for API boundaries; frontend also has DTOs under `frontend/src/lib/dto/`.
- Database models include `BaseModel` fields and may implement `TableName()` for custom names.
- Svelte 5: use `$state()/$effect()/$derived()` and `let { prop } = $props()` patterns. Frontend files use Svelte 5 runes consistently.

Where to look when adding features or debugging

- Startup & wiring: `internal/bootstrap/` -> `cmd/main.go`.
- API endpoints and handlers: `internal/api/`.
- Services and business logic: `internal/services/`.
- Frontend pages & components: `frontend/src/routes/` and `frontend/src/lib/components/`.
- Docker/dev scripts: `scripts/development/dev.sh`, `docker-compose*.yml`, and `scripts/docker/entrypoint.sh`.

Tests & CI notes

- Playwright E2E lives in `tests/` and is configured via `tests/package.json` and `playwright.config.ts`.
- Backend unit tests should mock Docker client calls where possible.

Safe-edit checklist for AI agents

1. Make minimal changes and run `go build ./...` if you change backend code.
2. Run frontend build (`pnpm -w -C frontend build`) or use the dev script for integrated runs.
3. Do not commit secrets or change environment wiring; use `dev.sh` for env setup.

Examples (copyable patterns)

- New handler: add `internal/api/foo_handler.go` that binds request DTO, calls `services.NewFooService(db, docker).Create(...)`, and returns JSON.
- New service: `internal/services/foo_service.go` that accepts DB and Docker clients from bootstrap and implements business logic; return wrapped errors with `fmt.Errorf("context: %w", err)`.

If unclear

- Ask to inspect a specific file (path) and whether you want me to run build/tests. I'll run them and return results.

— End of concise instructions —

# Arcane Docker Management UI - Copilot Instructions

## Project Overview

Arcane is a modern, full-stack Docker management UI built with SvelteKit frontend and Go backend. It provides comprehensive Docker environment management including containers, images, volumes, networks, stacks, and image update tracking.

## Architecture & Tech Stack

### Backend (Go)

- **Framework**: Gin web framework with Go 1.24.3+
- **Database**: GORM with PostgreSQL/SQLite support
- **Structure**: Clean architecture with bootstrap pattern
- **Authentication**: JWT + optional OIDC integration
- **Jobs**: gocron v2 for scheduled tasks
- **Docker**: Official Docker SDK integration

### Frontend (SvelteKit + TypeScript)

- **Framework**: SvelteKit with Svelte 5 syntax
- **UI**: shadcn-svelte components + Tailwind CSS
- **Icons**: Lucide Svelte
- **State**: Svelte 5 runes ($state, $effect, $derived)
- **API**: Axios for HTTP requests
- **Build**: Vite with static adapter

## Code Conventions & Patterns

### Backend (Go)

#### File Organization

```
backend/
├── cmd/main.go                    # Application entry point
├── internal/
│   ├── bootstrap/                 # App initialization (DI container pattern)
│   ├── api/                      # HTTP handlers (*_handler.go)
│   ├── services/                 # Business logic (*_service.go)
│   ├── models/                   # Database models
│   ├── dto/                      # Data transfer objects
│   ├── database/                 # DB connection & migrations
│   ├── config/                   # Configuration management
│   ├── middleware/               # HTTP middleware
│   ├── utils/                    # Utility functions
│   └── job/                      # Background job scheduling
```

#### Naming Conventions

- **Handlers**: `*_handler.go` with methods like `List`, `Create`, `Update`, `Delete`
- **Services**: `*_service.go` with business logic implementation
- **Models**: Singular names (e.g., `Container`, `Image`, `Stack`)
- **Package names**: Lowercase, single word when possible

#### Database Models

- Use GORM annotations for relationships and constraints
- Include `BaseModel` for common fields (ID, CreatedAt, UpdatedAt)
- Implement `TableName()` method for custom table names
- Use proper foreign key relationships with preloading

#### API Patterns

- RESTful endpoints with proper HTTP status codes
- Use DTOs for request/response transformation
- Implement pagination with `SortedPaginationRequest`
- Return consistent JSON error responses
- Use Gin binding for request validation

#### Error Handling

- Return meaningful HTTP status codes
- Use structured logging with `slog`
- Wrap errors with context using `fmt.Errorf`
- Handle Docker API errors gracefully

### Frontend (SvelteKit + TypeScript)

#### File Organization

```
frontend/src/
├── routes/                       # SvelteKit file-based routing
├── lib/
│   ├── components/              # Reusable Svelte components
│   ├── services/api/           # API service classes
│   ├── stores/                 # Svelte stores
│   ├── types/                  # TypeScript type definitions
│   ├── dto/                    # Frontend DTOs
│   ├── utils/                  # Utility functions
│   └── constants.ts            # App constants
```

#### Svelte 5 Conventions

- **Props**: Use `let { prop1, prop2 } = $props()` destructuring
- **State**: Use `$state()` for reactive variables
- **Effects**: Use `$effect()` for side effects
- **Derived**: Use `$derived()` for computed values
- **Event handlers**: Use `on*` props or inline handlers

#### Component Patterns

- **Reusable components**: Place in `/lib/components/`
- **Page components**: Use `+page.svelte` in routes
- **Layout components**: Use `+layout.svelte` for shared layouts
- **Loading states**: Implement with `loading` props and spinners
- **Error boundaries**: Handle errors gracefully with user feedback

#### TypeScript Usage

- Define interfaces for all data structures
- Use strict type checking
- Export types from dedicated `*.type.ts` files
- Use generic types for reusable components

#### API Integration

- Create service classes in `/lib/services/api/`
- Use Axios with proper error handling
- Implement request/response DTOs
- Use async/await patterns consistently

#### Styling

- Use Tailwind CSS classes
- Follow shadcn-svelte component patterns
- Implement dark/light mode support
- Use CSS variables for theming

## Development Guidelines

### General Rules

- **No unnecessary comments**: Code should be self-documenting
- **Clean imports**: Group and sort imports logically
- **Error handling**: Always handle errors appropriately
- **Type safety**: Use TypeScript strictly on frontend
- **Performance**: Implement pagination, lazy loading, and efficient updates

### Backend Specific

- Use dependency injection through bootstrap pattern
- Implement proper service layer separation
- Use GORM relationships efficiently with preloading
- Handle Docker API rate limits and timeouts
- Implement proper logging with structured data

### Frontend Specific

- **Always use Svelte 5 syntax** (runes, new event handling)
- Implement proper loading and error states
- Use reactive patterns efficiently
- Follow SvelteKit best practices for SSR/hydration
- Implement proper form validation

### Database

- Use migrations for schema changes
- Implement proper indexing for performance
- Use foreign key constraints
- Handle soft deletes where appropriate

### Security

- Validate all user inputs
- Use proper authentication middleware
- Implement CORS correctly
- Encrypt sensitive configuration data
- Follow Docker security best practices

### Testing

- Write Playwright E2E tests for critical user flows
- Test API endpoints thoroughly
- Mock external Docker API calls in tests
- Use proper test data setup and teardown

## Anti-Patterns to Avoid

### Backend

- Don't put business logic in handlers
- Don't use global variables for state
- Don't ignore database transaction boundaries
- Don't hardcode registry-specific logic (use generic patterns)

### Frontend

- Don't use Svelte 4 syntax (no export let, on:click, etc.)
- Don't ignore loading/error states
- Don't create overly complex component hierarchies
- Don't bypass type checking with `any`

### General

- Don't add unnecessary comments or console.log statements
- Don't ignore error handling
- Don't create tight coupling between layers
- Don't commit sensitive configuration data

## Container Registry Integration

When working with container registries:

- Use generic authentication patterns, not registry-specific hardcoding
- Handle different authentication methods (bearer tokens, basic auth)
- Implement proper error handling for network timeouts
- Support multiple registry providers (Docker Hub, GHCR, custom OCI)
- Use case-insensitive header checking for registry responses

This codebase emphasizes clean architecture, type safety, and maintainable patterns. Follow these guidelines to ensure consistency and quality across all contributions.
