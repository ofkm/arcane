package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
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

func (h *AutoUpdateHandler) CheckForUpdates(c *gin.Context) {
	var req dto.AutoUpdateCheckDto
	if err := c.ShouldBindJSON(&req); err != nil {
		req = dto.AutoUpdateCheckDto{Type: "all"}
	}

	result, err := h.autoUpdateService.CheckForUpdates(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

func (h *AutoUpdateHandler) CheckContainers(c *gin.Context) {
	req := dto.AutoUpdateCheckDto{
		Type: "containers",
	}

	result, err := h.autoUpdateService.CheckForUpdates(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

func (h *AutoUpdateHandler) CheckStacks(c *gin.Context) {
	req := dto.AutoUpdateCheckDto{
		Type: "stacks",
	}

	result, err := h.autoUpdateService.CheckForUpdates(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

func (h *AutoUpdateHandler) GetUpdateHistory(c *gin.Context) {
	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
			if limit > 100 {
				limit = 100
			}
		}
	}

	history, err := h.autoUpdateService.GetAutoUpdateHistory(c.Request.Context(), limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    history,
	})
}

func (h *AutoUpdateHandler) GetUpdateStatus(c *gin.Context) {
	status := h.autoUpdateService.GetUpdateStatus()
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    status,
	})
}
