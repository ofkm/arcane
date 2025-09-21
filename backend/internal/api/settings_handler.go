package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
)

type SettingsHandler struct {
	settingsService *services.SettingsService
}

func NewSettingsHandler(group *gin.RouterGroup, settingsService *services.SettingsService, authMiddleware *middleware.AuthMiddleware) {
	handler := &SettingsHandler{settingsService: settingsService}

	apiGroup := group.Group("/settings")

	apiGroup.GET("/public", handler.GetPublicSettings)
	apiGroup.GET("", authMiddleware.WithAdminNotRequired().Add(), handler.GetSettings)
	apiGroup.PUT("", authMiddleware.WithAdminRequired().Add(), handler.UpdateSettings)
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	settings := h.settingsService.ListSettings(true)

	var settingsDto []dto.PublicSettingDto
	if err := dto.MapStructList(settings, &settingsDto); err != nil {
		_ = c.Error(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to map settings",
		})
		return
	}

	settingsDto = append(settingsDto, dto.PublicSettingDto{
		Key:   "uiConfigDisabled",
		Value: strconv.FormatBool(config.Load().UIConfigurationDisabled),
		Type:  "boolean",
	})

	c.JSON(http.StatusOK, settingsDto)
}

func (h *SettingsHandler) GetPublicSettings(c *gin.Context) {
	settings := h.settingsService.ListSettings(false)

	var settingsDto []dto.PublicSettingDto
	if err := dto.MapStructList(settings, &settingsDto); err != nil {
		_ = c.Error(err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to map settings",
		})
		return
	}

	settingsDto = append(settingsDto, dto.PublicSettingDto{
		Key:   "uiConfigDisabled",
		Value: strconv.FormatBool(config.Load().UIConfigurationDisabled),
		Type:  "boolean",
	})

	c.JSON(http.StatusOK, settingsDto)
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var req dto.UpdateSettingsDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	updatedSettings, err := h.settingsService.UpdateSettings(c.Request.Context(), req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update settings",
		})
		return
	}

	settingDtos := make([]dto.SettingDto, 0, len(updatedSettings))
	for _, setting := range updatedSettings {
		settingDtos = append(settingDtos, dto.SettingDto{
			PublicSettingDto: dto.PublicSettingDto{
				Key:   setting.Key,
				Type:  "string",
				Value: setting.Value,
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"settings": settingDtos,
	})
}
