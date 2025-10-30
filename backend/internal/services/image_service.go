package services

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"

	"log/slog"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/registry"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
)

type ImageService struct {
	db                 *database.DB
	dockerService      *DockerClientService
	imageUpdateService *ImageUpdateService
	registryService    *ContainerRegistryService
	eventService       *EventService
}

func NewImageService(db *database.DB, dockerService *DockerClientService, registryService *ContainerRegistryService, imageUpdateService *ImageUpdateService, eventService *EventService) *ImageService {
	return &ImageService{
		db:                 db,
		dockerService:      dockerService,
		registryService:    registryService,
		imageUpdateService: imageUpdateService,
		eventService:       eventService,
	}
}

func (s *ImageService) GetImageByID(ctx context.Context, id string) (*image.InspectResponse, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	inspect, err := dockerClient.ImageInspect(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("inspect not found: %w", err)
	}

	return &inspect, nil
}

func (s *ImageService) RemoveImage(ctx context.Context, id string, force bool, user models.User) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		s.eventService.LogErrorEvent(ctx, models.EventTypeImageError, "image", id, "", user.ID, user.Username, "0", err, models.JSON{"action": "delete", "force": force})
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	imageDetails, inspectErr := dockerClient.ImageInspect(ctx, id)
	var imageName string
	if inspectErr == nil && len(imageDetails.RepoTags) > 0 {
		imageName = imageDetails.RepoTags[0]
	} else {
		imageName = id
	}

	options := image.RemoveOptions{
		Force:         force,
		PruneChildren: true,
	}

	_, err = dockerClient.ImageRemove(ctx, id, options)
	if err != nil {
		s.eventService.LogErrorEvent(ctx, models.EventTypeImageError, "image", id, imageName, user.ID, user.Username, "0", err, models.JSON{"action": "delete", "force": force})
		return fmt.Errorf("failed to remove image: %w", err)
	}

	if s.db != nil {
		s.db.WithContext(ctx).Delete(&models.ImageUpdateRecord{}, "id = ?", id)
	}

	metadata := models.JSON{
		"action":  "delete",
		"imageId": id,
		"force":   force,
	}
	if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImageDelete, id, imageName, user.ID, user.Username, "0", metadata); logErr != nil {
		slog.Warn("could not log image deletion action", slog.Any("err", logErr), slog.String("image", imageName), slog.String("image_id", id))
	}

	return nil
}

func (s *ImageService) PullImage(ctx context.Context, imageName string, progressWriter io.Writer, user models.User, externalCreds []dto.ContainerRegistryCredential) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		s.eventService.LogErrorEvent(ctx, models.EventTypeImageError, "image", "", imageName, user.ID, user.Username, "0", err, models.JSON{"action": "pull"})
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	slog.DebugContext(ctx, "Attempting to pull image",
		slog.String("image", imageName),
		slog.Int("externalCredCount", len(externalCreds)))

	pullOptions, err := s.getPullOptionsWithAuth(ctx, imageName, externalCreds)
	if err != nil {
		slog.WarnContext(ctx, "Failed to get registry authentication for image; proceeding without auth",
			slog.String("image", imageName),
			slog.String("error", err.Error()))
		pullOptions = image.PullOptions{}
	}

	reader, err := dockerClient.ImagePull(ctx, imageName, pullOptions)
	if err != nil {
		slog.ErrorContext(ctx, "Docker ImagePull failed",
			slog.String("image", imageName),
			slog.Bool("hasAuth", pullOptions.RegistryAuth != ""),
			slog.String("error", err.Error()))
		s.eventService.LogErrorEvent(ctx, models.EventTypeImageError, "image", "", imageName, user.ID, user.Username, "0", err, models.JSON{"action": "pull"})
		return fmt.Errorf("failed to initiate image pull for %s: %w", imageName, err)
	}
	defer reader.Close()

	scanner := bufio.NewScanner(reader)
	flusher, implementsFlusher := progressWriter.(http.Flusher)

	for scanner.Scan() {
		line := scanner.Bytes()
		if _, writeErr := progressWriter.Write(line); writeErr != nil {
			s.eventService.LogErrorEvent(ctx, models.EventTypeImageError, "image", "", imageName, user.ID, user.Username, "0", writeErr, models.JSON{"action": "pull", "step": "write_progress"})
			return fmt.Errorf("error writing pull progress for %s: %w", imageName, writeErr)
		}
		if _, writeErr := progressWriter.Write([]byte("\n")); writeErr != nil {
			s.eventService.LogErrorEvent(ctx, models.EventTypeImageError, "image", "", imageName, user.ID, user.Username, "0", writeErr, models.JSON{"action": "pull", "step": "write_newline"})
			return fmt.Errorf("error writing newline for %s: %w", imageName, writeErr)
		}

		if implementsFlusher {
			flusher.Flush()
		}
	}
	if scanErr := scanner.Err(); scanErr != nil {
		if errors.Is(scanErr, context.Canceled) || strings.Contains(scanErr.Error(), "context canceled") {
			slog.Debug("image pull stream canceled", slog.String("image", imageName), slog.Any("err", scanErr))
			s.eventService.LogErrorEvent(ctx, models.EventTypeImageError, "image", "", imageName, user.ID, user.Username, "0", scanErr, models.JSON{"action": "pull", "step": "canceled"})
			return fmt.Errorf("image pull stream canceled for %s: %w", imageName, scanErr)
		}
		s.eventService.LogErrorEvent(ctx, models.EventTypeImageError, "image", "", imageName, user.ID, user.Username, "0", scanErr, models.JSON{"action": "pull", "step": "read_stream"})
		return fmt.Errorf("error reading image pull stream for %s: %w", imageName, scanErr)
	}

	slog.Debug("image pull stream completed", slog.String("image", imageName))

	metadata := models.JSON{
		"action":    "pull",
		"imageName": imageName,
	}
	if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImagePull, "", imageName, user.ID, user.Username, "0", metadata); logErr != nil {
		slog.Warn("could not log image pull action", slog.Any("err", logErr), slog.String("image", imageName))
	}

	return nil
}

