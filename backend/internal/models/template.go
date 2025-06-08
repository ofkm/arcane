package models

import (
	"time"
)

type TemplateRegistry struct {
	ID          uint      `json:"id" gorm:"primaryKey"`
	Name        string    `json:"name" gorm:"not null"`
	URL         string    `json:"url" gorm:"not null;unique"`
	Enabled     bool      `json:"enabled" gorm:"default:true"`
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
}

type ComposeTemplate struct {
	ID          string                   `json:"id" gorm:"primaryKey"`
	Name        string                   `json:"name" gorm:"not null"`
	Description string                   `json:"description"`
	Content     string                   `json:"content" gorm:"type:text"`
	EnvContent  *string                  `json:"envContent,omitempty" gorm:"type:text"`
	IsCustom    bool                     `json:"isCustom" gorm:"default:true"`
	IsRemote    bool                     `json:"isRemote" gorm:"default:false"`
	RegistryID  *uint                    `json:"registryId,omitempty"`
	Registry    *TemplateRegistry        `json:"registry,omitempty" gorm:"foreignKey:RegistryID"`
	Metadata    *ComposeTemplateMetadata `json:"metadata,omitempty" gorm:"embedded;embeddedPrefix:meta_"`
	CreatedAt   time.Time                `json:"createdAt"`
	UpdatedAt   time.Time                `json:"updatedAt"`
}

type ComposeTemplateMetadata struct {
	Version          *string `json:"version,omitempty" gorm:"column:meta_version"`
	Author           *string `json:"author,omitempty" gorm:"column:meta_author"`
	Tags             *string `json:"tags,omitempty" gorm:"column:meta_tags"`
	RemoteURL        *string `json:"remoteUrl,omitempty" gorm:"column:meta_remote_url"`
	EnvURL           *string `json:"envUrl,omitempty" gorm:"column:meta_env_url"`
	DocumentationURL *string `json:"documentationUrl,omitempty" gorm:"column:meta_documentation_url"`
	IconURL          *string `json:"iconUrl,omitempty" gorm:"column:meta_icon_url"`
	UpdatedAt        *string `json:"updatedAt,omitempty" gorm:"column:meta_updated_at"`
}

type RemoteTemplate struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Description string   `json:"description"`
	Version     string   `json:"version"`
	ComposeURL  string   `json:"compose_url"`
	EnvURL      string   `json:"env_url,omitempty"`
	UpdatedAt   string   `json:"updated_at"`
	Author      string   `json:"author,omitempty"`
	Tags        []string `json:"tags,omitempty"`
	IconURL     string   `json:"icon_url,omitempty"`
	DocsURL     string   `json:"documentation_url,omitempty"`
}

type RemoteRegistry struct {
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Version     string           `json:"version"`
	Templates   []RemoteTemplate `json:"templates"`
}

func (TemplateRegistry) TableName() string {
	return "template_registries"
}

func (ComposeTemplate) TableName() string {
	return "compose_templates"
}
