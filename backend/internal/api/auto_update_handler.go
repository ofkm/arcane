package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/services"
)

type AutoUpdateHandler struct {
	autoUpdateService *services.AutoUpdateService
}

func NewAutoUpdateHandler(autoUpdateService *services.AutoUpdateService) *AutoUpdateHandler {
	return &AutoUpdateHandler{
		autoUpdateService: autoUpdateService,
	}
}

func (h *AutoUpdateHandler) CheckContainersForUpdates(c *gin.Context) {
	result, err := h.autoUpdateService.CheckAndUpdateContainers(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *AutoUpdateHandler) CheckStacksForUpdates(c *gin.Context) {
	result, err := h.autoUpdateService.CheckAndUpdateStacks(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (h *AutoUpdateHandler) GetUpdateStatus(c *gin.Context) {
	status := h.autoUpdateService.GetUpdateStatus()
	c.JSON(http.StatusOK, status)
}
