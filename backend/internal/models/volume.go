package models

type Volume struct {
	ClusterVolume JSON   `json:"clusterVolume,omitempty" gorm:"type:text"`
	CreatedAt     string `json:"createdAt" gorm:"column:docker_created_at" sortable:"true"`
	Driver        string `json:"driver" gorm:"not null"`
	Labels        JSON   `json:"labels,omitempty" gorm:"type:text"`
	Mountpoint    string `json:"mountpoint" gorm:"not null"`
	Name          string `json:"name" gorm:"primaryKey;type:text" sortable:"true"`
	Options       JSON   `json:"options,omitempty" gorm:"type:text"`
	Scope         string `json:"scope" gorm:"not null"`
	Status        JSON   `json:"status,omitempty" gorm:"type:text"`
	UsageData     JSON   `json:"usageData,omitempty" gorm:"type:text"`

	InUse bool `json:"inUse" gorm:"column:in_use;default:false" filterable:"true" sortable:"true"`

	BaseModel
}

func (Volume) TableName() string {
	return "volumes"
}
