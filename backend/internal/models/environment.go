package models

import "time"

type Environment struct {
	ApiUrl      string     `json:"apiUrl" gorm:"column:api_url;not null" sortable:"true"`
	Status      string     `json:"status" gorm:"default:offline" sortable:"true"`
	Enabled     bool       `json:"enabled" gorm:"default:true" sortable:"true"`
	LastSeen    *time.Time `json:"lastSeen" gorm:"column:last_seen"`
	AccessToken *string    `json:"-" gorm:"column:access_token"` // reserved for future use

	BaseModel
}

func (Environment) TableName() string { return "environments" }

type EnvironmentStatus string

const (
	EnvironmentStatusOnline  EnvironmentStatus = "online"
	EnvironmentStatusOffline EnvironmentStatus = "offline"
	EnvironmentStatusError   EnvironmentStatus = "error"
)
