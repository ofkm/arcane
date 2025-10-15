package services

import (
	"context"
	"log/slog"
	"sync"
	"time"
)

type cacheEntry struct {
	digest    string
	timestamp time.Time
}

type DigestCache struct {
	cache   map[string]cacheEntry
	mu      sync.RWMutex
	ttl     time.Duration
	stopCh  chan struct{}
	stopped bool
}

func NewDigestCache(ttl time.Duration) *DigestCache {
	return &DigestCache{
		cache:  make(map[string]cacheEntry),
		ttl:    ttl,
		stopCh: make(chan struct{}),
	}
}

// Start begins the cleanup goroutine
func (c *DigestCache) Start(ctx context.Context) {
	go c.cleanupLoop(ctx)
}

// Stop gracefully stops the cleanup goroutine
func (c *DigestCache) Stop() {
	c.mu.Lock()
	if !c.stopped {
		close(c.stopCh)
		c.stopped = true
	}
	c.mu.Unlock()
}

// Get retrieves a digest from the cache if it exists and is not expired
func (c *DigestCache) Get(imageRef string) (string, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()

	entry, exists := c.cache[imageRef]
	if !exists {
		return "", false
	}

	// Check if expired
	if time.Since(entry.timestamp) > c.ttl {
		return "", false
	}

	return entry.digest, true
}

// Set stores a digest in the cache
func (c *DigestCache) Set(imageRef, digest string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	c.cache[imageRef] = cacheEntry{
		digest:    digest,
		timestamp: time.Now(),
	}
}

// cleanupLoop periodically removes expired entries from the cache
func (c *DigestCache) cleanupLoop(ctx context.Context) {
	ticker := time.NewTicker(10 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			c.cleanup(ctx)
		case <-c.stopCh:
			slog.InfoContext(ctx, "Digest cache cleanup loop stopped")
			return
		case <-ctx.Done():
			slog.InfoContext(ctx, "Digest cache cleanup loop context canceled")
			return
		}
	}
}

// cleanup removes expired entries from the cache
func (c *DigestCache) cleanup(ctx context.Context) {
	c.mu.Lock()
	defer c.mu.Unlock()

	now := time.Now()
	removed := 0

	for imageRef, entry := range c.cache {
		if now.Sub(entry.timestamp) > c.ttl {
			delete(c.cache, imageRef)
			removed++
		}
	}

	if removed > 0 {
		slog.DebugContext(ctx, "Digest cache cleanup completed",
			slog.Int("removedEntries", removed),
			slog.Int("remainingEntries", len(c.cache)))
	}
}

// Size returns the current number of entries in the cache
func (c *DigestCache) Size() int {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return len(c.cache)
}

// Clear removes all entries from the cache
func (c *DigestCache) Clear() {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.cache = make(map[string]cacheEntry)
}
