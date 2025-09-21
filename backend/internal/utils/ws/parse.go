package ws

import (
	"regexp"
	"strings"
	"time"
)

var (
	isoDockerTs   = regexp.MustCompile(`^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\s+`)
	slashDockerTs = regexp.MustCompile(`^\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2}\s+`)
)

// NormalizeContainerLine parses a raw container log line into level + cleaned message.
// It also attempts to extract a leading timestamp (returned as an RFC3339Nano string).
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

	// Strip and parse docker timestamps
	if match := isoDockerTs.FindString(line); match != "" {
		trimmed := strings.TrimSpace(match)
		// try multiple ISO layouts
		var parsed time.Time
		var err error
		parsed, err = time.Parse(time.RFC3339Nano, trimmed)
		if err != nil {
			parsed, err = time.Parse(time.RFC3339, trimmed)
		}
		if err == nil {
			timestamp = parsed.UTC().Format(time.RFC3339Nano)
		}
		line = strings.TrimPrefix(line, match)
	} else if match := slashDockerTs.FindString(line); match != "" {
		trimmed := strings.TrimSpace(match)
		parsed, err := time.Parse("2006/01/02 15:04:05", trimmed)
		if err == nil {
			timestamp = parsed.UTC().Format(time.RFC3339Nano)
		}
		line = strings.TrimPrefix(line, match)
	}

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
