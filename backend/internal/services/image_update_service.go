package services

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/docker/docker/api/types/image"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type ImageUpdateService struct {
	db              *database.DB
	settingsService *SettingsService
	registryService *ContainerRegistryService
	dockerService   *DockerClientService
}

type UpdateResult struct {
	HasUpdate      bool      `json:"hasUpdate"`
	UpdateType     string    `json:"updateType"` // "tag" or "digest"
	CurrentVersion string    `json:"currentVersion"`
	LatestVersion  string    `json:"latestVersion,omitempty"`
	CurrentDigest  string    `json:"currentDigest,omitempty"`
	LatestDigest   string    `json:"latestDigest,omitempty"`
	CheckTime      time.Time `json:"checkTime"`
	ResponseTimeMs int       `json:"responseTimeMs"`
	Error          string    `json:"error,omitempty"`
}

type UpdateSummary struct {
	TotalImages       int `json:"totalImages"`
	ImagesWithUpdates int `json:"imagesWithUpdates"`
	DigestUpdates     int `json:"digestUpdates"`
	TagUpdates        int `json:"tagUpdates"`
	ErrorsCount       int `json:"errorsCount"`
}

type ImageParts struct {
	Registry   string
	Repository string
	Tag        string
}

type VersionInfo struct {
	Major     *int   `json:"major"`
	Minor     *int   `json:"minor"`
	Patch     *int   `json:"patch"`
	FormatStr string `json:"formatStr"`
}

type VersionComparison struct {
	CurrentVersion string `json:"currentVersion"`
	TargetVersion  string `json:"targetVersion"`
	IsNewer        bool   `json:"isNewer"`
	UpdateType     string `json:"updateType"`
	ChangeLevel    string `json:"changeLevel"`
}

type AvailableVersions struct {
	ImageRef string   `json:"imageRef"`
	Current  string   `json:"current"`
	Versions []string `json:"versions"`
	Latest   string   `json:"latest,omitempty"`
}

func NewImageUpdateService(db *database.DB, settingsService *SettingsService, registryService *ContainerRegistryService, dockerService *DockerClientService) *ImageUpdateService {
	return &ImageUpdateService{
		db:              db,
		settingsService: settingsService,
		registryService: registryService,
		dockerService:   dockerService,
	}
}

func (s *ImageUpdateService) CheckImageUpdate(ctx context.Context, imageRef string) (*UpdateResult, error) {
	startTime := time.Now()

	parts := s.parseImageReference(imageRef)
	if parts == nil {
		return &UpdateResult{
			Error:          "Invalid image reference format",
			CheckTime:      time.Now(),
			ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
		}, nil
	}

	registry := s.getRegistryForImage(ctx, parts.Registry)

	digestResult, err := s.checkDigestUpdate(ctx, parts, registry)
	if err != nil {
		result := &UpdateResult{
			Error:          err.Error(),
			CheckTime:      time.Now(),
			ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
		}
		s.saveUpdateResult(ctx, imageRef, result)
		return result, nil
	}

	if !digestResult.HasUpdate && !s.isSpecialTag(parts.Tag) {
		tagResult, err := s.checkTagUpdate(ctx, parts, registry)
		if err != nil {
			result := &UpdateResult{
				Error:          err.Error(),
				CheckTime:      time.Now(),
				ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
			}
			s.saveUpdateResult(ctx, imageRef, result)
			return result, nil
		}
		if tagResult.HasUpdate {
			tagResult.ResponseTimeMs = int(time.Since(startTime).Milliseconds())
			s.saveUpdateResult(ctx, imageRef, tagResult)
			return tagResult, nil
		}
	}

	digestResult.ResponseTimeMs = int(time.Since(startTime).Milliseconds())
	s.saveUpdateResult(ctx, imageRef, digestResult)
	return digestResult, nil
}

func (s *ImageUpdateService) getRegistryToken(ctx context.Context, registry, repository string, reg *models.ContainerRegistry) (string, error) {
	registryUtils := utils.NewRegistryUtils()

	authURL, err := registryUtils.CheckAuth(ctx, registry)
	if err != nil {
		return "", fmt.Errorf("failed to check auth: %w", err)
	}

	if authURL == "" {
		return "", nil
	}

	var creds *utils.RegistryCredentials
	if reg != nil && reg.Username != "" && reg.Token != "" {
		creds = &utils.RegistryCredentials{
			Username: reg.Username,
			Token:    reg.Token,
		}
	}

	return registryUtils.GetToken(ctx, authURL, repository, creds)
}

