package registry

import (
	"net/http"
	"strings"
)

func DetermineHTTPStatusFromError(err error) int {
	if err == nil {
		return http.StatusOK
	}

	errStr := strings.ToLower(err.Error())
	
	switch {
	case containsAny(errStr, "not found", "does not exist", "no such", "manifest unknown", "name_unknown"):
		return http.StatusNotFound
	case containsAny(errStr, "unauthorized", "authentication required", "401", "token", "credentials"):
		return http.StatusUnauthorized
	case containsAny(errStr, "forbidden", "access denied", "denied", "403"):
		return http.StatusForbidden
	case containsAny(errStr, "too many requests", "rate limit", "429", "toomanyrequests"):
		return http.StatusTooManyRequests
	case containsAny(errStr, "invalid", "malformed", "bad request", "parse", "validation"):
		return http.StatusBadRequest
	case containsAny(errStr, "timeout", "deadline exceeded", "context canceled"):
		return http.StatusGatewayTimeout
	case containsAny(errStr, "unavailable", "service unavailable", "503"):
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

func containsAny(s string, substrs ...string) bool {
	for _, substr := range substrs {
		if strings.Contains(s, substr) {
			return true
		}
	}
	return false
}
