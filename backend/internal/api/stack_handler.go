package api

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type StackHandler struct {
	stackService *services.StackService
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
		apiGroup.GET("/:id/logs/stream", handler.GetStackLogsStream)
	}
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

func (h *StackHandler) GetStackLogsStream(c *gin.Context) {
	stackID := c.Param("stackId")
	if stackID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Stack ID is required",
		})
		return
	}

	follow := c.DefaultQuery("follow", "true") == "true"
	tail := c.DefaultQuery("tail", "100")
	since := c.Query("since")
	timestamps := c.DefaultQuery("timestamps", "false") == "true"

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("Access-Control-Allow-Origin", "*")

	logsChan := make(chan string, 100)
	errChan := make(chan error, 1)

	ctx, cancel := context.WithCancel(c.Request.Context())
	defer cancel()

	go func() {
		defer close(logsChan)
		defer close(errChan)

		if err := h.stackService.StreamStackLogs(ctx, stackID, logsChan, follow, tail, since, timestamps); err != nil {
			errChan <- err
		}
	}()

	c.Stream(func(w io.Writer) bool {
		select {
		case logLine, ok := <-logsChan:
			if !ok {
				return false
			}
			parsedLog := h.parseStackLogLine(logLine)
			c.SSEvent("log", parsedLog)
			return true
		case err, ok := <-errChan:
			if !ok || err == nil {
				return false
			}
			c.SSEvent("error", gin.H{"error": err.Error()})
			return false
		case <-ctx.Done():
			return false
		case <-time.After(30 * time.Second):
			c.SSEvent("ping", gin.H{"message": "keepalive"})
			return true
		}
	})
}

func (h *StackHandler) parseStackLogLine(logLine string) gin.H {
	var service, message, timestamp string
	var level = "info"

	if strings.HasPrefix(logLine, "[STDERR] ") {
		level = "stderr"
		logLine = strings.TrimPrefix(logLine, "[STDERR] ")
	}

	parts := strings.SplitN(logLine, " ", 2)
	if len(parts) == 2 && strings.Contains(parts[0], "T") && strings.Contains(parts[0], "Z") {
		timestamp = parts[0]
		logLine = parts[1]
	} else {
		timestamp = time.Now().Format(time.RFC3339Nano)
	}

	if strings.Contains(logLine, " | ") {
		serviceParts := strings.SplitN(logLine, " | ", 2)
		if len(serviceParts) == 2 {
			service = strings.TrimSpace(serviceParts[0])
			message = serviceParts[1]
		} else {
			message = logLine
		}
	} else {
		message = logLine
	}

	return gin.H{
		"level":     level,
		"message":   message,
		"timestamp": timestamp,
		"service":   service,
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
