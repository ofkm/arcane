package ws

import "regexp"

var ansiRegexp = regexp.MustCompile(`\x1B\[[0-?]*[ -/]*[@-~]|\x1B\][^\x07\x1B]*(\x07|\x1B\\)|\x1B[@-_]`)

// StripANSI removes ANSI color / control escape sequences.
func StripANSI(s string) string {
	if s == "" {
		return s
	}
	return ansiRegexp.ReplaceAllString(s, "")
}
