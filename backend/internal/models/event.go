package models

import (
	"time"
)

type EventType string
type EventSeverity string

const (
	// Event types
	EventTypeContainerStart   EventType = "container.start"
	EventTypeContainerStop    EventType = "container.stop"
	EventTypeContainerRestart EventType = "container.restart"
	EventTypeContainerDelete  EventType = "container.delete"
	EventTypeContainerCreate  EventType = "container.create"
	EventTypeContainerScan    EventType = "container.scan"

	EventTypeImagePull   EventType = "image.pull"
	EventTypeImageDelete EventType = "image.delete"
	EventTypeImageScan   EventType = "image.scan"

	EventTypeStackDeploy EventType = "stack.deploy"
	EventTypeStackDelete EventType = "stack.delete"
	EventTypeStackStart  EventType = "stack.start"
	EventTypeStackStop   EventType = "stack.stop"

	EventTypeVolumeCreate EventType = "volume.create"
	EventTypeVolumeDelete EventType = "volume.delete"

	EventTypeNetworkCreate EventType = "network.create"
	EventTypeNetworkDelete EventType = "network.delete"

	EventTypeSystemPrune EventType = "system.prune"
	EventTypeUserLogin   EventType = "user.login"
	EventTypeUserLogout  EventType = "user.logout"

	// Event severities
	EventSeverityInfo    EventSeverity = "info"
	EventSeverityWarning EventSeverity = "warning"
	EventSeverityError   EventSeverity = "error"
	EventSeveritySuccess EventSeverity = "success"
)

type Event struct {
	ID            string        `json:"id" gorm:"primaryKey;type:text"`
	Type          EventType     `json:"type" gorm:"not null;index"`
	Severity      EventSeverity `json:"severity" gorm:"not null;default:'info'"`
	Title         string        `json:"title" gorm:"not null"`
	Description   string        `json:"description"`
	ResourceType  *string       `json:"resourceType,omitempty" gorm:"index"`
	ResourceID    *string       `json:"resourceId,omitempty" gorm:"index"`
	ResourceName  *string       `json:"resourceName,omitempty"`
	UserID        *string       `json:"userId,omitempty" gorm:"index"`
	Username      *string       `json:"username,omitempty"`
	EnvironmentID *string       `json:"environmentId,omitempty" gorm:"index"`
	Metadata      JSON          `json:"metadata,omitempty" gorm:"type:text"`
	Timestamp     time.Time     `json:"timestamp" gorm:"not null;index"`
	BaseModel
}

func (Event) TableName() string {
	return "events"
}
