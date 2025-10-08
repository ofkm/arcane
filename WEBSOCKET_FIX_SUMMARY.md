# WebSocket Memory Leak & Performance Fixes - Summary

## Issues Fixed

### 1. Backend: Hub Cleanup (CRITICAL)

**Problem**: Hubs were never removed from `sync.Map`, causing memory leaks
**Solution**:

- Added `ClientCount()` method to Hub
- Added `SetOnEmpty()` callback mechanism
- Hub automatically cleans up and removes itself from sync.Map when last client disconnects
- Context is cancelled to stop all goroutines

**Files Modified**:

- `backend/internal/utils/ws/hub.go`
- `backend/internal/api/container_handler.go`
- `backend/internal/api/project_handler.go`

### 2. Backend: DiskUsagePath Database Query Spam

**Problem**: `diskUsagePath` was queried from database every 2 seconds during stats streaming
**Solution**: Added 30-second in-memory cache for diskUsagePath setting

**Files Modified**:

- `backend/internal/api/system_handler.go`

### 3. Backend: System Stats Connection Limiting

**Problem**: No rate limiting on system stats connections per IP
**Solution**: Added limit of 5 concurrent connections per IP with 429 response

**Files Modified**:

- `backend/internal/api/system_handler.go`

### 4. Backend: CPU Measurement Optimization

**Problem**: Blocking CPU measurement slowed down stats every 2 seconds
**Solution**:

- Separated CPU measurement into background goroutine (updates every 1 second)
- Main stats loop reads from cached value (non-blocking)

**Files Modified**:

- `backend/internal/api/system_handler.go`

### 5. Frontend: WebSocket Reconnection Loop

**Problem**: `$effect` in container stats page was triggering on every state change, causing rapid reconnect loops
**Solution**:

- Added `lastStatsTab` state variable to track tab changes
- Only reconnect when tab actually changes, not on every reactive update
- Properly close old WebSocket before creating new one

**Files Modified**:

- `frontend/src/routes/containers/[containerId]/+page.svelte`

### 6. Frontend: WebSocket Cleanup on Reconnect

**Problem**: Old WebSocket connections weren't properly closed before creating new ones
**Solution**: Enhanced `ReconnectingWebSocket` class to force close existing connections before connecting

**Files Modified**:

- `frontend/src/lib/utils/ws.ts`
- `frontend/src/routes/dashboard/+page.svelte`
- `frontend/src/lib/components/logs/log-viewer.svelte`

## Performance Improvements

### Before:

- Database queries every 2 seconds for diskUsagePath
- Hubs never cleaned up (memory leak)
- WebSocket reconnection storms
- Blocking CPU measurements

### After:

- Database queries cached for 30 seconds
- Hubs auto-cleanup when unused
- Stable WebSocket connections
- Non-blocking CPU measurements
- Connection rate limiting (max 5 per IP)

## Testing Recommendations

1. **Monitor Memory**: Check memory usage over time to confirm no leaks
2. **Check Logs**: Verify no reconnection spam in logs
3. **Database Load**: Confirm diskUsagePath queries are reduced (should see query every 30s max)
4. **Tab Switching**: Switch between container tabs rapidly - should not cause reconnection storms
5. **Multiple Clients**: Test with multiple browser tabs to verify connection limiting works

## Configuration

### Backend Cache Durations:

- CPU Cache: Updated every 1 second
- DiskUsagePath Cache: 30 seconds
- System Stats Interval: 2 seconds

### Frontend:

- Stats WebSocket max backoff: 5 seconds
- System stats reconnection: Automatic
- Container stats reconnection: Only when on stats tab

## Notes

- Settings store (`settingsStore`) is already in-memory on frontend
- Backend cache is separate and doesn't interfere with settings updates
- Cache invalidation happens automatically after 30 seconds
- If users update diskUsagePath in settings, worst case is 30-second delay before stats reflect new path
