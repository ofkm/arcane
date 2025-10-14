package models

type TemplateRegistry struct {
	BaseModel
	Name        string `json:"name" gorm:"not null"`
	URL         string `json:"url" gorm:"not null;unique"`
	Enabled     bool   `json:"enabled" gorm:"default:true"`
	Description string `json:"description"`
}

type ComposeTemplate struct {
	BaseModel
	Name        string                   `json:"name" gorm:"not null"`
	Description string                   `json:"description"`
	Content     string                   `json:"content" gorm:"type:text"`
	EnvContent  *string                  `json:"envContent,omitempty" gorm:"type:text"`
	IsCustom    bool                     `json:"isCustom" gorm:"default:true"`
	IsRemote    bool                     `json:"isRemote" gorm:"default:false"`
	RegistryID  *string                  `json:"registryId,omitempty"`
	Registry    *TemplateRegistry        `json:"registry,omitempty" gorm:"foreignKey:RegistryID;references:ID"`
	Metadata    *ComposeTemplateMetadata `json:"metadata,omitempty" gorm:"embedded;embeddedPrefix:meta_"`
}

type ComposeTemplateMetadata struct {
	Version          *string  `json:"version,omitempty"`
	Author           *string  `json:"author,omitempty"`
	Tags             []string `json:"tags,omitempty" gorm:"serializer:json"`
	RemoteURL        *string  `json:"remoteUrl,omitempty"`
	EnvURL           *string  `json:"envUrl,omitempty"`
	DocumentationURL *string  `json:"documentationUrl,omitempty"`
}

func (TemplateRegistry) TableName() string { return "template_registries" }
func (ComposeTemplate) TableName() string  { return "compose_templates" }