func (s *ImageService) getPullOptionsWithAuth(ctx context.Context, imageRef string, externalCreds []dto.ContainerRegistryCredential) (image.PullOptions, error) {
	pullOptions := image.PullOptions{}

	registryHost := s.extractRegistryHost(imageRef)

	if len(externalCreds) > 0 {
		for _, cred := range externalCreds {
			if !cred.Enabled || cred.Username == "" || cred.Token == "" {
				continue
			}

			credHost := s.normalizeRegistryForComparison(cred.URL)
			if credHost == s.normalizeRegistryForComparison(registryHost) {
				authConfig := &registry.AuthConfig{
					Username:      cred.Username,
					Password:      cred.Token,
					ServerAddress: s.normalizeRegistryURL(cred.URL),
				}

				authBytes, err := json.Marshal(authConfig)
				if err != nil {
					return pullOptions, fmt.Errorf("failed to marshal auth config: %w", err)
				}

				pullOptions.RegistryAuth = base64.StdEncoding.EncodeToString(authBytes)
				slog.DebugContext(ctx, "Using external credentials for image pull",
					slog.String("registry", credHost),
					slog.String("username", cred.Username))
				return pullOptions, nil
			}
		}
	}

	if s.registryService == nil {
		return pullOptions, nil
	}

	registries, err := s.registryService.GetEnabledRegistries(ctx)
	if err != nil {
		return pullOptions, fmt.Errorf("failed to get registry credentials: %w", err)
	}

	for _, reg := range registries {
		if s.isRegistryMatch(reg.URL, registryHost) {
			decryptedToken, err := s.registryService.GetDecryptedToken(ctx, reg.ID)
			if err != nil {
				return pullOptions, fmt.Errorf("failed to decrypt token for registry %s: %w", reg.URL, err)
			}

			authConfig := &registry.AuthConfig{
				Username:      reg.Username,
				Password:      decryptedToken,
				ServerAddress: s.normalizeRegistryURL(reg.URL),
			}

			authBytes, err := json.Marshal(authConfig)
			if err != nil {
				return pullOptions, fmt.Errorf("failed to marshal auth config: %w", err)
			}

			pullOptions.RegistryAuth = base64.StdEncoding.EncodeToString(authBytes)
			slog.DebugContext(ctx, "Using database credentials for image pull",
				slog.String("registry", registryHost),
				slog.String("username", reg.Username))
			break
		}
	}

	return pullOptions, nil
}

func (s *ImageService) extractRegistryHost(imageRef string) string {
	if i := strings.IndexByte(imageRef, '@'); i != -1 {
		imageRef = imageRef[:i]
	}

	hostCandidate, _, found := strings.Cut(imageRef, "/")
	if !found {
		return "docker.io"
	}

	if !strings.Contains(hostCandidate, ".") && !strings.Contains(hostCandidate, ":") {
		return "docker.io"
	}
	return hostCandidate
}

func (s *ImageService) isRegistryMatch(credURL, registryHost string) bool {
	normalizedCred := s.normalizeRegistryForComparison(credURL)
	normalizedHost := s.normalizeRegistryForComparison(registryHost)

	return normalizedCred == normalizedHost
}

