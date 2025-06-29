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
	"sync" // Import sync package
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type TemplateService struct {
	db *database.DB
	// Add fields for caching remote templates
	remoteTemplatesCache []models.ComposeTemplate
	lastRemoteFetch      time.Time
	remoteFetchMutex     sync.Mutex
}

const remoteCacheDuration = 5 * time.Minute // Cache duration

func NewTemplateService(db *database.DB) *TemplateService {
	return &TemplateService{db: db}
}

// Helper to load remote templates into cache
func (s *TemplateService) ensureRemoteTemplatesLoaded(ctx context.Context) error {
	s.remoteFetchMutex.Lock()
	defer s.remoteFetchMutex.Unlock()

	// Check if cache is fresh
	if time.Since(s.lastRemoteFetch) < remoteCacheDuration && s.remoteTemplatesCache != nil {
		return nil // Cache is fresh
	}

	// Fetch and update cache
	fetchedTemplates, err := s.loadRemoteTemplates(ctx) // This function already exists
	if err != nil {
		// Log the error but don't fail the request if local templates are available
		fmt.Printf("Warning: failed to refresh remote templates cache: %v\n", err)
		// Keep the old cache if fetching failed, unless it's the first fetch
		if s.remoteTemplatesCache == nil {
			return fmt.Errorf("failed to load remote templates: %w", err)
		}
		return nil // Use stale cache if fetch failed
	}

	s.remoteTemplatesCache = fetchedTemplates
	s.lastRemoteFetch = time.Now()
	return nil
}

func (s *TemplateService) GetAllTemplates(ctx context.Context) ([]models.ComposeTemplate, error) {
	var templates []models.ComposeTemplate

	// Get local templates
	err := s.db.WithContext(ctx).Preload("Registry").Find(&templates).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get local templates: %w", err)
	}

	// Ensure remote templates are loaded into cache
	err = s.ensureRemoteTemplatesLoaded(ctx)
	if err != nil {
		// Log the error but proceed with local templates if remote loading failed
		fmt.Printf("Warning: failed to load remote templates for GetAllTemplates: %v\n", err)
	} else {
		// Append remote templates from cache
		templates = append(templates, s.remoteTemplatesCache...)
	}

	return templates, nil
}

func (s *TemplateService) GetTemplate(ctx context.Context, id string) (*models.ComposeTemplate, error) {
	var template models.ComposeTemplate

	// 1. Try to find in local database
	err := s.db.WithContext(ctx).Preload("Registry").Where("id = ?", id).First(&template).Error
	if err == nil {
		return &template, nil // Found a local template
	}

	// If not found in DB, check if it's a record not found error
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to query local template: %w", err) // Other DB error
	}

	// 2. If not found in local DB, try to find in remote templates cache
	err = s.ensureRemoteTemplatesLoaded(ctx) // Ensure cache is loaded/fresh
	if err != nil {
		// If loading remote templates failed and there's no local template, return not found
		return nil, fmt.Errorf("template not found (failed to load remote templates): %w", err)
	}

	// Search in the in-memory cache
	for _, remoteTemplate := range s.remoteTemplatesCache {
		if remoteTemplate.ID == id {
			// Found the remote template in cache
			// Return a copy to avoid modifying the cached object directly
			foundTemplate := remoteTemplate
			return &foundTemplate, nil
		}
	}

	// 3. If not found in local DB or remote cache
	return nil, fmt.Errorf("template not found")
}

