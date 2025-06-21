package dto

import "github.com/ofkm/arcane-backend/internal/models"

type UpdateSettingsDto struct {
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