func (s *ImageService) normalizeRegistryForComparison(url string) string {
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")
	url = strings.TrimSuffix(url, "/")

	if slash := strings.Index(url, "/"); slash != -1 {
		url = url[:slash]
	}

	if url == "docker.io" || url == "registry-1.docker.io" || url == "index.docker.io" {
		return "docker.io"
	}
	return url
}

func (s *ImageService) normalizeRegistryURL(url string) string {
	normalized := s.normalizeRegistryForComparison(url)
	if normalized == "docker.io" {
		return "https://index.docker.io/v1/"
	}

	result := strings.TrimPrefix(url, "https://")
	result = strings.TrimPrefix(result, "http://")
	result = strings.TrimSuffix(result, "/")

	return result
}

func (s *ImageService) PruneImages(ctx context.Context, dangling bool) (*image.PruneReport, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	filterArgs := filters.NewArgs()
	if dangling {
		filterArgs.Add("dangling", "true")
	} else {
		filterArgs.Add("dangling", "false")
	}

	report, err := dockerClient.ImagesPrune(ctx, filterArgs)
	if err != nil {
		return nil, fmt.Errorf("failed to prune images: %w", err)
	}

	metadata := models.JSON{
		"action":         "prune",
		"dangling":       dangling,
		"imagesDeleted":  len(report.ImagesDeleted),
		"spaceReclaimed": report.SpaceReclaimed,
	}
	if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImageDelete, "", "bulk_prune", systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
		slog.Warn("could not log image prune action", slog.Any("err", logErr))
	}

	return &report, nil
}

func (s *ImageService) ListImagesPaginated(ctx context.Context, params pagination.QueryParams) ([]dto.ImageSummaryDto, pagination.Response, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	dockerImages, err := dockerClient.ImageList(ctx, image.ListOptions{})
	if err != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to list Docker images: %w", err)
	}

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to list containers: %w", err)
	}

	inUseMap := buildInUseMap(containers)

	var updateRecords []models.ImageUpdateRecord
	if s.db != nil {
		s.db.WithContext(ctx).Find(&updateRecords)
	}
	updateMap := buildUpdateMap(updateRecords)

	items := mapDockerImagesToDTOs(dockerImages, inUseMap, updateMap)

	config := pagination.Config[dto.ImageSummaryDto]{
		SearchAccessors: []pagination.SearchAccessor[dto.ImageSummaryDto]{
			func(i dto.ImageSummaryDto) (string, error) { return i.Repo, nil },
			func(i dto.ImageSummaryDto) (string, error) { return i.Tag, nil },
			func(i dto.ImageSummaryDto) (string, error) { return i.ID, nil },
			func(i dto.ImageSummaryDto) (string, error) {
				if len(i.RepoTags) > 0 {
					return i.RepoTags[0], nil
				}
				return "", nil
			},
		},
		SortBindings: []pagination.SortBinding[dto.ImageSummaryDto]{
			{
				Key: "repo",
				Fn: func(a, b dto.ImageSummaryDto) int {
					return strings.Compare(a.Repo, b.Repo)
				},
			},
			{
				Key: "tag",
				Fn: func(a, b dto.ImageSummaryDto) int {
					return strings.Compare(a.Tag, b.Tag)
				},
			},
			{
				Key: "size",
				Fn: func(a, b dto.ImageSummaryDto) int {
					if a.Size < b.Size {
						return -1
					}
					if a.Size > b.Size {
						return 1
					}
					return 0
				},
			},
			{
				Key: "created",
				Fn: func(a, b dto.ImageSummaryDto) int {
					if a.Created < b.Created {
						return -1
					}
					if a.Created > b.Created {
						return 1
					}
					return 0
				},
			},
			{
				Key: "inUse",
				Fn: func(a, b dto.ImageSummaryDto) int {
					if a.InUse == b.InUse {
						return 0
					}
					if a.InUse {
						return -1
					}
					return 1
				},
			},
		},
		FilterAccessors: []pagination.FilterAccessor[dto.ImageSummaryDto]{
			{
				Key: "inUse",
				Fn: func(i dto.ImageSummaryDto, filterValue string) bool {
					if filterValue == "true" {
						return i.InUse
					}
					if filterValue == "false" {
						return !i.InUse
					}
					return true
				},
			},
			{
				Key: "updates",
				Fn: func(i dto.ImageSummaryDto, filterValue string) bool {
					hasUpdate := i.UpdateInfo != nil && i.UpdateInfo.HasUpdate
					if filterValue == "true" {
						return hasUpdate
					}
					if filterValue == "false" {
						return !hasUpdate
					}
					return true
				},
			},
		},
	}

	result := pagination.SearchOrderAndPaginate(items, params, config)

	totalPages := int64(0)
	if params.Limit > 0 {
		totalPages = (int64(result.TotalCount) + int64(params.Limit) - 1) / int64(params.Limit)
	}

	page := 1
	if params.Limit > 0 {
		page = (params.Start / params.Limit) + 1
	}

	paginationResp := pagination.Response{
		TotalPages:      totalPages,
		TotalItems:      int64(result.TotalCount),
		CurrentPage:     page,
		ItemsPerPage:    params.Limit,
		GrandTotalItems: int64(result.TotalAvailable),
	}

	return result.Items, paginationResp, nil
}

