package api

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

// AuthMiddleware creates a gin middleware for authentication
func AuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the Authorization header
		authHeader := c.GetHeader("Authorization")

		var tokenString string

		// Check if Authorization header exists and starts with "Bearer "
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}

		// If no token found in Authorization header, check for token in cookie
		if tokenString == "" {
			tokenCookie, err := c.Cookie("token")
			if err == nil {
				tokenString = tokenCookie
			}
		}

		// If still no token found, return unauthorized
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, models.APIError{
				Code:    models.APIErrorCodeUnauthorized,
				Message: "Authentication required",
			})
			c.Abort()
			return
		}

		// Verify token
		user, err := authService.VerifyToken(c.Request.Context(), tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.APIError{
				Code:    models.APIErrorCodeUnauthorized,
				Message: "Invalid or expired token",
			})
			c.Abort()
			return
		}

		// Set user in context for handlers to use
		c.Set("currentUser", user)

		c.Next()
	}
}

// GetCurrentUser gets the current authenticated user from the context
func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	user, exists := c.Get("currentUser")
	if !exists {
		return nil, false
	}

	userModel, ok := user.(*models.User)
	return userModel, ok
}

// RoleMiddleware creates a gin middleware that restricts access to specific roles
func RoleMiddleware(roles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		user, exists := GetCurrentUser(c)
		if !exists {
			c.JSON(http.StatusUnauthorized, models.APIError{
				Code:    models.APIErrorCodeUnauthorized,
				Message: "Authentication required",
			})
			c.Abort()
			return
		}

		// Check if user has any of the required roles
		hasRole := false
		for _, requiredRole := range roles {
			for _, userRole := range user.Roles {
				if userRole == requiredRole {
					hasRole = true
					break
				}
			}
			if hasRole {
				break
			}
		}

		if !hasRole {
			c.JSON(http.StatusForbidden, models.APIError{
				Code:    "FORBIDDEN",
				Message: "You don't have permission to access this resource",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}
