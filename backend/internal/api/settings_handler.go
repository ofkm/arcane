package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
)

type SettingsHandler struct {
	settingsService *services.SettingsService
}

func NewSettingsHandler(settingsService *services.SettingsService) *SettingsHandler {
	return &SettingsHandler{
		settingsService: settingsService,
	}
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	settings, err := h.settingsService.GetSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch settings",
		})
		return
	}

	settingsSlice := settings.ToSettingVariableSlice(true, true)

	settingDtos := make([]dto.SettingDto, 0, len(settingsSlice))
	for _, setting := range settingsSlice {
		_, isPublic, _, _ := settings.FieldByKey(setting.Key)
		settingDtos = append(settingDtos, dto.SettingDto{
			PublicSettingDto: dto.PublicSettingDto{
				Key:      setting.Key,
				Type:     "string",
				Value:    setting.Value,
				IsPublic: isPublic,
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"settings": settingDtos,
	})
}

func (h *SettingsHandler) GetPublicSettings(c *gin.Context) {
	publicSettings, err := h.settingsService.GetPublicSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch public settings",
		})
		return
	}

	settingDtos := make([]dto.PublicSettingDto, 0, len(publicSettings))
	for _, setting := range publicSettings {
		settingDtos = append(settingDtos, dto.PublicSettingDto{
			Key:      setting.Key,
			Type:     "string",
			Value:    setting.Value,
			IsPublic: true,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"settings": settingDtos,
	})
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

	// Convert to DTO format
	settingDtos := make([]dto.SettingDto, 0, len(updatedSettings))
	for _, setting := range updatedSettings {
		settingDtos = append(settingDtos, dto.SettingDto{
			PublicSettingDto: dto.PublicSettingDto{
				Key:      setting.Key,
				Type:     "string",
				Value:    setting.Value,
				IsPublic: false, // We'll determine this from the struct later if needed
			},
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"settings": settingDtos,
	})
}