func convertLabels(labels map[string]string) map[string]interface{} {
	if labels == nil {
		return nil
	}
	result := make(map[string]interface{}, len(labels))
	for k, v := range labels {
		result[k] = v
	}
	return result
}

func (s *ImageService) GetTotalImageSize(ctx context.Context) (int64, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return 0, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	images, err := dockerClient.ImageList(ctx, image.ListOptions{})
	if err != nil {
		return 0, fmt.Errorf("failed to list images: %w", err)
	}

	var total int64
	for _, img := range images {
		total += img.Size
	}

	return total, nil
}

func buildInUseMap(containers []container.Summary) map[string]bool {
	inUseMap := make(map[string]bool)
	for _, c := range containers {
		inUseMap[c.ImageID] = true
	}
	return inUseMap
}

func buildUpdateMap(records []models.ImageUpdateRecord) map[string]*models.ImageUpdateRecord {
	updateMap := make(map[string]*models.ImageUpdateRecord, len(records))
	for i := range records {
		updateMap[records[i].ID] = &records[i]
	}
	return updateMap
}

func mapDockerImagesToDTOs(dockerImages []image.Summary, inUseMap map[string]bool, updateMap map[string]*models.ImageUpdateRecord) []dto.ImageSummaryDto {
	items := make([]dto.ImageSummaryDto, 0, len(dockerImages))
	for _, di := range dockerImages {
		inUse := inUseMap[di.ID]

		imageDto := dto.ImageSummaryDto{
			ID:          di.ID,
			RepoTags:    di.RepoTags,
			RepoDigests: di.RepoDigests,
			Created:     di.Created,
			Size:        di.Size,
			VirtualSize: di.SharedSize,
			Labels:      convertLabels(di.Labels),
			InUse:       inUse,
		}

		if len(di.RepoTags) > 0 {
			repoTag := di.RepoTags[0]
			// Use LastIndex to split on the LAST colon, correctly handling registry:port/image:tag
			lastColonIdx := strings.LastIndex(repoTag, ":")
			if lastColonIdx != -1 {
				imageDto.Repo = repoTag[:lastColonIdx]
				imageDto.Tag = repoTag[lastColonIdx+1:]
				// Handle edge cases
				if imageDto.Repo == "" {
					imageDto.Repo = "<none>"
				}
				if imageDto.Tag == "" {
					imageDto.Tag = "<none>"
				}
			} else {
				// No colon found, treat entire string as repo with default tag
				imageDto.Repo = repoTag
				imageDto.Tag = "latest"
			}
		} else {
			imageDto.Repo = "<none>"
			imageDto.Tag = "<none>"
		}

		if updateRecord, exists := updateMap[di.ID]; exists {
			sp := func(p *string) string {
				if p == nil {
					return ""
				}
				return *p
			}

			imageDto.UpdateInfo = &dto.ImageUpdateInfoDto{
				HasUpdate:      updateRecord.HasUpdate,
				UpdateType:     updateRecord.UpdateType,
				CurrentVersion: updateRecord.CurrentVersion,
				LatestVersion:  sp(updateRecord.LatestVersion),
				CurrentDigest:  sp(updateRecord.CurrentDigest),
				LatestDigest:   sp(updateRecord.LatestDigest),
				CheckTime:      updateRecord.CheckTime,
				ResponseTimeMs: updateRecord.ResponseTimeMs,
				Error:          sp(updateRecord.LastError),
				AuthMethod:     sp(updateRecord.AuthMethod),
				AuthUsername:   sp(updateRecord.AuthUsername),
				AuthRegistry:   sp(updateRecord.AuthRegistry),
				UsedCredential: updateRecord.UsedCredential,
			}
		}

		items = append(items, imageDto)
	}
	return items
}
