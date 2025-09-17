package models

import "time"

type Container struct {
	Name        string      `json:"name" gorm:"not null" sortable:"true"`
	Image       string      `json:"image" gorm:"not null" sortable:"true"`
	Status      string      `json:"status" gorm:"not null" sortable:"true"`
	State       string      `json:"state" gorm:"not null" sortable:"true"`
	Ports       JSON        `json:"ports,omitempty" gorm:"type:text"`
	Mounts      JSON        `json:"mounts,omitempty" gorm:"type:text"`
	Networks    StringSlice `json:"networks,omitempty" gorm:"type:text"`
	Labels      JSON        `json:"labels,omitempty" gorm:"type:text"`
	Environment StringSlice `json:"environment,omitempty" gorm:"type:text"`
	Command     StringSlice `json:"command,omitempty" gorm:"type:text"`
	ProjectID   *string     `json:"projectId,omitempty" gorm:"column:project_id;index"`
	CreatedAt   time.Time   `json:"createdAt" gorm:"not null" sortable:"true"`
	StartedAt   *time.Time  `json:"startedAt,omitempty" gorm:"column:started_at" sortable:"true"`

	Project *Project `json:"project,omitempty" gorm:"foreignKey:ProjectID;references:ID"`

	BaseModel
}

func (Container) TableName() string {
	return "containers"
}
