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
	httputil "github.com/ofkm/arcane-backend/internal/utils/http"
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
		httputil.RespondBadRequest(c, "Invalid request format")
		return
	}

	localAuthEnabled, err := h.authService.IsLocalAuthEnabled(c.Request.Context())
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}
	if !localAuthEnabled {
		httputil.RespondBadRequest(c, "Local authentication is disabled")
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
		httputil.RespondWithCustomError(c, statusCode, errorMsg, "AUTH_FAILED")
		return
	}

	c.SetSameSite(http.SameSiteLaxMode)
	maxAge := int(time.Until(tokenPair.ExpiresAt).Seconds())
	cookie.CreateTokenCookie(c, maxAge, tokenPair.AccessToken)

	var out dto.UserResponseDto
	if mapErr := dto.MapStruct(user, &out); mapErr != nil {
		httputil.RespondWithError(c, mapErr)
		return
	}

	response := gin.H{
		"token":        tokenPair.AccessToken,
		"refreshToken": tokenPair.RefreshToken,
		"expiresAt":    tokenPair.ExpiresAt,
		"user":         out,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}

func (h *AuthHandler) Logout(c *gin.Context) {
	c.SetSameSite(http.SameSiteLaxMode)
	cookie.ClearTokenCookie(c)
	httputil.RespondWithMessage(c, http.StatusOK, "Logged out successfully")
}

func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := middleware.GetCurrentUserID(c)
	if !exists {
		httputil.RespondWithCustomError(c, http.StatusUnauthorized, "Not authenticated", "UNAUTHORIZED")
		return
	}

	user, err := h.userService.GetUser(c.Request.Context(), userID)
	if err != nil {
		httputil.RespondWithError(c, err)
		return
	}

	var out dto.UserResponseDto
	if mapErr := dto.MapStruct(user, &out); mapErr != nil {
		httputil.RespondWithError(c, mapErr)
		return
	}

	httputil.RespondWithSuccess(c, http.StatusOK, out)
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	var req dto.RefreshRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format")
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
		httputil.RespondWithCustomError(c, statusCode, errorMsg, "TOKEN_REFRESH_FAILED")
		return
	}

	c.SetSameSite(http.SameSiteLaxMode)
	maxAge := int(time.Until(tokenPair.ExpiresAt).Seconds())
	cookie.CreateTokenCookie(c, maxAge, tokenPair.AccessToken)

	response := gin.H{
		"token":        tokenPair.AccessToken,
		"refreshToken": tokenPair.RefreshToken,
		"expiresAt":    tokenPair.ExpiresAt,
	}

	httputil.RespondWithSuccess(c, http.StatusOK, response)
}

func (h *AuthHandler) ChangePassword(c *gin.Context) {
	user, ok := middleware.RequireAuthentication(c)
	if !ok {
		return
	}

	var req dto.PasswordChangeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format")
		return
	}

	if req.CurrentPassword == "" {
		httputil.RespondBadRequest(c, "Current password is required")
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
		httputil.RespondWithCustomError(c, statusCode, errorMsg, "PASSWORD_CHANGE_FAILED")
		return
	}

	httputil.RespondWithMessage(c, http.StatusOK, "Password changed successfully")
}