func (s *TemplateService) CreateTemplate(ctx context.Context, template *models.ComposeTemplate) error {
	// Ensure ID is set if not provided (for custom templates)
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

	// Only allow updating local templates
	if existing.IsRemote {
		return fmt.Errorf("cannot update remote template")
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
	var existing models.ComposeTemplate
	err := s.db.WithContext(ctx).Where("id = ?", id).First(&existing).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("template not found")
		}
		return fmt.Errorf("failed to find template: %w", err)
	}

	// Only allow deleting local templates
	if existing.IsRemote {
		return fmt.Errorf("cannot delete remote template directly")
	}

	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&models.ComposeTemplate{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete template: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		// This case should ideally not be reached if First() succeeded, but as a safeguard
		return fmt.Errorf("template not found after finding it")
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

func (s *TemplateService) UpdateRegistry(ctx context.Context, id string, updates *models.TemplateRegistry) error {
	result := s.db.WithContext(ctx).Model(&models.TemplateRegistry{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("registry not found")
	}
	return nil
}

func (s *TemplateService) DeleteRegistry(ctx context.Context, id string) error {
	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&models.TemplateRegistry{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("registry not found")
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
		// Use the combined ID format here
		ID:          fmt.Sprintf("%s-%s", registry.ID, remote.ID),
		Name:        remote.Name,
		Description: remote.Description,
		Content:     "",  // Content is not stored for remote templates initially
		EnvContent:  nil, // EnvContent is not stored for remote templates initially
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

	// Ensure uniqueness for local templates if needed, e.g., append a short hash or timestamp
	// For now, relying on DB primary key constraint for uniqueness on save.

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
		return template.Content, "", fmt.Errorf("not a remote template or missing remote URL")
	}

	composeContent, err := s.fetchURL(ctx, *template.Metadata.RemoteURL)
	if err != nil {
		return "", "", fmt.Errorf("failed to fetch compose content from %s: %w", *template.Metadata.RemoteURL, err)
	}

	var envContent string
	if template.Metadata.EnvURL != nil && *template.Metadata.EnvURL != "" {
		envContent, err = s.fetchURL(ctx, *template.Metadata.EnvURL)
		if err != nil {
			// Log error but don't fail if env file fetch fails
			fmt.Printf("Warning: failed to fetch env content from %s: %v\n", *template.Metadata.EnvURL, err)
			envContent = "" // Ensure envContent is empty string on failure
		}
	}

	return composeContent, envContent, nil
}

func (s *TemplateService) fetchURL(ctx context.Context, url string) (string, error) {
	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", fmt.Errorf("failed to create request for %s: %w", url, err)
	}
	resp, err := client.Do(req)
	if err != nil {
		return "", fmt.Errorf("failed to fetch URL %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("HTTP status %d for URL %s", resp.StatusCode, url)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("failed to read response body from %s: %w", url, err)
	}

	return string(body), nil
}

func (s *TemplateService) DownloadTemplate(ctx context.Context, remoteTemplate *models.ComposeTemplate) (*models.ComposeTemplate, error) {
	if !remoteTemplate.IsRemote {
		return nil, fmt.Errorf("template is not remote")
	}

	// Check if a local version with the same remote ID already exists
	// This prevents duplicate downloads of the same remote template
	existingLocalTemplate, err := s.GetTemplate(ctx, s.generateTemplateID(remoteTemplate.Name)) // Assuming local ID is based on name
	if err == nil && !existingLocalTemplate.IsRemote {
		return existingLocalTemplate, fmt.Errorf("template '%s' is already downloaded", remoteTemplate.Name)
	}

	composeContent, envContent, err := s.FetchTemplateContent(ctx, remoteTemplate)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch template content for download: %w", err)
	}

	localTemplate := &models.ComposeTemplate{
		// Generate a new ID for the local copy, distinct from the remote ID
		ID:          s.generateTemplateID(remoteTemplate.Name), // Use a local-specific ID generation
		Name:        remoteTemplate.Name,
		Description: fmt.Sprintf("%s (Downloaded from %s)", remoteTemplate.Description, remoteTemplate.Registry.Name),
		Content:     composeContent,
		IsCustom:    true, // Downloaded templates are custom local copies
		IsRemote:    false,
		RegistryID:  nil, // No longer linked to a remote registry
		Registry:    nil,
	}

	if envContent != "" {
		localTemplate.EnvContent = &envContent
	}

	// Copy relevant metadata
	if remoteTemplate.Metadata != nil {
		localTemplate.Metadata = &models.ComposeTemplateMetadata{
			Version:          remoteTemplate.Metadata.Version,
			Author:           remoteTemplate.Metadata.Author,
			Tags:             remoteTemplate.Metadata.Tags,
			DocumentationURL: remoteTemplate.Metadata.DocumentationURL,
			IconURL:          remoteTemplate.Metadata.IconURL,
			// Do not copy RemoteURL, EnvURL, UpdatedAt as it's now local
		}
	}

	err = s.db.WithContext(ctx).Create(localTemplate).Error
	if err != nil {
		return nil, fmt.Errorf("failed to save local template: %w", err)
	}

	// After successful download and save, remove the remote template from the cache
	// This is optional but can help keep the list clean if you only want to see local after download
	// s.removeRemoteTemplateFromCache(remoteTemplate.ID) // Need to implement this helper if desired

	return localTemplate, nil
}

// Helper to remove a template from the remote cache (optional)
// func (s *TemplateService) removeRemoteTemplateFromCache(id string) {
// 	s.remoteFetchMutex.Lock()
// 	defer s.remoteFetchMutex.Unlock()
// 	var updatedCache []models.ComposeTemplate
// 	for _, t := range s.remoteTemplatesCache {
// 		if t.ID != id {
// 			updatedCache = append(updatedCache, t)
// 		}
// 	}
// 	s.remoteTemplatesCache = updatedCache
// }
