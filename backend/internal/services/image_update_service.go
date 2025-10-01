package services

import (
	"context"
	"fmt"
	"regexp"
	"strconv"
	"strings"
	"time"

	"log/slog"
	"sync"

	"github.com/docker/docker/api/types/image"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	registry "github.com/ofkm/arcane-backend/internal/utils/registry"
)

var (
	semanticVersionRegex = regexp.MustCompile(`^(?:v)?(\d+)\.(\d+)\.(\d+)$`)
	dateVersionRegex     = regexp.MustCompile(`^(\d{4})\.(\d{1,2})\.(\d{1,2})$`)
	numericVersionRegex  = regexp.MustCompile(`^(\d+)(?:\.(\d+))?(?:\.(\d+))?$`)
)

type ImageUpdateService struct {
	db              *database.DB
	settingsService *SettingsService
	registryService *ContainerRegistryService
	dockerService   *DockerClientService
	eventService    *EventService
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

func NewImageUpdateService(db *database.DB, settingsService *SettingsService, registryService *ContainerRegistryService, dockerService *DockerClientService, eventService *EventService) *ImageUpdateService {
	return &ImageUpdateService{
		db:              db,
		settingsService: settingsService,
		registryService: registryService,
		dockerService:   dockerService,
		eventService:    eventService,
	}
}

func (s *ImageUpdateService) CheckImageUpdate(ctx context.Context, imageRef string) (*dto.ImageUpdateResponse, error) {
	startTime := time.Now()

	parts := s.parseImageReference(imageRef)
	if parts == nil {
		return &dto.ImageUpdateResponse{
			Error:          "Invalid image reference format",
			CheckTime:      time.Now(),
			ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
		}, nil
	}

	registries := s.getRegistriesForImage(ctx, parts.Registry)

	digestResult, err := s.checkDigestUpdate(ctx, parts, registries)
	if err != nil {
		result := &dto.ImageUpdateResponse{
			Error:          err.Error(),
			CheckTime:      time.Now(),
			ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
		}
		metadata := models.JSON{
			"action":    "check_update",
			"imageRef":  imageRef,
			"error":     err.Error(),
			"checkType": "digest",
		}
		if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImageScan, "", imageRef, systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
			slog.WarnContext(ctx, "Failed to log image update check error event",
				slog.String("imageRef", imageRef),
				slog.String("error", logErr.Error()))
		}
		if saveErr := s.saveUpdateResult(ctx, imageRef, result); saveErr != nil {
			slog.WarnContext(ctx, "Failed to save update result",
				slog.String("imageRef", imageRef),
				slog.String("error", saveErr.Error()))
		}
		return result, err
	}

	if !digestResult.HasUpdate && !s.isSpecialTag(parts.Tag) {
		tagResult, err := s.checkTagUpdate(ctx, parts, registries)
		if err != nil {
			result := &dto.ImageUpdateResponse{
				Error:          err.Error(),
				CheckTime:      time.Now(),
				ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
			}
			metadata := models.JSON{
				"action":    "check_update",
				"imageRef":  imageRef,
				"error":     err.Error(),
				"checkType": "tag",
			}
			if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImageScan, "", imageRef, systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
				slog.WarnContext(ctx, "Failed to log image update check error event",
					slog.String("imageRef", imageRef),
					slog.String("error", logErr.Error()))
			}
			if saveErr := s.saveUpdateResult(ctx, imageRef, result); saveErr != nil {
				slog.WarnContext(ctx, "Failed to save update result",
					slog.String("imageRef", imageRef),
					slog.String("error", saveErr.Error()))
			}
			return result, err
		}
		if tagResult.HasUpdate {
			tagResult.ResponseTimeMs = int(time.Since(startTime).Milliseconds())
			metadata := models.JSON{
				"action":         "check_update",
				"imageRef":       imageRef,
				"hasUpdate":      true,
				"updateType":     "tag",
				"currentVersion": tagResult.CurrentVersion,
				"latestVersion":  tagResult.LatestVersion,
				"responseTimeMs": tagResult.ResponseTimeMs,
			}
			if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImageScan, "", imageRef, systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
				slog.WarnContext(ctx, "Failed to log image update check event",
					slog.String("imageRef", imageRef),
					slog.String("error", logErr.Error()))
			}
			if saveErr := s.saveUpdateResult(ctx, imageRef, tagResult); saveErr != nil {
				slog.WarnContext(ctx, "Failed to save update result",
					slog.String("imageRef", imageRef),
					slog.String("error", saveErr.Error()))
			}
			return tagResult, nil
		}
	}

	digestResult.ResponseTimeMs = int(time.Since(startTime).Milliseconds())
	metadata := models.JSON{
		"action":         "check_update",
		"imageRef":       imageRef,
		"hasUpdate":      digestResult.HasUpdate,
		"updateType":     "digest",
		"currentDigest":  digestResult.CurrentDigest,
		"latestDigest":   digestResult.LatestDigest,
		"responseTimeMs": digestResult.ResponseTimeMs,
	}
	if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImageScan, "", imageRef, systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
		slog.WarnContext(ctx, "Failed to log image update check event",
			slog.String("imageRef", imageRef),
			slog.String("error", logErr.Error()))
	}
	if saveErr := s.saveUpdateResult(ctx, imageRef, digestResult); saveErr != nil {
		slog.WarnContext(ctx, "Failed to save update result",
			slog.String("imageRef", imageRef),
			slog.String("error", saveErr.Error()))
	}
	return digestResult, nil
}

