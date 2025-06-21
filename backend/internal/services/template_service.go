package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type TemplateService struct {
	db *database.DB
}

func NewTemplateService(db *database.DB) *TemplateService {
	return &TemplateService{db: db}
}

func (s *TemplateService) GetAllTemplates(ctx context.Context) ([]models.ComposeTemplate, error) {
	var templates []models.ComposeTemplate

	err := s.db.WithContext(ctx).Preload("Registry").Find(&templates).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get local templates: %w", err)
	}

	remoteTemplates, err := s.loadRemoteTemplates(ctx)
	if err != nil {
		fmt.Printf("Warning: failed to load remote templates: %v\n", err)
	} else {
		templates = append(templates, remoteTemplates...)
	}

	return templates, nil
}

func (s *TemplateService) GetTemplate(ctx context.Context, id string) (*models.ComposeTemplate, error) {
	var template models.ComposeTemplate
	err := s.db.WithContext(ctx).Preload("Registry").Where("id = ?", id).First(&template).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("template not found")
		}
		return nil, fmt.Errorf("failed to get template: %w", err)
	}
	return &template, nil
}

func (s *TemplateService) CreateTemplate(ctx context.Context, template *models.ComposeTemplate) error {
	if template.ID == "" {
		template.ID = s.generateTemplateID(template.Name)
	}

	template.IsCustom = true
	template.IsRemote = false

	err := s.db.WithContext(ctx).Create(template).Error
	if err != nil {
		return fmt.Errorf("failed to create template: %w", err)
	}

	return nil
}

func (s *TemplateService) UpdateTemplate(ctx context.Context, id string, updates *models.ComposeTemplate) error {
	var existing models.ComposeTemplate
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("template not found")
		}
		return fmt.Errorf("failed to find template: %w", err)
	}

	existing.Name = updates.Name
	existing.Description = updates.Description
	existing.Content = updates.Content
	existing.EnvContent = updates.EnvContent

	err = s.db.WithContext(ctx).Save(&existing).Error
	if err != nil {
		return fmt.Errorf("failed to update template: %w", err)
	}

	return nil
}

func (s *TemplateService) DeleteTemplate(ctx context.Context, id string) error {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&models.ComposeTemplate{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete template: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("template not found")
	}
	return nil
}

func (s *TemplateService) GetEnvTemplate() string {
	envPath := filepath.Join("data", "templates", ".env.template")
	if content, err := os.ReadFile(envPath); err == nil {
		return string(content)
	}

	return s.getDefaultEnvTemplate()
}

func (s *TemplateService) SaveEnvTemplate(content string) error {
	templateDir := filepath.Join("data", "templates")
	if err := os.MkdirAll(templateDir, 0755); err != nil {
		return fmt.Errorf("failed to create template directory: %w", err)
	}

	envPath := filepath.Join(templateDir, ".env.template")
	if err := os.WriteFile(envPath, []byte(content), 0600); err != nil {
		return fmt.Errorf("failed to save env template: %w", err)
	}

	return nil
}

func (s *TemplateService) GetRegistries(ctx context.Context) ([]models.TemplateRegistry, error) {
	var registries []models.TemplateRegistry
	err := s.db.WithContext(ctx).Find(&registries).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get registries: %w", err)
	}
	return registries, nil
}

func (s *TemplateService) CreateRegistry(ctx context.Context, registry *models.TemplateRegistry) error {
	err := s.db.WithContext(ctx).Create(registry).Error
	if err != nil {
		return fmt.Errorf("failed to create registry: %w", err)
	}
	return nil
}

func (s *TemplateService) UpdateRegistry(ctx context.Context, id uint, updates *models.TemplateRegistry) error {
	var existing models.TemplateRegistry
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("registry not found")
		}
		return fmt.Errorf("failed to find registry: %w", err)
	}

	existing.Name = updates.Name
	existing.URL = updates.URL
	existing.Enabled = updates.Enabled
	existing.Description = updates.Description

	err = s.db.WithContext(ctx).Save(&existing).Error
	if err != nil {
		return fmt.Errorf("failed to update registry: %w", err)
	}

	return nil
}

func (s *TemplateService) DeleteRegistry(ctx context.Context, id uint) error {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&models.TemplateRegistry{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete registry: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("registry not found")
	}
	return nil
}

func (s *TemplateService) loadRemoteTemplates(ctx context.Context) ([]models.ComposeTemplate, error) {
	var templates []models.ComposeTemplate

	registries, err := s.GetRegistries(ctx)
	if err != nil {
		return nil, err
	}

	for _, registry := range registries {
		if !registry.Enabled {
			continue
		}

		remoteTemplates, err := s.fetchRegistryTemplates(ctx, registry.URL)
		if err != nil {
			fmt.Printf("Warning: failed to fetch templates from registry %s: %v\n", registry.Name, err)
			continue
		}

		for _, rt := range remoteTemplates {
			template := s.convertRemoteToLocal(rt, &registry)
			templates = append(templates, template)
		}
	}

	return templates, nil
}

