package dto

import "github.com/ofkm/arcane-backend/internal/models"

type RegisterAgentDto struct {
	ID           string   `json:"id" binding:"required"`
	Hostname     string   `json:"hostname" binding:"required"`
	Platform     string   `json:"platform"`
	Version      string   `json:"version"`
	Capabilities []string `json:"capabilities"`
}

type HeartbeatDto struct {
	Status   string                 `json:"status"`
	Metrics  *models.AgentMetrics   `json:"metrics,omitempty"`
	Docker   *models.DockerInfo     `json:"docker,omitempty"`
	Metadata map[string]interface{} `json:"metadata,omitempty"`
}

type SubmitTaskResultDto struct {
	Status models.AgentTaskStatus `json:"status" binding:"required"`
	Result map[string]interface{} `json:"result,omitempty"`
	Error  *string                `json:"error,omitempty"`
}

type DeployAgentStackDto struct {
	StackName      string  `json:"stackName" binding:"required"`
	ComposeContent string  `json:"composeContent" binding:"required"`
	EnvContent     *string `json:"envContent,omitempty"`
}

type DeployAgentContainerDto struct {
	ContainerName string   `json:"containerName" binding:"required"`
	ImageName     string   `json:"imageName" binding:"required"`
	Ports         []string `json:"ports,omitempty"`
	Volumes       []string `json:"volumes,omitempty"`
	Environment   []string `json:"environment,omitempty"`
}

type DeployAgentImageDto struct {
	ImageName string `json:"imageName" binding:"required"`
}