type authDetails struct {
	Method   string
	Username string
	Registry string
}

// Try anonymous first, then each matching registry credential (decrypting token)
// until one returns a token. If auth is not required, returns empty token.
func (s *ImageUpdateService) getRegistryToken(ctx context.Context, regHost, repository string, regs []models.ContainerRegistry) (string, *authDetails, error) {
	rc := registry.NewClient()

	slog.DebugContext(ctx, "Checking registry auth",
		slog.String("registry", regHost),
		slog.String("repository", repository))

	authURL, err := rc.CheckAuth(ctx, regHost)
	if err != nil {
		slog.DebugContext(ctx, "Registry auth check failed",
			slog.String("registry", regHost),
			slog.String("error", err.Error()))
		return "", nil, fmt.Errorf("failed to check auth: %w", err)
	}

	// No auth required
	if authURL == "" {
		return "", &authDetails{Method: "none", Registry: regHost}, nil
	}

	// 1) Try anonymous (works for many public repos)
	anonToken, anonErr := rc.GetToken(ctx, authURL, repository, nil)
	if anonErr == nil && anonToken != "" {
		return anonToken, &authDetails{Method: "anonymous", Registry: regHost}, nil
	}

	// 2) Try each matching enabled registry credential
	var lastErr error
	for i, reg := range regs {
		if reg.Username == "" || reg.Token == "" {
			continue
		}
		decrypted, decErr := utils.Decrypt(reg.Token)
		if decErr != nil {
			lastErr = decErr
			continue
		}
		creds := &registry.Credentials{Username: reg.Username, Token: decrypted}
		token, err := rc.GetToken(ctx, authURL, repository, creds)
		if err == nil && token != "" {
			return token, &authDetails{Method: "credential", Username: reg.Username, Registry: regHost}, nil
		}
		if err != nil {
			lastErr = err
		} else {
			lastErr = fmt.Errorf("empty token (cred idx %d)", i)
		}
	}

	if lastErr != nil {
		return "", nil, fmt.Errorf("failed to get registry token: %w", lastErr)
	}
	return "", nil, fmt.Errorf("failed to get registry token")
}

const (
	UpdateScopeNone  = "none"  // Allow any update that matches format structure
	UpdateScopeMajor = "major" // Require same major (allow minor/patch changes)
	UpdateScopeMinor = "minor" // Require same major+minor (allow patch changes)
	UpdateScopePatch = "patch" // Require same major+minor+patch (effectively for digest-only)
)

func (s *ImageUpdateService) getUpdateScope() string { return UpdateScopeNone }

func (s *ImageUpdateService) checkDigestUpdate(ctx context.Context, parts *ImageParts, registries []models.ContainerRegistry) (*dto.ImageUpdateResponse, error) {
	rc := registry.NewClient()

	token, auth, err := s.getRegistryToken(ctx, parts.Registry, parts.Repository, registries)
	if err != nil {
		return nil, fmt.Errorf("failed to get registry token: %w", err)
	}

	normalizedRepo := s.normalizeRepository(parts.Registry, parts.Repository)

	start := time.Now()
	remoteDigest, _, err := rc.GetLatestDigestTimed(ctx, parts.Registry, normalizedRepo, parts.Tag, token)
	if err != nil && strings.Contains(strings.ToLower(err.Error()), "unauthorized") {
		// Attempt to resolve auth header via registry helpers and retry once
		enabledRegs, _ := s.registryService.GetEnabledRegistries(ctx)
		authHeader, _, _, resolveErr := registry.ResolveAuthHeaderForRepository(ctx, parts.Registry, normalizedRepo, parts.Tag, enabledRegs)
		if resolveErr == nil && authHeader != "" {
			remoteDigest, _, err = rc.GetLatestDigestTimed(ctx, parts.Registry, normalizedRepo, parts.Tag, authHeader)
		}
	}
	elapsed := time.Since(start)
	if err != nil {
		return nil, fmt.Errorf("failed to get remote digest: %w", err)
	}

	localDigest, err := s.getLocalImageDigest(ctx, fmt.Sprintf("%s/%s:%s", parts.Registry, parts.Repository, parts.Tag))
	if err != nil {
		return nil, fmt.Errorf("failed to get local digest: %w", err)
	}

	hasUpdate := localDigest != remoteDigest
	return &dto.ImageUpdateResponse{
		HasUpdate:      hasUpdate,
		UpdateType:     "digest",
		CurrentDigest:  localDigest,
		LatestDigest:   remoteDigest,
		CheckTime:      time.Now(),
		ResponseTimeMs: int(elapsed.Milliseconds()),
		AuthMethod:     auth.Method,
		AuthUsername:   auth.Username,
		AuthRegistry:   auth.Registry,
		UsedCredential: auth.Method == "credential",
	}, nil
}

