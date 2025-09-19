package dto

type RemoteTemplate struct {
	ID               string   `json:"id"`
	Name             string   `json:"name"`
	Description      string   `json:"description"`
	Version          string   `json:"version"`
	Author           string   `json:"author"`
	ComposeURL       string   `json:"compose_url"`
	EnvURL           string   `json:"env_url"`
	DocumentationURL string   `json:"documentation_url"`
	Tags             []string `json:"tags"`
}

type RemoteRegistry struct {
	Schema      string           `json:"$schema,omitempty"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Version     string           `json:"version"`
	Author      string           `json:"author"`
	URL         string           `json:"url"`
	Templates   []RemoteTemplate `json:"templates"`
}

type TemplateRegistryDto struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	URL         string `json:"url"`
	Enabled     bool   `json:"enabled"`
	Description string `json:"description"`
}

type ComposeTemplateMetadataDto struct {
	Version          *string `json:"version,omitempty"`
	Author           *string `json:"author,omitempty"`
	Tags             *string `json:"tags,omitempty"`
	RemoteURL        *string `json:"remoteUrl,omitempty"`
	EnvURL           *string `json:"envUrl,omitempty"`
	DocumentationURL *string `json:"documentationUrl,omitempty"`
	UpdatedAt        *string `json:"updatedAt,omitempty"`
}

type ComposeTemplateDto struct {
	ID          string                      `json:"id"`
	Name        string                      `json:"name"`
	Description string                      `json:"description"`
	Content     string                      `json:"content"`
	EnvContent  *string                     `json:"envContent,omitempty"`
	IsCustom    bool                        `json:"isCustom"`
	IsRemote    bool                        `json:"isRemote"`
	RegistryID  *string                     `json:"registryId,omitempty"`
	Registry    *TemplateRegistryDto        `json:"registry,omitempty"`
	Metadata    *ComposeTemplateMetadataDto `json:"metadata,omitempty"`
}
