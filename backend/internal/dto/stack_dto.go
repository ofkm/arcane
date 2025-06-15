package dto

type CreateStackDto struct {
	Name           string  `json:"name" binding:"required"`
	ComposeContent string  `json:"composeContent" binding:"required"`
	EnvContent     *string `json:"envContent,omitempty"`
	AgentID        *string `json:"agentId,omitempty"`
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
