package api

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type NotificationHandler struct {
	notificationService *services.NotificationService
	appriseService      *services.AppriseService
}

func NewNotificationHandler(group *gin.RouterGroup, notificationService *services.NotificationService, appriseService *services.AppriseService, authMiddleware *middleware.AuthMiddleware) {
	handler := &NotificationHandler{
		notificationService: notificationService,
		appriseService:      appriseService,
	}

	notifications := group.Group("/environments/:id/notifications")
	notifications.Use(authMiddleware.WithAdminRequired().Add())
	{
		// Existing legacy endpoints
		notifications.GET("/settings", handler.GetAllSettings)
		notifications.GET("/settings/:provider", handler.GetSettings)
		notifications.POST("/settings", handler.CreateOrUpdateSettings)
		notifications.DELETE("/settings/:provider", handler.DeleteSettings)
		notifications.POST("/test/:provider", handler.TestNotification)

		// New Apprise endpoints
		notifications.GET("/providers", handler.GetAllProviders)
		notifications.GET("/providers/:provider/schema", handler.GetProviderSchema)
		notifications.POST("/providers/:provider/validate", handler.ValidateProvider)
		notifications.POST("/providers/:provider/test", handler.TestProvider)
		notifications.POST("/batch", handler.SendBatchNotification)
		notifications.GET("/logs", handler.GetNotificationLogs)
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
			ID:               setting.ID,
			Provider:         setting.Provider,
			Enabled:          setting.Enabled,
			Config:           setting.Config,
			AppriseURLs:      setting.AppriseURLs,
			Label:            setting.Label,
			Tags:             setting.Tags,
			ValidationStatus: setting.ValidationStatus,
			LastValidatedAt: func() *string {
				if setting.LastValidatedAt != nil {
					t := setting.LastValidatedAt.Format(time.RFC3339)
					return &t
				}
				return nil
			}(),
			CreatedAt: setting.CreatedAt.Format(time.RFC3339),
			UpdatedAt: setting.UpdatedAt.Format(time.RFC3339),
		}
	}

	c.JSON(http.StatusOK, responses)
}

func (h *NotificationHandler) GetSettings(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := models.NotificationProvider(providerStr)

	settings, err := h.notificationService.GetSettingsByProvider(c.Request.Context(), provider)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Settings not found"})
		return
	}

	response := dto.NotificationSettingsResponse{
		ID:               settings.ID,
		Provider:         settings.Provider,
		Enabled:          settings.Enabled,
		Config:           settings.Config,
		AppriseURLs:      settings.AppriseURLs,
		Label:            settings.Label,
		Tags:             settings.Tags,
		ValidationStatus: settings.ValidationStatus,
		LastValidatedAt: func() *string {
			if settings.LastValidatedAt != nil {
				t := settings.LastValidatedAt.Format(time.RFC3339)
				return &t
			}
			return nil
		}(),
		CreatedAt: settings.CreatedAt.Format(time.RFC3339),
		UpdatedAt: settings.UpdatedAt.Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, response)
}

func (h *NotificationHandler) CreateOrUpdateSettings(c *gin.Context) {
	var req dto.NotificationSettingsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Enhanced validation for Apprise providers
	if req.Provider != models.NotificationProviderDiscord && req.Provider != models.NotificationProviderEmail {
		// Skip validation for the special "apprise" provider
		if req.Provider != models.NotificationProviderApprise {
			if validation, err := h.appriseService.ValidateProvider(c.Request.Context(), req.Provider, req.Config); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Provider validation failed", "details": err.Error()})
				return
			} else if !validation.Valid {
				c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid configuration", "validation": validation})
				return
			}
		}
	}

	settings, err := h.notificationService.CreateOrUpdateSettingsEnhanced(
		c.Request.Context(),
		req.Provider,
		req.Enabled,
		req.Config,
		req.AppriseURLs,
		req.Label,
		req.Tags,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := dto.NotificationSettingsResponse{
		ID:               settings.ID,
		Provider:         settings.Provider,
		Enabled:          settings.Enabled,
		Config:           settings.Config,
		AppriseURLs:      settings.AppriseURLs,
		Label:            settings.Label,
		Tags:             settings.Tags,
		ValidationStatus: settings.ValidationStatus,
		LastValidatedAt: func() *string {
			if settings.LastValidatedAt != nil {
				t := settings.LastValidatedAt.Format(time.RFC3339)
				return &t
			}
			return nil
		}(),
		CreatedAt: settings.CreatedAt.Format(time.RFC3339),
		UpdatedAt: settings.UpdatedAt.Format(time.RFC3339),
	}

	c.JSON(http.StatusOK, response)
}