func (s *ImageUpdateService) checkDigestUpdate(ctx context.Context, parts *ImageParts, registry *models.ContainerRegistry) (*UpdateResult, error) {
	startTime := time.Now()
	registryUtils := utils.NewRegistryUtils()

	token, err := s.getRegistryToken(ctx, parts.Registry, parts.Repository, registry)
	if err != nil {
		return nil, fmt.Errorf("failed to get registry token: %w", err)
	}

	normalizedRepo := s.normalizeRepository(parts.Registry, parts.Repository)
	remoteDigest, err := registryUtils.GetLatestDigest(ctx, parts.Registry, normalizedRepo, parts.Tag, token)
	if err != nil {
		return nil, fmt.Errorf("failed to get remote digest: %w", err)
	}

	localDigest, err := s.getLocalImageDigest(ctx, fmt.Sprintf("%s/%s:%s", parts.Registry, parts.Repository, parts.Tag))
	if err != nil {
		return nil, fmt.Errorf("failed to get local digest: %w", err)
	}

	hasUpdate := localDigest != remoteDigest

	return &UpdateResult{
		HasUpdate:      hasUpdate,
		UpdateType:     "digest",
		CurrentDigest:  localDigest,
		LatestDigest:   remoteDigest,
		CheckTime:      time.Now(),
		ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
	}, nil
}

func (s *ImageUpdateService) checkTagUpdate(ctx context.Context, parts *ImageParts, registry *models.ContainerRegistry) (*UpdateResult, error) {
	startTime := time.Now()

	currentVersion := s.parseVersion(parts.Tag)
	if currentVersion == nil {
		return &UpdateResult{
			HasUpdate:      false,
			UpdateType:     "tag",
			CurrentVersion: parts.Tag,
			CheckTime:      time.Now(),
			ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
		}, nil
	}

	tags, err := s.getImageTags(ctx, parts, registry)
	if err != nil {
		return nil, fmt.Errorf("failed to get tags: %w", err)
	}

	latestVersion := s.findLatestCompatibleVersion(currentVersion, tags)
	if latestVersion == nil {
		return &UpdateResult{
			HasUpdate:      false,
			UpdateType:     "tag",
			CurrentVersion: parts.Tag,
			CheckTime:      time.Now(),
			ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
		}, nil
	}

	hasUpdate := s.isNewerVersion(latestVersion, currentVersion)

	return &UpdateResult{
		HasUpdate:      hasUpdate,
		UpdateType:     "tag",
		CurrentVersion: parts.Tag,
		LatestVersion:  s.versionToString(latestVersion),
		CheckTime:      time.Now(),
		ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
	}, nil
}

func (s *ImageUpdateService) getImageTags(ctx context.Context, parts *ImageParts, registry *models.ContainerRegistry) ([]string, error) {
	registryUtils := utils.NewRegistryUtils()

	token, err := s.getRegistryToken(ctx, parts.Registry, parts.Repository, registry)
	if err != nil {
		return nil, fmt.Errorf("failed to get registry token: %w", err)
	}

	normalizedRepo := s.normalizeRepository(parts.Registry, parts.Repository)
	return registryUtils.GetImageTags(ctx, parts.Registry, normalizedRepo, token)
}

