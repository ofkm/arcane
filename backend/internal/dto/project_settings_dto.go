package dto

type ProjectSettingsDto struct {
	ProjectID      string  `json:"projectId"`
	AutoUpdate     *bool   `json:"autoUpdate"`     // NULL = follow global
	AutoUpdateCron *string `json:"autoUpdateCron"` // NULL = immediate
}

type UpdateProjectSettingsDto struct {
	AutoUpdate     *bool   `json:"autoUpdate"`
	AutoUpdateCron *string `json:"autoUpdateCron"`
}
