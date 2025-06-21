package models

import (
	"fmt"
	"time"
)

type ImageMaturityRecord struct {
	ID                string     `json:"id" gorm:"primaryKey;type:text"`
	Repository        string     `json:"repository" gorm:"not null;index"`
	Tag               string     `json:"tag" gorm:"not null;index"`
	CurrentVersion    string     `json:"currentVersion" gorm:"column:current_version"`
	LatestVersion     *string    `json:"latestVersion,omitempty" gorm:"column:latest_version"`
	Status            string     `json:"status" gorm:"not null;index"`
	UpdatesAvailable  bool       `json:"updatesAvailable" gorm:"column:updates_available;default:false"`
	CurrentImageDate  *time.Time `json:"currentImageDate,omitempty" gorm:"column:current_image_date"`
	LatestImageDate   *time.Time `json:"latestImageDate,omitempty" gorm:"column:latest_image_date"`
	DaysSinceCreation *int       `json:"daysSinceCreation,omitempty" gorm:"column:days_since_creation"`
	RegistryDomain    *string    `json:"registryDomain,omitempty" gorm:"column:registry_domain"`
	IsPrivateRegistry bool       `json:"isPrivateRegistry" gorm:"column:is_private_registry;default:false"`
	LastChecked       time.Time  `json:"lastChecked" gorm:"column:last_checked;not null"`
	CheckCount        int        `json:"checkCount" gorm:"column:check_count;default:0"`
	LastError         *string    `json:"lastError,omitempty" gorm:"column:last_error"`
	ResponseTimeMs    *int       `json:"responseTimeMs,omitempty" gorm:"column:response_time_ms"`

	Image *Image `json:"image,omitempty" gorm:"foreignKey:ID;references:ID"`

	BaseModel
}

func (i *ImageMaturityRecord) TableName() string {
	return "image_maturity_table"
}

type ImageMaturity struct {
	Version          string `json:"version"`
	Date             string `json:"date"`
	Status           string `json:"status"`
	UpdatesAvailable bool   `json:"updatesAvailable"`
	LatestVersion    string `json:"latestVersion,omitempty"`
}

const (
	ImageStatusMatured    = "Matured"
	ImageStatusNotMatured = "Not Matured"
	ImageStatusUnknown    = "Unknown"
	ImageStatusChecking   = "Checking"
	ImageStatusError      = "Error"
)

func (i *ImageMaturityRecord) IsMatured() bool {
	return i.Status == ImageStatusMatured
}

func (i *ImageMaturityRecord) NeedsUpdate() bool {
	return i.UpdatesAvailable
}

func (i *ImageMaturityRecord) GetFullImageName() string {
	return fmt.Sprintf("%s:%s", i.Repository, i.Tag)
}

func (i *ImageMaturityRecord) GetDaysSinceLastCheck() int {
	return int(time.Since(i.LastChecked).Hours() / 24)
}

func (i *ImageMaturityRecord) NeedsCheck(maxAgeHours int) bool {
	return time.Since(i.LastChecked).Hours() > float64(maxAgeHours)
}