func (s *ImageUpdateService) parseVersion(tag string) *VersionInfo {
	// Handle semantic versioning patterns
	if matches := utils.SemanticVersionRegex.FindStringSubmatch(tag); matches != nil {
		major, _ := strconv.Atoi(matches[1])
		minor, _ := strconv.Atoi(matches[2])
		patch, _ := strconv.Atoi(matches[3])

		return &VersionInfo{
			Major:     &major,
			Minor:     &minor,
			Patch:     &patch,
			FormatStr: "semantic",
		}
	}

	// Handle date-based versioning (YYYY.MM.DD)
	if matches := utils.DateVersionRegex.FindStringSubmatch(tag); matches != nil {
		year, _ := strconv.Atoi(matches[1])
		month, _ := strconv.Atoi(matches[2])
		day, _ := strconv.Atoi(matches[3])

		return &VersionInfo{
			Major:     &year,
			Minor:     &month,
			Patch:     &day,
			FormatStr: "date",
		}
	}

	// Handle simple numeric versioning
	if matches := utils.NumericVersionRegex.FindStringSubmatch(tag); matches != nil {
		major, _ := strconv.Atoi(matches[1])
		var minor, patch *int
		if len(matches) > 2 && matches[2] != "" {
			m, _ := strconv.Atoi(matches[2])
			minor = &m
		}
		if len(matches) > 3 && matches[3] != "" {
			p, _ := strconv.Atoi(matches[3])
			patch = &p
		}

		return &VersionInfo{
			Major:     &major,
			Minor:     minor,
			Patch:     patch,
			FormatStr: "numeric",
		}
	}

	return nil
}

func (s *ImageUpdateService) findLatestCompatibleVersion(current *VersionInfo, tags []string) *VersionInfo {
	var latest *VersionInfo

	for _, tag := range tags {
		version := s.parseVersion(tag)
		if version == nil || version.FormatStr != current.FormatStr {
			continue
		}

		// Check compatibility based on semantic versioning rules
		if !s.isCompatibleVersion(current, version) {
			continue
		}

		if latest == nil || s.isNewerVersion(version, latest) {
			latest = version
		}
	}

	return latest
}

func (s *ImageUpdateService) isCompatibleVersion(base, candidate *VersionInfo) bool {
	// Same format is required
	if base.FormatStr != candidate.FormatStr {
		return false
	}

	// For semantic versioning, ensure major version compatibility
	if base.FormatStr == "semantic" {
		return base.Major != nil && candidate.Major != nil && *base.Major == *candidate.Major
	}

	// For other formats, allow any newer version
	return true
}

func (s *ImageUpdateService) isNewerVersion(newer, current *VersionInfo) bool {
	if newer.Major != nil && current.Major != nil {
		if *newer.Major > *current.Major {
			return true
		}
		if *newer.Major < *current.Major {
			return false
		}
	}

	if newer.Minor != nil && current.Minor != nil {
		if *newer.Minor > *current.Minor {
			return true
		}
		if *newer.Minor < *current.Minor {
			return false
		}
	}

	if newer.Patch != nil && current.Patch != nil {
		return *newer.Patch > *current.Patch
	}

	return false
}

func (s *ImageUpdateService) parseImageReference(imageRef string) *ImageParts {
	var registry, repository, tag string

	if strings.Contains(imageRef, "@sha256:") {
		digestParts := strings.Split(imageRef, "@")
		if len(digestParts) != 2 {
			return nil
		}

		repoWithRegistry := digestParts[0]
		parts := strings.Split(repoWithRegistry, "/")

		if strings.Contains(parts[0], ".") || strings.Contains(parts[0], ":") {
			registry = parts[0]
			repository = strings.Join(parts[1:], "/")
		} else {
			registry = "docker.io"
			if len(parts) == 1 {
				repository = "library/" + parts[0]
			} else {
				repository = repoWithRegistry
			}
		}

		tag = "latest"
	} else {
		parts := strings.Split(imageRef, "/")

		if len(parts) == 1 {
			registry = "docker.io"
			if strings.Contains(parts[0], ":") {
				repoParts := strings.Split(parts[0], ":")
				repository = "library/" + repoParts[0]
				tag = repoParts[1]
			} else {
				repository = "library/" + parts[0]
				tag = "latest"
			}
		} else if strings.Contains(parts[0], ".") || strings.Contains(parts[0], ":") {
			registry = parts[0]
			repository = strings.Join(parts[1:], "/")

			if strings.Contains(repository, ":") {
				repoParts := strings.Split(repository, ":")
				repository = repoParts[0]
				tag = repoParts[1]
			} else {
				tag = "latest"
			}
		} else {
			registry = "docker.io"
			repository = imageRef

			if strings.Contains(repository, ":") {
				repoParts := strings.Split(repository, ":")
				repository = repoParts[0]
				tag = repoParts[1]
			} else {
				tag = "latest"
			}
		}
	}

	return &ImageParts{
		Registry:   registry,
		Repository: repository,
		Tag:        tag,
	}
}

