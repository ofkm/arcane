package models

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
	ID           string      `json:"id" gorm:"primaryKey;type:text"`
	Hostname     string      `json:"hostname" gorm:"not null"`
	Platform     string      `json:"platform" gorm:"not null"`
	Version      string      `json:"version" gorm:"not null"`
	Capabilities StringSlice `json:"capabilities" gorm:"type:text;default:'[]'"`
	Status       string      `json:"status" gorm:"default:'offline'"`
	LastSeen     int64       `json:"lastSeen" gorm:"column:last_seen;not null"`
	RegisteredAt int64       `json:"registeredAt" gorm:"column:registered_at;not null"`

	// Metrics (stored as separate columns for easier querying)
	ContainerCount *int `json:"containerCount,omitempty" gorm:"column:container_count"`
	ImageCount     *int `json:"imageCount,omitempty" gorm:"column:image_count"`
	StackCount     *int `json:"stackCount,omitempty" gorm:"column:stack_count"`
	NetworkCount   *int `json:"networkCount,omitempty" gorm:"column:network_count"`
	VolumeCount    *int `json:"volumeCount,omitempty" gorm:"column:volume_count"`

	// Docker info (stored as separate columns)
	DockerVersion    *string `json:"dockerVersion,omitempty" gorm:"column:docker_version"`
	DockerContainers *int    `json:"dockerContainers,omitempty" gorm:"column:docker_containers"`
	DockerImages     *int    `json:"dockerImages,omitempty" gorm:"column:docker_images"`

	Metadata JSON `json:"metadata,omitempty" gorm:"type:text"`

	// Relationships
	Tasks        []AgentTask  `json:"tasks,omitempty" gorm:"foreignKey:AgentID"`
	Tokens       []AgentToken `json:"tokens,omitempty" gorm:"foreignKey:AgentID"`
	RemoteStacks []Stack      `json:"remoteStacks,omitempty" gorm:"foreignKey:AgentID"`
	Deployments  []Deployment `json:"deployments,omitempty" gorm:"foreignKey:AgentID"`

	BaseModel
}

func (Agent) TableName() string {
	return "agents_table"
}

// Helper methods to get computed properties
func (a *Agent) GetMetrics() *AgentMetrics {
	return &AgentMetrics{
		ContainerCount: a.ContainerCount,
		ImageCount:     a.ImageCount,
		StackCount:     a.StackCount,
		NetworkCount:   a.NetworkCount,
		VolumeCount:    a.VolumeCount,
	}
}

func (a *Agent) GetDockerInfo() *DockerInfo {
	if a.DockerVersion == nil {
		return nil
	}

	return &DockerInfo{
		Version:    *a.DockerVersion,
		Containers: *a.DockerContainers,
		Images:     *a.DockerImages,
	}
}

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

	// Relationships
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

	// Relationships
	Agent Agent `json:"agent" gorm:"foreignKey:AgentID;references:ID"`

	BaseModel
}

func (AgentToken) TableName() string {
	return "agent_tokens_table"
}
