package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

func AuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		var tokenString string
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}
		if tokenString == "" {
			tokenCookie, err := c.Cookie("token")
			if err == nil {
				tokenString = tokenCookie
			}
		}
		if tokenString == "" {
			c.JSON(http.StatusUnauthorized, models.APIError{
				Code:    models.APIErrorCodeUnauthorized,
				Message: "Authentication required",
			})
			c.Abort()
			return
		}
		user, err := authService.VerifyToken(c.Request.Context(), tokenString)
		if err != nil {
			c.JSON(http.StatusUnauthorized, models.APIError{
				Code:    models.APIErrorCodeUnauthorized,
				Message: "Invalid or expired token",
			})
			c.Abort()
			return
		}
		c.Set("currentUser", user)
		c.Next()
	}
}

func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	user, exists := c.Get("currentUser")
	if !exists {
		return nil, false
	}
	userModel, ok := user.(*models.User)
	return userModel, ok
}

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

func OptionalAuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		var tokenString string
		if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
			tokenString = strings.TrimPrefix(authHeader, "Bearer ")
		}
		if tokenString == "" {
			tokenCookie, err := c.Cookie("token")
			if err == nil {
				tokenString = tokenCookie
			}
		}
		if tokenString != "" {
			user, err := authService.VerifyToken(c.Request.Context(), tokenString)
			if err == nil {
				c.Set("currentUser", user)
			}
		}
		c.Next()
	}
}

func AdminOnlyMiddleware() gin.HandlerFunc {
	return RoleMiddleware("admin")
}

func IsAuthenticated(c *gin.Context) bool {
	_, exists := GetCurrentUser(c)
	return exists
}

func RequireAuthentication(c *gin.Context) (*models.User, bool) {
	user, exists := GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, models.APIError{
			Code:    models.APIErrorCodeUnauthorized,
			Message: "Authentication required",
		})
		c.Abort()
		return nil, false
	}
	return user, true
}
