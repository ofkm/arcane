package services

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"os"
	"path/filepath"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	appfs "github.com/ofkm/arcane-backend/internal/utils/fs"
	"gorm.io/gorm"
)

type remoteCache struct {
	templates []models.ComposeTemplate
	lastFetch time.Time
}

type registryFetchMeta struct {
	LastModified string
	Templates    []dto.RemoteTemplate
}

type TemplateService struct {
	db              *database.DB
	httpClient      *http.Client
	settingsService *SettingsService

	remoteMu    sync.RWMutex
	remoteCache remoteCache

	registryMu        sync.RWMutex
	registryFetchMeta map[string]*registryFetchMeta
}

const remoteCacheDuration = 5 * time.Minute

const remoteIDPrefix = "remote"

func makeRemoteID(registryID, slug string) string {
	return fmt.Sprintf("%s:%s:%s", remoteIDPrefix, registryID, slug)
}

func NewTemplateService(ctx context.Context, db *database.DB, httpClient *http.Client, settingsService *SettingsService) *TemplateService {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}

	if err := appfs.EnsureDefaultTemplates(ctx); err != nil {
		slog.WarnContext(ctx, "failed to ensure default templates", "error", err)
	}

	return &TemplateService{
		db:                db,
		httpClient:        httpClient,
		settingsService:   settingsService,
		remoteCache:       remoteCache{},
		registryFetchMeta: make(map[string]*registryFetchMeta),
	}
}

func (s *TemplateService) ensureRemoteTemplatesLoaded(ctx context.Context) error {
	s.remoteMu.Lock()
	defer s.remoteMu.Unlock()

	if s.remoteCache.templates != nil && time.Since(s.remoteCache.lastFetch) < remoteCacheDuration {
		return nil
	}

	templates, err := s.loadRemoteTemplates(ctx)
	if err != nil {
		if s.remoteCache.templates == nil {
			return fmt.Errorf("failed to load remote templates: %w", err)
		}
		slog.WarnContext(ctx, "remote template refresh failed; using stale cache", "error", err)
		return nil
	}

	s.remoteCache = remoteCache{templates: templates, lastFetch: time.Now()}
	return nil
}

func (s *TemplateService) GetAllTemplates(ctx context.Context) ([]models.ComposeTemplate, error) {
	if err := s.syncFilesystemTemplatesInternal(ctx); err != nil {
		slog.WarnContext(ctx, "failed to sync filesystem templates", "error", err)
	}

	var templates []models.ComposeTemplate
	if err := s.db.WithContext(ctx).Preload("Registry").Find(&templates).Error; err != nil {
		return nil, fmt.Errorf("failed to get local templates: %w", err)
	}

	// Trim heavy fields in list responses
	for i := range templates {
		templates[i].Content = ""
		templates[i].EnvContent = nil
	}

	if err := s.ensureRemoteTemplatesLoaded(ctx); err != nil {
		slog.WarnContext(ctx, "failed to load remote templates for GetAllTemplates", "error", err)
	} else {
		s.remoteMu.RLock()
		copied := make([]models.ComposeTemplate, len(s.remoteCache.templates))
		copy(copied, s.remoteCache.templates)
		s.remoteMu.RUnlock()

		if len(copied) > 0 {
			templates = append(templates, copied...)
		}
	}

	return templates, nil
}

var ErrTemplateNotFound = errors.New("template not found")

func (s *TemplateService) GetTemplate(ctx context.Context, id string) (*models.ComposeTemplate, error) {
	if err := s.syncFilesystemTemplatesInternal(ctx); err != nil {
		slog.WarnContext(ctx, "failed to sync filesystem templates", "error", err)
	}

	var template models.ComposeTemplate
	if err := s.db.WithContext(ctx).Preload("Registry").Where("id = ?", id).First(&template).Error; err == nil {
		return &template, nil
	} else if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to query local template: %w", err)
	}

	if err := s.ensureRemoteTemplatesLoaded(ctx); err != nil {
		return nil, fmt.Errorf("template not found (failed to load remote templates): %w", err)
	}
	s.remoteMu.RLock()
	copied := make([]models.ComposeTemplate, len(s.remoteCache.templates))
	copy(copied, s.remoteCache.templates)
	s.remoteMu.RUnlock()

	for _, remoteTemplate := range copied {
		if remoteTemplate.ID == id {
			t := remoteTemplate
			return &t, nil
		}
	}

	return nil, ErrTemplateNotFound
}

