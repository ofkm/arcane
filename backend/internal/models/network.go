package models

import "time"

type Network struct {
	Name       string    `json:"name" gorm:"uniqueIndex;not null"`
	Driver     string    `json:"driver" gorm:"not null"`
	Scope      string    `json:"scope" gorm:"not null"`
	Internal   bool      `json:"internal" gorm:"default:false"`
	Attachable bool      `json:"attachable" gorm:"default:false"`
	Ingress    bool      `json:"ingress" gorm:"default:false"`
	IPAM       JSON      `json:"ipam" gorm:"type:text"`
	Labels     JSON      `json:"labels,omitempty" gorm:"type:text"`
	Options    JSON      `json:"options,omitempty" gorm:"type:text"`
	CreatedAt  time.Time `json:"createdAt" gorm:"not null"`

	BaseModel
}
