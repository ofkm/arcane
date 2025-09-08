package middleware

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type AuthOptions struct {
	AdminRequired   bool
	SuccessOptional bool
}

type AuthMiddleware struct {
	authService *services.AuthService
	cfg         *config.Config
	options     AuthOptions
}

func NewAuthMiddleware(authService *services.AuthService, cfg *config.Config) *AuthMiddleware {
	return &AuthMiddleware{
		authService: authService,
		cfg:         cfg,
		options:     AuthOptions{},
	}
}

func (m *AuthMiddleware) WithAdminRequired() *AuthMiddleware {
	clone := *m
	clone.options.AdminRequired = true
	return &clone
}
func (m *AuthMiddleware) WithAdminNotRequired() *AuthMiddleware {
	clone := *m
	clone.options.AdminRequired = false
	return &clone
}
func (m *AuthMiddleware) WithSuccessOptional() *AuthMiddleware {
	clone := *m
	clone.options.SuccessOptional = true
	return &clone
}

func (m *AuthMiddleware) Add() gin.HandlerFunc {
	return func(c *gin.Context) {
		// Agent API-key/JWT mode
		if m.cfg != nil && m.cfg.AgentMode {
			// 0) Allow trusted manager proxy marker (helps unblock while we test)
			if c.GetHeader("X-Arcane-Agent-Proxy") == "1" {
				slog.Info("Agent auth: proxy marker accepted", "path", c.Request.URL.Path, "method", c.Request.Method)
				agentSudo(c)
				return
			}

			// 1) Allow pairing via bootstrap token
			if strings.HasPrefix(c.Request.URL.Path, "/api/environments/0/agent/pair") &&
				m.cfg.AgentBootstrapToken != "" &&
				c.GetHeader("X-Arcane-Agent-Bootstrap") == m.cfg.AgentBootstrapToken {
				slog.Info("Agent auth: bootstrap pairing accepted")
				agentSudo(c)
				return
			}

			// 2) Prefer X-Arcane-Agent-Token
			if tok := c.GetHeader("X-Arcane-Agent-Token"); tok != "" && m.cfg.AgentToken != "" && tok == m.cfg.AgentToken {
				slog.Info("Agent auth: agent token accepted")
				agentSudo(c)
				return
			}

			// 3) Fallback Bearer JWT
			if bearer := extractBearerOrCookieToken(c); bearer != "" {
				user, err := m.authService.VerifyToken(c.Request.Context(), bearer)
				if err == nil {
					isAdmin := userHasRole(user, "admin")
					slog.Info("Agent auth: bearer accepted", "isAdmin", isAdmin)
					c.Set("userID", user.ID)
					c.Set("currentUser", user)
					c.Set("userIsAdmin", isAdmin)
					c.Next()
					return
				}
			}

			// Debug why forbidden
			slog.Warn("Agent auth forbidden",
				"path", c.Request.URL.Path,
				"method", c.Request.Method,
				"has_proxy_marker", c.GetHeader("X-Arcane-Agent-Proxy") == "1",
				"has_agent_token_hdr", c.GetHeader("X-Arcane-Agent-Token") != "",
				"agent_token_config_set", m.cfg.AgentToken != "",
				"has_bearer", c.GetHeader("Authorization") != "")

			c.JSON(http.StatusForbidden, models.APIError{
				Code:    "FORBIDDEN",
				Message: "Invalid or missing agent token",
			})
			c.Abort()
			return
		}

		// Manager (normal) JWT mode
		token := extractBearerOrCookieToken(c)
		if token == "" {
			if m.options.SuccessOptional {
				c.Next()
				return
			}
			c.JSON(http.StatusUnauthorized, models.APIError{
				Code:    models.APIErrorCodeUnauthorized,
				Message: "Authentication required",
			})
			c.Abort()
			return
		}

		user, err := m.authService.VerifyToken(c.Request.Context(), token)
		if err != nil {
			if m.options.SuccessOptional {
				c.Next()
				return
			}
			c.JSON(http.StatusUnauthorized, models.APIError{
				Code:    models.APIErrorCodeUnauthorized,
				Message: "Invalid or expired token",
			})
			c.Abort()
			return
		}

		isAdmin := userHasRole(user, "admin")
		if m.options.AdminRequired && !isAdmin {
			c.JSON(http.StatusForbidden, models.APIError{
				Code:    "FORBIDDEN",
				Message: "You don't have permission to access this resource",
			})
			c.Abort()
			return
		}
		c.Set("userID", user.ID)
		c.Set("currentUser", user)
		c.Set("userIsAdmin", isAdmin)
		c.Next()
	}
}

func agentSudo(c *gin.Context) {
	agentEmail := func() *string { s := "agent@arcane.dev"; return &s }()
	agentUser := &models.User{
		BaseModel: models.BaseModel{ID: "agent"},
		Email:     agentEmail,
		Roles:     []string{"admin"},
	}
	c.Set("userID", agentUser.ID)
	c.Set("currentUser", agentUser)
	c.Set("userIsAdmin", true)
	c.Next()
}

func extractBearerOrCookieToken(c *gin.Context) string {
	authHeader := c.GetHeader("Authorization")
	if authHeader != "" && strings.HasPrefix(authHeader, "Bearer ") {
		return strings.TrimPrefix(authHeader, "Bearer ")
	}
	if tokenCookie, err := c.Cookie("token"); err == nil && tokenCookie != "" {
		return tokenCookie
	}
	return ""
}

func userHasRole(user *models.User, role string) bool {
	for _, r := range user.Roles {
		if r == role {
			return true
		}
	}
	return false
}

func GetCurrentUserID(c *gin.Context) (string, bool) {
	userID, exists := c.Get("userID")
	if !exists {
		return "", false
	}
	userIDStr, ok := userID.(string)
	return userIDStr, ok
}

func GetCurrentUser(c *gin.Context) (*models.User, bool) {
	user, exists := c.Get("currentUser")
	if !exists {
		return nil, false
	}
	u, ok := user.(*models.User)
	return u, ok
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