func (s *TemplateService) CreateTemplate(ctx context.Context, template *models.ComposeTemplate) error {
	if template.ID == "" {
		template.ID = uuid.NewString()
	}
	template.IsCustom = true
	template.IsRemote = false
	if err := s.db.WithContext(ctx).Create(template).Error; err != nil {
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

	if existing.IsRemote {
		return fmt.Errorf("cannot delete remote template directly")
	}

	result := s.db.WithContext(ctx).Where("id = ?", id).Delete(&models.ComposeTemplate{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete template: %w", result.Error)
	}
	if result.RowsAffected == 0 {
		return fmt.Errorf("template not found after finding it")
	}
	return nil
}

func (s *TemplateService) GetComposeTemplate() string {
	composePath := filepath.Join("data", "templates", ".compose.template")
	content, err := os.ReadFile(composePath)
	if err != nil {
		slog.Warn("failed to read compose template", "error", err)
		return ""
	}
	return string(content)
}

func (s *TemplateService) SaveComposeTemplate(content string) error {
	templateDir := filepath.Join("data", "templates")
	if err := os.MkdirAll(templateDir, 0755); err != nil {
		return fmt.Errorf("failed to create template directory: %w", err)
	}

	composePath := filepath.Join(templateDir, ".compose.template")
	if err := os.WriteFile(composePath, []byte(content), 0600); err != nil {
		return fmt.Errorf("failed to save compose template: %w", err)
	}

	return nil
}

func (s *TemplateService) GetEnvTemplate() string {
	envPath := filepath.Join("data", "templates", ".env.template")
	content, err := os.ReadFile(envPath)
	if err != nil {
		slog.Warn("failed to read env template", "error", err)
		return ""
	}
	return string(content)
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
	// Hydrate metadata if needed
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
		} else if registry.Name == "" || registry.Description == "" {
			return fmt.Errorf("failed to fetch registry manifest: %w", err)
		}
	}

	if registry.ID == "" {
		registry.ID = uuid.NewString()
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

		remoteTemplates, err := s.fetchRegistryTemplates(ctx, &reg)
		if err != nil {
			slog.WarnContext(ctx, "failed to fetch templates from registry", "registry", reg.Name, "url", reg.URL, "error", err)
			continue
		}

		for _, rt := range remoteTemplates {
			template := s.convertRemoteToLocal(rt, &reg)
			templates = append(templates, template)
		}
	}

	return templates, nil
}

func (s *TemplateService) FetchRaw(ctx context.Context, url string) ([]byte, error) {
	return s.doGET(ctx, url)
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

// fetchRegistryTemplates performs a conditional GET using If-Modified-Since.
// If the server replies 304 Not Modified, cached templates for the registry are reused.
func (s *TemplateService) fetchRegistryTemplates(ctx context.Context, reg *models.TemplateRegistry) ([]dto.RemoteTemplate, error) {
	s.registryMu.RLock()
	meta := s.registryFetchMeta[reg.ID]
	s.registryMu.RUnlock()

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, reg.URL, nil)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}
	if meta != nil && meta.LastModified != "" {
		req.Header.Set("If-Modified-Since", meta.LastModified)
	}

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotModified {
		if meta != nil {
			return meta.Templates, nil
		}
		return nil, fmt.Errorf("received 304 without cached data")
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("unexpected status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read body: %w", err)
	}

	var regDTO dto.RemoteRegistry
	if err := json.Unmarshal(body, &regDTO); err != nil {
		return nil, fmt.Errorf("parse registry JSON: %w", err)
	}

	lm := resp.Header.Get("Last-Modified")
	newMeta := &registryFetchMeta{
		LastModified: lm,
		Templates:    regDTO.Templates,
	}
	s.registryMu.Lock()
	s.registryFetchMeta[reg.ID] = newMeta
	s.registryMu.Unlock()

	return regDTO.Templates, nil
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
		},
	}
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
			slog.WarnContext(ctx, "failed to fetch env content", "url", *template.Metadata.EnvURL, "error", err)
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

	base := s.templateBaseFromRemote(remoteTemplate)

	dir, composePath, envPath, err := appfs.EnsureTemplateDir(ctx, base)
	if err != nil {
		return nil, err
	}
	srcDesc := appfs.ImportedComposeDescription(dir)

	var existing models.ComposeTemplate
	if err := s.db.WithContext(ctx).
		Where("is_remote = ? AND registry_id IS NULL AND (description = ? OR name = ?)", false, srcDesc, base).
		First(&existing).Error; err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, fmt.Errorf("failed to check existing template: %w", err)
	} else if err == nil {
		composeContent, envContent, err := s.FetchTemplateContent(ctx, remoteTemplate)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch template content for existing local template: %w", err)
		}

		envPtr, werr := appfs.WriteTemplateFiles(composePath, envPath, composeContent, envContent)
		if werr != nil {
			return nil, werr
		}

		existing.Content = composeContent
		existing.EnvContent = envPtr
		existing.Metadata = cloneTemplateMetadata(remoteTemplate.Metadata)

		if err := s.db.WithContext(ctx).Save(&existing).Error; err != nil {
			return nil, fmt.Errorf("failed to update existing local template: %w", err)
		}
		return &existing, nil
	}

	composeContent, envContent, err := s.FetchTemplateContent(ctx, remoteTemplate)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch template content for download: %w", err)
	}

	envPtr, werr := appfs.WriteTemplateFiles(composePath, envPath, composeContent, envContent)
	if werr != nil {
		return nil, werr
	}

	localTemplate := &models.ComposeTemplate{
		BaseModel:   models.BaseModel{ID: uuid.NewString()},
		Name:        base,
		Description: srcDesc,
		Content:     composeContent,
		EnvContent:  envPtr,
		IsCustom:    true,
		IsRemote:    false,
		RegistryID:  nil,
		Registry:    nil,
		Metadata:    cloneTemplateMetadata(remoteTemplate.Metadata),
	}

	if err := s.db.WithContext(ctx).Create(localTemplate).Error; err != nil {
		return nil, fmt.Errorf("failed to save local template: %w", err)
	}

	return localTemplate, nil
}

