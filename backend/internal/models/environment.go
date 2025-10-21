package models

import "time"

type Environment struct {
	Name        string     `json:"name" sortable:"true"`
	ApiUrl      string     `json:"apiUrl" gorm:"column:api_url" sortable:"true"`
	Status      string     `json:"status" sortable:"true"`
	Enabled     bool       `json:"enabled" sortable:"true"`
	LastSeen    *time.Time `json:"lastSeen" gorm:"column:last_seen"`
	AccessToken *string    `json:"-" gorm:"column:access_token"`

	BaseModel
}

func (Environment) TableName() string { return "environments" }

type EnvironmentStatus string

const (
	EnvironmentStatusOnline  EnvironmentStatus = "online"
	EnvironmentStatusOffline EnvironmentStatus = "offline"
	EnvironmentStatusError   EnvironmentStatus = "error"
)
