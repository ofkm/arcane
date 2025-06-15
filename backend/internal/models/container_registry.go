package models

import (
	"time"
)

type ContainerRegistry struct {
	ID          string    `json:"id" gorm:"primaryKey"`
	URL         string    `json:"url" gorm:"not null"`
	Username    string    `json:"username" gorm:"not null"`
	Token       string    `json:"token" gorm:"not null"`
	Description *string   `json:"description,omitempty"`
	Insecure    bool      `json:"insecure" gorm:"default:false"`
	Enabled     bool      `json:"enabled" gorm:"default:true"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
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