func (h *NotificationHandler) DeleteSettings(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := models.NotificationProvider(providerStr)

	if err := h.notificationService.DeleteSettings(c.Request.Context(), provider); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Settings deleted successfully"})
}

func (h *NotificationHandler) TestNotification(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := models.NotificationProvider(providerStr)

	testType := c.DefaultQuery("type", "simple") // "simple" or "image-update"

	if err := h.notificationService.TestNotification(c.Request.Context(), provider, testType); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Test notification sent successfully"})
}

// New Apprise endpoints

func (h *NotificationHandler) GetAllProviders(c *gin.Context) {
	metadata := h.appriseService.GetAllProviderMetadata()

	// Map to DTOs
	responses := make([]dto.ProviderMetadataResponse, len(metadata))
	for i, meta := range metadata {
		parameters := make(map[string]dto.ParamDefResponse)
		for name, param := range meta.Parameters {
			parameters[name] = dto.ParamDefResponse{
				Name:        param.Name,
				DisplayName: param.DisplayName,
				Type:        param.Type,
				Required:    param.Required,
				Description: param.Description,
				Example:     param.Example,
				Placeholder: param.Placeholder,
				Validation:  param.Validation,
			}
		}

		responses[i] = dto.ProviderMetadataResponse{
			ID:          meta.ID,
			Name:        meta.Name,
			DisplayName: meta.DisplayName,
			Category:    meta.Category,
			Description: meta.Description,
			URLFormat:   meta.URLFormat,
			Parameters:  parameters,
			AuthTypes:   meta.AuthTypes,
			Tags:        meta.Tags,
			Examples:    meta.Examples,
			Enabled:     meta.Enabled,
			CreatedAt:   meta.CreatedAt.Format(time.RFC3339),
			UpdatedAt:   meta.UpdatedAt.Format(time.RFC3339),
		}
	}

	c.JSON(http.StatusOK, responses)
}

func (h *NotificationHandler) GetProviderSchema(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := models.NotificationProvider(providerStr)

	schema, err := h.appriseService.GetProviderSchema(provider)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Map to DTOs
	response := make(map[string]dto.ParamDefResponse)
	for name, param := range schema {
		response[name] = dto.ParamDefResponse{
			Name:        param.Name,
			DisplayName: param.DisplayName,
			Type:        param.Type,
			Required:    param.Required,
			Description: param.Description,
			Example:     param.Example,
			Placeholder: param.Placeholder,
			Validation:  param.Validation,
		}
	}

	c.JSON(http.StatusOK, response)
}

func (h *NotificationHandler) ValidateProvider(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := models.NotificationProvider(providerStr)

	var req dto.ProviderValidationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	validation, err := h.appriseService.ValidateProvider(c.Request.Context(), provider, req.Config)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	response := dto.ProviderValidationResponse{
		Provider: validation.Provider,
		Valid:    validation.Valid,
		Message:  validation.Message,
		Errors:   validation.Errors,
		Warnings: validation.Warnings,
	}

	c.JSON(http.StatusOK, response)
}

func (h *NotificationHandler) TestProvider(c *gin.Context) {
	providerStr := c.Param("provider")
	provider := models.NotificationProvider(providerStr)

	var req dto.NotificationTestRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.appriseService.TestProvider(c.Request.Context(), provider, req.Config); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, dto.NotificationTestResponse{
		Success:  true,
		Message:  "Test notification sent successfully",
		Provider: string(provider),
		SentAt:   time.Now().Format(time.RFC3339),
	})
}

func (h *NotificationHandler) SendBatchNotification(c *gin.Context) {
	var req dto.BatchNotificationRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Convert to internal message format
	msg := &models.NotificationMessage{
		Title:    req.Message.Title,
		Body:     req.Message.Body,
		Format:   req.Message.Format,
		Tags:     req.Message.Tags,
		Priority: req.Message.Priority,
		Metadata: req.Message.Metadata,
	}

	if err := h.appriseService.SendBatchNotifications(c.Request.Context(), msg, req.ProviderConfigs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Batch notifications sent successfully"})
}

func (h *NotificationHandler) GetNotificationLogs(c *gin.Context) {
	// This would get logs from the database
	// For now, return a placeholder response
	c.JSON(http.StatusOK, []dto.NotificationLogResponse{})
}
