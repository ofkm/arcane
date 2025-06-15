package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
)

func AgentAuthMiddleware(agentService *services.AgentService) gin.HandlerFunc {
	return func(c *gin.Context) {
		var tokenString string

		authHeader := c.GetHeader("Authorization")
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		} else if token := c.GetHeader("X-Agent-Token"); token != "" {
			tokenString = token
		}

		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Missing agent token",
			})
			c.Abort()
			return
		}

		agent, err := agentService.GetAgentByToken(c.Request.Context(), tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"success": false,
				"error":   "Invalid agent token",
			})
			c.Abort()
			return
		}

		c.Set("agent", agent)
		c.Set("agentId", agent.ID)
		c.Next()
	}
}
