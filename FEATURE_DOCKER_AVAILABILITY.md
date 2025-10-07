# Feature: Docker Socket Availability Detection

## Issue

When the Docker socket is not mounted for the Arcane service, the 'Local Docker' option still appears in the Environments dropdown but selecting it triggers unhandled 500 internal errors.

## Solution

Detect whether the local Docker socket is mounted and gracefully handle the scenario where it's not available.

## Changes Made

### Backend Changes

#### 1. `backend/internal/services/docker_client_service.go`

- **Added**: `IsDockerAvailable(ctx context.Context) bool` method
  - Attempts to create a Docker connection
  - Pings the Docker daemon
  - Returns `true` if Docker is accessible, `false` otherwise

#### 2. `backend/internal/api/system_handler.go`

- **Added**: `CheckDockerAvailable(c *gin.Context)` handler method
  - Calls `dockerService.IsDockerAvailable()`
  - Returns JSON with `available` boolean field
- **Added**: New route: `GET /api/environments/:id/system/docker/available`

### Frontend Changes

#### 3. `frontend/src/lib/services/system-service.ts`

- **Added**: `checkDockerAvailable(): Promise<boolean>` method
  - Calls the backend `/environments/0/system/docker/available` endpoint
  - Returns `false` if the request fails (graceful fallback)

#### 4. `frontend/src/lib/stores/docker-availability.store.ts` (NEW FILE)

- Created a simple writable store to track Docker availability globally
- Initial value: `null` (unknown state)

#### 5. `frontend/src/routes/+layout.ts`

- **Modified**: App initialization to check Docker availability
- Checks Docker availability on load and sets the store
- Passes Docker availability to `environmentStore.initialize()`
- Only includes "Local Docker" environment if Docker is actually available

#### 6. `frontend/src/lib/components/docker-unavailable.svelte` (NEW FILE)

- Created a user-friendly component displayed when Docker is not available
- **Features**:
  - Clear explanation of why Docker might be unavailable
  - Instructions on how to use Arcane without local Docker (via remote agents)
  - Instructions on how to enable local Docker support
  - Links to Docker installation guide
  - Button to add remote environments

#### 7. `frontend/src/routes/dashboard/+page.svelte`

- **Modified**: Added conditional rendering based on Docker availability
- Shows `DockerUnavailable` component when:
  - Docker is not available (`$dockerAvailability === false`)
  - AND user is on the local environment (`selectedEnv?.id === LOCAL_DOCKER_ENVIRONMENT_ID`)
- Otherwise shows the normal dashboard

## How It Works

1. **On App Load**:

   - Frontend calls `systemService.checkDockerAvailable()`
   - Backend pings Docker daemon to check connectivity
   - Result is stored in `dockerAvailability` store

2. **Environment Initialization**:

   - If Docker is NOT available, "Local Docker" is excluded from environment list
   - User won't see the problematic local option in the dropdown

3. **Dashboard Display**:
   - If somehow on local environment without Docker, shows helpful message
   - User can add remote environments or fix Docker setup
   - No 500 errors or confusing failures

## Benefits

- ✅ No more 500 errors when Docker socket is not mounted
- ✅ Clear user guidance on what to do
- ✅ Supports Arcane agent-only deployments
- ✅ Graceful degradation of functionality
- ✅ Users can still manage remote Docker environments

## Testing Scenarios

1. **With Docker Socket Mounted** (Normal Operation):

   - "Local Docker" appears in environments
   - Dashboard works normally
   - All Docker operations function

2. **Without Docker Socket Mounted** (Agent-Only Mode):

   - "Local Docker" does NOT appear in environments
   - If user tries to access dashboard, sees helpful message
   - Can add and manage remote environments via agents

3. **Docker Stopped But Socket Present**:
   - Backend ping fails
   - Treated same as socket not mounted
   - User sees guidance to start Docker

## API Changes

### New Endpoint

```
GET /api/environments/:id/system/docker/available

Response:
{
  "success": true,
  "available": boolean
}
```

## Configuration

No configuration changes needed. The feature automatically detects Docker availability.

## Future Enhancements

Potential improvements for the future:

- Add a "Retry" button on the Docker unavailable page to re-check availability
- Show Docker status in the UI header/settings
- Add notification when Docker becomes available/unavailable
- Cache availability check to reduce redundant pings