func (s *TemplateService) templateBaseFromRemote(remoteTemplate *models.ComposeTemplate) string {
	base := appfs.Slugify(remoteTemplate.Name)
	if base != "" {
		return base
	}
	parts := strings.Split(remoteTemplate.ID, ":")
	if len(parts) > 0 {
		base = appfs.Slugify(parts[len(parts)-1])
	}
	if base == "" {
		base = "template-" + uuid.NewString()
	}
	return base
}

func cloneTemplateMetadata(meta *models.ComposeTemplateMetadata) *models.ComposeTemplateMetadata {
	if meta == nil {
		return nil
	}
	return &models.ComposeTemplateMetadata{
		Version:          meta.Version,
		Author:           meta.Author,
		Tags:             meta.Tags,
		RemoteURL:        meta.RemoteURL,
		EnvURL:           meta.EnvURL,
		DocumentationURL: meta.DocumentationURL,
	}
}

func (s *TemplateService) invalidateRemoteCache() {
	s.remoteMu.Lock()
	s.remoteCache = remoteCache{}
	s.remoteMu.Unlock()

	s.registryMu.Lock()
	s.registryFetchMeta = make(map[string]*registryFetchMeta)
	s.registryMu.Unlock()
}

func (s *TemplateService) SyncLocalTemplatesFromFilesystem(ctx context.Context) error {
	return s.syncFilesystemTemplatesInternal(ctx)
}

func (s *TemplateService) upsertFilesystemTemplate(ctx context.Context, name, desc, compose string, envPtr *string) error {
	var existing models.ComposeTemplate
	q := s.db.WithContext(ctx).
		Where("is_remote = ? AND registry_id IS NULL AND description = ?", false, desc).
		First(&existing)

	if q.Error == nil {
		existing.Name = name
		existing.Content = compose
		existing.EnvContent = envPtr
		existing.IsCustom = true
		existing.IsRemote = false
		if err := s.db.WithContext(ctx).Save(&existing).Error; err != nil {
			return fmt.Errorf("update template %s: %w", existing.ID, err)
		}
		return nil
	}
	if !errors.Is(q.Error, gorm.ErrRecordNotFound) {
		return fmt.Errorf("query existing template: %w", q.Error)
	}

	tpl := &models.ComposeTemplate{
		BaseModel:   models.BaseModel{ID: uuid.NewString()},
		Name:        name,
		Description: desc,
		Content:     compose,
		EnvContent:  envPtr,
		IsCustom:    true,
		IsRemote:    false,
		RegistryID:  nil,
		Registry:    nil,
		Metadata:    nil,
	}
	if err := s.db.WithContext(ctx).Create(tpl).Error; err != nil {
		return fmt.Errorf("insert template %s: %w", name, err)
	}
	return nil
}

