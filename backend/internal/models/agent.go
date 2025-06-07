package models

import (
	"time"
)

type AgentMetrics struct {
	ContainerCount *int `json:"containerCount,omitempty" gorm:"column:container_count"`
	ImageCount     *int `json:"imageCount,omitempty" gorm:"column:image_count"`
	StackCount     *int `json:"stackCount,omitempty" gorm:"column:stack_count"`
	NetworkCount   *int `json:"networkCount,omitempty" gorm:"column:network_count"`
	VolumeCount    *int `json:"volumeCount,omitempty" gorm:"column:volume_count"`
}

type DockerInfo struct {
	Version    string `json:"version"`
	Containers int    `json:"containers"`
	Images     int    `json:"images"`
}

type Agent struct {
	ID       string     `json:"id" gorm:"primaryKey"`
	Name     string     `json:"name" gorm:"not null"`
	URL      string     `json:"url" gorm:"not null"`
	Token    string     `json:"token"`
	IsActive bool       `json:"is_active" gorm:"default:true"`
	LastPing *time.Time `json:"last_ping,omitempty"`
	Version  string     `json:"version,omitempty"`

	Stacks []Stack `json:"stacks,omitempty" gorm:"foreignKey:AgentID"`

	BaseModel
}

type AgentStatus string

const (
	AgentStatusOnline  AgentStatus = "online"
	AgentStatusOffline AgentStatus = "offline"
	AgentStatusError   AgentStatus = "error"
)

type AgentTaskType string

const (
	TaskDockerCommand        AgentTaskType = "docker_command"
	TaskStackDeploy          AgentTaskType = "stack_deploy"
	TaskComposeCreateProject AgentTaskType = "compose_create_project"
	TaskComposeUp            AgentTaskType = "compose_up"
	TaskImagePull            AgentTaskType = "image_pull"
	TaskHealthCheck          AgentTaskType = "health_check"
	TaskContainerStart       AgentTaskType = "container_start"
	TaskStackList            AgentTaskType = "stack_list"
	TaskContainerStop        AgentTaskType = "container_stop"
	TaskContainerRestart     AgentTaskType = "container_restart"
	TaskContainerRemove      AgentTaskType = "container_remove"
	TaskAgentUpgrade         AgentTaskType = "agent_upgrade"
)

type AgentTaskStatus string

const (
	TaskStatusPending   AgentTaskStatus = "pending"
	TaskStatusRunning   AgentTaskStatus = "running"
	TaskStatusCompleted AgentTaskStatus = "completed"
	TaskStatusFailed    AgentTaskStatus = "failed"
)

type AgentTask struct {
	ID          string          `json:"id" gorm:"primaryKey;type:text"`
	AgentID     string          `json:"agentId" gorm:"column:agent_id;not null;index"`
	Type        AgentTaskType   `json:"type" gorm:"not null"`
	Payload     JSON            `json:"payload" gorm:"type:text;not null"`
	Status      AgentTaskStatus `json:"status" gorm:"default:'pending'"`
	Result      JSON            `json:"result,omitempty" gorm:"type:text"`
	Error       *string         `json:"error,omitempty"`
	StartedAt   *int64          `json:"startedAt,omitempty" gorm:"column:started_at"`
	CompletedAt *int64          `json:"completedAt,omitempty" gorm:"column:completed_at"`

	Agent Agent `json:"agent" gorm:"foreignKey:AgentID;references:ID"`

	BaseModel
}

func (AgentTask) TableName() string {
	return "agent_tasks_table"
}

type AgentToken struct {
	ID          string      `json:"id" gorm:"primaryKey;type:text"`
	AgentID     string      `json:"agentId" gorm:"column:agent_id;not null;index"`
	Token       string      `json:"token" gorm:"uniqueIndex;not null"`
	Name        *string     `json:"name,omitempty"`
	Permissions StringSlice `json:"permissions" gorm:"type:text;default:'[]'"`
	LastUsed    *int64      `json:"lastUsed,omitempty" gorm:"column:last_used"`
	ExpiresAt   *int64      `json:"expiresAt,omitempty" gorm:"column:expires_at"`
	IsActive    bool        `json:"isActive" gorm:"column:is_active;default:true"`

	Agent Agent `json:"agent" gorm:"foreignKey:AgentID;references:ID"`

	BaseModel
}

func (AgentToken) TableName() string {
	return "agent_tokens_table"
}
