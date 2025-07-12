package models

import (
	"time"
)

type ContainerRegistry struct {
	ID          string    `json:"id" gorm:"primaryKey" sortable:"true"`
	URL         string    `json:"url" gorm:"not null" sortable:"true"`
	Username    string    `json:"username" gorm:"not null" sortable:"true"`
	Token       string    `json:"token" gorm:"not null"`
	Description *string   `json:"description,omitempty" sortable:"true"`
	Insecure    bool      `json:"insecure" gorm:"default:false" sortable:"true"`
	Enabled     bool      `json:"enabled" gorm:"default:true" sortable:"true"`
	CreatedAt   time.Time `json:"createdAt" sortable:"true"`
	UpdatedAt   time.Time `json:"updatedAt" sortable:"true"`
}

func (ContainerRegistry) TableName() string {
	return "container_registries"
}

type CreateContainerRegistryRequest struct {
	URL         string  `json:"url" binding:"required"`
	Username    string  `json:"username" binding:"required"`
	Token       string  `json:"token" binding:"required"`
	Description *string `json:"description"`
	Insecure    *bool   `json:"insecure"`
	Enabled     *bool   `json:"enabled"`
}

type UpdateContainerRegistryRequest struct {
	URL         *string `json:"url"`
	Username    *string `json:"username"`
	Token       *string `json:"token"`
	Description *string `json:"description"`
	Insecure    *bool   `json:"insecure"`
	Enabled     *bool   `json:"enabled"`
}
