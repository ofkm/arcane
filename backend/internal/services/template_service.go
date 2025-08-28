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
	"sync/atomic"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type remoteCache struct {
	templates []models.ComposeTemplate
	lastFetch time.Time
}

type cacheCmd struct {
	kind  string
	ctx   context.Context
	reply chan error
}

type TemplateService struct {
	db          *database.DB
	cacheCmdCh  chan cacheCmd
	remoteCache atomic.Value
	httpClient  *http.Client
}

const remoteCacheDuration = 5 * time.Minute

// Remote public ID helpers
const remoteIDPrefix = "remote"

func makeRemoteID(registryID, slug string) string {
	return fmt.Sprintf("%s:%s:%s", remoteIDPrefix, registryID, slug)
}

func NewTemplateService(db *database.DB) *TemplateService {
	s := &TemplateService{
		db:         db,
		httpClient: &http.Client{Timeout: 30 * time.Second},
		cacheCmdCh: make(chan cacheCmd, 1),
	}
	s.remoteCache.Store(remoteCache{})
	s.startRemoteCacheWorker()
	return s
}

func (s *TemplateService) startRemoteCacheWorker() {
	go func() {
		for cmd := range s.cacheCmdCh {
			switch cmd.kind {
			case "ensure":
				rc := s.getRemoteCache()
				if rc.templates != nil && time.Since(rc.lastFetch) < remoteCacheDuration {
					cmd.reply <- nil
					continue
				}
				templates, err := s.loadRemoteTemplates(cmd.ctx)
				if err == nil {
					s.setRemoteCache(remoteCache{templates: templates, lastFetch: time.Now()})
				}
				cmd.reply <- err
			}
		}
	}()
}

func (s *TemplateService) getRemoteCache() remoteCache {
	if v := s.remoteCache.Load(); v != nil {
		if rc, ok := v.(remoteCache); ok {
			return rc
		}
	}
	return remoteCache{}
}

func (s *TemplateService) setRemoteCache(rc remoteCache) {
	s.remoteCache.Store(rc)
}

func (s *TemplateService) ensureRemoteTemplatesLoaded(ctx context.Context) error {
	reply := make(chan error, 1)
	select {
	case s.cacheCmdCh <- cacheCmd{kind: "ensure", ctx: ctx, reply: reply}:
	case <-ctx.Done():
		return ctx.Err()
	}
	select {
	case err := <-reply:
		if err != nil {
			fmt.Printf("Warning: failed to refresh remote templates cache: %v\n", err)
			// If we have no cache at all, bubble the error
			if len(s.getRemoteCache().templates) == 0 {
				return fmt.Errorf("failed to load remote templates: %w", err)
			}
		}
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}

func (s *TemplateService) GetAllTemplates(ctx context.Context) ([]models.ComposeTemplate, error) {
	var templates []models.ComposeTemplate

	err := s.db.WithContext(ctx).Preload("Registry").Find(&templates).Error
	if err != nil {
		return nil, fmt.Errorf("failed to get local templates: %w", err)
	}

	err = s.ensureRemoteTemplatesLoaded(ctx)
	if err != nil {
		fmt.Printf("Warning: failed to load remote templates for GetAllTemplates: %v\n", err)
	} else {
		rc := s.getRemoteCache()
		if len(rc.templates) > 0 {
			templates = append(templates, rc.templates...)
		}
	}

	return templates, nil
}

func (s *TemplateService) GetTemplate(ctx context.Context, id string) (*models.ComposeTemplate, error) {
	var template models.ComposeTemplate

	// Local DB by ID (keeps DB concerns in models)
	err := s.db.WithContext(ctx).Preload("Registry").Where("id = ?", id).First(&template).Error
	if err == nil {
		return &template, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to query local template: %w", err)
	}

	// Remote cache by public ID
	if err := s.ensureRemoteTemplatesLoaded(ctx); err != nil {
		return nil, fmt.Errorf("template not found (failed to load remote templates): %w", err)
	}
	rc := s.getRemoteCache()
	for _, remoteTemplate := range rc.templates {
		// Compare against public ID (supports both new composite IDs and legacy slug IDs if present)
		if remoteTemplate.ID == id {
			foundTemplate := remoteTemplate
			return &foundTemplate, nil
		}
	}

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
	if registry.Name == "" || registry.Description == "" {
		if registry.URL == "" {
			return fmt.Errorf("registry URL is required")
		}
		if manifest, err := s.fetchRegistryManifest(ctx, registry.URL); err == nil {
			if registry.Name == "" {
				registry.Name = manifest.Name
			}
			if registry.Description == "" {
				registry.Description = manifest.Description
			}
		} else {
			// If required fields are still missing, bubble error
			if registry.Name == "" || registry.Description == "" {
				return fmt.Errorf("failed to fetch registry manifest: %w", err)
			}
		}
	}

	if err := s.db.WithContext(ctx).Create(registry).Error; err != nil {
		return fmt.Errorf("failed to create registry: %w", err)
	}

	s.invalidateRemoteCache()
	return nil
}

func (s *TemplateService) UpdateRegistry(ctx context.Context, id string, updates *models.TemplateRegistry) error {
	var existing models.TemplateRegistry
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&existing).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("registry not found")
		}
		return fmt.Errorf("failed to find registry: %w", err)
	}

	urlChanged := updates.URL != "" && updates.URL != existing.URL
	needsHydration := updates.Name == "" || updates.Description == ""
	if (urlChanged || needsHydration) && (updates.URL != "" || existing.URL != "") {
		manifestURL := updates.URL
		if manifestURL == "" {
			manifestURL = existing.URL
		}
		if manifest, err := s.fetchRegistryManifest(ctx, manifestURL); err == nil {
			if updates.Name == "" {
				updates.Name = manifest.Name
			}
			if updates.Description == "" {
				updates.Description = manifest.Description
			}
		} else if urlChanged && (updates.Name == "" || updates.Description == "") {
			return fmt.Errorf("failed to fetch registry manifest: %w", err)
		}
	}

	result := s.db.WithContext(ctx).Model(&models.TemplateRegistry{}).Where("id = ?", id).Updates(updates)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return errors.New("registry not found")
	}

	s.invalidateRemoteCache()
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

	s.invalidateRemoteCache()
	return nil
}

