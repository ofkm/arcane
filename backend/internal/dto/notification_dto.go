package dto

import (
	"time"

	"github.com/ofkm/arcane-backend/internal/models"
)

type NotificationSettingsRequest struct {
	Provider    models.NotificationProvider `json:"provider" binding:"required"`
	Enabled     bool                        `json:"enabled"`
	Config      models.JSON                 `json:"config" binding:"required"`
	AppriseURLs []string                    `json:"appriseUrls"`
	Label       string                      `json:"label"`
	Tags        []string                    `json:"tags"`
}

type NotificationSettingsResponse struct {
	ID               uint                        `json:"id"`
	Provider         models.NotificationProvider `json:"provider"`
	Enabled          bool                        `json:"enabled"`
	Config           models.JSON                 `json:"config"`
	AppriseURLs      []string                    `json:"appriseUrls"`
	Label            string                      `json:"label"`
	Tags             []string                    `json:"tags"`
	ValidationStatus string                      `json:"validationStatus"`
	LastValidatedAt  *time.Time                  `json:"lastValidatedAt"`
	CreatedAt        string                      `json:"createdAt"`
	UpdatedAt        string                      `json:"updatedAt"`
}

// Provider Metadata DTOs
type ProviderMetadataResponse struct {
	ID          uint                       `json:"id"`
	Name        string                     `json:"name"`
	DisplayName string                     `json:"displayName"`
	Category    string                     `json:"category"`
	Description string                     `json:"description"`
	URLFormat   string                     `json:"urlFormat"`
	Parameters  map[string]models.ParamDef `json:"parameters"`
	AuthTypes   []string                   `json:"authTypes"`
	Tags        []string                   `json:"tags"`
	Examples    []string                   `json:"examples"`
	Enabled     bool                       `json:"enabled"`
	CreatedAt   string                     `json:"createdAt"`
	UpdatedAt   string                     `json:"updatedAt"`
}

type ParamDefResponse struct {
	Name        string `json:"name"`
	DisplayName string `json:"displayName"`
	Type        string `json:"type"`
	Required    bool   `json:"required"`
	Description string `json:"description"`
	Example     string `json:"example"`
	Placeholder string `json:"placeholder"`
	Validation  string `json:"validation"`
}

// Provider Validation DTOs
type ProviderValidationRequest struct {
	Config models.JSON `json:"config" binding:"required"`
}

type ProviderValidationResponse struct {
	Provider models.NotificationProvider `json:"provider"`
	Valid    bool                        `json:"valid"`
	Message  string                      `json:"message"`
	Errors   []string                    `json:"errors"`
	Warnings []string                    `json:"warnings"`
}

// Notification Test DTOs
type NotificationTestRequest struct {
	Config models.JSON `json:"config" binding:"required"`
}

type NotificationTestResponse struct {
	Success  bool   `json:"success"`
	Message  string `json:"message"`
	Provider string `json:"provider"`
	SentAt   string `json:"sentAt"`
}

// Batch Notification DTOs
type BatchNotificationRequest struct {
	Message         NotificationMessage                         `json:"message"`
	ProviderConfigs map[models.NotificationProvider]models.JSON `json:"providerConfigs"`
}

type NotificationMessage struct {
	Title    string            `json:"title"`
	Body     string            `json:"body"`
	Format   string            `json:"format"`
	Tags     []string          `json:"tags"`
	Priority string            `json:"priority"`
	Metadata map[string]string `json:"metadata"`
}

// Notification Log DTOs
type NotificationLogResponse struct {
	ID         uint   `json:"id"`
	Provider   string `json:"provider"`
	Message    string `json:"message"`
	Status     string `json:"status"`
	SentAt     string `json:"sentAt"`
	Response   string `json:"response"`
	Error      string `json:"error"`
	RetryCount int    `json:"retryCount"`
}
