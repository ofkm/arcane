package api

import (
	"errors"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils/cookie"
)

type AuthHandler struct {
	userService *services.UserService
	authService *services.AuthService
	oidcService *services.OidcService
}

func NewAuthHandler(group *gin.RouterGroup, userService *services.UserService, authService *services.AuthService, oidcService *services.OidcService, authMiddleware *middleware.AuthMiddleware) {
	ah := &AuthHandler{userService: userService, authService: authService, oidcService: oidcService}

	authApiGroup := group.Group("/auth")
	{
		authApiGroup.POST("/login", ah.Login)
		authApiGroup.POST("/logout", ah.Logout)
		authApiGroup.GET("/me", authMiddleware.WithAdminNotRequired().Add(), ah.GetCurrentUser)
		authApiGroup.POST("/refresh", ah.RefreshToken)
		authApiGroup.POST("/password", authMiddleware.WithAdminNotRequired().Add(), ah.ChangePassword)
	}
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req dto.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid request format"}})
		return
	}

	localAuthEnabled, err := h.authService.IsLocalAuthEnabled(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to check authentication settings"}})
		return
	}
	if !localAuthEnabled {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Local authentication is disabled"}})
		return
	}

	user, tokenPair, err := h.authService.Login(c.Request.Context(), req.Username, req.Password)
	if err != nil {
		var statusCode int
		var errorMsg string
		switch {
		case errors.Is(err, services.ErrInvalidCredentials):
			statusCode = http.StatusUnauthorized
			errorMsg = "Invalid username or password"
		case errors.Is(err, services.ErrLocalAuthDisabled):
			statusCode = http.StatusBadRequest
			errorMsg = "Local authentication is disabled"
		default:
			statusCode = http.StatusInternalServerError
			errorMsg = "Authentication failed"
		}
		c.JSON(statusCode, gin.H{"success": false, "data": gin.H{"error": errorMsg}})
		return
	}

	c.SetSameSite(http.SameSiteLaxMode)
	maxAge := int(time.Until(tokenPair.ExpiresAt).Seconds())
	cookie.CreateTokenCookie(c, maxAge, tokenPair.AccessToken)

	var out dto.UserResponseDto
	if mapErr := dto.MapStruct(user, &out); mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to map user"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token":        tokenPair.AccessToken,
			"refreshToken": tokenPair.RefreshToken,
			"expiresAt":    tokenPair.ExpiresAt,
			"user":         out,
		},
	})
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	cookie.ClearTokenCookie(c)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"message": "Logged out successfully"}})
}

func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "data": gin.H{"error": "Not authenticated"}})
		return
	}

	user, err := h.userService.GetUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to get user information"}})
		return
	}

	var out dto.UserResponseDto
	if mapErr := dto.MapStruct(user, &out); mapErr != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "data": gin.H{"error": "Failed to map user"}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": out})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req dto.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid request format"}})
		return
	}

	tokenPair, err := h.authService.RefreshToken(c.Request.Context(), req.RefreshToken)
	if err != nil {
		var statusCode int
		var errorMsg string
		switch {
		case errors.Is(err, services.ErrInvalidToken), errors.Is(err, services.ErrExpiredToken):
			statusCode = http.StatusUnauthorized
			errorMsg = "Invalid or expired refresh token"
		default:
			statusCode = http.StatusInternalServerError
			errorMsg = "Failed to refresh token"
		}
		c.JSON(statusCode, gin.H{"success": false, "data": gin.H{"error": errorMsg}})
		return
	}

	c.SetSameSite(http.SameSiteLaxMode)
	maxAge := int(time.Until(tokenPair.ExpiresAt).Seconds())
	cookie.CreateTokenCookie(c, maxAge, tokenPair.AccessToken)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"token":        tokenPair.AccessToken,
			"refreshToken": tokenPair.RefreshToken,
			"expiresAt":    tokenPair.ExpiresAt,
		},
	})
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	user, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	var req dto.PasswordChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Invalid request format"}})
		return
	}

	if req.CurrentPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "data": gin.H{"error": "Current password is required"}})
		return
	}

	err := h.authService.ChangePassword(c.Request.Context(), user.ID, req.CurrentPassword, req.NewPassword)
	if err != nil {
		var statusCode int
		var errorMsg string
		switch {
		case errors.Is(err, services.ErrInvalidCredentials):
			statusCode = http.StatusUnauthorized
			errorMsg = "Current password is incorrect"
		default:
			statusCode = http.StatusInternalServerError
			errorMsg = "Failed to change password"
		}
		c.JSON(statusCode, gin.H{"success": false, "data": gin.H{"error": errorMsg}})
		return
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"message": "Password changed successfully"}})
}
