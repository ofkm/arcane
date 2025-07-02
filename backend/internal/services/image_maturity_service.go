package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"gorm.io/gorm"
)

type ImageMaturityService struct {
	db              *database.DB
	settingsService *SettingsService
	registryService *ContainerRegistryService
}

func NewImageMaturityService(db *database.DB, settingsService *SettingsService, registryService *ContainerRegistryService) *ImageMaturityService {
	return &ImageMaturityService{
		db:              db,
		settingsService: settingsService,
		registryService: registryService,
	}
}

func (s *ImageMaturityService) GetImageMaturity(ctx context.Context, imageID string) (*models.ImageMaturityRecord, error) {
	var record models.ImageMaturityRecord
	if err := s.db.WithContext(ctx).Where("id = ?", imageID).First(&record).Error; err != nil {
		return nil, fmt.Errorf("failed to get image maturity: %w", err)
	}
	return &record, nil
}

func (s *ImageMaturityService) CheckImageMaturity(ctx context.Context, imageID, repository, tag string, imageCreatedAt time.Time) (*models.ImageMaturity, error) {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get settings: %w", err)
	}

	maturityThresholdDays := settings.MaturityThresholdDays
	if maturityThresholdDays == 0 {
		maturityThresholdDays = 30
	}

	imageAge := time.Since(imageCreatedAt)
	isMaturedByAge := imageAge > time.Duration(maturityThresholdDays)*24*time.Hour

	hasUpdates := false
	latestVersion := ""
	var checkError error

	registry := s.getRegistryForImage(ctx, repository)
	registryManifest, err := s.getImageManifest(ctx, repository, tag, registry)
	if err != nil {
		checkError = err
	} else {
		hasUpdates = s.hasTagUpdates(imageCreatedAt, registryManifest.CreatedAt)
	}

	if checkError == nil && !s.isSpecialTag(tag) {
		allTags, err := s.getImageTags(ctx, repository, registry)
		if err == nil {
			hasNewerVersions, newerVersion := s.hasNewerVersions(tag, allTags)
			if hasNewerVersions {
				hasUpdates = true
				latestVersion = newerVersion
			}
		}
	}

	status := s.determineMaturityStatus(isMaturedByAge, hasUpdates, checkError)

	maturity := &models.ImageMaturity{
		Version:          tag,
		Date:             imageCreatedAt.Format(time.RFC3339),
		Status:           status,
		UpdatesAvailable: hasUpdates,
		LatestVersion:    latestVersion,
	}

	metadata := map[string]interface{}{
		"registryDomain":    utils.ExtractRegistryDomain(repository),
		"isPrivateRegistry": s.isPrivateRegistry(repository),
		"currentImageDate":  imageCreatedAt,
		"daysSinceCreation": int(imageAge.Hours() / 24),
		"isMaturedByAge":    isMaturedByAge,
		"maturityThreshold": maturityThresholdDays,
	}

	if registryManifest != nil {
		metadata["latestImageDate"] = registryManifest.CreatedAt
	}
	if checkError != nil {
		metadata["error"] = checkError.Error()
	}

	if err := s.SetImageMaturity(ctx, imageID, repository, tag, *maturity, metadata); err != nil {
		return nil, fmt.Errorf("failed to save maturity: %w", err)
	}

	return maturity, nil
}

func (s *ImageMaturityService) SetImageMaturity(ctx context.Context, imageID, repository, tag string, maturity models.ImageMaturity, metadata map[string]interface{}) error {
	now := time.Now()

	record := &models.ImageMaturityRecord{
		ID:               imageID,
		Repository:       repository,
		Tag:              tag,
		CurrentVersion:   maturity.Version,
		Status:           maturity.Status,
		UpdatesAvailable: maturity.UpdatesAvailable,
		LatestVersion:    &maturity.LatestVersion,
		LastChecked:      now,
		BaseModel:        models.BaseModel{CreatedAt: now},
	}

	if registryDomain, ok := metadata["registryDomain"].(string); ok {
		record.RegistryDomain = &registryDomain
	}
	if isPrivate, ok := metadata["isPrivateRegistry"].(bool); ok {
		record.IsPrivateRegistry = isPrivate
	}
	if responseTime, ok := metadata["responseTimeMs"].(int); ok {
		record.ResponseTimeMs = &responseTime
	}
	if errorMsg, ok := metadata["error"].(string); ok {
		record.LastError = &errorMsg
	}
	if latestVersion, ok := metadata["latestVersion"].(string); ok {
		record.LatestVersion = &latestVersion
	}
	if currentDate, ok := metadata["currentImageDate"].(time.Time); ok {
		record.CurrentImageDate = &currentDate
	}
	if latestDate, ok := metadata["latestImageDate"].(time.Time); ok {
		record.LatestImageDate = &latestDate
	}
	if days, ok := metadata["daysSinceCreation"].(int); ok {
		record.DaysSinceCreation = &days
	}

	existing, err := s.GetImageMaturity(ctx, imageID)
	if err == nil {
		record.CheckCount = existing.CheckCount + 1
		record.CreatedAt = existing.CreatedAt
	}

	if err := s.db.WithContext(ctx).Save(record).Error; err != nil {
		return fmt.Errorf("failed to set image maturity: %w", err)
	}

	return nil
}