func (s *ImageUpdateService) getImageRefByID(ctx context.Context, imageID string) (string, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	imageID = strings.TrimPrefix(imageID, "sha256:")

	inspectResponse, err := dockerClient.ImageInspect(ctx, imageID)
	if err != nil {
		return "", fmt.Errorf("image not found: %w", err)
	}

	fmt.Printf("DEBUG: RepoTags: %v\n", inspectResponse.RepoTags)
	fmt.Printf("DEBUG: RepoDigests: %v\n", inspectResponse.RepoDigests)

	if len(inspectResponse.RepoTags) > 0 {
		for _, tag := range inspectResponse.RepoTags {
			if tag != "<none>:<none>" {
				fmt.Printf("DEBUG: Using RepoTag: %s\n", tag)
				return tag, nil
			}
		}
	}

	if len(inspectResponse.RepoDigests) > 0 {
		for _, digest := range inspectResponse.RepoDigests {
			if digest != "<none>@<none>" {
				digestParts := strings.Split(digest, "@")
				if len(digestParts) == 2 {
					imageRef := digestParts[0] + ":latest"
					fmt.Printf("DEBUG: Using RepoDigest as: %s\n", imageRef)
					return imageRef, nil
				}
			}
		}
	}

	return "", fmt.Errorf("no valid repository tags or digests found for image")
}

func (s *ImageUpdateService) getAllImageRefs(ctx context.Context, limit int) ([]string, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	images, err := dockerClient.ImageList(ctx, image.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list Docker images: %w", err)
	}

	var imageRefs []string
	for _, img := range images {
		for _, tag := range img.RepoTags {
			if tag != "<none>:<none>" {
				imageRefs = append(imageRefs, tag)
			}
		}

		if limit > 0 && len(imageRefs) >= limit {
			break
		}
	}

	if limit > 0 && len(imageRefs) > limit {
		imageRefs = imageRefs[:limit]
	}

	return imageRefs, nil
}

func (s *ImageUpdateService) getLocalImageDigest(ctx context.Context, imageRef string) (string, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	inspectResponse, err := dockerClient.ImageInspect(ctx, imageRef)
	if err != nil {
		return "", fmt.Errorf("failed to inspect image: %w", err)
	}

	if len(inspectResponse.RepoDigests) > 0 {
		digestParts := strings.Split(inspectResponse.RepoDigests[0], "@")
		if len(digestParts) == 2 {
			return digestParts[1], nil
		}
	}

	return inspectResponse.ID, nil
}

func (s *ImageUpdateService) versionToString(version *VersionInfo) string {
	result := ""
	if version.Major != nil {
		result = strconv.Itoa(*version.Major)
	}
	if version.Minor != nil {
		result += "." + strconv.Itoa(*version.Minor)
	}
	if version.Patch != nil {
		result += "." + strconv.Itoa(*version.Patch)
	}
	return result
}

// Helper methods that can reuse existing logic from ImageMaturityService
func (s *ImageUpdateService) getRegistryForImage(ctx context.Context, registry string) *models.ContainerRegistry {
	normalizedDomain := s.normalizeRegistryURL(registry)

	registries, err := s.registryService.GetAllRegistries(ctx)
	if err != nil {
		return nil
	}

	for _, reg := range registries {
		if !reg.Enabled {
			continue
		}

		normalizedRegURL := s.normalizeRegistryURL(reg.URL)
		if normalizedRegURL == normalizedDomain {
			return &reg
		}
	}

	return nil
}