func (s *ImageUpdateService) checkTagUpdate(ctx context.Context, parts *ImageParts, registries []models.ContainerRegistry) (*dto.ImageUpdateResponse, error) {
	startTime := time.Now()

	currentVersion := s.parseVersion(parts.Tag)
	if currentVersion == nil {
		return &dto.ImageUpdateResponse{
			HasUpdate:      false,
			UpdateType:     "tag",
			CurrentVersion: parts.Tag,
			CheckTime:      time.Now(),
			ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
			AuthRegistry:   parts.Registry,
			AuthMethod:     "unknown",
		}, nil
	}

	tags, auth, err := s.getImageTags(ctx, parts, registries)
	if err != nil {
		return nil, fmt.Errorf("failed to get tags: %w", err)
	}

	updateScope := s.getUpdateScope()
	latestVersion := s.findLatestCompatibleVersionWithScope(currentVersion, tags, updateScope)
	if latestVersion == nil {
		return &dto.ImageUpdateResponse{
			HasUpdate:      false,
			UpdateType:     "tag",
			CurrentVersion: parts.Tag,
			CheckTime:      time.Now(),
			ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
			AuthMethod:     auth.Method,
			AuthUsername:   auth.Username,
			AuthRegistry:   auth.Registry,
			UsedCredential: auth.Method == "credential",
		}, nil
	}

	hasUpdate := s.isNewerVersion(latestVersion, currentVersion)
	return &dto.ImageUpdateResponse{
		HasUpdate:      hasUpdate,
		UpdateType:     "tag",
		CurrentVersion: parts.Tag,
		LatestVersion:  s.versionToString(latestVersion),
		CheckTime:      time.Now(),
		ResponseTimeMs: int(time.Since(startTime).Milliseconds()),
		AuthMethod:     auth.Method,
		AuthUsername:   auth.Username,
		AuthRegistry:   auth.Registry,
		UsedCredential: auth.Method == "credential",
	}, nil
}

func (s *ImageUpdateService) findLatestCompatibleVersionWithScope(current *VersionInfo, tags []string, updateScope string) *VersionInfo {
	var latest *VersionInfo
	for _, tag := range tags {
		version := s.parseVersion(tag)
		if version == nil || version.FormatStr != current.FormatStr {
			continue
		}
		if !s.matchesVersionStructure(current, version) {
			continue
		}
		if !s.isAllowedByUpdateScope(current, version, updateScope) {
			continue
		}
		if latest == nil || s.isNewerVersion(version, latest) {
			latest = version
		}
	}
	return latest
}

// matchesVersionStructure ensures minor/patch presence matches between versions
func (s *ImageUpdateService) matchesVersionStructure(base, candidate *VersionInfo) bool {
	// Minor presence must match (both Some or both None)
	if (base.Minor == nil) != (candidate.Minor == nil) {
		return false
	}

	// Patch presence must match (both Some or both None)
	if (base.Patch == nil) != (candidate.Patch == nil) {
		return false
	}

	return true
}

func (s *ImageUpdateService) isAllowedByUpdateScope(base, candidate *VersionInfo, updateScope string) bool {
	switch updateScope {
	case UpdateScopeMajor:
		// Require same major
		return base.Major != nil && candidate.Major != nil &&
			*base.Major == *candidate.Major

	case UpdateScopeMinor:
		// Require same major and minor
		return base.Major != nil && candidate.Major != nil &&
			base.Minor != nil && candidate.Minor != nil &&
			*base.Major == *candidate.Major &&
			*base.Minor == *candidate.Minor

	case UpdateScopePatch:
		// Require same major, minor, and patch
		return base.Major != nil && candidate.Major != nil &&
			base.Minor != nil && candidate.Minor != nil &&
			base.Patch != nil && candidate.Patch != nil &&
			*base.Major == *candidate.Major &&
			*base.Minor == *candidate.Minor &&
			*base.Patch == *candidate.Patch

	default: // UpdateScopeNone
		// Allow any version with matching structure
		return true
	}
}

func (s *ImageUpdateService) getImageTags(ctx context.Context, parts *ImageParts, registries []models.ContainerRegistry) ([]string, *authDetails, error) {
	rc := registry.NewClient()

	token, auth, err := s.getRegistryToken(ctx, parts.Registry, parts.Repository, registries)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get registry token: %w", err)
	}

	normalizedRepo := s.normalizeRepository(parts.Registry, parts.Repository)
	slog.DebugContext(ctx, "Fetching tags",
		slog.String("registry", parts.Registry),
		slog.String("repository", normalizedRepo),
		slog.String("authMethod", auth.Method),
		slog.String("authUser", auth.Username))

	tags, err := rc.GetImageTags(ctx, parts.Registry, normalizedRepo, token)
	if err != nil && strings.Contains(strings.ToLower(err.Error()), "unauthorized") {
		enabledRegs, _ := s.registryService.GetEnabledRegistries(ctx)
		authHeader, method, username, resolveErr := registry.ResolveAuthHeaderForRepository(ctx, parts.Registry, normalizedRepo, "", enabledRegs)
		if resolveErr == nil && authHeader != "" {
			tags, err = rc.GetImageTags(ctx, parts.Registry, normalizedRepo, authHeader)
			if err == nil {
				// update auth info to reflect how we retried
				auth = &authDetails{Method: method, Username: username, Registry: parts.Registry}
			}
		}
	}
	if err != nil {
		return nil, nil, err
	}
	return tags, auth, nil
}

