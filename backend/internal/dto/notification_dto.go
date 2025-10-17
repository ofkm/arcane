package dto

import "github.com/ofkm/arcane-backend/internal/models"

type NotificationSettingsRequest struct {
	Provider string      `json:"provider" binding:"required"`
	Enabled  bool        `json:"enabled"`
	Config   models.JSON `json:"config" binding:"required"`
}

type NotificationSettingsResponse struct {
	ID       uint        `json:"id"`
	Provider string      `json:"provider"`
	Enabled  bool        `json:"enabled"`
	Config   models.JSON `json:"config"`
}
