package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
)

type AuthHandler struct {
	userService *services.UserService
	authService *services.AuthService
	oidcService *services.OidcService
}

func NewAuthHandler(userService *services.UserService, authService *services.AuthService, oidcService *services.OidcService) *AuthHandler {
	return &AuthHandler{
		userService: userService,
		authService: authService,
		oidcService: oidcService,
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Success               bool          `json:"success"`
	Token                 string        `json:"token,omitempty"`
	RefreshToken          string        `json:"refreshToken,omitempty"`
	ExpiresAt             time.Time     `json:"expiresAt,omitempty"`
	User                  *UserResponse `json:"user,omitempty"`
	Error                 string        `json:"error,omitempty"`
	RequirePasswordChange bool          `json:"requirePasswordChange,omitempty"`
}

type UserResponse struct {
	ID          string   `json:"id"`
	Username    string   `json:"username"`
	DisplayName *string  `json:"displayName,omitempty"`
	Email       *string  `json:"email,omitempty"`
	Roles       []string `json:"roles"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refreshToken" binding:"required"`
}

type OidcLoginRequest struct {
	Code  string `json:"code" binding:"required"`
	State string `json:"state" binding:"required"`
}

type PasswordChangeRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, LoginResponse{
			Success: false,
			Error:   "Invalid request format",
		})
		return
	}

	// Check if local auth is enabled
	localAuthEnabled, err := h.authService.IsLocalAuthEnabled(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, LoginResponse{
			Success: false,
			Error:   "Failed to check authentication settings",
		})
		return
	}

	if !localAuthEnabled {
		c.JSON(http.StatusBadRequest, LoginResponse{
			Success: false,
			Error:   "Local authentication is disabled",
		})
		return
	}

	// Authenticate user
	user, tokenPair, err := h.authService.Login(c.Request.Context(), req.Username, req.Password)

	// Handle password change required
	if err == services.ErrPasswordChangeRequired && user != nil {
		c.JSON(http.StatusOK, LoginResponse{
			Success:               true,
			RequirePasswordChange: true,
			User: &UserResponse{
				ID:          user.ID,
				Username:    user.Username,
				DisplayName: user.DisplayName,
				Email:       user.Email,
				Roles:       user.Roles,
			},
		})
		return
	}

	// Handle authentication errors
	if err != nil {
		var statusCode int
		var errorMsg string

		switch err {
		case services.ErrInvalidCredentials:
			statusCode = http.StatusUnauthorized
			errorMsg = "Invalid username or password"
		case services.ErrLocalAuthDisabled:
			statusCode = http.StatusBadRequest
			errorMsg = "Local authentication is disabled"
		default:
			statusCode = http.StatusInternalServerError
			errorMsg = "Authentication failed"
		}

		c.JSON(statusCode, LoginResponse{
			Success: false,
			Error:   errorMsg,
		})
		return
	}

	// Set token cookie
	c.SetCookie(
		"token",
		tokenPair.AccessToken,
		int(time.Until(tokenPair.ExpiresAt).Seconds()),
		"/",
		"",
		c.Request.TLS != nil, // secure if HTTPS
		true,                 // httpOnly
	)

	// Return successful response
	c.JSON(http.StatusOK, LoginResponse{
		Success:      true,
		Token:        tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
		ExpiresAt:    tokenPair.ExpiresAt,
		User: &UserResponse{
			ID:          user.ID,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Roles:       user.Roles,
		},
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	// Clear the authentication cookie
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie("token", "", -1, "/", "", false, true)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Not authenticated",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": UserResponse{
			ID:          user.ID,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Roles:       user.Roles,
		},
	})
}

func (h *AuthHandler) ValidateSession(c *gin.Context) {
	_, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"valid":   false,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"valid":   true,
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	tokenPair, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		var statusCode int
		var errorMsg string

		switch err {
		case services.ErrInvalidToken, services.ErrExpiredToken:
			statusCode = http.StatusUnauthorized
			errorMsg = "Invalid or expired refresh token"
		default:
			statusCode = http.StatusInternalServerError
			errorMsg = "Failed to refresh token"
		}

		c.JSON(statusCode, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	// Set new token cookie
	c.SetCookie(
		"token",
		tokenPair.AccessToken,
		int(time.Until(tokenPair.ExpiresAt).Seconds()),
		"/",
		"",
		c.Request.TLS != nil, // secure if HTTPS
		true,                 // httpOnly
	)

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"token":        tokenPair.AccessToken,
		"refreshToken": tokenPair.RefreshToken,
		"expiresAt":    tokenPair.ExpiresAt,
	})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	user, exists := middleware.GetCurrentUser(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "Not authenticated",
		})
		return
	}

	var req PasswordChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	// For password change after login, current password is required
	if !user.RequirePasswordChange && req.CurrentPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Current password is required",
		})
		return
	}

	err := h.authService.ChangePassword(
		c.Request.Context(),
		user.ID,
		req.CurrentPassword,
		req.NewPassword,
	)

	if err != nil {
		var statusCode int
		var errorMsg string

		switch err {
		case services.ErrInvalidCredentials:
			statusCode = http.StatusUnauthorized
			errorMsg = "Current password is incorrect"
		default:
			statusCode = http.StatusInternalServerError
			errorMsg = "Failed to change password"
		}

		c.JSON(statusCode, gin.H{
			"success": false,
			"error":   errorMsg,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Password changed successfully",
	})
}
