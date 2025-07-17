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
