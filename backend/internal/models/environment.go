package models

import (
	"time"
)

type Environment struct {
	ID          string     `json:"id" gorm:"primaryKey"`
	Hostname    string     `json:"hostname" gorm:"not null"`
	ApiUrl      string     `json:"apiUrl" gorm:"column:api_url;not null"`
	Description *string    `json:"description"`
	Status      string     `json:"status" gorm:"default:offline"`
	Enabled     bool       `json:"enabled" gorm:"default:true"`
	LastSeen    *time.Time `json:"lastSeen" gorm:"column:last_seen"`
	CreatedAt   time.Time  `json:"createdAt" gorm:"column:created_at"`
	UpdatedAt   *time.Time `json:"updatedAt" gorm:"column:updated_at"`
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
