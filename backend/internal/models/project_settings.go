package models

type ProjectSettings struct {
	ProjectID      string  `json:"project_id" gorm:"uniqueIndex"`
	AutoUpdate     *bool   `json:"auto_update"`      // NULL = follow global
	AutoUpdateCron *string `json:"auto_update_cron"` // NULL = immediate

	BaseModel
}

func (ProjectSettings) TableName() string {
	return "project_settings"
}
