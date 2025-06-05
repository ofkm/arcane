package models

import (
	"time"
)

// Container represents a Docker container
type Container struct {
	ID          string      `json:"id" gorm:"primaryKey;type:text"`
	Name        string      `json:"name" gorm:"not null"`
	Image       string      `json:"image" gorm:"not null"`
	Status      string      `json:"status" gorm:"not null"`
	State       string      `json:"state" gorm:"not null"`
	Ports       JSON        `json:"ports,omitempty" gorm:"type:text"`
	Mounts      JSON        `json:"mounts,omitempty" gorm:"type:text"`
	Networks    StringSlice `json:"networks,omitempty" gorm:"type:text"`
	Labels      JSON        `json:"labels,omitempty" gorm:"type:text"`
	Environment StringSlice `json:"environment,omitempty" gorm:"type:text"`
	Command     StringSlice `json:"command,omitempty" gorm:"type:text"`
	StackID     *string     `json:"stackId,omitempty" gorm:"column:stack_id;index"`
	CreatedAt   time.Time   `json:"createdAt" gorm:"not null"`
	StartedAt   *time.Time  `json:"startedAt,omitempty" gorm:"column:started_at"`

	// Relationships
	Stack *Stack `json:"stack,omitempty" gorm:"foreignKey:StackID;references:ID"`

	BaseModel
}

func (Container) TableName() string {
	return "containers_table"
}

type ContainerPort struct {
	PrivatePort int    `json:"privatePort"`
	PublicPort  *int   `json:"publicPort,omitempty"`
	Type        string `json:"type"`
	IP          string `json:"ip,omitempty"`
}

type ContainerMount struct {
	Source      string `json:"source"`
	Destination string `json:"destination"`
	Mode        string `json:"mode"`
	RW          bool   `json:"rw"`
}

// Image represents a Docker image
type Image struct {
	ID          string      `json:"id" gorm:"primaryKey;type:text"`
	RepoTags    StringSlice `json:"repoTags" gorm:"type:text"`
	RepoDigests StringSlice `json:"repoDigests,omitempty" gorm:"type:text"`
	Size        int64       `json:"size" gorm:"not null"`
	VirtualSize int64       `json:"virtualSize" gorm:"column:virtual_size"`
	Labels      JSON        `json:"labels,omitempty" gorm:"type:text"`
	Created     time.Time   `json:"created" gorm:"not null"`

	// Additional fields for enhanced functionality
	Repo  string `json:"repo" gorm:"column:repo"`
	Tag   string `json:"tag" gorm:"column:tag"`
	InUse bool   `json:"inUse" gorm:"column:in_use;default:false"`

	BaseModel
}

func (Image) TableName() string {
	return "images_table"
}

// Volume represents a Docker volume
type Volume struct {
	Name       string    `json:"name" gorm:"primaryKey;type:text"`
	Driver     string    `json:"driver" gorm:"not null"`
	Mountpoint string    `json:"mountpoint" gorm:"not null"`
	Labels     JSON      `json:"labels,omitempty" gorm:"type:text"`
	Scope      string    `json:"scope" gorm:"not null"`
	Options    JSON      `json:"options,omitempty" gorm:"type:text"`
	CreatedAt  time.Time `json:"createdAt" gorm:"not null"`

	// Additional fields
	InUse bool `json:"inUse" gorm:"column:in_use;default:false"`

	BaseModel
}

func (Volume) TableName() string {
	return "volumes_table"
}

// Network represents a Docker network
type Network struct {
	ID         string    `json:"id" gorm:"primaryKey;type:text"`
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

func (Network) TableName() string {
	return "networks_table"
}

type NetworkIPAM struct {
	Driver  string              `json:"driver"`
	Config  []NetworkIPAMConfig `json:"config,omitempty"`
	Options map[string]string   `json:"options,omitempty"`
}

type NetworkIPAMConfig struct {
	Subnet     string `json:"subnet,omitempty"`
	IPRange    string `json:"ipRange,omitempty"`
	Gateway    string `json:"gateway,omitempty"`
	AuxAddress string `json:"auxAddress,omitempty"`
}
