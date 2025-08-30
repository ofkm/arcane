package models

import (
	"time"
)

type Environment struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	Hostname    string     `json:"hostname" gorm:"not null" sortable:"true"`
	ApiUrl      string     `json:"apiUrl" gorm:"column:api_url;not null" sortable:"true"`
	Description *string    `json:"description" sortable:"true"`
	Status      string     `json:"status" gorm:"default:offline" sortable:"true"`
	Enabled     bool       `json:"enabled" gorm:"default:true" sortable:"true"`
	LastSeen    *time.Time `json:"lastSeen" gorm:"column:last_seen" sortable:"true"`
	CreatedAt   time.Time  `json:"createdAt" gorm:"column:created_at" sortable:"true"`
	UpdatedAt   *time.Time `json:"updatedAt" gorm:"column:updated_at" sortable:"true"`
}

func (Environment) TableName() string {
	return "environments"
}

type EnvironmentStatus string

const (
	EnvironmentStatusOnline  EnvironmentStatus = "online"
	EnvironmentStatusOffline EnvironmentStatus = "offline"
	EnvironmentStatusError   EnvironmentStatus = "error"
)