func (s *ImageUpdateService) normalizeRegistryURL(url string) string {
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

func (s *ImageUpdateService) normalizeRepository(registry, repository string) string {
	if registry == "docker.io" {
		if !strings.Contains(repository, "/") {
			return "library/" + repository
		}
	}
	return repository
}

func (s *ImageUpdateService) isSpecialTag(tag string) bool {
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

func (s *ImageUpdateService) CheckImageUpdateByID(ctx context.Context, imageID string) (*UpdateResult, error) {
	imageRef, err := s.getImageRefByID(ctx, imageID)
	if err != nil {
		return nil, fmt.Errorf("failed to get image reference: %w", err)
	}

	result, err := s.CheckImageUpdate(ctx, imageRef)
	if err != nil {
		return nil, err
	}

	s.saveUpdateResultByID(ctx, imageID, result)
	return result, nil
}

func (s *ImageUpdateService) saveUpdateResult(ctx context.Context, imageRef string, result *UpdateResult) error {
	parts := s.parseImageReference(imageRef)
	if parts == nil {
		return fmt.Errorf("invalid image reference")
	}

	imageID, err := s.getImageIDByRef(ctx, imageRef)
	if err != nil {
		return fmt.Errorf("failed to get image ID: %w", err)
	}

	return s.saveUpdateResultByID(ctx, imageID, result)
}

func (s *ImageUpdateService) saveUpdateResultByID(ctx context.Context, imageID string, result *UpdateResult) error {
	var lastError *string
	if result.Error != "" {
		lastError = &result.Error
	}

	var latestVersion *string
	if result.LatestVersion != "" {
		latestVersion = &result.LatestVersion
	}

	var currentDigest *string
	if result.CurrentDigest != "" {
		currentDigest = &result.CurrentDigest
	}

	var latestDigest *string
	if result.LatestDigest != "" {
		latestDigest = &result.LatestDigest
	}

	var image models.Image
	if err := s.db.WithContext(ctx).Where("id = ?", imageID).First(&image).Error; err != nil {
		return fmt.Errorf("image not found: %w", err)
	}

	currentVersion := result.CurrentVersion
	if currentVersion == "" {
		currentVersion = image.Tag
	}

	updateRecord := &models.ImageUpdateRecord{
		ID:             imageID,
		Repository:     image.Repo,
		Tag:            image.Tag,
		HasUpdate:      result.HasUpdate,
		UpdateType:     result.UpdateType,
		CurrentVersion: currentVersion,
		LatestVersion:  latestVersion,
		CurrentDigest:  currentDigest,
		LatestDigest:   latestDigest,
		CheckTime:      result.CheckTime,
		ResponseTimeMs: result.ResponseTimeMs,
		LastError:      lastError,
	}

	return s.db.WithContext(ctx).Save(updateRecord).Error
}

func (s *ImageUpdateService) getImageIDByRef(ctx context.Context, imageRef string) (string, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	inspectResponse, err := dockerClient.ImageInspect(ctx, imageRef)
	if err != nil {
		return "", fmt.Errorf("image not found: %w", err)
	}

	return inspectResponse.ID, nil
}

func (s *ImageUpdateService) CheckMultipleImages(ctx context.Context, imageRefs []string) (map[string]*UpdateResult, error) {
	results := make(map[string]*UpdateResult)

	for _, imageRef := range imageRefs {
		result, err := s.CheckImageUpdate(ctx, imageRef)
		if err != nil {
			results[imageRef] = &UpdateResult{
				Error:     err.Error(),
				CheckTime: time.Now(),
			}
		} else {
			results[imageRef] = result
		}
	}

	return results, nil
}

func (s *ImageUpdateService) CheckAllImages(ctx context.Context, limit int) (map[string]*UpdateResult, error) {
	imageRefs, err := s.getAllImageRefs(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get image references: %w", err)
	}

	return s.CheckMultipleImages(ctx, imageRefs)
}

func (s *ImageUpdateService) TriggerBulkUpdateCheck(ctx context.Context, imageIDs []string) error {
	for _, imageID := range imageIDs {
		_, err := s.CheckImageUpdateByID(ctx, imageID)
		if err != nil {
			continue
		}
	}
	return nil
}

func (s *ImageUpdateService) GetUpdateRecordByImageID(ctx context.Context, imageID string) (*models.ImageUpdateRecord, error) {
	var record models.ImageUpdateRecord
	err := s.db.WithContext(ctx).Where("id = ?", imageID).First(&record).Error
	if err != nil {
		return nil, err
	}
	return &record, nil
}

func (s *ImageUpdateService) DeleteUpdateRecord(ctx context.Context, imageID string) error {
	return s.db.WithContext(ctx).Where("id = ?", imageID).Delete(&models.ImageUpdateRecord{}).Error
}

func (s *ImageUpdateService) CleanupOrphanedRecords(ctx context.Context) error {
	subQuery := s.db.WithContext(ctx).Model(&models.Image{}).Select("id")

	return s.db.WithContext(ctx).
		Where("id NOT IN (?)", subQuery).
		Delete(&models.ImageUpdateRecord{}).Error
}

func (s *ImageUpdateService) GetUpdateSummary(ctx context.Context) (*UpdateSummary, error) {
	var totalImages int64
	var imagesWithUpdates int64
	var digestUpdates int64
	var tagUpdates int64
	var errorsCount int64

	s.db.WithContext(ctx).Model(&models.ImageUpdateRecord{}).Count(&totalImages)
	s.db.WithContext(ctx).Model(&models.ImageUpdateRecord{}).Where("has_update = ?", true).Count(&imagesWithUpdates)
	s.db.WithContext(ctx).Model(&models.ImageUpdateRecord{}).Where("has_update = ? AND update_type = ?", true, "digest").Count(&digestUpdates)
	s.db.WithContext(ctx).Model(&models.ImageUpdateRecord{}).Where("has_update = ? AND update_type = ?", true, "tag").Count(&tagUpdates)
	s.db.WithContext(ctx).Model(&models.ImageUpdateRecord{}).Where("last_error IS NOT NULL").Count(&errorsCount)

	return &UpdateSummary{
		TotalImages:       int(totalImages),
		ImagesWithUpdates: int(imagesWithUpdates),
		DigestUpdates:     int(digestUpdates),
		TagUpdates:        int(tagUpdates),
		ErrorsCount:       int(errorsCount),
	}, nil
}

func (s *ImageUpdateService) GetAvailableVersions(ctx context.Context, imageRef string, limit int) (*AvailableVersions, error) {
	parts := s.parseImageReference(imageRef)
	if parts == nil {
		return nil, fmt.Errorf("invalid image reference format")
	}

	registry := s.getRegistryForImage(ctx, parts.Registry)

	tags, err := s.getImageTags(ctx, parts, registry)
	if err != nil {
		return nil, fmt.Errorf("failed to get tags: %w", err)
	}

	if limit > 0 && len(tags) > limit {
		tags = tags[:limit]
	}

	var latest string
	currentVersion := s.parseVersion(parts.Tag)
	if currentVersion != nil {
		latestVersion := s.findLatestCompatibleVersion(currentVersion, tags)
		if latestVersion != nil {
			latest = s.versionToString(latestVersion)
		}
	}

	return &AvailableVersions{
		ImageRef: imageRef,
		Current:  parts.Tag,
		Versions: tags,
		Latest:   latest,
	}, nil
}

func (s *ImageUpdateService) CompareVersions(ctx context.Context, imageRef, currentVersion, targetVersion string) (*VersionComparison, error) {
	currentVer := s.parseVersion(currentVersion)
	targetVer := s.parseVersion(targetVersion)

	if currentVer == nil || targetVer == nil {
		return &VersionComparison{
			CurrentVersion: currentVersion,
			TargetVersion:  targetVersion,
			IsNewer:        false,
			UpdateType:     "unknown",
			ChangeLevel:    "unknown",
		}, nil
	}

	isNewer := s.isNewerVersion(targetVer, currentVer)

	var changeLevel string
	if currentVer.Major != nil && targetVer.Major != nil {
		if *targetVer.Major > *currentVer.Major {
			changeLevel = "major"
		} else if targetVer.Minor != nil && currentVer.Minor != nil && *targetVer.Minor > *currentVer.Minor {
			changeLevel = "minor"
		} else {
			changeLevel = "patch"
		}
	} else {
		changeLevel = "unknown"
	}

	return &VersionComparison{
		CurrentVersion: currentVersion,
		TargetVersion:  targetVersion,
		IsNewer:        isNewer,
		UpdateType:     currentVer.FormatStr,
		ChangeLevel:    changeLevel,
	}, nil
}
