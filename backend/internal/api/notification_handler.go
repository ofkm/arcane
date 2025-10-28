package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
}

func NewNotificationHandler(group *gin.RouterGroup, notificationService *services.NotificationService, authMiddleware *middleware.AuthMiddleware) {
	handler := &NotificationHandler{
		notificationService: notificationService,
	}

	notifications := group.Group("/environments/:id/notifications")
	notifications.Use(authMiddleware.WithAdminRequired().Add())
	{
		notifications.GET("/settings", handler.GetAllSettings)
		notifications.GET("/settings/:provider", handler.GetSettings)
		notifications.POST("/settings", handler.CreateOrUpdateSettings)
		notifications.DELETE("/settings/:provider", handler.DeleteSettings)
		notifications.POST("/test/:provider", handler.TestNotification)
	}
}

func (h *NotificationHandler) GetAllSettings(c *gin.Context) {
	settings, err := h.notificationService.GetAllSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	// Map to DTOs
	responses := make([]dto.NotificationSettingsResponse, len(settings))
	for i, setting := range settings {
		responses[i] = dto.NotificationSettingsResponse{
			ID:       setting.ID,
			Provider: setting.Provider,
			Enabled:  setting.Enabled,
			Config:   setting.Config,
		}
	}

	c.JSON(http.StatusOK, responses)
}

func (h *NotificationHandler) GetSettings(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := models.NotificationProvider(providerStr)

	switch provider {
	case models.NotificationProviderDiscord, models.NotificationProviderEmail:
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid provider"})
		return
	}

	settings, err := h.notificationService.GetSettingsByProvider(c.Request.Context(), provider)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Settings not found"})
		return
	}

	response := dto.NotificationSettingsResponse{
		ID:       settings.ID,
		Provider: settings.Provider,
		Enabled:  settings.Enabled,
		Config:   settings.Config,
	}

	c.JSON(http.StatusOK, response)
}

func (h *NotificationHandler) CreateOrUpdateSettings(c *gin.Context) {
	var req dto.NotificationSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	settings, err := h.notificationService.CreateOrUpdateSettings(
		c.Request.Context(),
		req.Provider,
		req.Enabled,
		req.Config,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := dto.NotificationSettingsResponse{
		ID:       settings.ID,
		Provider: settings.Provider,
		Enabled:  settings.Enabled,
		Config:   settings.Config,
	}

	c.JSON(http.StatusOK, response)
}

func (h *NotificationHandler) DeleteSettings(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := models.NotificationProvider(providerStr)

	switch provider {
	case models.NotificationProviderDiscord, models.NotificationProviderEmail:
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid provider"})
		return
	}

	if err := h.notificationService.DeleteSettings(c.Request.Context(), provider); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings deleted successfully"})
}

func (h *NotificationHandler) TestNotification(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := models.NotificationProvider(providerStr)

	switch provider {
	case models.NotificationProviderDiscord, models.NotificationProviderEmail:
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid provider"})
		return
	}

	testType := c.DefaultQuery("type", "simple") // "simple" or "image-update"

	if err := h.notificationService.TestNotification(c.Request.Context(), provider, testType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Test notification sent successfully"})
}