func (s *TemplateService) loadRemoteTemplates(ctx context.Context) ([]models.ComposeTemplate, error) {
	var templates []models.ComposeTemplate

	registries, err := s.GetRegistries(ctx)
	if err != nil {
		return nil, err
	}

	for i := range registries {
		reg := registries[i]
		if !reg.Enabled {
			continue
		}

		remoteTemplates, err := s.fetchRegistryTemplates(ctx, reg.URL)
		if err != nil {
			fmt.Printf("Warning: failed to fetch templates from registry %s: %v\n", reg.Name, err)
			continue
		}

		for _, rt := range remoteTemplates {
			template := s.convertRemoteToLocal(rt, &reg)
			templates = append(templates, template)
		}
	}

	return templates, nil
}

func (s *TemplateService) doGET(ctx context.Context, url string) ([]byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request for %s: %w", url, err)
	}
	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch %s: %w", url, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("HTTP status %d for URL %s", resp.StatusCode, url)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body from %s: %w", url, err)
	}
	return body, nil
}

func (s *TemplateService) fetchRegistryTemplates(ctx context.Context, url string) ([]dto.RemoteTemplate, error) {
	body, err := s.doGET(ctx, url)
	if err != nil {
		return nil, err
	}

	var registry dto.RemoteRegistry
	if err := json.Unmarshal(body, &registry); err != nil {
		return nil, fmt.Errorf("failed to parse registry JSON: %w", err)
	}

	return registry.Templates, nil
}

func (s *TemplateService) fetchRegistryManifest(ctx context.Context, url string) (*dto.RemoteRegistry, error) {
	body, err := s.doGET(ctx, url)
	if err != nil {
		return nil, err
	}
	var reg dto.RemoteRegistry
	if err := json.Unmarshal(body, &reg); err != nil {
		return nil, fmt.Errorf("failed to parse registry JSON: %w", err)
	}
	if reg.Name == "" || len(reg.Templates) == 0 {
		return nil, fmt.Errorf("invalid registry manifest: missing required fields (name, templates)")
	}
	return &reg, nil
}

func (s *TemplateService) convertRemoteToLocal(remote dto.RemoteTemplate, registry *models.TemplateRegistry) models.ComposeTemplate {
	tagsJSON := ""
	if len(remote.Tags) > 0 {
		if data, err := json.Marshal(remote.Tags); err == nil {
			tagsJSON = string(data)
		}
	}

	publicID := makeRemoteID(registry.ID, remote.ID)

	return models.ComposeTemplate{
		BaseModel:   models.BaseModel{ID: publicID},
		Name:        remote.Name,
		Description: remote.Description,
		Content:     "",
		EnvContent:  nil,
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
			DocumentationURL: &remote.DocumentationURL,
			IconURL:          nil,
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
			fmt.Printf("Warning: failed to fetch env content from %s: %v\n", *template.Metadata.EnvURL, err)
			envContent = ""
		}
	}

	return composeContent, envContent, nil
}

func (s *TemplateService) fetchURL(ctx context.Context, url string) (string, error) {
	body, err := s.doGET(ctx, url)
	if err != nil {
		return "", err
	}
	return string(body), nil
}

func (s *TemplateService) DownloadTemplate(ctx context.Context, remoteTemplate *models.ComposeTemplate) (*models.ComposeTemplate, error) {
	if !remoteTemplate.IsRemote {
		return nil, fmt.Errorf("template is not remote")
	}

	// Check if a local version with the same remote ID already exists
	// This prevents duplicate downloads of the same remote template
	existingLocalTemplate, err := s.GetTemplate(ctx, s.generateTemplateID(remoteTemplate.Name))
	if err == nil && !existingLocalTemplate.IsRemote {
		return existingLocalTemplate, fmt.Errorf("template '%s' is already downloaded", remoteTemplate.Name)
	}

	composeContent, envContent, err := s.FetchTemplateContent(ctx, remoteTemplate)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch template content for download: %w", err)
	}

	localTemplate := &models.ComposeTemplate{
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
			DocumentationURL: remoteTemplate.Metadata.DocumentationURL,
			IconURL:          remoteTemplate.Metadata.IconURL,
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

func (s *TemplateService) invalidateRemoteCache() {
	s.setRemoteCache(remoteCache{})
}
