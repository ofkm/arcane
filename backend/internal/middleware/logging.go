package middleware

import (
	"github.com/gin-gonic/gin"
)

// LoggingMiddleware creates a custom logging middleware that excludes certain paths
func LoggingMiddleware(excludePaths ...string) gin.HandlerFunc {
	excluded := make(map[string]bool)
	for _, path := range excludePaths {
		excluded[path] = true
	}

	return gin.LoggerWithConfig(gin.LoggerConfig{
		SkipPaths: excludePaths,
	})
}
