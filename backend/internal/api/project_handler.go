package api

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type ProjectHandler struct {
	projectService *services.ProjectService
}

func NewProjectHandler(group *gin.RouterGroup, projectService *services.ProjectService, authMiddleware *middleware.AuthMiddleware) {

	handler := &ProjectHandler{projectService: projectService}

	apiGroup := group.Group("/projects")
	apiGroup.Use(authMiddleware.WithAdminNotRequired().Add())
	{
		apiGroup.GET("/", handler.ListProjects)
		apiGroup.POST("/:id/up", handler.DeployProject)
		apiGroup.POST("/:id/down", handler.DownProject)
		apiGroup.POST("/", handler.CreateProject)
	}
}

func (h *ProjectHandler) ListProjects(c *gin.Context) {
	var req utils.SortedPaginationRequest
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid pagination or sort parameters: " + err.Error(),
		})
		return
	}

	projectsResponse, pagination, err := h.projectService.ListProjects(c.Request.Context(), req)
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
			"error":   "Failed to list projects: " + err.Error(),
		})
		return
	}
	if projectsResponse == nil {
		projectsResponse = []dto.ProjectDetailsDto{}
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"data":       projectsResponse,
		"pagination": pagination,
	})
}

func (h *ProjectHandler) DeployProject(c *gin.Context) {
	projectID := c.Param("projectId")

	if projectID == "" {
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
	if err := h.projectService.DeployProject(c.Request.Context(), projectID, *currentUser); err != nil {
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

func (h *ProjectHandler) DownProject(c *gin.Context) {
	projectID := c.Param("projectId")

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "User not authenticated"})
		return
	}
	if err := h.projectService.DownProject(c.Request.Context(), projectID, *currentUser); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to bring down project: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"message": "Project brought down successfully"},
	})
}

func (h *ProjectHandler) CreateProject(c *gin.Context) {
	var req dto.CreateProjectDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "error": err.Error()})
		return
	}

	currentUser, exists := middleware.GetCurrentUser(c)
	if !exists || currentUser == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"success": false, "error": "User not authenticated"})
		return
	}

	proj, err := h.projectService.CreateProject(c.Request.Context(), req.Name, req.ComposeContent, req.EnvContent, *currentUser)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": err.Error()})
		return
	}

	var response dto.CreateProjectReponseDto
	if err := dto.MapStruct(proj, &response); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "error": "failed to map response"})
		return
	}
	response.Status = string(proj.Status)
	response.CreatedAt = proj.CreatedAt.Format(time.RFC3339)
	response.UpdatedAt = proj.UpdatedAt.Format(time.RFC3339)
	response.DirName = utils.DerefString(proj.DirName)

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    response,
	})
}
