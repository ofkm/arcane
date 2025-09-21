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
func NormalizeContainerLine(raw string) (level string, msg string) {
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

	// Strip docker timestamps
	if isoDockerTs.MatchString(line) {
		line = isoDockerTs.ReplaceAllString(line, "")
	} else if slashDockerTs.MatchString(line) {
		line = slashDockerTs.ReplaceAllString(line, "")
	}

	return level, strings.TrimSpace(line)
}

// NormalizeProjectLine additionally extracts service (pattern: service | message).
func NormalizeProjectLine(raw string) (level, service, msg string) {
	level, base := NormalizeContainerLine(raw)
	service = ""
	if parts := strings.SplitN(base, " | ", 2); len(parts) == 2 {
		service = strings.TrimSpace(parts[0])
		base = parts[1]
	}
	return level, service, base
}

func NowRFC3339() string {
	return time.Now().UTC().Format(time.RFC3339Nano)
}
