package middleware

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// WebSocketConnectMiddleware handles iOS PWA CONNECT method for WebSocket endpoints
// iOS Safari in standalone mode sends CONNECT requests after app backgrounding/foregrounding
// instead of proper GET requests with Upgrade headers
func WebSocketConnectMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		path := c.Request.URL.Path

		// Log all WebSocket connection attempts for debugging
		if strings.HasSuffix(path, "/ws") || strings.Contains(path, "/ws") {
			slog.Info("WebSocket connection attempt",
				"path", path,
				"method", c.Request.Method,
				"upgrade", c.Request.Header.Get("Upgrade"),
				"connection", c.Request.Header.Get("Connection"),
				"user_agent", c.Request.UserAgent(),
				"origin", c.Request.Header.Get("Origin"))
		}

		// Handle iOS PWA CONNECT method bug
		if c.Request.Method == http.MethodConnect && (strings.HasSuffix(path, "/ws") || strings.Contains(path, "/ws")) {
			slog.Info("Converting iOS PWA CONNECT to GET for WebSocket",
				"path", path,
				"user_agent", c.Request.UserAgent())

			// Convert CONNECT to GET
			c.Request.Method = http.MethodGet

			// Add required WebSocket headers
			c.Request.Header.Set("Upgrade", "websocket")
			c.Request.Header.Set("Connection", "Upgrade")

			// WebSocket version (required)
			if c.Request.Header.Get("Sec-WebSocket-Version") == "" {
				c.Request.Header.Set("Sec-WebSocket-Version", "13")
			}

			// Generate a WebSocket key if missing (required for handshake)
			if c.Request.Header.Get("Sec-WebSocket-Key") == "" {
				c.Request.Header.Set("Sec-WebSocket-Key", "dGhlIHNhbXBsZSBub25jZQ==")
			}
		}

		c.Next()
	}
}
