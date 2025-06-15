package models

import (
	"time"
)

type Agent struct {
	ID           string      `json:"id" gorm:"primaryKey"`
	Name         string      `json:"name" gorm:"not null"`
	Hostname     string      `json:"hostname" gorm:"not null"`
	URL          string      `json:"url" gorm:"not null"`
	Platform     string      `json:"platform"`
	Version      string      `json:"version"`
	Capabilities StringSlice `json:"capabilities" gorm:"type:text;default:'[]'"`
	Status       string      `json:"status" gorm:"default:'offline'"`
	LastSeen     *time.Time  `json:"lastSeen" gorm:"column:last_seen"`
	RegisteredAt *time.Time  `json:"registeredAt" gorm:"column:registered_at"`

	ContainerCount *int `json:"-" gorm:"column:container_count"`
	ImageCount     *int `json:"-" gorm:"column:image_count"`
	StackCount     *int `json:"-" gorm:"column:stack_count"`
	NetworkCount   *int `json:"-" gorm:"column:network_count"`
	VolumeCount    *int `json:"-" gorm:"column:volume_count"`

	DockerVersion    *string `json:"-" gorm:"column:docker_version"`
	DockerContainers *int    `json:"-" gorm:"column:docker_containers"`
	DockerImages     *int    `json:"-" gorm:"column:docker_images"`

	Metrics    *AgentMetrics `json:"metrics,omitempty" gorm:"-"`
	DockerInfo *DockerInfo   `json:"dockerInfo,omitempty" gorm:"-"`

	Metadata JSON `json:"metadata,omitempty" gorm:"type:text"`

	Tasks  []AgentTask  `json:"tasks,omitempty" gorm:"foreignKey:AgentID"`
	Tokens []AgentToken `json:"tokens,omitempty" gorm:"foreignKey:AgentID"`

	BaseModel
}

func (a *Agent) PopulateMetrics() {
	if a.ContainerCount != nil || a.ImageCount != nil || a.StackCount != nil || a.NetworkCount != nil || a.VolumeCount != nil {
		a.Metrics = &AgentMetrics{
			ContainerCount: getIntValue(a.ContainerCount),
			ImageCount:     getIntValue(a.ImageCount),
			StackCount:     getIntValue(a.StackCount),
			NetworkCount:   getIntValue(a.NetworkCount),
			VolumeCount:    getIntValue(a.VolumeCount),
		}
	}

	if a.DockerVersion != nil || a.DockerContainers != nil || a.DockerImages != nil {
		a.DockerInfo = &DockerInfo{
			Version:    getStringValue(a.DockerVersion),
			Containers: getIntValue(a.DockerContainers),
			Images:     getIntValue(a.DockerImages),
		}
	}
}

func getIntValue(ptr *int) int {
	if ptr == nil {
		return 0
	}
	return *ptr
}

func getStringValue(ptr *string) string {
	if ptr == nil {
		return ""
	}
	return *ptr
}

type AgentMetrics struct {
	ContainerCount int `json:"containerCount"`
	ImageCount     int `json:"imageCount"`
	StackCount     int `json:"stackCount"`
	NetworkCount   int `json:"networkCount"`
	VolumeCount    int `json:"volumeCount"`
}

type DockerInfo struct {
	Version    string `json:"version"`
	Containers int    `json:"containers"`
	Images     int    `json:"images"`
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
	TaskStatusCancelled AgentTaskStatus = "cancelled"
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

	Agent Agent `json:"agent,omitempty" gorm:"foreignKey:AgentID;references:ID"`

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

	Agent Agent `json:"agent,omitempty" gorm:"foreignKey:AgentID;references:ID"`

	BaseModel
}

func (AgentToken) TableName() string {
	return "agent_tokens_table"
}
