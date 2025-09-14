package cache

import (
	"context"
	"sync"
	"time"
)

type ErrStale struct {
	Err error
}

func (e *ErrStale) Error() string { return "stale cache value: " + e.Err.Error() }
func (e *ErrStale) Unwrap() error { return e.Err }

type Cache[T any] struct {
	ttl time.Duration

	mu  sync.RWMutex
	val T
	exp time.Time
	set bool
}

func New[T any](ttl time.Duration) *Cache[T] {
	return &Cache[T]{ttl: ttl}
}

func (c *Cache[T]) GetOrFetch(ctx context.Context, fetch func(ctx context.Context) (T, error)) (T, error) {
	now := time.Now()

	// Fast path: fresh cache
	c.mu.RLock()
	if c.set && now.Before(c.exp) {
		v := c.val
		c.mu.RUnlock()
		return v, nil
	}
	// Capture stale value (if any) to return when fetch fails
	hasStale := c.set
	stale := c.val
	c.mu.RUnlock()

	// Fetch new value
	v, err := fetch(ctx)
	if err != nil {
		if hasStale {
			return stale, &ErrStale{Err: err}
		}
		var zero T
		return zero, err
	}

	// Store and return fresh value
	c.mu.Lock()
	c.val = v
	c.set = true
	c.exp = now.Add(c.ttl)
	c.mu.Unlock()

	return v, nil
}
