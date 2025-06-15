package models

type DeploymentType string

const (
	DeploymentTypeStack     DeploymentType = "stack"
	DeploymentTypeContainer DeploymentType = "container"
	DeploymentTypeImage     DeploymentType = "image"
)

type DeploymentStatus string

const (
	DeploymentStatusPending   DeploymentStatus = "pending"
	DeploymentStatusRunning   DeploymentStatus = "running"
	DeploymentStatusStopped   DeploymentStatus = "stopped"
	DeploymentStatusFailed    DeploymentStatus = "failed"
	DeploymentStatusCompleted DeploymentStatus = "completed"
)

type DeploymentMetadata struct {
	StackName      *string  `json:"stackName,omitempty"`
	ImageName      *string  `json:"imageName,omitempty"`
	ContainerName  *string  `json:"containerName,omitempty"`
	ComposeContent *string  `json:"composeContent,omitempty"`
	EnvContent     *string  `json:"envContent,omitempty"`
	Ports          []string `json:"ports,omitempty"`
	Volumes        []string `json:"volumes,omitempty"`
}

type Deployment struct {
	ID       string           `json:"id" gorm:"primaryKey;type:text"`
	Name     string           `json:"name" gorm:"not null"`
	Type     DeploymentType   `json:"type" gorm:"not null"`
	Status   DeploymentStatus `json:"status" gorm:"default:'pending'"`
	AgentID  string           `json:"agentId" gorm:"column:agent_id;not null;index"`
	TaskID   *string          `json:"taskId,omitempty" gorm:"column:task_id;index"`
	Error    *string          `json:"error,omitempty"`
	Metadata JSON             `json:"metadata,omitempty" gorm:"type:text"`

	// Relationships
	Agent Agent      `json:"agent" gorm:"foreignKey:AgentID;references:ID"`
	Task  *AgentTask `json:"task,omitempty" gorm:"foreignKey:TaskID;references:ID"`

	BaseModel
}

func (Deployment) TableName() string {
	return "deployments_table"
}