func (s *TemplateService) fetchRegistryTemplates(ctx context.Context, url string) ([]models.RemoteTemplate, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch registry: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("registry returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read registry response: %w", err)
	}

	var registry models.RemoteRegistry
	if err := json.Unmarshal(body, &registry); err != nil {
		return nil, fmt.Errorf("failed to parse registry JSON: %w", err)
	}

	return registry.Templates, nil
}

func (s *TemplateService) convertRemoteToLocal(remote models.RemoteTemplate, registry *models.TemplateRegistry) models.ComposeTemplate {
	tagsJSON := ""
	if len(remote.Tags) > 0 {
		if data, err := json.Marshal(remote.Tags); err == nil {
			tagsJSON = string(data)
		}
	}

	return models.ComposeTemplate{
		ID:          fmt.Sprintf("%s/%s", registry.Name, remote.ID),
		Name:        remote.Name,
		Description: remote.Description,
		Content:     "",
		IsCustom:    false,
		IsRemote:    true,
		RegistryID:  &registry.ID,
		Registry:    registry,
		Metadata: &models.ComposeTemplateMetadata{
			Version:          &remote.Version,
			Author:           &remote.Author,
			Tags:             &tagsJSON,
			RemoteURL:        &remote.ComposeURL,
			EnvURL:           &remote.EnvURL,
			DocumentationURL: &remote.DocsURL,
			IconURL:          &remote.IconURL,
			UpdatedAt:        &remote.UpdatedAt,
		},
	}
}

func (s *TemplateService) generateTemplateID(name string) string {
	id := strings.ToLower(name)
	id = regexp.MustCompile(`[^a-z0-9]+`).ReplaceAllString(id, "-")
	id = strings.Trim(id, "-")

	if id == "" {
		id = "template"
	}

	return id
}

func (s *TemplateService) getDefaultEnvTemplate() string {
	return `# Environment Variables
# These variables will be available to your stack services
# Format: VARIABLE_NAME=value

# Web Server Configuration
NGINX_HOST=localhost
NGINX_PORT=80

# Database Configuration
POSTGRES_DB=myapp
POSTGRES_USER=myuser
POSTGRES_PASSWORD=mypassword
POSTGRES_PORT=5432

# Example Additional Variables
# API_KEY=your_api_key_here
# SECRET_KEY=your_secret_key_here
# DEBUG=false
`
}

func (s *TemplateService) FetchTemplateContent(ctx context.Context, template *models.ComposeTemplate) (string, string, error) {
	if !template.IsRemote || template.Metadata == nil || template.Metadata.RemoteURL == nil {
		return template.Content, "", fmt.Errorf("not a remote template")
	}

	composeContent, err := s.fetchURL(ctx, *template.Metadata.RemoteURL)
	if err != nil {
		return "", "", fmt.Errorf("failed to fetch compose content: %w", err)
	}

	var envContent string
	if template.Metadata.EnvURL != nil && *template.Metadata.EnvURL != "" {
		envContent, _ = s.fetchURL(ctx, *template.Metadata.EnvURL)
	}

	return composeContent, envContent, nil
}

func (s *TemplateService) fetchURL(ctx context.Context, url string) (string, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", err
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", err
	}

	return string(body), nil
}

func (s *TemplateService) DownloadTemplate(ctx context.Context, remoteTemplate *models.ComposeTemplate) (*models.ComposeTemplate, error) {
	if !remoteTemplate.IsRemote {
		return nil, fmt.Errorf("template is not remote")
	}

	composeContent, envContent, err := s.FetchTemplateContent(ctx, remoteTemplate)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch template content: %w", err)
	}

	localTemplate := &models.ComposeTemplate{
		ID:          s.generateTemplateID(remoteTemplate.Name + "-local"),
		Name:        remoteTemplate.Name,
		Description: fmt.Sprintf("%s (Downloaded from %s)", remoteTemplate.Description, remoteTemplate.Registry.Name),
		Content:     composeContent,
		IsCustom:    true,
		IsRemote:    false,
		RegistryID:  nil,
		Registry:    nil,
	}

	if envContent != "" {
		localTemplate.EnvContent = &envContent
	}

	if remoteTemplate.Metadata != nil {
		localTemplate.Metadata = &models.ComposeTemplateMetadata{
			Version:          remoteTemplate.Metadata.Version,
			Author:           remoteTemplate.Metadata.Author,
			Tags:             remoteTemplate.Metadata.Tags,
			RemoteURL:        remoteTemplate.Metadata.RemoteURL,
			EnvURL:           remoteTemplate.Metadata.EnvURL,
			DocumentationURL: remoteTemplate.Metadata.DocumentationURL,
			IconURL:          remoteTemplate.Metadata.IconURL,
			UpdatedAt:        remoteTemplate.Metadata.UpdatedAt,
		}
	}

	err = s.db.WithContext(ctx).Create(localTemplate).Error
	if err != nil {
		return nil, fmt.Errorf("failed to save local template: %w", err)
	}

	return localTemplate, nil
}