func (s *TemplateService) processFolderEntry(ctx context.Context, baseDir, folder string) error {
	compose, envPtr, desc, found, err := appfs.ReadFolderComposeTemplate(baseDir, folder)
	if err != nil || !found {
		return err
	}
	return s.upsertFilesystemTemplate(ctx, folder, desc, compose, envPtr)
}

func (s *TemplateService) syncFilesystemTemplatesInternal(ctx context.Context) error {
	dir, err := appfs.GetTemplatesDirectory(ctx)
	if err != nil {
		return fmt.Errorf("ensure templates dir: %w", err)
	}

	entries, err := os.ReadDir(dir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("read dir %s: %w", dir, err)
	}

	for _, ent := range entries {
		// Only process directories; root-level compose files are ignored to prevent duplication.
		if !ent.IsDir() {
			continue
		}
		if err := s.processFolderEntry(ctx, dir, ent.Name()); err != nil {
			slog.WarnContext(ctx, "failed to read folder template", "folder", ent.Name(), "error", err)
		}
	}
	return nil
}

func (s *TemplateService) getGlobalVariablesPath(ctx context.Context) (string, error) {
	projectsDirectory, err := appfs.GetProjectsDirectory(ctx, s.settingsService.GetStringSetting(ctx, "projectsDirectory", "data/projects"))
	if err != nil {
		return "", fmt.Errorf("failed to get projects directory: %w", err)
	}

	return filepath.Join(projectsDirectory, ".env.global"), nil
}

func (s *TemplateService) GetGlobalVariables(ctx context.Context) ([]dto.VariableDto, error) {
	envPath, err := s.getGlobalVariablesPath(ctx)
	if err != nil {
		return nil, err
	}

	if _, err := os.Stat(envPath); os.IsNotExist(err) {
		slog.DebugContext(ctx, "Global variables file does not exist yet", "path", envPath)
		return []dto.VariableDto{}, nil
	}

	file, err := os.Open(envPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open global variables file: %w", err)
	}
	defer file.Close()

	vars := []dto.VariableDto{}
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := strings.TrimSpace(scanner.Text())

		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			slog.WarnContext(ctx, "Skipping invalid line in global variables file",
				"line", lineNum,
				"content", line)
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])

		if len(value) >= 2 {
			if (strings.HasPrefix(value, `"`) && strings.HasSuffix(value, `"`)) ||
				(strings.HasPrefix(value, `'`) && strings.HasSuffix(value, `'`)) {
				value = value[1 : len(value)-1]
			}
		}

		vars = append(vars, dto.VariableDto{
			Key:   key,
			Value: value,
		})
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading global variables file: %w", err)
	}

	sort.Slice(vars, func(i, j int) bool {
		return vars[i].Key < vars[j].Key
	})

	return vars, nil
}

func (s *TemplateService) UpdateGlobalVariables(ctx context.Context, vars []dto.VariableDto) error {
	envPath, err := s.getGlobalVariablesPath(ctx)
	if err != nil {
		return err
	}

	projectsDirectory := filepath.Dir(envPath)
	if err := os.MkdirAll(projectsDirectory, 0755); err != nil {
		return fmt.Errorf("failed to create projects directory: %w", err)
	}

	var builder strings.Builder
	builder.WriteString("# Global Environment Variables\n")
	builder.WriteString("# These variables are available to all projects\n")
	builder.WriteString("# Last updated: " + time.Now().Format(time.RFC3339) + "\n\n")

	sortedVars := make([]dto.VariableDto, len(vars))
	copy(sortedVars, vars)
	sort.Slice(sortedVars, func(i, j int) bool {
		return sortedVars[i].Key < sortedVars[j].Key
	})

	for _, v := range sortedVars {
		if strings.TrimSpace(v.Key) == "" {
			continue
		}

		key := strings.TrimSpace(v.Key)
		value := strings.TrimSpace(v.Value)

		if strings.ContainsAny(value, " \t\n\r#") {
			value = fmt.Sprintf(`"%s"`, strings.ReplaceAll(value, `"`, `\"`))
		}

		builder.WriteString(fmt.Sprintf("%s=%s\n", key, value))
	}

	if err := os.WriteFile(envPath, []byte(builder.String()), 0600); err != nil {
		return fmt.Errorf("failed to write global variables file: %w", err)
	}

	slog.InfoContext(ctx, "Updated global variables",
		"path", envPath,
		"count", len(sortedVars))

	return nil
}
