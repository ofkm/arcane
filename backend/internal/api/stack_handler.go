package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
	ws "github.com/ofkm/arcane-backend/internal/utils/ws"
)

type StackHandler struct {
	stackService *services.StackService
	logStreams   sync.Map // map[string]*logStream
}

func NewStackHandler(group *gin.RouterGroup, stackService *services.StackService, authMiddleware *middleware.AuthMiddleware) {

	handler := &StackHandler{stackService: stackService}

	apiGroup := group.Group("/stacks")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("", handler.ListStacks)
		apiGroup.POST("", handler.CreateStack)
		apiGroup.GET("/:id", handler.GetStack)
		apiGroup.PUT("/:id", handler.UpdateStack)
		apiGroup.POST("/:id/deploy", handler.DeployStack)
		apiGroup.POST("/:id/restart", handler.RestartStack)
		apiGroup.GET("/:id/services", handler.GetStackServices)
		apiGroup.POST("/:id/pull", handler.PullImages)
		apiGroup.POST("/:id/redeploy", handler.RedeployStack)
		apiGroup.POST("/:id/down", handler.DownStack)
		apiGroup.DELETE("/:id/destroy", handler.DestroyStack)
		apiGroup.GET("/:id/logs/ws", handler.GetStackLogsWS)
	}
}

var wsUpgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool { return true },
}

type projectLogStream struct {
	hub    *ws.Hub
	once   sync.Once
	cancel context.CancelFunc
}

func (h *StackHandler) getOrStartStackLogHub(stackID string, follow bool, tail, since string, timestamps bool) *ws.Hub {
	v, _ := h.logStreams.LoadOrStore(stackID, &projectLogStream{
		hub: ws.NewHub(1024),
	})
	ls := v.(*projectLogStream)

	ls.once.Do(func() {
		ctx, cancel := context.WithCancel(context.Background())
		ls.cancel = cancel

		go ls.hub.Run(ctx)

		lines := make(chan string, 256)
		go func() {
			defer close(lines)
			_ = h.stackService.StreamStackLogs(ctx, stackID, lines, follow, tail, since, timestamps)
		}()
		go ws.ForwardLines(ctx, ls.hub, lines)
	})

	return ls.hub
}

// WebSocket endpoint: /api/stacks/:id/logs/ws and /api/environments/:id/stacks/:stackId/logs/ws
func (h *StackHandler) GetStackLogsWS(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}
	if strings.TrimSpace(stackID) == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": "Stack ID is required"})
		return
	}

	follow := c.DefaultQuery("follow", "true") == "true"
	tail := c.DefaultQuery("tail", "100")
	since := c.Query("since")
	timestamps := c.DefaultQuery("timestamps", "false") == "true"

	conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		return
	}
	hub := h.getOrStartStackLogHub(stackID, follow, tail, since, timestamps)

	// don't use the request context here; it is canceled when handler returns.
	ws.ServeClient(context.Background(), hub, conn)
}

func (h *StackHandler) ListStacks(c *gin.Context) {
	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid pagination or sort parameters: " + err.Error(),
		})
		return
	}

	if req.Pagination.Page == 0 {
		req.Pagination.Page = 1
	}
	if req.Pagination.Limit == 0 {
		req.Pagination.Limit = 20
	}

	stacks, pagination, err := h.stackService.ListStacksPaginated(c.Request.Context(), req)
	if err != nil {
		if errors.Is(err, context.Canceled) {
			c.JSON(http.StatusRequestTimeout, gin.H{
				"success": false,
				"error":   "Request was canceled",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to list stacks: " + err.Error(),
		})
		return
	}

	// Ensure data is never null - always return empty array if no stacks
	if stacks == nil {
		stacks = []map[string]interface{}{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       stacks,
		"pagination": pagination,
	})
}

func (h *StackHandler) CreateStack(c *gin.Context) {
	var req dto.CreateStackDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "User not authenticated"})
		return
	}
	stack, err := h.stackService.CreateStack(c.Request.Context(), req.Name, req.ComposeContent, req.EnvContent, *currentUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	var response dto.CreateStackResponseDto
	if err := dto.MapStruct(stack, &response); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to map response"})
		return
	}
	response.Status = string(stack.Status)
	response.CreatedAt = stack.CreatedAt.Format(time.RFC3339)
	response.UpdatedAt = stack.UpdatedAt.Format(time.RFC3339)
	if stack.DirName != nil {
		response.DirName = *stack.DirName
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    response,
	})
}

func (h *StackHandler) GetStack(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}

	stack, err := h.stackService.GetStackByID(c.Request.Context(), stackID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Stack not found",
		})
		return
	}

	composeContent, envContent, err := h.stackService.GetStackContent(c.Request.Context(), stackID)
	if err != nil {
		fmt.Printf("Warning: failed to read stack content: %v\n", err)
		composeContent, envContent = "", ""
	}

	services, err := h.stackService.GetStackServices(c.Request.Context(), stackID)
	if err != nil {
		fmt.Printf("Warning: failed to get services: %v\n", err)
		services = nil
	}

	var serviceCount, runningCount int
	if services != nil {
		serviceCount = len(services)
		for _, s := range services {
			st := strings.ToLower(strings.TrimSpace(s.Status))
			if st == "running" || st == "up" {
				runningCount++
			}
		}
	} else {
		serviceCount = stack.ServiceCount
		runningCount = stack.RunningCount
	}

	var resp dto.StackDetailsDto
	if err := dto.MapStruct(stack, &resp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to map response"})
		return
	}
	resp.Status = string(stack.Status)
	resp.CreatedAt = stack.CreatedAt.Format(time.RFC3339)
	resp.UpdatedAt = stack.UpdatedAt.Format(time.RFC3339)
	if stack.DirName != nil {
		resp.DirName = *stack.DirName
	}
	resp.ComposeContent = composeContent
	resp.EnvContent = envContent
	resp.ServiceCount = serviceCount
	resp.RunningCount = runningCount
	if services != nil {
		// pass-through as []any to avoid changing service shape
		raw := make([]any, len(services))
		for i := range services {
			raw[i] = services[i]
		}
		resp.Services = raw
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resp,
	})
}