func (s *ImageUpdateService) parseVersion(tag string) *VersionInfo {
	if matches := semanticVersionRegex.FindStringSubmatch(tag); matches != nil {
		major, _ := strconv.Atoi(matches[1])
		minor, _ := strconv.Atoi(matches[2])
		patch, _ := strconv.Atoi(matches[3])
		return &VersionInfo{Major: &major, Minor: &minor, Patch: &patch, FormatStr: "semantic"}
	}
	if matches := dateVersionRegex.FindStringSubmatch(tag); matches != nil {
		year, _ := strconv.Atoi(matches[1])
		month, _ := strconv.Atoi(matches[2])
		day, _ := strconv.Atoi(matches[3])
		return &VersionInfo{Major: &year, Minor: &month, Patch: &day, FormatStr: "date"}
	}
	if matches := numericVersionRegex.FindStringSubmatch(tag); matches != nil {
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
		return &VersionInfo{Major: &major, Minor: minor, Patch: patch, FormatStr: "numeric"}
	}
	return nil
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
	var registryHost, repository, tag string
	if strings.Contains(imageRef, "@sha256:") {
		digestParts := strings.Split(imageRef, "@")
		if len(digestParts) != 2 {
			return nil
		}
		repoWithRegistry := digestParts[0]
		parts := strings.Split(repoWithRegistry, "/")
		if strings.Contains(parts[0], ".") || strings.Contains(parts[0], ":") {
			registryHost = parts[0]
			repository = strings.Join(parts[1:], "/")
		} else {
			registryHost = "docker.io"
			if len(parts) == 1 {
				repository = "library/" + parts[0]
			} else {
				repository = repoWithRegistry
			}
		}
		tag = "latest"
	} else {
		parts := strings.Split(imageRef, "/")
		switch {
		case len(parts) == 1:
			registryHost = "docker.io"
			if strings.Contains(parts[0], ":") {
				repoParts := strings.Split(parts[0], ":")
				repository = "library/" + repoParts[0]
				tag = repoParts[1]
			} else {
				repository = "library/" + parts[0]
				tag = "latest"
			}
		case strings.Contains(parts[0], ".") || strings.Contains(parts[0], ":"):
			registryHost = parts[0]
			repository = strings.Join(parts[1:], "/")
			if strings.Contains(repository, ":") {
				repoParts := strings.Split(repository, ":")
				repository = repoParts[0]
				tag = repoParts[1]
			} else {
				tag = "latest"
			}
		default:
			registryHost = "docker.io"
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
	return &ImageParts{Registry: registryHost, Repository: repository, Tag: tag}
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
	if len(inspectResponse.RepoTags) > 0 {
		for _, tag := range inspectResponse.RepoTags {
			if tag != "<none>:<none>" {
				return tag, nil
			}
		}
	}
	if len(inspectResponse.RepoDigests) > 0 {
		for _, digest := range inspectResponse.RepoDigests {
			if digest != "<none>@<none>" {
				digestParts := strings.Split(digest, "@")
				if len(digestParts) == 2 {
					return digestParts[0] + ":latest", nil
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

func (s *ImageUpdateService) versionToString(v *VersionInfo) string {
	out := ""
	if v.Major != nil {
		out = strconv.Itoa(*v.Major)
	}
	if v.Minor != nil {
		out += "." + strconv.Itoa(*v.Minor)
	}
	if v.Patch != nil {
		out += "." + strconv.Itoa(*v.Patch)
	}
	return out
}

// Returns all enabled credentials whose URL matches the image registry domain (normalized)
func (s *ImageUpdateService) getRegistriesForImage(ctx context.Context, regHost string) []models.ContainerRegistry {
	normalizedDomain := s.normalizeRegistryURL(regHost)

	registries, err := s.registryService.GetAllRegistries(ctx)
	if err != nil {
		slog.DebugContext(ctx, "Failed to load registries for image",
			slog.String("registry", regHost),
			slog.String("error", err.Error()))
		return nil
	}

	var matches []models.ContainerRegistry
	for _, reg := range registries {
		if !reg.Enabled {
			continue
		}
		normalizedRegURL := s.normalizeRegistryURL(reg.URL)
		if normalizedRegURL == normalizedDomain {
			matches = append(matches, reg)
		}
	}

	slog.DebugContext(ctx, "Matched registry credentials for image",
		slog.String("registry", regHost),
		slog.String("normalizedDomain", normalizedDomain),
		slog.Int("matchCount", len(matches)))

	for i, reg := range matches {
		slog.DebugContext(ctx, "Matched credential",
			slog.Int("index", i),
			slog.String("registryURL", reg.URL),
			slog.String("username", reg.Username))
	}

	return matches
}

func (s *ImageUpdateService) normalizeRegistryURL(url string) string {
	url = strings.TrimSpace(strings.ToLower(url))
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")
	url = strings.TrimSuffix(url, "/")

	switch url {
	case "docker.io", "registry-1.docker.io", "index.docker.io":
		return "docker.io"
	}
	return url
}

func (s *ImageUpdateService) normalizeRepository(regHost, repo string) string {
	if regHost == "docker.io" && !strings.Contains(repo, "/") {
		return "library/" + repo
	}
	return repo
}

func (s *ImageUpdateService) isSpecialTag(tag string) bool {
	special := []string{
		"latest", "stable", "unstable", "dev", "devel", "development",
		"test", "testing", "prod", "production", "main", "master",
		"stage", "staging", "canary", "nightly", "edge", "next",
	}
	for _, v := range special {
		if tag == v {
			return true
		}
	}
	return false
}

func (s *ImageUpdateService) CheckImageUpdateByID(ctx context.Context, imageID string) (*dto.ImageUpdateResponse, error) {
	imageRef, err := s.getImageRefByID(ctx, imageID)
	if err != nil {
		metadata := models.JSON{
			"action":  "check_update_by_id",
			"imageID": imageID,
			"error":   err.Error(),
		}
		if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImageScan, imageID, "", systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
			slog.WarnContext(ctx, "Failed to log image update check by ID error event",
				slog.String("imageID", imageID),
				slog.String("error", logErr.Error()))
		}
		return nil, fmt.Errorf("failed to get image reference: %w", err)
	}
	result, err := s.CheckImageUpdate(ctx, imageRef)
	if err != nil {
		return nil, err
	}
	if saveErr := s.saveUpdateResultByID(ctx, imageID, result); saveErr != nil {
		slog.WarnContext(ctx, "Failed to save update result by ID",
			slog.String("imageID", imageID),
			slog.String("error", saveErr.Error()))
	}
	return result, nil
}

func (s *ImageUpdateService) saveUpdateResult(ctx context.Context, imageRef string, result *dto.ImageUpdateResponse) error {
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

func (s *ImageUpdateService) saveUpdateResultByID(ctx context.Context, imageID string, result *dto.ImageUpdateResponse) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	dockerImage, err := dockerClient.ImageInspect(ctx, imageID)
	if err != nil {
		return fmt.Errorf("failed to inspect image: %w", err)
	}

	var repo, tag string
	if len(dockerImage.RepoTags) > 0 && dockerImage.RepoTags[0] != "<none>:<none>" {
		parts := strings.SplitN(dockerImage.RepoTags[0], ":", 2)
		repo = parts[0]
		if len(parts) > 1 {
			tag = parts[1]
		} else {
			tag = "latest"
		}
	} else {
		repo = "<none>"
		tag = "<none>"
	}

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

	currentVersion := result.CurrentVersion
	if currentVersion == "" {
		currentVersion = tag
	}

	var authMethod, authUsername, authRegistry *string
	if result.AuthMethod != "" {
		authMethod = &result.AuthMethod
	}
	if result.AuthUsername != "" {
		authUsername = &result.AuthUsername
	}
	if result.AuthRegistry != "" {
		authRegistry = &result.AuthRegistry
	}

	updateRecord := &models.ImageUpdateRecord{
		ID:             imageID,
		Repository:     repo,
		Tag:            tag,
		HasUpdate:      result.HasUpdate,
		UpdateType:     result.UpdateType,
		CurrentVersion: currentVersion,
		LatestVersion:  latestVersion,
		CurrentDigest:  currentDigest,
		LatestDigest:   latestDigest,
		CheckTime:      result.CheckTime,
		ResponseTimeMs: result.ResponseTimeMs,
		LastError:      lastError,
		AuthMethod:     authMethod,
		AuthUsername:   authUsername,
		AuthRegistry:   authRegistry,
		UsedCredential: result.UsedCredential,
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

type batchCred struct {
	username string
	token    string
}

type regAuth struct {
	token string
	auth  *authDetails
}

type batchImage struct {
	ref   string
	parts *ImageParts
}

func (s *ImageUpdateService) parseAndGroupImages(imageRefs []string) (map[string]map[string]struct{}, map[string]*dto.ImageUpdateResponse, []batchImage) {
	regRepos := make(map[string]map[string]struct{})
	results := make(map[string]*dto.ImageUpdateResponse)
	var images []batchImage

	for _, ref := range imageRefs {
		parts := s.parseImageReference(ref)
		if parts == nil {
			results[ref] = &dto.ImageUpdateResponse{
				Error:          "Invalid image reference format",
				CheckTime:      time.Now(),
				ResponseTimeMs: 0,
			}
			continue
		}
		if _, ok := regRepos[parts.Registry]; !ok {
			regRepos[parts.Registry] = make(map[string]struct{})
		}
		regRepos[parts.Registry][s.normalizeRepository(parts.Registry, parts.Repository)] = struct{}{}
		images = append(images, batchImage{ref: ref, parts: parts})
	}
	return regRepos, results, images
}

func (s *ImageUpdateService) buildCredentialMap(ctx context.Context, externalCreds []dto.ContainerRegistryCredential) (map[string]batchCred, []models.ContainerRegistry) {
	var enabledRegs []models.ContainerRegistry
	credMap := make(map[string]batchCred)

	normalizeHost := func(u string) string {
		u = strings.TrimSpace(u)
		u = strings.TrimPrefix(u, "https://")
		u = strings.TrimPrefix(u, "http://")
		return strings.TrimSuffix(u, "/")
	}

	if len(externalCreds) > 0 {
		for _, c := range externalCreds {
			if !c.Enabled || c.Username == "" || c.Token == "" {
				continue
			}
			host := normalizeHost(c.URL)
			if host == "" {
				continue
			}
			if _, exists := credMap[host]; !exists {
				credMap[host] = batchCred{username: c.Username, token: c.Token}
			}
			encToken, encErr := utils.Encrypt(c.Token)
			if encErr != nil {
				slog.WarnContext(ctx, "Failed to encrypt external registry token",
					slog.String("registryURL", c.URL),
					slog.String("error", encErr.Error()))
				continue
			}
			enabledRegs = append(enabledRegs, models.ContainerRegistry{
				URL:      c.URL,
				Username: c.Username,
				Token:    encToken,
				Enabled:  c.Enabled,
			})
		}
		slog.DebugContext(ctx, "Using external credentials for batch check",
			slog.Int("credentialCount", len(credMap)))
		return credMap, enabledRegs
	}

	dbRegs, err := s.registryService.GetEnabledRegistries(ctx)
	if err != nil {
		slog.DebugContext(ctx, "Failed to load enabled registries", slog.String("error", err.Error()))
		return credMap, nil
	}
	enabledRegs = dbRegs

	for _, r := range dbRegs {
		if r.Username == "" || r.Token == "" {
			continue
		}
		host := normalizeHost(r.URL)
		if host == "" {
			continue
		}
		dec, decErr := utils.Decrypt(r.Token)
		if decErr != nil {
			slog.DebugContext(ctx, "Decrypt registry token failed",
				slog.String("registryURL", r.URL),
				slog.String("error", decErr.Error()))
			continue
		}
		if _, exists := credMap[host]; !exists {
			credMap[host] = batchCred{username: r.Username, token: dec}
		}
	}
	return credMap, enabledRegs
}

func (s *ImageUpdateService) buildRegistryAuthMap(ctx context.Context, rc *registry.Client, regRepos map[string]map[string]struct{}, credMap map[string]batchCred) map[string]regAuth {
	regAuthMap := make(map[string]regAuth, len(regRepos))
	normalizeHost := func(u string) string {
		u = strings.TrimSpace(u)
		u = strings.TrimPrefix(u, "https://")
		u = strings.TrimPrefix(u, "http://")
		return strings.TrimSuffix(u, "/")
	}

	for regHost, set := range regRepos {
		repos := make([]string, 0, len(set))
		for r := range set {
			repos = append(repos, r)
		}

		authURL, err := rc.CheckAuth(ctx, regHost)
		if err != nil {
			slog.DebugContext(ctx, "Auth probe failed",
				slog.String("registry", regHost),
				slog.String("error", err.Error()))
			regAuthMap[regHost] = regAuth{token: "", auth: &authDetails{Method: "unknown", Registry: regHost}}
			continue
		}
		// No auth required
		if authURL == "" {
			regAuthMap[regHost] = regAuth{token: "", auth: &authDetails{Method: "none", Registry: regHost}}
			continue
		}
		// Anonymous multi-scope
		if anonToken, anonErr := rc.GetTokenMulti(ctx, authURL, repos, nil); anonErr == nil && anonToken != "" {
			regAuthMap[regHost] = regAuth{token: anonToken, auth: &authDetails{Method: "anonymous", Registry: regHost}}
			continue
		}
		// Credential attempt
		host := normalizeHost(regHost)
		if c, ok := credMap[host]; ok && c.username != "" && c.token != "" {
			creds := &registry.Credentials{Username: c.username, Token: c.token}
			if tok, tokErr := rc.GetTokenMulti(ctx, authURL, repos, creds); tokErr == nil && tok != "" {
				regAuthMap[regHost] = regAuth{
					token: tok,
					auth:  &authDetails{Method: "credential", Username: c.username, Registry: regHost},
				}
				continue
			}
		}
		// Fallback unknown
		regAuthMap[regHost] = regAuth{token: "", auth: &authDetails{Method: "unknown", Registry: regHost}}
	}
	return regAuthMap
}

func (s *ImageUpdateService) checkSingleImageInBatch(
	ctx context.Context,
	rc *registry.Client,
	authMap map[string]regAuth,
	enabledRegs []models.ContainerRegistry,
	parts *ImageParts,
	updateScope string,
) *dto.ImageUpdateResponse {

	start := time.Now()
	authInfo := authMap[parts.Registry]
	token := authInfo.token
	auth := authInfo.auth
	normalizedRepo := s.normalizeRepository(parts.Registry, parts.Repository)

	remoteDigest, _, digestErr := rc.GetLatestDigestTimed(ctx, parts.Registry, normalizedRepo, parts.Tag, token)
	if digestErr != nil && strings.Contains(strings.ToLower(digestErr.Error()), "unauthorized") {
		authHeader, method, username, resolveErr := registry.ResolveAuthHeaderForRepository(ctx, parts.Registry, normalizedRepo, parts.Tag, enabledRegs)
		if resolveErr == nil && authHeader != "" {
			remoteDigest, _, digestErr = rc.GetLatestDigestTimed(ctx, parts.Registry, normalizedRepo, parts.Tag, authHeader)
			if digestErr == nil {
				auth = &authDetails{Method: method, Username: username, Registry: parts.Registry}
			}
		}
	}
	if digestErr != nil {
		return &dto.ImageUpdateResponse{
			Error:          digestErr.Error(),
			CheckTime:      time.Now(),
			ResponseTimeMs: int(time.Since(start).Milliseconds()),
			AuthMethod:     auth.Method,
			AuthUsername:   auth.Username,
			AuthRegistry:   auth.Registry,
			UsedCredential: auth.Method == "credential",
		}
	}

	localDigest, ldErr := s.getLocalImageDigest(ctx, fmt.Sprintf("%s/%s:%s", parts.Registry, parts.Repository, parts.Tag))
	if ldErr != nil {
		return &dto.ImageUpdateResponse{
			Error:          ldErr.Error(),
			CheckTime:      time.Now(),
			ResponseTimeMs: int(time.Since(start).Milliseconds()),
			AuthMethod:     auth.Method,
			AuthUsername:   auth.Username,
			AuthRegistry:   auth.Registry,
			UsedCredential: auth.Method == "credential",
		}
	}

	hasDigestUpdate := localDigest != remoteDigest

	// Tag update path only if digest unchanged and tag is version-like
	if !hasDigestUpdate && !s.isSpecialTag(parts.Tag) {
		curVer := s.parseVersion(parts.Tag)
		if curVer != nil {
			tags, tagErr := rc.GetImageTags(ctx, parts.Registry, normalizedRepo, token)
			if tagErr == nil {
				if latestVer := s.findLatestCompatibleVersionWithScope(curVer, tags, updateScope); latestVer != nil && s.isNewerVersion(latestVer, curVer) {
					return &dto.ImageUpdateResponse{
						HasUpdate:      true,
						UpdateType:     "tag",
						CurrentVersion: parts.Tag,
						LatestVersion:  s.versionToString(latestVer),
						CheckTime:      time.Now(),
						ResponseTimeMs: int(time.Since(start).Milliseconds()),
						AuthMethod:     auth.Method,
						AuthUsername:   auth.Username,
						AuthRegistry:   auth.Registry,
						UsedCredential: auth.Method == "credential",
					}
				}
			}
		}
	}

	return &dto.ImageUpdateResponse{
		HasUpdate:      hasDigestUpdate,
		UpdateType:     "digest",
		CurrentDigest:  localDigest,
		LatestDigest:   remoteDigest,
		CheckTime:      time.Now(),
		ResponseTimeMs: int(time.Since(start).Milliseconds()),
		AuthMethod:     auth.Method,
		AuthUsername:   auth.Username,
		AuthRegistry:   auth.Registry,
		UsedCredential: auth.Method == "credential",
	}
}

func (s *ImageUpdateService) CheckMultipleImages(ctx context.Context, imageRefs []string, externalCreds []dto.ContainerRegistryCredential) (map[string]*dto.ImageUpdateResponse, error) {
	startBatch := time.Now()
	results := make(map[string]*dto.ImageUpdateResponse, len(imageRefs))
	if len(imageRefs) == 0 {
		return results, nil
	}

	rc := registry.NewClient()

	regRepos, initialResults, images := s.parseAndGroupImages(imageRefs)
	for k, v := range initialResults {
		results[k] = v
	}

	credMap, enabledRegs := s.buildCredentialMap(ctx, externalCreds)

	regAuthMap := s.buildRegistryAuthMap(ctx, rc, regRepos, credMap)

	updateScope := s.getUpdateScope()
	outCh := make(chan struct {
		ref string
		res *dto.ImageUpdateResponse
	}, len(images))

	wg := sync.WaitGroup{}
	wg.Add(len(images))
	for _, img := range images {
		go func(bi batchImage) {
			defer wg.Done()
			res := s.checkSingleImageInBatch(ctx, rc, regAuthMap, enabledRegs, bi.parts, updateScope)
			outCh <- struct {
				ref string
				res *dto.ImageUpdateResponse
			}{bi.ref, res}
		}(img)
	}
	wg.Wait()
	close(outCh)

	for item := range outCh {
		results[item.ref] = item.res
		if err := s.saveUpdateResult(ctx, item.ref, item.res); err != nil {
			slog.WarnContext(ctx, "Failed to save update result",
				slog.String("imageRef", item.ref),
				slog.String("error", err.Error()))
		}
	}

	slog.InfoContext(ctx, "Batch image update check completed",
		slog.Int("totalImages", len(imageRefs)),
		slog.Int("successCount", len(results)),
		slog.Duration("duration", time.Since(startBatch)))

	return results, nil
}

func (s *ImageUpdateService) CheckAllImages(ctx context.Context, limit int, externalCreds []dto.ContainerRegistryCredential) (map[string]*dto.ImageUpdateResponse, error) {
	imageRefs, err := s.getAllImageRefs(ctx, limit)
	if err != nil {
		return nil, fmt.Errorf("failed to get image references: %w", err)
	}

	if len(imageRefs) == 0 {
		return make(map[string]*dto.ImageUpdateResponse), nil
	}

	return s.CheckMultipleImages(ctx, imageRefs, externalCreds)
}

func (s *ImageUpdateService) CleanupOrphanedRecords(ctx context.Context) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	// Get all image IDs from Docker
	dockerImages, err := dockerClient.ImageList(ctx, image.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to list Docker images: %w", err)
	}

	dockerImageIDs := make(map[string]bool)
	for _, img := range dockerImages {
		dockerImageIDs[img.ID] = true
	}

	// Get all update records from database
	var updateRecords []models.ImageUpdateRecord
	if err := s.db.WithContext(ctx).Find(&updateRecords).Error; err != nil {
		return fmt.Errorf("failed to query update records: %w", err)
	}

	// Delete records for images that no longer exist in Docker
	orphanedCount := 0
	for _, record := range updateRecords {
		if !dockerImageIDs[record.ID] {
			if err := s.db.WithContext(ctx).Delete(&models.ImageUpdateRecord{}, "id = ?", record.ID).Error; err != nil {
				slog.WarnContext(ctx, "Failed to delete orphaned update record",
					slog.String("imageId", record.ID),
					slog.String("error", err.Error()))
			} else {
				orphanedCount++
			}
		}
	}

	slog.InfoContext(ctx, "Cleaned up orphaned image update records",
		slog.Int("deletedCount", orphanedCount))

	return nil
}

func (s *ImageUpdateService) GetUpdateSummary(ctx context.Context) (*dto.ImageUpdateSummaryResponse, error) {
	var totalImages, imagesWithUpdates, digestUpdates, tagUpdates, errorsCount int64
	s.db.WithContext(ctx).Model(&models.ImageUpdateRecord{}).Count(&totalImages)
	s.db.WithContext(ctx).Model(&models.ImageUpdateRecord{}).Where("has_update = ?", true).Count(&imagesWithUpdates)
	s.db.WithContext(ctx).Model(&models.ImageUpdateRecord{}).Where("has_update = ? AND update_type = ?", true, "digest").Count(&digestUpdates)
	s.db.WithContext(ctx).Model(&models.ImageUpdateRecord{}).Where("has_update = ? AND update_type = ?", true, "tag").Count(&tagUpdates)
	s.db.WithContext(ctx).Model(&models.ImageUpdateRecord{}).Where("last_error IS NOT NULL").Count(&errorsCount)

	return &dto.ImageUpdateSummaryResponse{
		TotalImages:       int(totalImages),
		ImagesWithUpdates: int(imagesWithUpdates),
		DigestUpdates:     int(digestUpdates),
		TagUpdates:        int(tagUpdates),
		ErrorsCount:       int(errorsCount),
	}, nil
}

func (s *ImageUpdateService) GetAvailableVersions(ctx context.Context, imageRef string, limit int) (*dto.ImageVersionsResponse, error) {
	parts := s.parseImageReference(imageRef)
	if parts == nil {
		return nil, fmt.Errorf("invalid image reference format")
	}
	registries := s.getRegistriesForImage(ctx, parts.Registry)
	tags, _, err := s.getImageTags(ctx, parts, registries)
	if err != nil {
		return nil, fmt.Errorf("failed to get tags: %w", err)
	}
	if limit > 0 && len(tags) > limit {
		tags = tags[:limit]
	}
	var latest string
	currentVersion := s.parseVersion(parts.Tag)
	if currentVersion != nil {
		updateScope := s.getUpdateScope()
		if latestVersion := s.findLatestCompatibleVersionWithScope(currentVersion, tags, updateScope); latestVersion != nil {
			latest = s.versionToString(latestVersion)
		}
	}
	return &dto.ImageVersionsResponse{
		ImageRef: imageRef,
		Current:  parts.Tag,
		Versions: tags,
		Latest:   latest,
	}, nil
}

func (s *ImageUpdateService) CompareVersions(ctx context.Context, imageRef, currentVersion, targetVersion string) (*dto.VersionComparisonResponse, error) {
	currentVer := s.parseVersion(currentVersion)
	targetVer := s.parseVersion(targetVersion)

	if currentVer == nil || targetVer == nil {
		return &dto.VersionComparisonResponse{
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
		switch {
		case *targetVer.Major > *currentVer.Major:
			changeLevel = "major"
		case targetVer.Minor != nil && currentVer.Minor != nil && *targetVer.Minor > *currentVer.Minor:
			changeLevel = "minor"
		default:
			changeLevel = "patch"
		}
	} else {
		changeLevel = "unknown"
	}

	return &dto.VersionComparisonResponse{
		CurrentVersion: currentVersion,
		TargetVersion:  targetVersion,
		IsNewer:        isNewer,
		UpdateType:     currentVer.FormatStr,
		ChangeLevel:    changeLevel,
	}, nil
}
