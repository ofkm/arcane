package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
)

type AuthHandler struct {
	userService *services.UserService
}

func NewAuthHandler(userService *services.UserService) *AuthHandler {
	return &AuthHandler{
		userService: userService,
	}
}

type LoginRequest struct {
	Username string `json:"username" binding:"required"`
	Password string `json:"password" binding:"required"`
}

type LoginResponse struct {
	Success bool          `json:"success"`
	Token   string        `json:"token,omitempty"`
	User    *UserResponse `json:"user,omitempty"`
	Error   string        `json:"error,omitempty"`
}

type UserResponse struct {
	ID          string   `json:"id"`
	Username    string   `json:"username"`
	DisplayName *string  `json:"displayName,omitempty"`
	Email       *string  `json:"email,omitempty"`
	Roles       []string `json:"roles"`
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

	// TODO: Implement actual authentication logic
	// For now, just check if user exists
	user, err := h.userService.GetUserByUsername(c.Request.Context(), req.Username)
	if err != nil {
		c.JSON(http.StatusUnauthorized, LoginResponse{
			Success: false,
			Error:   "Invalid credentials",
		})
		return
	}

	// TODO: Verify password hash
	// TODO: Generate JWT token

	c.JSON(http.StatusOK, LoginResponse{
		Success: true,
		Token:   "placeholder-jwt-token", // TODO: Generate actual JWT
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
	// TODO: Implement logout logic (invalidate token, etc.)
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Logged out successfully",
	})
}

func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	// TODO: Get user from JWT token
	// For now, just return a placeholder
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": gin.H{
			"id":       "placeholder-id",
			"username": "placeholder-user",
			"roles":    []string{"admin"},
		},
	})
}

func (h *AuthHandler) RefreshToken(c *gin.Context) {
	// TODO: Implement token refresh logic
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"token":   "new-placeholder-jwt-token",
	})
}
