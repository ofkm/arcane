package utils

import "regexp"

var (
	SemanticVersionRegex = regexp.MustCompile(`^(\d+)\.(\d+)\.(\d+)(?:-.*)?$`)
	DateVersionRegex     = regexp.MustCompile(`^(\d{4})\.(\d{1,2})\.(\d{1,2})$`)
	NumericVersionRegex  = regexp.MustCompile(`^(\d+)(?:\.(\d+))?(?:\.(\d+))?$`)
)