func (h *StackHandler) UpdateStack(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}

	var req dto.UpdateStackDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	if req.ComposeContent != nil || req.EnvContent != nil {
		if err := h.stackService.UpdateStackContent(c.Request.Context(), stackID, req.ComposeContent, req.EnvContent); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to update stack content",
			})
			return
		}
	}

	if req.Name != nil || req.AutoUpdate != nil {
		stack, err := h.stackService.GetStackByID(c.Request.Context(), stackID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "Stack not found",
			})
			return
		}

		if req.Name != nil {
			stack.Name = *req.Name
		}
		if req.AutoUpdate != nil {
			stack.AutoUpdate = *req.AutoUpdate
		}

		if _, err := h.stackService.UpdateStack(c.Request.Context(), stack); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "Failed to update stack",
			})
			return
		}
	}

	updatedStack, err := h.stackService.GetStackByID(c.Request.Context(), stackID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to get updated stack",
		})
		return
	}

	services, err := h.stackService.GetStackServices(c.Request.Context(), stackID)
	if err != nil {
		fmt.Printf("Warning: failed to get services: %v\n", err)
		services = nil
	}

	var resp dto.StackDetailsDto
	if err := dto.MapStruct(updatedStack, &resp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to map response"})
		return
	}
	resp.Status = string(updatedStack.Status)
	resp.CreatedAt = updatedStack.CreatedAt.Format(time.RFC3339)
	resp.UpdatedAt = updatedStack.UpdatedAt.Format(time.RFC3339)
	if updatedStack.DirName != nil {
		resp.DirName = *updatedStack.DirName
	}
	resp.ServiceCount = len(services)
	resp.RunningCount = updatedStack.RunningCount
	if services != nil {
		raw := make([]any, len(services))
		for i := range services {
			raw[i] = services[i]
		}
		resp.Services = raw
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    resp,
	})
}

func (h *StackHandler) RestartStack(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "User not authenticated"})
		return
	}
	if err := h.stackService.RestartStack(c.Request.Context(), stackID, *currentUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Stack restarted successfully"},
	})
}

func (h *StackHandler) RedeployStack(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}

	var req dto.RedeployStackDto
	if err := c.ShouldBindJSON(&req); err != nil {
		req = dto.RedeployStackDto{
			Profiles:     []string{},
			EnvOverrides: map[string]string{},
		}
	}

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "User not authenticated"})
		return
	}
	if err := h.stackService.RedeployStack(c.Request.Context(), stackID, req.Profiles, req.EnvOverrides, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to redeploy stack: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Stack redeployed successfully"},
	})
}

func (h *StackHandler) DownStack(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "User not authenticated"})
		return
	}
	if err := h.stackService.DownStack(c.Request.Context(), stackID, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to bring down stack: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Stack brought down successfully"},
	})
}

func (h *StackHandler) DestroyStack(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}

	var req dto.DestroyStackDto
	if err := c.ShouldBindJSON(&req); err != nil {
		req = dto.DestroyStackDto{
			RemoveFiles:   false,
			RemoveVolumes: false,
		}
	}

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "User not authenticated"})
		return
	}
	if err := h.stackService.DestroyStack(c.Request.Context(), stackID, req.RemoveFiles, req.RemoveVolumes, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to destroy stack: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Stack destroyed successfully"},
	})
}

func (h *StackHandler) PullStack(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}

	c.Writer.Header().Set("Content-Type", "application/x-json-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "User not authenticated"})
		return
	}

	if err := h.stackService.PullStackImages(c.Request.Context(), stackID, c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to pull stack images: %v", err),
		})
		return
	}

}

func (h *StackHandler) DeployStack(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}

	if stackID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Stack ID is required",
		})
		return
	}

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "User not authenticated"})
		return
	}
	if err := h.stackService.DeployStack(c.Request.Context(), stackID, *currentUser); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Project deployed successfully"},
	})
}

func (h *StackHandler) GetStackServices(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}

	services, err := h.stackService.GetStackServices(c.Request.Context(), stackID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    services,
	})
}

func (h *StackHandler) PullImages(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		stackID = c.Param("id")
	}

	c.Writer.Header().Set("Content-Type", "application/x-json-stream")
	c.Writer.Header().Set("Cache-Control", "no-cache")
	c.Writer.Header().Set("Connection", "keep-alive")
	c.Writer.Header().Set("X-Accel-Buffering", "no")

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "User not authenticated"})
		return
	}

	if err := h.stackService.PullStackImages(c.Request.Context(), stackID, c.Writer); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}
}

func (h *StackHandler) GetProjectStatusCounts(c *gin.Context) {
	_, running, stopped, total, err := h.stackService.GetProjectStatusCounts(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"data":    gin.H{"error": "Failed to get project counts: " + err.Error()},
		})
		return
	}

	out := dto.ProjectStatusCounts{
		RunningProjects: int(running),
		StoppedProjects: int(stopped),
		TotalProjects:   int(total),
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    out,
	})
}
