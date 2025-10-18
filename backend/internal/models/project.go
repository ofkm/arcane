package models

type ProjectStatus string

const (
	ProjectStatusRunning          ProjectStatus = "running"
	ProjectStatusStopped          ProjectStatus = "stopped"
	ProjectStatusPartiallyRunning ProjectStatus = "partially running"
	ProjectStatusUnknown          ProjectStatus = "unknown"
	ProjectStatusDeploying        ProjectStatus = "deploying"
	ProjectStatusStopping         ProjectStatus = "stopping"
	ProjectStatusRestarting       ProjectStatus = "restarting"
)

type Project struct {
	Name         string        `json:"name" gorm:"not null" sortable:"true"`
	DirName      *string       `json:"dir_name" gorm:"unique"`
	Path         string        `json:"path" gorm:"not null"`
	Status       ProjectStatus `json:"status" sortable:"true"`
	StatusReason *string       `json:"status_reason"`
	ServiceCount int           `json:"service_count" sortable:"true"`
	RunningCount int           `json:"running_count" sortable:"true"`

	AutoUpdate             *bool   `json:"auto_update,omitempty" gorm:"column:auto_update"`
	UpdateScheduleEnabled  *bool   `json:"update_schedule_enabled,omitempty" gorm:"column:update_schedule_enabled"`
	UpdateScheduleWindows  *JSON   `json:"update_schedule_windows,omitempty" gorm:"type:text;column:update_schedule_windows"`
	UpdateScheduleTimezone *string `json:"update_schedule_timezone,omitempty" gorm:"column:update_schedule_timezone"`

	BaseModel
}

func (Project) TableName() string {
	return "projects"
}
