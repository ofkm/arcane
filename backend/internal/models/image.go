package models

import "time"

type Image struct {
	RepoTags    StringSlice `json:"repoTags" gorm:"type:text"`
	RepoDigests StringSlice `json:"repoDigests,omitempty" gorm:"type:text"`
	Size        int64       `json:"size" gorm:"not null" sortable:"true"`
	VirtualSize int64       `json:"virtualSize" gorm:"column:virtual_size"`
	Labels      JSON        `json:"labels,omitempty" gorm:"type:text"`
	Created     time.Time   `json:"created" gorm:"not null" sortable:"true"`

	Repo  string `json:"repo" gorm:"column:repo;index" sortable:"true"`
	Tag   string `json:"tag" gorm:"column:tag;index" sortable:"true"`
	InUse bool   `json:"inUse" gorm:"column:in_use;default:false" sortable:"true" filterable:"true"`

	UpdateRecord *ImageUpdateRecord `json:"updateInfo,omitempty" gorm:"foreignKey:ID;references:ID"`

	BaseModel
}

func (i *Image) TableName() string {
	return "images"
}
