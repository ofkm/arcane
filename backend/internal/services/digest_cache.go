package services

import (
	"container/list"
	"context"
	"log/slog"
	"sync"
	"time"
)

type cacheEntry struct {
	digest    string
	timestamp time.Time
	element   *list.Element // for LRU tracking
}

type lruEntry struct {
	key string
}

type DigestCache struct {
	cache   map[string]*cacheEntry
	lruList *list.List
	mu      sync.RWMutex
	ttl     time.Duration
	maxSize int
	stopCh  chan struct{}
	stopped bool

	// Metrics
	hits      uint64
	misses    uint64
	evictions uint64
}

func NewDigestCache(ttl time.Duration) *DigestCache {
	return NewDigestCacheWithSize(ttl, 10000) // Default max size: 10,000 entries
}

func NewDigestCacheWithSize(ttl time.Duration, maxSize int) *DigestCache {
	return &DigestCache{
		cache:   make(map[string]*cacheEntry),
		lruList: list.New(),
		ttl:     ttl,
		maxSize: maxSize,
		stopCh:  make(chan struct{}),
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
	c.mu.Lock()
	defer c.mu.Unlock()

	entry, exists := c.cache[imageRef]
	if !exists {
		c.misses++
		return "", false
	}

	// Check if expired
	if time.Since(entry.timestamp) > c.ttl {
		// Remove expired entry
		c.removeEntry(imageRef, entry)
		c.misses++
		return "", false
	}

	// Move to front of LRU list (most recently used)
	if entry.element != nil {
		c.lruList.MoveToFront(entry.element)
	}

	c.hits++
	return entry.digest, true
}

// Set stores a digest in the cache
func (c *DigestCache) Set(imageRef, digest string) {
	c.mu.Lock()
	defer c.mu.Unlock()

	// Check if entry already exists
	if entry, exists := c.cache[imageRef]; exists {
		// Update existing entry
		entry.digest = digest
		entry.timestamp = time.Now()
		if entry.element != nil {
			c.lruList.MoveToFront(entry.element)
		}
		return
	}

	// Check if cache is at capacity
	if len(c.cache) >= c.maxSize {
		// Evict least recently used entry
		c.evictLRU()
	}

	// Add new entry
	element := c.lruList.PushFront(&lruEntry{key: imageRef})
	c.cache[imageRef] = &cacheEntry{
		digest:    digest,
		timestamp: time.Now(),
		element:   element,
	}
}

// evictLRU removes the least recently used entry
func (c *DigestCache) evictLRU() {
	element := c.lruList.Back()
	if element == nil {
		return
	}

	lruEntry := element.Value.(*lruEntry)
	c.removeEntry(lruEntry.key, c.cache[lruEntry.key])
	c.evictions++
}

// removeEntry removes an entry from both cache and LRU list
func (c *DigestCache) removeEntry(key string, entry *cacheEntry) {
	if entry.element != nil {
		c.lruList.Remove(entry.element)
	}
	delete(c.cache, key)
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

	// Iterate over cache and remove expired entries
	for imageRef, entry := range c.cache {
		if now.Sub(entry.timestamp) > c.ttl {
			c.removeEntry(imageRef, entry)
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
	c.cache = make(map[string]*cacheEntry)
	c.lruList = list.New()
}

// GetStats returns cache statistics
func (c *DigestCache) GetStats() CacheStats {
	c.mu.RLock()
	defer c.mu.RUnlock()

	totalRequests := c.hits + c.misses
	var hitRate float64
	if totalRequests > 0 {
		hitRate = float64(c.hits) / float64(totalRequests) * 100
	}

	return CacheStats{
		Size:      len(c.cache),
		MaxSize:   c.maxSize,
		Hits:      c.hits,
		Misses:    c.misses,
		Evictions: c.evictions,
		HitRate:   hitRate,
	}
}

// CacheStats represents cache statistics
type CacheStats struct {
	Size      int
	MaxSize   int
	Hits      uint64
	Misses    uint64
	Evictions uint64
	HitRate   float64
}
