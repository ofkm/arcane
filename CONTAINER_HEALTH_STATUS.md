# Container Health Status Display

## Overview

Added container health status display to the project services grid cards. When a container has a health check configured, the health status (healthy, unhealthy, starting, etc.) is now displayed alongside the container state.

## Changes

### Backend

**File**: `backend/internal/services/project_service.go`

Added health status to `ProjectServiceInfo`:

```go
type ProjectServiceInfo struct {
    Name        string   `json:"name"`
    Image       string   `json:"image"`
    Status      string   `json:"status"`
    ContainerID string   `json:"container_id"`
    Ports       []string `json:"ports"`
    Health      *string  `json:"health,omitempty"` // NEW: Health status from Docker
}
```

Updated `GetProjectServices()` to populate health status:

```go
for _, c := range containers {
    var health *string
    if c.Health != "" {
        health = &c.Health
    }

    services = append(services, ProjectServiceInfo{
        Name:        c.Service,
        Image:       c.Image,
        Status:      c.State,
        ContainerID: c.ID,
        Ports:       formatPorts(c.Publishers),
        Health:      health, // NEW: Include health status
    })
    have[c.Service] = true
}
```

### Frontend

**File**: `frontend/src/routes/projects/components/ServicesGrid.svelte`

1. **Updated Service Type**:

```typescript
type Service = {
  container_id?: string;
  name: string;
  status?: string;
  health?: string; // NEW: Health status field
};
```

2. **Added Health Variant Helper**:

```typescript
function getHealthVariant(health: string | undefined): 'green' | 'red' | 'amber' {
  if (!health) return 'amber';
  const normalized = health.toLowerCase();
  if (normalized === 'healthy') return 'green';
  if (normalized === 'unhealthy') return 'red';
  return 'amber'; // starting, none, etc.
}
```

3. **Added Health Status Badge to Card**:

```svelte
<div class="flex flex-wrap items-center gap-2">
    <StatusBadge {variant} text={capitalizeFirstLetter(status)} />
    {#if service.health}
        <div class="flex items-center gap-1.5">
            <HeartPulseIcon class="size-3.5 text-muted-foreground" />
            <StatusBadge
                variant={getHealthVariant(service.health)}
                text={capitalizeFirstLetter(service.health)}
                size="sm"
            />
        </div>
    {/if}
</div>
```

## Health Status Values

Docker containers can have the following health statuses:

- **`healthy`** - Health check passed (green badge)
- **`unhealthy`** - Health check failed (red badge)
- **`starting`** - Health check in progress during startup (amber badge)
- **`none`** - No health check configured (not displayed)

## Visual Design

- Health status is shown next to the container state badge
- Small heart pulse icon (`HeartPulseIcon`) precedes the health badge
- Color-coded badges:
  - 🟢 Green: Healthy
  - 🔴 Red: Unhealthy
  - 🟠 Amber: Starting or unknown
- Smaller badge size (`sm`) to differentiate from state badge
- Only displayed when health information is available

## Example

For a service with health check:

```
┌─────────────────────────────┐
│ 🔷 web                      │
│ [Running] 💗 [Healthy]      │
│ Active Container            │
└─────────────────────────────┘
```

For a service without health check:

```
┌─────────────────────────────┐
│ 🔷 api                      │
│ [Running]                   │
│ Active Container            │
└─────────────────────────────┘
```

## Benefits

- ✅ Quick visibility of container health at a glance
- ✅ Differentiate between "running but unhealthy" containers
- ✅ Monitor health check status without drilling into container details
- ✅ Consistent with health status display in container detail pages
- ✅ Non-intrusive (only shows when health info available)

## Testing

To test the health status display:

1. **Create a container with health check**:

```yaml
version: '3.8'
services:
  web:
    image: nginx:alpine
    healthcheck:
      test: ['CMD', 'wget', '--quiet', '--tries=1', '--spider', 'http://localhost']
      interval: 10s
      timeout: 5s
      retries: 3
      start_period: 5s
```

2. **Start the project** and navigate to the project details page
3. **Observe** the health status badge next to the running status
4. **Stop the nginx service** inside the container to trigger unhealthy status
5. **Verify** the badge changes to red "Unhealthy"

## Notes

- Health status is optional and only displayed when available
- Uses the same color scheme as container detail page health status
- Respects Docker's health check configuration
- Updates automatically when service status is refreshed
