package api

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/models"
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

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"settings": settings,
	})
}

type UpdateSettingsRequest struct {
	DockerHost            *string      `json:"dockerHost,omitempty"`
	StacksDirectory       *string      `json:"stacksDirectory,omitempty"`
	AutoUpdate            *bool        `json:"autoUpdate,omitempty"`
	AutoUpdateInterval    *int         `json:"autoUpdateInterval,omitempty"`
	PollingEnabled        *bool        `json:"pollingEnabled,omitempty"`
	PollingInterval       *int         `json:"pollingInterval,omitempty"`
	PruneMode             *string      `json:"pruneMode,omitempty"`
	RegistryCredentials   *models.JSON `json:"registryCredentials,omitempty"`
	TemplateRegistries    *models.JSON `json:"templateRegistries,omitempty"`
	Auth                  *models.JSON `json:"auth,omitempty"`
	Onboarding            *models.JSON `json:"onboarding,omitempty"`
	BaseServerURL         *string      `json:"baseServerUrl,omitempty"`
	MaturityThresholdDays *int         `json:"maturityThresholdDays,omitempty"`
}

func (h *SettingsHandler) UpdateSettings(c *gin.Context) {
	var req UpdateSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format",
		})
		return
	}

	settings, err := h.settingsService.GetSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch current settings",
		})
		return
	}

	if req.DockerHost != nil {
		settings.DockerHost = *req.DockerHost
	}
	if req.StacksDirectory != nil {
		settings.StacksDirectory = *req.StacksDirectory
	}
	if req.AutoUpdate != nil {
		settings.AutoUpdate = *req.AutoUpdate
	}
	if req.AutoUpdateInterval != nil {
		settings.AutoUpdateInterval = *req.AutoUpdateInterval
	}
	if req.PollingEnabled != nil {
		settings.PollingEnabled = *req.PollingEnabled
	}
	if req.PollingInterval != nil {
		settings.PollingInterval = *req.PollingInterval
	}
	if req.PruneMode != nil {
		settings.PruneMode = req.PruneMode
	}
	if req.RegistryCredentials != nil {
		settings.RegistryCredentials = *req.RegistryCredentials
	}
	if req.TemplateRegistries != nil {
		settings.TemplateRegistries = *req.TemplateRegistries
	}
	if req.Auth != nil {
		settings.Auth = *req.Auth
	}
	if req.Onboarding != nil {
		settings.Onboarding = *req.Onboarding
	}
	if req.BaseServerURL != nil {
		settings.BaseServerURL = req.BaseServerURL
	}
	if req.MaturityThresholdDays != nil {
		settings.MaturityThresholdDays = *req.MaturityThresholdDays
	}

	updatedSettings, err := h.settingsService.UpdateSettings(c.Request.Context(), settings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update settings",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"settings": updatedSettings,
		"message":  "Settings updated successfully",
	})
}

func (h *SettingsHandler) UpdateAuth(c *gin.Context) {
	var authSettings models.JSON
	if err := c.ShouldBindJSON(&authSettings); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid auth settings format",
		})
		return
	}

	settings, err := h.settingsService.GetSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch settings",
		})
		return
	}

	settings.Auth = authSettings
	updatedSettings, err := h.settingsService.UpdateSettings(c.Request.Context(), settings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update auth settings",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"settings": updatedSettings,
		"message":  "Auth settings updated successfully",
	})
}

func (h *SettingsHandler) UpdateOnboarding(c *gin.Context) {
	var onboardingData models.JSON
	if err := c.ShouldBindJSON(&onboardingData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid onboarding data format",
		})
		return
	}

	settings, err := h.settingsService.GetSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch settings",
		})
		return
	}

	settings.Onboarding = onboardingData
	updatedSettings, err := h.settingsService.UpdateSettings(c.Request.Context(), settings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update onboarding settings",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"settings": updatedSettings,
		"message":  "Onboarding settings updated successfully",
	})
}

func (h *SettingsHandler) AddRegistryCredential(c *gin.Context) {
	type AddRegistryRequest struct {
		URL      string `json:"url" binding:"required"`
		Username string `json:"username" binding:"required"`
		Password string `json:"password" binding:"required"`
	}

	var req AddRegistryRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid registry credential format",
		})
		return
	}

	settings, err := h.settingsService.GetSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch settings",
		})
		return
	}

	credentials := settings.RegistryCredentials
	if credentials == nil {
		credentials = make(models.JSON)
	}

	if credArray, ok := credentials["credentials"].([]interface{}); ok {
		newCred := map[string]interface{}{
			"url":      req.URL,
			"username": req.Username,
			"password": req.Password,
		}
		credArray = append(credArray, newCred)
		credentials["credentials"] = credArray
	} else {
		credentials["credentials"] = []interface{}{
			map[string]interface{}{
				"url":      req.URL,
				"username": req.Username,
				"password": req.Password,
			},
		}
	}

	settings.RegistryCredentials = credentials
	updatedSettings, err := h.settingsService.UpdateSettings(c.Request.Context(), settings)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to add registry credential",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"settings": updatedSettings,
		"message":  "Registry credential added successfully",
	})
}

func (h *SettingsHandler) GetPublicSettings(c *gin.Context) {
	settings, err := h.settingsService.GetSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to retrieve settings: " + err.Error(),
		})
		return
	}

	publicSettings := map[string]interface{}{
		"auth": settings.Auth,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    publicSettings,
	})
}
