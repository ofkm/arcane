package models

import (
	"time"
)

// JobStatus represents the current status of a job
type JobStatus string

const (
	JobStatusPending    JobStatus = "pending"
	JobStatusRunning    JobStatus = "running"
	JobStatusCompleted  JobStatus = "completed"
	JobStatusFailed     JobStatus = "failed"
	JobStatusCancelled  JobStatus = "cancelled"
	JobStatusCancelling JobStatus = "cancelling"
)

// JobType represents the type of operation being performed
type JobType string

const (
	JobTypeContainerStart    JobType = "container_start"
	JobTypeContainerStop     JobType = "container_stop"
	JobTypeContainerRestart  JobType = "container_restart"
	JobTypeContainerDelete   JobType = "container_delete"
	JobTypeContainerCreate   JobType = "container_create"
	JobTypeImagePull         JobType = "image_pull"
	JobTypeImageRemove       JobType = "image_remove"
	JobTypeImagePrune        JobType = "image_prune"
	JobTypeProjectDeploy     JobType = "project_deploy"
	JobTypeProjectRedeploy   JobType = "project_redeploy"
	JobTypeProjectDown       JobType = "project_down"
	JobTypeProjectRestart    JobType = "project_restart"
	JobTypeProjectDestroy    JobType = "project_destroy"
	JobTypeProjectPullImages JobType = "project_pull_images"
	JobTypeSystemPrune       JobType = "system_prune"
	JobTypeSystemStartAll    JobType = "system_start_all"
	JobTypeSystemStopAll     JobType = "system_stop_all"
	JobTypeUpdaterApply      JobType = "updater_apply"
	JobTypeVolumePrune       JobType = "volume_prune"
	JobTypeVolumeRemove      JobType = "volume_remove"
	JobTypeNetworkPrune      JobType = "network_prune"
	JobTypeNetworkRemove     JobType = "network_remove"
)

// Job represents an asynchronous long-running operation
type Job struct {
	BaseModel
	Type        JobType    `json:"type" gorm:"type:text;not null;index"`
	Status      JobStatus  `json:"status" gorm:"type:text;not null;index;default:'pending'"`
	Progress    int        `json:"progress" gorm:"default:0"` // 0-100
	Message     string     `json:"message,omitempty" gorm:"type:text"`
	Error       *string    `json:"error,omitempty" gorm:"type:text"`
	StartTime   *time.Time `json:"startTime,omitempty"`
	EndTime     *time.Time `json:"endTime,omitempty"`
	CancelToken string     `json:"-" gorm:"type:text;index"` // For cancellation
	UserID      string     `json:"userId" gorm:"type:text;not null;index"`
	Username    string     `json:"username" gorm:"type:text;not null"`
	Metadata    JSON       `json:"metadata,omitempty" gorm:"type:jsonb"` // Operation-specific data
	Result      JSON       `json:"result,omitempty" gorm:"type:jsonb"`   // Operation result data
}

func (Job) TableName() string {
	return "jobs"
}
