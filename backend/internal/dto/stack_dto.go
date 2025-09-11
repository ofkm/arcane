package dto

type CreateStackDto struct {
	Name           string  `json:"name" binding:"required"`
	ComposeContent string  `json:"composeContent" binding:"required"`
	EnvContent     *string `json:"envContent,omitempty"`
	AgentID        *string `json:"agentId,omitempty"`
}

type CreateStackResponseDto struct {
	ID           string `json:"id"`
	Name         string `json:"name"`
	DirName      string `json:"dirName,omitempty"`
	Path         string `json:"path"`
	Status       string `json:"status"`
	ServiceCount int    `json:"serviceCount"`
	RunningCount int    `json:"runningCount"`
	AutoUpdate   bool   `json:"autoUpdate"`
	IsExternal   bool   `json:"isExternal"`
	IsLegacy     bool   `json:"isLegacy"`
	IsRemote     bool   `json:"isRemote"`
	CreatedAt    string `json:"createdAt"`
	UpdatedAt    string `json:"updatedAt"`
}

type UpdateStackDto struct {
	Name           *string `json:"name,omitempty"`
	ComposeContent *string `json:"composeContent,omitempty"`
	EnvContent     *string `json:"envContent,omitempty"`
	AutoUpdate     *bool   `json:"autoUpdate,omitempty"`
}

type RedeployStackDto struct {
	Profiles     []string          `json:"profiles,omitempty"`
	EnvOverrides map[string]string `json:"envOverrides,omitempty"`
}

type DestroyStackDto struct {
	RemoveFiles   bool `json:"removeFiles,omitempty"`
	RemoveVolumes bool `json:"removeVolumes,omitempty"`
}

type StackDetailsDto struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	DirName        string `json:"dirName,omitempty"`
	Path           string `json:"path"`
	ComposeContent string `json:"composeContent,omitempty"`
	EnvContent     string `json:"envContent,omitempty"`
	Status         string `json:"status"`
	ServiceCount   int    `json:"serviceCount"`
	RunningCount   int    `json:"runningCount"`
	AutoUpdate     bool   `json:"autoUpdate"`
	IsExternal     bool   `json:"isExternal"`
	IsLegacy       bool   `json:"isLegacy"`
	IsRemote       bool   `json:"isRemote"`
	CreatedAt      string `json:"createdAt"`
	UpdatedAt      string `json:"updatedAt"`
	Services       []any  `json:"services,omitempty"`
}

type ProjectStatusCounts struct {
	RunningProjects int `json:"runningProjects"`
	StoppedProjects int `json:"stoppedProjects"`
	TotalProjects   int `json:"totalProjects"`
}