func (s *ImageMaturityService) getRegistryForImage(ctx context.Context, repository string) *models.ContainerRegistry {
	registryDomain := utils.ExtractRegistryDomain(repository)
	normalizedImageDomain := s.normalizeRegistryURL(registryDomain)

	registries, err := s.registryService.GetAllRegistries(ctx)
	if err != nil {
		return nil
	}

	for _, reg := range registries {
		if !reg.Enabled {
			continue
		}

		normalizedRegURL := s.normalizeRegistryURL(reg.URL)
		if normalizedRegURL == normalizedImageDomain {
			return &reg
		}
	}

	return nil
}

func (s *ImageMaturityService) normalizeRegistryURL(url string) string {
	url = strings.TrimSpace(url)
	url = strings.ToLower(url)

	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")

	url = strings.TrimSuffix(url, "/")

	if url == "docker.io" || url == "registry-1.docker.io" || url == "index.docker.io" {
		return "docker.io"
	}

	return url
}

func (s *ImageMaturityService) getImageManifest(ctx context.Context, repository, tag string, registry *models.ContainerRegistry) (*RegistryManifest, error) {
	registryURL := s.buildRegistryURL(repository)
	normalizedRepo := s.normalizeRepository(repository)

	manifestURL := fmt.Sprintf("%s/v2/%s/manifests/%s", registryURL, normalizedRepo, tag)

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, manifestURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create manifest request: %w", err)
	}

	if registry != nil {
		token, err := s.getRegistryToken(ctx, repository, registry)
		if err == nil && token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
	}

	req.Header.Set("Accept", "application/vnd.docker.distribution.manifest.v2+json")
	req.Header.Set("Accept", "application/vnd.docker.distribution.manifest.v1+json")

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get manifest: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("manifest request failed with status: %d", resp.StatusCode)
	}

	digest := resp.Header.Get("Docker-Content-Digest")

	var manifest map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&manifest); err != nil {
		return nil, fmt.Errorf("failed to decode manifest: %w", err)
	}

	createdAt := time.Now()
	if history, ok := manifest["history"].([]interface{}); ok && len(history) > 0 {
		if firstHistory, ok := history[0].(map[string]interface{}); ok {
			if v1Compat, ok := firstHistory["v1Compatibility"].(string); ok {
				var compat V1Compatibility
				if err := json.Unmarshal([]byte(v1Compat), &compat); err == nil {
					createdAt = compat.Created
				}
			}
		}
	}

	return &RegistryManifest{
		Digest:    digest,
		CreatedAt: createdAt,
	}, nil
}

