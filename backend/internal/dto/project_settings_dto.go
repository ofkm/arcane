package dto

type ProjectSettingsDto struct {
	ProjectID      string  `json:"project_id"`
	AutoUpdate     *bool   `json:"auto_update"`      // NULL = follow global
	AutoUpdateCron *string `json:"auto_update_cron"` // NULL = immediate
}

type UpdateProjectSettingsDto struct {
	AutoUpdate     *bool   `json:"autoUpdate"`
	AutoUpdateCron *string `json:"autoUpdateCron"`
}
