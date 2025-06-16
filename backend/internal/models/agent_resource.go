package models

import (
	"time"
)

type AgentResource struct {
	BaseModel
	ID       string `gorm:"primaryKey"`
	AgentID  string `gorm:"index"`
	Type     string `gorm:"index"` // "container", "image", "network", "volume", "stack"
	Data     JSON   `gorm:"type:text"`
	LastSync time.Time
}

type AgentContainer struct {
	ID      string            `json:"id"`
	Names   []string          `json:"names"`
	Image   string            `json:"image"`
	Status  string            `json:"status"`
	Ports   map[string]string `json:"ports"`
	Created time.Time         `json:"created"`
	Labels  map[string]string `json:"labels"`
}

type AgentImage struct {
	ID         string            `json:"id"`
	Repository string            `json:"repository"`
	Tag        string            `json:"tag"`
	Size       int64             `json:"size"`
	Created    time.Time         `json:"created"`
	Labels     map[string]string `json:"labels"`
}

type AgentNetwork struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Driver string `json:"driver"`
	Scope  string `json:"scope"`
}

type AgentVolume struct {
	Name       string            `json:"name"`
	Driver     string            `json:"driver"`
	Mountpoint string            `json:"mountpoint"`
	Labels     map[string]string `json:"labels"`
}

type AgentStack struct {
	Name         string `json:"name"`
	Status       string `json:"status"`
	ServiceCount int    `json:"service_count"`
	ProjectDir   string `json:"project_dir"`
}
