package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ProjectSettingsHandler struct {
	projectSettingsService *services.ProjectSettingsService
}

func NewProjectSettingsHandler(projectSettingsService *services.ProjectSettingsService) *ProjectSettingsHandler {
	return &ProjectSettingsHandler{
		projectSettingsService: projectSettingsService,
	}
}

func (h *ProjectSettingsHandler) GetProjectSettings(c *gin.Context) {
	projectID := c.Param("projectId")

	settings, err := h.projectSettingsService.GetProjectSettings(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	if settings == nil {
		c.JSON(http.StatusOK, dto.ProjectSettingsDto{
			ProjectID:      projectID,
			AutoUpdate:     nil,
			AutoUpdateCron: nil,
		})
		return
	}

	c.JSON(http.StatusOK, dto.ProjectSettingsDto{
		ProjectID:      settings.ProjectID,
		AutoUpdate:     settings.AutoUpdate,
		AutoUpdateCron: settings.AutoUpdateCron,
	})
}

func (h *ProjectSettingsHandler) UpdateProjectSettings(c *gin.Context) {
	projectID := c.Param("projectId")

	var req dto.UpdateProjectSettingsDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.projectSettingsService.UpsertProjectSettings(
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
	settings, err := h.projectSettingsService.GetProjectSettings(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.ProjectSettingsDto{
		ProjectID:      projectID,
		AutoUpdate:     settings.AutoUpdate,
		AutoUpdateCron: settings.AutoUpdateCron,
	})
}

func (h *ProjectSettingsHandler) DeleteProjectSettings(c *gin.Context) {
	projectID := c.Param("projectId")

	err := h.projectSettingsService.DeleteProjectSettings(c.Request.Context(), projectID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Status(http.StatusNoContent)
}
