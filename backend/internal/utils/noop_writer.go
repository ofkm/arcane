package utils

import (
	"io"
)

// NoOpWriter is a simple writer that discards all output
// Used for background jobs where we don't need to stream progress
type NoOpWriter struct{}

func (w *NoOpWriter) Write(p []byte) (n int, err error) {
	return len(p), nil
}

// NewNoOpWriter creates a new no-op writer
func NewNoOpWriter() io.Writer {
	return &NoOpWriter{}
}
