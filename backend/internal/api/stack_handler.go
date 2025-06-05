package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type StackHandler struct {
	stackService *services.StackService
}

func NewStackHandler(stackService *services.StackService) *StackHandler {
	return &StackHandler{
		stackService: stackService,
	}
}

type CreateStackRequest struct {
	Name           string  `json:"name" binding:"required"`
	ComposeContent string  `json:"composeContent" binding:"required"`
	EnvContent     *string `json:"envContent,omitempty"`
	Path           string  `json:"path" binding:"required"`
	AgentID        *string `json:"agentId,omitempty"`
}

type UpdateStackRequest struct {
	Name           *string `json:"name,omitempty"`
	ComposeContent *string `json:"composeContent,omitempty"`
	EnvContent     *string `json:"envContent,omitempty"`
	AutoUpdate     *bool   `json:"autoUpdate,omitempty"`
}

func (h *StackHandler) ListStacks(c *gin.Context) {
	stacks, err := h.stackService.ListStacks(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch stacks",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stacks":  stacks,
		"count":   len(stacks),
	})
}

func (h *StackHandler) CreateStack(c *gin.Context) {
	var req CreateStackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	stackID := uuid.New().String()
	createdStack, err := h.stackService.CreateStack(
		c.Request.Context(),
		stackID,
		req.Name,
		req.EnvContent,
		req.Path,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create stack",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"stack":   createdStack,
	})
}

func (h *StackHandler) GetStack(c *gin.Context) {
	stackID := c.Param("id")

	stack, err := h.stackService.GetStackByID(c.Request.Context(), stackID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Stack not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stack":   stack,
	})
}

func (h *StackHandler) UpdateStack(c *gin.Context) {
	stackID := c.Param("id")

	var req UpdateStackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	stack, err := h.stackService.GetStackByID(c.Request.Context(), stackID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Stack not found",
		})
		return
	}

	// Update fields
	if req.Name != nil {
		stack.Name = *req.Name
	}
	if req.ComposeContent != nil {
		stack.ComposeContent = req.ComposeContent
	}
	if req.EnvContent != nil {
		stack.EnvContent = req.EnvContent
	}
	if req.AutoUpdate != nil {
		stack.AutoUpdate = *req.AutoUpdate
	}

	now := time.Now()
	stack.UpdatedAt = &now

	updatedStack, err := h.stackService.UpdateStack(c.Request.Context(), stack)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update stack",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"stack":   updatedStack,
	})
}

func (h *StackHandler) DeleteStack(c *gin.Context) {
	stackID := c.Param("id")

	err := h.stackService.DeleteStack(c.Request.Context(), stackID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete stack",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Stack deleted successfully",
	})
}

// Stack action handlers
func (h *StackHandler) StartStack(c *gin.Context) {
	stackID := c.Param("id")

	// TODO: Implement actual stack start logic
	err := h.stackService.UpdateStackStatus(c.Request.Context(), stackID, models.StackStatusRunning)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to start stack",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Stack started successfully",
	})
}

func (h *StackHandler) StopStack(c *gin.Context) {
	stackID := c.Param("id")

	// TODO: Implement actual stack stop logic
	err := h.stackService.UpdateStackStatus(c.Request.Context(), stackID, models.StackStatusStopped)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to stop stack",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Stack stopped successfully",
	})
}

func (h *StackHandler) RestartStack(c *gin.Context) {
	stackID := c.Param("id")

	// TODO: Implement actual stack restart logic
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Stack restarted successfully",
		"stackId": stackID,
	})
}

func (h *StackHandler) RedeployStack(c *gin.Context) {
	stackID := c.Param("id")

	// TODO: Implement actual stack redeploy logic
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Stack redeployed successfully",
		"stackId": stackID,
	})
}

func (h *StackHandler) PullStack(c *gin.Context) {
	stackID := c.Param("id")

	// TODO: Implement actual stack pull logic
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Stack images pulled successfully",
		"stackId": stackID,
	})
}
