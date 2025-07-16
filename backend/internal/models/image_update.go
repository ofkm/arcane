package models

import (
	"time"
)

type ImageUpdateRecord struct {
	ID             string    `json:"id" gorm:"primaryKey;type:text"`
	Repository     string    `json:"repository" gorm:"not null;index"`
	Tag            string    `json:"tag" gorm:"not null;index"`
	HasUpdate      bool      `json:"hasUpdate" gorm:"column:has_update;default:false"`
	UpdateType     string    `json:"updateType" gorm:"column:update_type"`
	CurrentVersion string    `json:"currentVersion" gorm:"column:current_version"`
	LatestVersion  *string   `json:"latestVersion,omitempty" gorm:"column:latest_version"`
	CurrentDigest  *string   `json:"currentDigest,omitempty" gorm:"column:current_digest"`
	LatestDigest   *string   `json:"latestDigest,omitempty" gorm:"column:latest_digest"`
	CheckTime      time.Time `json:"checkTime" gorm:"column:check_time;not null"`
	ResponseTimeMs int       `json:"responseTimeMs" gorm:"column:response_time_ms"`
	LastError      *string   `json:"lastError,omitempty" gorm:"column:last_error"`

	Image *Image `json:"image,omitempty" gorm:"foreignKey:ID;references:ID"`

	BaseModel
}

func (i *ImageUpdateRecord) TableName() string {
	return "image_update_table"
}

type ImageUpdate struct {
	HasUpdate      bool   `json:"hasUpdate"`
	UpdateType     string `json:"updateType"`
	CurrentVersion string `json:"currentVersion"`
	LatestVersion  string `json:"latestVersion,omitempty"`
	CheckTime      string `json:"checkTime"`
}

const (
	UpdateTypeDigest = "digest"
	UpdateTypeTag    = "tag"
)

func (i *ImageUpdateRecord) NeedsUpdate() bool {
	return i.HasUpdate
}

func (i *ImageUpdateRecord) IsDigestUpdate() bool {
	return i.UpdateType == UpdateTypeDigest
}

func (i *ImageUpdateRecord) IsTagUpdate() bool {
	return i.UpdateType == UpdateTypeTag
}
