package ws

import (
	"regexp"
	"strings"
	"time"
)

var (
	// Docker's RFC3339 timestamp when timestamps=true
	dockerTimestamp = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z\s+`)
)

// NormalizeContainerLine parses a raw container log line into level + cleaned message.
// It extracts Docker's timestamp if present (when timestamps=true in Docker API).
func NormalizeContainerLine(raw string) (level string, msg string, timestamp string) {
	line := StripANSI(strings.TrimRight(raw, "\r\n"))

	level = "stdout"
	switch {
	case strings.HasPrefix(line, "[STDERR] "):
		level = "stderr"
		line = strings.TrimPrefix(line, "[STDERR] ")
	case strings.HasPrefix(line, "stderr:"):
		level = "stderr"
		line = strings.TrimPrefix(line, "stderr:")
	case strings.HasPrefix(line, "stdout:"):
		level = "stdout"
		line = strings.TrimPrefix(line, "stdout:")
	}

	// Extract and strip Docker's RFC3339 timestamp (when timestamps=true)
	timestamp = ""
	if match := dockerTimestamp.FindString(line); match != "" {
		trimmed := strings.TrimSpace(match)
		if parsed, err := time.Parse(time.RFC3339Nano, trimmed); err == nil {
			timestamp = parsed.UTC().Format(time.RFC3339Nano)
		} else if parsed, err := time.Parse(time.RFC3339, trimmed); err == nil {
			timestamp = parsed.UTC().Format(time.RFC3339Nano)
		}
		line = strings.TrimPrefix(line, match)
	}

	// Return the message as-is (including any application-level timestamps)
	// The frontend will display Docker's timestamp, and applications can
	// include their own timestamps in the message if they want
	return level, strings.TrimSpace(line), timestamp
}

// NormalizeProjectLine additionally extracts service (pattern: service | message).
// Returns level, service, message, timestamp (RFC3339Nano) — timestamp may be empty.
func NormalizeProjectLine(raw string) (level, service, msg, timestamp string) {
	level, base, ts := NormalizeContainerLine(raw)
	timestamp = ts

	service = ""
	if parts := strings.SplitN(base, " | ", 2); len(parts) == 2 {
		service = strings.TrimSpace(parts[0])
		base = parts[1]
	}
	return level, service, base, timestamp
}

func NowRFC3339() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}
