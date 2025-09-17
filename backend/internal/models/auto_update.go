package models

import (
	"time"
)

type AutoUpdateStatus string

const (
	AutoUpdateStatusPending   AutoUpdateStatus = "pending"
	AutoUpdateStatusChecking  AutoUpdateStatus = "checking"
	AutoUpdateStatusUpdating  AutoUpdateStatus = "updating"
	AutoUpdateStatusCompleted AutoUpdateStatus = "completed"
	AutoUpdateStatusFailed    AutoUpdateStatus = "failed"
	AutoUpdateStatusSkipped   AutoUpdateStatus = "skipped"
)

type AutoUpdateRecord struct {
	ResourceID       string           `json:"resourceId" gorm:"index;not null"`
	ResourceType     string           `json:"resourceType" gorm:"not null"`
	ResourceName     string           `json:"resourceName" gorm:"not null"`
	Status           AutoUpdateStatus `json:"status" gorm:"not null"`
	StartTime        time.Time        `json:"startTime" gorm:"not null"`
	EndTime          *time.Time       `json:"endTime,omitempty"`
	UpdateAvailable  bool             `json:"updateAvailable" gorm:"default:false"`
	UpdateApplied    bool             `json:"updateApplied" gorm:"default:false"`
	OldImageVersions JSON             `json:"oldImageVersions,omitempty" gorm:"type:text"`
	NewImageVersions JSON             `json:"newImageVersions,omitempty" gorm:"type:text"`
	Error            *string          `json:"error,omitempty"`
	Details          JSON             `json:"details,omitempty" gorm:"type:text"`
	BaseModel
}

func (AutoUpdateRecord) TableName() string {
	return "auto_update_records"
}
