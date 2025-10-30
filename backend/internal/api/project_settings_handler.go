package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ProjectSettingsHandler struct {
	projectService *services.ProjectService
}

func NewProjectSettingsHandler(projectService *services.ProjectService) *ProjectSettingsHandler {
	return &ProjectSettingsHandler{
		projectService: projectService,
	}
}

func (h *ProjectSettingsHandler) GetProjectSettings(c *gin.Context) {
	projectID := c.Param("projectId")

	project, err := h.projectService.GetProjectSettings(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ProjectSettingsDto{
		ProjectID:      projectID,
		AutoUpdate:     project.AutoUpdate,
		AutoUpdateCron: project.AutoUpdateCron,
	})
}

func (h *ProjectSettingsHandler) UpdateProjectSettings(c *gin.Context) {
	projectID := c.Param("projectId")

	var req dto.UpdateProjectSettingsDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.projectService.UpdateProjectSettings(
		c.Request.Context(),
		projectID,
		req.AutoUpdate,
		req.AutoUpdateCron,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Return the updated settings
	project, err := h.projectService.GetProjectSettings(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ProjectSettingsDto{
		ProjectID:      projectID,
		AutoUpdate:     project.AutoUpdate,
		AutoUpdateCron: project.AutoUpdateCron,
	})
}

func (h *ProjectSettingsHandler) DeleteProjectSettings(c *gin.Context) {
	projectID := c.Param("projectId")

	err := h.projectService.ClearProjectSettings(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
