package models

import "time"

type Network struct {
	ID string `json:"id" gorm:"primaryKey;not null" sortable:"true"`

	Name       string `json:"name" gorm:"uniqueIndex;not null" sortable:"true"`
	Driver     string `json:"driver" gorm:"not null" sortable:"true"`
	Scope      string `json:"scope" gorm:"not null" sortable:"true"`
	Internal   bool   `json:"internal" gorm:"default:false"`
	Attachable bool   `json:"attachable" gorm:"default:false"`
	Ingress    bool   `json:"ingress" gorm:"default:false"`

	Options    JSON      `json:"options,omitempty" gorm:"type:text"`
	Labels     JSON      `json:"labels,omitempty" gorm:"type:text"`
	Containers JSON      `json:"containers,omitempty" gorm:"type:text"`
	IPAM       JSON      `json:"ipam,omitempty" gorm:"column:ip_am;type:text"`
	EnableIPv4 bool      `json:"enableIPv4" gorm:"default:false"`
	EnableIPv6 bool      `json:"enableIPv6" gorm:"default:false"`
	ConfigFrom JSON      `json:"configFrom,omitempty" gorm:"type:text"`
	ConfigOnly bool      `json:"configOnly" gorm:"default:false"`
	Peers      JSON      `json:"peers,omitempty" gorm:"type:text"`
	Services   JSON      `json:"services,omitempty" gorm:"type:text"`
	Created    time.Time `json:"created" gorm:"not null" sortable:"true"`

	InUse bool `json:"inUse" gorm:"column:in_use;default:false" sortable:"true" filterable:"true"`

	BaseModel
}
