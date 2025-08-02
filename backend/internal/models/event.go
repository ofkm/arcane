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
	EventTypeContainerUpdate  EventType = "container.update"

	EventTypeImagePull   EventType = "image.pull"
	EventTypeImageDelete EventType = "image.delete"
	EventTypeImageScan   EventType = "image.scan"

	EventTypeStackDeploy EventType = "project.deploy"
	EventTypeStackDelete EventType = "project.delete"
	EventTypeStackStart  EventType = "project.start"
	EventTypeStackStop   EventType = "project.stop"
	EventTypeStackCreate EventType = "project.create"
	EventTypeStackUpdate EventType = "project.update"

	EventTypeVolumeCreate EventType = "volume.create"
	EventTypeVolumeDelete EventType = "volume.delete"

	EventTypeNetworkCreate EventType = "network.create"
	EventTypeNetworkDelete EventType = "network.delete"

	EventTypeSystemPrune      EventType = "system.prune"
	EventTypeUserLogin        EventType = "user.login"
	EventTypeUserLogout       EventType = "user.logout"
	EventTypeSystemAutoUpdate EventType = "system.auto_update"

	// Event severities
	EventSeverityInfo    EventSeverity = "info"
	EventSeverityWarning EventSeverity = "warning"
	EventSeverityError   EventSeverity = "error"
	EventSeveritySuccess EventSeverity = "success"
)

type Event struct {
	ID            string        `json:"id" gorm:"primaryKey" sortable:"true"`
	Type          EventType     `json:"type" gorm:"not null" sortable:"true"`
	Severity      EventSeverity `json:"severity" gorm:"not null" sortable:"true"`
	Title         string        `json:"title" gorm:"not null" sortable:"true"`
	Description   string        `json:"description"`
	ResourceType  *string       `json:"resourceType,omitempty" gorm:"index" sortable:"true"`
	ResourceID    *string       `json:"resourceId,omitempty" gorm:"index" sortable:"true"`
	ResourceName  *string       `json:"resourceName,omitempty" sortable:"true"`
	UserID        *string       `json:"userId,omitempty" gorm:"index" sortable:"true"`
	Username      *string       `json:"username,omitempty" sortable:"true"`
	EnvironmentID *string       `json:"environmentId,omitempty" gorm:"index"`
	Metadata      JSON          `json:"metadata,omitempty" gorm:"type:text"`
	Timestamp     time.Time     `json:"timestamp" gorm:"not null;index" sortable:"true"`
	BaseModel
}

func (Event) TableName() string {
	return "events"
}