func (s *ImageMaturityService) getImageTags(ctx context.Context, repository string, registry *models.ContainerRegistry) ([]string, error) {
	registryURL := s.buildRegistryURL(repository)
	normalizedRepo := s.normalizeRepository(repository)

	tagsURL := fmt.Sprintf("%s/v2/%s/tags/list", registryURL, normalizedRepo)

	client := &http.Client{Timeout: 30 * time.Second}
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, tagsURL, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create tags request: %w", err)
	}

	if registry != nil {
		token, err := s.getRegistryToken(ctx, repository, registry)
		if err == nil && token != "" {
			req.Header.Set("Authorization", "Bearer "+token)
		}
	}

	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to get tags: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("tags request failed with status: %d", resp.StatusCode)
	}

	var tagsResp struct {
		Tags []string `json:"tags"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&tagsResp); err != nil {
		return nil, fmt.Errorf("failed to decode tags response: %w", err)
	}

	return tagsResp.Tags, nil
}

func (s *ImageMaturityService) getRegistryToken(ctx context.Context, repository string, registry *models.ContainerRegistry) (string, error) {
	domain := s.extractRegistryDomain(repository)

	switch domain {
	case "docker.io", "registry-1.docker.io", "index.docker.io":
		return utils.GetDockerHubToken(ctx, repository)
	default:
		if registry != nil {
			creds := &utils.RegistryCredentials{
				Username: registry.Username,
				Token:    registry.Token,
			}
			return utils.GetRegistryToken(ctx, domain, repository, creds)
		}
		return utils.GetGenericRegistryToken(ctx, domain, repository)
	}
}

func (s *ImageMaturityService) buildRegistryURL(repository string) string {
	domain := utils.ExtractRegistryDomain(repository)

	if domain == "docker.io" {
		return "https://registry-1.docker.io"
	}

	if !strings.HasPrefix(domain, "http") {
		return "https://" + domain
	}

	return domain
}

func (s *ImageMaturityService) normalizeRepository(repository string) string {
	domain := utils.ExtractRegistryDomain(repository)

	if domain == "docker.io" {
		if !strings.Contains(repository, "/") {
			return "library/" + repository
		}

		if utils.ExtractRegistryDomain(repository) == "docker.io" || utils.ExtractRegistryDomain(repository) == "registry-1.docker.io" {
			repoWithoutRegistry := strings.TrimPrefix(repository, utils.ExtractRegistryDomain(repository)+"/")
			if !strings.Contains(repoWithoutRegistry, "/") {
				return "library/" + repoWithoutRegistry
			}
			return repoWithoutRegistry
		}
	}

	return repository
}

func (s *ImageMaturityService) extractRegistryDomain(repository string) string {
	if !strings.Contains(repository, "/") {
		return "docker.io"
	}

	parts := strings.Split(repository, "/")
	domain := parts[0]

	if strings.Contains(domain, ".") || strings.Contains(domain, ":") {
		return domain
	}

	return "docker.io"
}

func (s *ImageMaturityService) isPrivateRegistry(repository string) bool {
	domain := utils.ExtractRegistryDomain(repository)
	publicRegistries := []string{"docker.io", "registry-1.docker.io", "index.docker.io", "ghcr.io", "quay.io", "gcr.io"}

	for _, public := range publicRegistries {
		if domain == public {
			return false
		}
	}
	return true
}

func (s *ImageMaturityService) hasTagUpdates(currentImageCreated, registryImageCreated time.Time) bool {
	return registryImageCreated.After(currentImageCreated)
}

func (s *ImageMaturityService) hasNewerVersions(currentTag string, allTags []string) (bool, string) {
	if s.isSpecialTag(currentTag) {
		return false, ""
	}

	currentPattern := s.getTagPattern(currentTag)
	if currentPattern.Version == "" {
		return false, ""
	}

	var newestVersion string
	var newestTag string
	hasNewer := false

	for _, tag := range allTags {
		if tag == currentTag {
			continue
		}

		tagPattern := s.getTagPattern(tag)
		if tagPattern.Pattern != currentPattern.Pattern || tagPattern.Version == "" {
			continue
		}

		if s.isNewerVersion(tagPattern.Version, currentPattern.Version) {
			if !hasNewer || (newestVersion != "" && s.isNewerVersion(tagPattern.Version, newestVersion)) {
				newestVersion = tagPattern.Version
				newestTag = tag
				hasNewer = true
			}
		}
	}

	return hasNewer, newestTag
}

func (s *ImageMaturityService) determineMaturityStatus(isMaturedByAge, hasUpdates bool, checkError error) string {
	if checkError != nil {
		if isMaturedByAge {
			return models.ImageStatusMatured
		}
		return models.ImageStatusError
	}

	if isMaturedByAge {
		return models.ImageStatusMatured
	}

	if hasUpdates {
		return models.ImageStatusMatured
	}

	return models.ImageStatusNotMatured
}

func (s *ImageMaturityService) isSpecialTag(tag string) bool {
	specialTags := []string{
		"latest", "stable", "unstable", "dev", "devel", "development",
		"test", "testing", "prod", "production", "main", "master",
		"stage", "staging", "canary", "nightly", "edge", "next",
	}

	for _, special := range specialTags {
		if tag == special {
			return true
		}
	}
	return false
}

func (s *ImageMaturityService) getTagPattern(tag string) struct{ Pattern, Version string } {
	if matches := regexp.MustCompile(`^(\d+)\.(\d+)(?:\.(\d+))?$`).FindStringSubmatch(tag); matches != nil {
		majorVersion := matches[1]
		return struct{ Pattern, Version string }{Pattern: majorVersion, Version: tag}
	}

	if matches := regexp.MustCompile(`^([a-z][\w-]*?)[.-]?(\d+(?:\.\d+)*)$`).FindStringSubmatch(tag); matches != nil {
		prefix := matches[1]
		version := matches[2]
		versionParts := strings.Split(version, ".")
		if len(versionParts) > 0 {
			majorVersion := versionParts[0]
			return struct{ Pattern, Version string }{Pattern: prefix + "-" + majorVersion, Version: version}
		}
		return struct{ Pattern, Version string }{Pattern: prefix, Version: version}
	}

	if matches := regexp.MustCompile(`^(\d+(?:\.\d+)*)$`).FindStringSubmatch(tag); matches != nil {
		version := matches[1]
		versionParts := strings.Split(version, ".")
		if len(versionParts) > 0 {
			majorVersion := versionParts[0]
			return struct{ Pattern, Version string }{Pattern: "v" + majorVersion, Version: version}
		}
		return struct{ Pattern, Version string }{Pattern: "version", Version: version}
	}

	return struct{ Pattern, Version string }{Pattern: tag, Version: ""}
}

func (s *ImageMaturityService) isNewerVersion(newer, current string) bool {
	newerParts := s.parseVersion(newer)
	currentParts := s.parseVersion(current)

	maxLen := len(newerParts)
	if len(currentParts) > maxLen {
		maxLen = len(currentParts)
	}

	for i := 0; i < maxLen; i++ {
		newerVal := 0
		currentVal := 0

		if i < len(newerParts) {
			newerVal = newerParts[i]
		}
		if i < len(currentParts) {
			currentVal = currentParts[i]
		}

		if newerVal > currentVal {
			return true
		}
		if newerVal < currentVal {
			return false
		}
	}

	return false
}

func (s *ImageMaturityService) parseVersion(version string) []int {
	parts := strings.Split(version, ".")
	result := make([]int, 0, len(parts))

	for _, part := range parts {
		if num, err := strconv.Atoi(strings.TrimSpace(part)); err == nil {
			result = append(result, num)
		}
	}

	return result
}

func (s *ImageMaturityService) ProcessImagesForMaturityCheck(ctx context.Context, imageService *ImageService) error {
	dockerImages, err := imageService.ListImages(ctx)
	if err != nil {
		return fmt.Errorf("failed to list Docker images: %w", err)
	}

	for _, img := range dockerImages {
		if len(img.RepoTags) == 0 || img.RepoTags[0] == "<none>:<none>" {
			continue
		}

		repoTag := img.RepoTags[0]
		parts := strings.Split(repoTag, ":")
		if len(parts) != 2 {
			continue
		}
		repo := parts[0]
		tag := parts[1]

		imageCreatedAt := time.Unix(img.Created, 0)
		_, err := s.CheckImageMaturity(ctx, img.ID, repo, tag, imageCreatedAt)
		if err != nil {
			continue
		}
	}

	return nil
}

func (s *ImageMaturityService) MarkAsMatured(ctx context.Context, imageID string, daysSinceCreation int) error {
	updates := map[string]interface{}{
		"status":              models.ImageStatusMatured,
		"days_since_creation": daysSinceCreation,
		"last_checked":        time.Now(),
		"updated_at":          time.Now(),
	}

	if err := s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).
		Where("id = ?", imageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to mark image as matured: %w", err)
	}

	return nil
}

func (s *ImageMaturityService) ListMaturityRecords(ctx context.Context) ([]*models.ImageMaturityRecord, error) {
	var records []*models.ImageMaturityRecord
	if err := s.db.WithContext(ctx).Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to list maturity records: %w", err)
	}
	return records, nil
}

func (s *ImageMaturityService) GetImagesWithUpdates(ctx context.Context) ([]*models.ImageMaturityRecord, error) {
	var records []*models.ImageMaturityRecord
	if err := s.db.WithContext(ctx).
		Where("updates_available = ?", true).
		Order("last_checked DESC").
		Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to get images with updates: %w", err)
	}
	return records, nil
}

func (s *ImageMaturityService) GetMaturityStats(ctx context.Context) (map[string]interface{}, error) {
	var total int64
	var withUpdates int64
	var matured int64
	var notMatured int64

	s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).Count(&total)
	s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).Where("updates_available = ?", true).Count(&withUpdates)
	s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).Where("status = ?", models.ImageStatusMatured).Count(&matured)
	s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).Where("status = ?", models.ImageStatusNotMatured).Count(&notMatured)

	return map[string]interface{}{
		"total":       total,
		"withUpdates": withUpdates,
		"matured":     matured,
		"notMatured":  notMatured,
	}, nil
}

func (s *ImageMaturityService) GetImagesNeedingCheck(ctx context.Context, maxAge int, limit int) ([]*models.ImageMaturityRecord, error) {
	cutoff := time.Now().Add(-time.Duration(maxAge) * time.Minute)
	var records []*models.ImageMaturityRecord

	if err := s.db.WithContext(ctx).
		Where("last_checked < ?", cutoff).
		Order("last_checked ASC").
		Limit(limit).
		Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to get images needing check: %w", err)
	}

	return records, nil
}

func (s *ImageMaturityService) GetMaturityByRepository(ctx context.Context, repository string) ([]*models.ImageMaturityRecord, error) {
	var records []*models.ImageMaturityRecord
	if err := s.db.WithContext(ctx).
		Where("repository = ?", repository).
		Order("tag ASC").
		Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to get maturity by repository: %w", err)
	}
	return records, nil
}

func (s *ImageMaturityService) UpdateCheckStatus(ctx context.Context, imageID string, status string, errorMsg *string) error {
	updates := map[string]interface{}{
		"status":       status,
		"last_checked": time.Now(),
		"updated_at":   time.Now(),
	}

	if errorMsg != nil {
		updates["last_error"] = *errorMsg
	} else {
		updates["last_error"] = nil
	}

	if err := s.db.WithContext(ctx).Model(&models.ImageMaturityRecord{}).
		Where("id = ?", imageID).
		Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update check status: %w", err)
	}

	return nil
}

func (s *ImageMaturityService) CleanupOrphanedRecords(ctx context.Context, existingImageIDs []string) (int64, error) {
	var result *gorm.DB
	if len(existingImageIDs) == 0 {
		result = s.db.WithContext(ctx).Delete(&models.ImageMaturityRecord{})
	} else {
		result = s.db.WithContext(ctx).Where("id NOT IN ?", existingImageIDs).Delete(&models.ImageMaturityRecord{})
	}

	if result.Error != nil {
		return 0, fmt.Errorf("failed to cleanup orphaned records: %w", result.Error)
	}

	return result.RowsAffected, nil
}

func (s *ImageMaturityService) CheckMaturityBatch(ctx context.Context, imageIDs []string) (map[string]interface{}, error) {
	results := make(map[string]interface{})
	successCount := 0

	for _, imageID := range imageIDs {
		updates := map[string]interface{}{
			"status":       models.ImageStatusChecking,
			"last_checked": time.Now(),
			"updated_at":   time.Now(),
		}

		err := s.db.WithContext(ctx).
			Model(&models.ImageMaturityRecord{}).
			Where("id = ?", imageID).
			Updates(updates).Error
		if err != nil {
			results[imageID] = gin.H{
				"success": false,
				"error":   err.Error(),
			}
		} else {
			results[imageID] = gin.H{
				"success":    true,
				"status":     models.ImageStatusChecking,
				"checked_at": time.Now(),
			}
			successCount++
		}
	}

	return map[string]interface{}{
		"results": results,
		"summary": map[string]interface{}{
			"total":      len(imageIDs),
			"successful": successCount,
			"failed":     len(imageIDs) - successCount,
		},
	}, nil
}

type RegistryManifest struct {
	Digest    string
	CreatedAt time.Time
	Size      int64
}

type ManifestV1History struct {
	V1Compatibility string `json:"v1Compatibility"`
}

type V1Compatibility struct {
	Created time.Time `json:"created"`
}
