package ws

import (
	"context"
	"encoding/json"
	"time"
)

type LogMessage struct {
	Level       string    `json:"level,omitempty"`
	Message     string    `json:"message"`
	Timestamp   time.Time `json:"timestamp"`
	Service     string    `json:"service,omitempty"`
	ContainerID string    `json:"containerId,omitempty"`
}

// ForwardLines forwards plain text lines to the hub.
func ForwardLines(ctx context.Context, hub *Hub, lines <-chan string) {
	for {
		select {
		case <-ctx.Done():
			return
		case line, ok := <-lines:
			if !ok {
				return
			}
			hub.Broadcast([]byte(line))
		}
	}
}

// ForwardLogJSON marshals LogMessage and forwards JSON to the hub.
func ForwardLogJSON(ctx context.Context, hub *Hub, logs <-chan LogMessage) {
	enc := json.NewEncoder(nil) // no reuse, just use json.Marshal below for simplicity
	_ = enc                     // avoid linter; using Marshal for perf/control
	for {
		select {
		case <-ctx.Done():
			return
		case m, ok := <-logs:
			if !ok {
				return
			}
			if m.Timestamp.IsZero() {
				m.Timestamp = time.Now()
			}
			if b, err := json.Marshal(m); err == nil {
				hub.Broadcast(b)
			}
		}
	}
}
