package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ContainerHandler struct {
	containerService *services.ContainerService
}

func NewContainerHandler(containerService *services.ContainerService) *ContainerHandler {
	return &ContainerHandler{
		containerService: containerService,
	}
}

func (h *ContainerHandler) List(c *gin.Context) {
	includeAll := c.Query("all") == "true"

	containers, err := h.containerService.ListContainers(c.Request.Context(), includeAll)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    containers,
	})
}

func (h *ContainerHandler) GetByID(c *gin.Context) {
	id := c.Param("id")

	container, err := h.containerService.GetContainerByID(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    container,
	})
}

func (h *ContainerHandler) Start(c *gin.Context) {
	id := c.Param("id")

	if err := h.containerService.StartContainer(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container started successfully",
	})
}

func (h *ContainerHandler) Stop(c *gin.Context) {
	id := c.Param("id")

	if err := h.containerService.StopContainer(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container stopped successfully",
	})
}

func (h *ContainerHandler) Restart(c *gin.Context) {
	id := c.Param("id")

	if err := h.containerService.RestartContainer(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container restarted successfully",
	})
}

func (h *ContainerHandler) GetLogs(c *gin.Context) {
	id := c.Param("id")
	tail := c.DefaultQuery("tail", "100")

	logs, err := h.containerService.GetContainerLogs(c.Request.Context(), id, tail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    gin.H{"logs": logs},
	})
}

func (h *ContainerHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	force := c.Query("force") == "true"
	removeVolumes := c.Query("volumes") == "true"

	if err := h.containerService.DeleteContainer(c.Request.Context(), id, force, removeVolumes); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Container deleted successfully",
	})
}
