package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type UserHandler struct {
	userService *services.UserService
}

func NewUserHandler(userService *services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

func (h *UserHandler) ListUsers(c *gin.Context) {
	users, err := h.userService.ListUsers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch users",
		})
		return
	}

	var userResponses []UserResponse
	for _, user := range users {
		userResponses = append(userResponses, UserResponse{
			ID:          user.ID,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Roles:       user.Roles,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"users":   userResponses,
		"count":   len(userResponses),
	})
}

func (h *UserHandler) CreateUser(c *gin.Context) {
	var req dto.CreateUserDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	hashedPassword, err := h.userService.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to hash password",
		})
		return
	}

	user := &models.User{
		ID:           uuid.New().String(),
		Username:     req.Username,
		PasswordHash: hashedPassword,
		DisplayName:  req.DisplayName,
		Email:        req.Email,
		Roles:        req.Roles,
		BaseModel: models.BaseModel{
			CreatedAt: time.Now(),
		},
	}

	if user.Roles == nil {
		user.Roles = []string{"user"}
	}

	createdUser, err := h.userService.CreateUser(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create user",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"user": UserResponse{
			ID:          createdUser.ID,
			Username:    createdUser.Username,
			DisplayName: createdUser.DisplayName,
			Email:       createdUser.Email,
			Roles:       createdUser.Roles,
		},
	})
}

func (h *UserHandler) GetUser(c *gin.Context) {
	userID := c.Param("id")

	user, err := h.userService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": UserResponse{
			ID:          user.ID,
			Username:    user.Username,
			DisplayName: user.DisplayName,
			Email:       user.Email,
			Roles:       user.Roles,
		},
	})
}

func (h *UserHandler) UpdateUser(c *gin.Context) {
	userID := c.Param("id")

	var req dto.UpdateUserDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	user, err := h.userService.GetUserByID(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "User not found",
		})
		return
	}

	if req.DisplayName != nil {
		user.DisplayName = req.DisplayName
	}
	if req.Email != nil {
		user.Email = req.Email
	}
	if req.Roles != nil {
		user.Roles = req.Roles
	}

	now := time.Now()
	user.UpdatedAt = &now

	updatedUser, err := h.userService.UpdateUser(c.Request.Context(), user)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"user": UserResponse{
			ID:          updatedUser.ID,
			Username:    updatedUser.Username,
			DisplayName: updatedUser.DisplayName,
			Email:       updatedUser.Email,
			Roles:       updatedUser.Roles,
		},
	})
}

func (h *UserHandler) DeleteUser(c *gin.Context) {
	userID := c.Param("id")

	err := h.userService.DeleteUser(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete user",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "User deleted successfully",
	})
}
