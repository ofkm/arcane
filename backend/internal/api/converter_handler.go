package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ConverterHandler struct {
	converterService *services.ConverterService
}

func NewConverterHandler(converterService *services.ConverterService) *ConverterHandler {
	return &ConverterHandler{
		converterService: converterService,
	}
}

func (h *ConverterHandler) ConvertDockerRun(c *gin.Context) {
	var req models.ConvertDockerRunRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format: " + err.Error(),
		})
		return
	}

	parsed, err := h.converterService.ParseDockerRunCommand(req.DockerRunCommand)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Failed to parse docker run command. Please check the syntax.",
			"code":    "BAD_REQUEST",
		})
		return
	}

	dockerCompose, envVars, serviceName, err := h.converterService.ConvertToDockerCompose(parsed)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to convert to Docker Compose format.",
			"code":    "CONVERSION_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, models.ConvertDockerRunResponse{
		Success:       true,
		DockerCompose: dockerCompose,
		EnvVars:       envVars,
		ServiceName:   serviceName,
	})
}
