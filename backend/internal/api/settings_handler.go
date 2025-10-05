package api

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
	httputil "github.com/ofkm/arcane-backend/internal/utils/http"
)

type SettingsHandler struct {
	settingsService *services.SettingsService
}

func NewSettingsHandler(group *gin.RouterGroup, settingsService *services.SettingsService, authMiddleware *middleware.AuthMiddleware) {
	handler := &SettingsHandler{settingsService: settingsService}

	apiGroup := group.Group("/environments/:id/settings")

	apiGroup.GET("/public", handler.GetPublicSettings)
	apiGroup.GET("", authMiddleware.WithAdminNotRequired().Add(), handler.GetSettings)
	apiGroup.PUT("", authMiddleware.WithAdminRequired().Add(), handler.UpdateSettings)
}

func (h *SettingsHandler) GetSettings(c *gin.Context) {
	environmentID := c.Param("id")

	showAll := environmentID == "0"
	settings := h.settingsService.ListSettings(showAll)

	var settingsDto []dto.PublicSettingDto
	if err := dto.MapStructList(settings, &settingsDto); err != nil {
		_ = c.Error(err)
		httputil.RespondWithError(c, err)
		return
	}

	settingsDto = append(settingsDto, dto.PublicSettingDto{
		Key:   "uiConfigDisabled",
		Value: strconv.FormatBool(config.Load().UIConfigurationDisabled),
		Type:  "boolean",
	})

	httputil.RespondWithSuccess(c, http.StatusOK, settingsDto)
}

func (h *SettingsHandler) GetPublicSettings(c *gin.Context) {
	settings := h.settingsService.ListSettings(false)

	var settingsDto []dto.PublicSettingDto
	if err := dto.MapStructList(settings, &settingsDto); err != nil {
		_ = c.Error(err)
		httputil.RespondWithError(c, err)
		return
	}

	settingsDto = append(settingsDto, dto.PublicSettingDto{
		Key:   "uiConfigDisabled",
		Value: strconv.FormatBool(config.Load().UIConfigurationDisabled),
		Type:  "boolean",
	})

	httputil.RespondWithSuccess(c, http.StatusOK, settingsDto)
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	environmentID := c.Param("id")

	var req dto.UpdateSettingsDto
	if err := c.ShouldBindJSON(&req); err != nil {
		httputil.RespondBadRequest(c, "Invalid request format")
		return
	}

	if environmentID != "0" {
		if req.AuthLocalEnabled != nil || req.AuthOidcEnabled != nil ||
			req.AuthSessionTimeout != nil || req.AuthPasswordPolicy != nil ||
			req.AuthOidcConfig != nil {
			httputil.RespondWithCustomError(c, http.StatusForbidden, "Authentication settings can only be updated from the main environment", "FORBIDDEN")
			return
		}
	}

	updatedSettings, err := h.settingsService.UpdateSettings(c.Request.Context(), req)
	if err != nil {
		httputil.RespondWithError(c, err)
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

	httputil.RespondWithSuccess(c, http.StatusOK, gin.H{
		"settings": settingDtos,
	})
}
