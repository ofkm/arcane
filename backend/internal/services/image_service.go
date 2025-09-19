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
	"time"

	"log/slog"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/registry"
	"github.com/docker/docker/client"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"gorm.io/gorm/clause"
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

func (s *ImageService) SyncDockerImages(ctx context.Context) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	images, err := dockerClient.ImageList(ctx, image.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to list Docker images: %w", err)
	}

	if err := s.syncImagesToDatabase(ctx, images, dockerClient); err != nil {
		return fmt.Errorf("error during image synchronization: %w", err)
	}
	return nil
}

func (s *ImageService) GetImageByID(ctx context.Context, id string) (*image.InspectResponse, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	image, err := dockerClient.ImageInspect(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("image not found: %w", err)
	}

	return &image, nil
}

func (s *ImageService) RemoveImage(ctx context.Context, id string, force bool, user models.User) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
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
		return fmt.Errorf("failed to remove image: %w", err)
	}

	s.db.WithContext(ctx).Delete(&models.Image{}, "id = ?", id)

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

func (s *ImageService) PullImage(ctx context.Context, imageName string, progressWriter io.Writer, user models.User) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	slog.Debug("attempting to pull image", slog.String("image", imageName))

	pullOptions, err := s.getPullOptionsWithAuth(ctx, imageName)
	if err != nil {
		slog.Warn("failed to get registry authentication for image; proceeding without auth", slog.String("image", imageName), slog.Any("err", err))
		pullOptions = image.PullOptions{}
	}

	reader, err := dockerClient.ImagePull(ctx, imageName, pullOptions)
	if err != nil {
		return fmt.Errorf("failed to initiate image pull for %s: %w", imageName, err)
	}
	defer reader.Close()

	scanner := bufio.NewScanner(reader)
	flusher, implementsFlusher := progressWriter.(http.Flusher)

	for scanner.Scan() {
		line := scanner.Bytes()
		if _, writeErr := progressWriter.Write(line); writeErr != nil {
			return fmt.Errorf("error writing pull progress for %s: %w", imageName, writeErr)
		}
		if _, writeErr := progressWriter.Write([]byte("\n")); writeErr != nil {
			return fmt.Errorf("error writing newline for %s: %w", imageName, writeErr)
		}

		if implementsFlusher {
			flusher.Flush()
		}
	}
	if scanErr := scanner.Err(); scanErr != nil {
		if errors.Is(scanErr, context.Canceled) || strings.Contains(scanErr.Error(), "context canceled") {
			slog.Debug("image pull stream canceled", slog.String("image", imageName), slog.Any("err", scanErr))
			return fmt.Errorf("image pull stream canceled for %s: %w", imageName, scanErr)
		}
		return fmt.Errorf("error reading image pull stream for %s: %w", imageName, scanErr)
	}

	slog.Debug("image pull stream completed, attempting to sync database", slog.String("image", imageName))

	latestImages, listErr := dockerClient.ImageList(ctx, image.ListOptions{})
	if listErr != nil {
		slog.Warn("failed to list images after pull for sync", slog.Any("err", listErr))
	} else {
		if syncErr := s.syncImagesToDatabase(ctx, latestImages, dockerClient); syncErr != nil {
			slog.Warn("error during image synchronization after pull", slog.Any("err", syncErr))
		} else {
			slog.Debug("database synchronized successfully after pulling image", slog.String("image", imageName))
		}
	}

	// Log image pull event
	metadata := models.JSON{
		"action":    "pull",
		"imageName": imageName,
	}
	if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImagePull, "", imageName, user.ID, user.Username, "0", metadata); logErr != nil {
		slog.Warn("could not log image pull action", slog.Any("err", logErr), slog.String("image", imageName))
	}

	return nil
}

func (s *ImageService) getPullOptionsWithAuth(ctx context.Context, imageRef string) (image.PullOptions, error) {
	pullOptions := image.PullOptions{}

	if s.registryService == nil {
		return pullOptions, nil
	}

	registryHost := s.extractRegistryHost(imageRef)

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

			pullOptions.RegistryAuth = base64.URLEncoding.EncodeToString(authBytes)
			break
		}
	}

	return pullOptions, nil
}

func (s *ImageService) extractRegistryHost(imageRef string) string {
	// strip digest if present
	if i := strings.IndexByte(imageRef, '@'); i != -1 {
		imageRef = imageRef[:i]
	}

	// split on first slash; if no slash, it's a Docker Hub shorthand
	hostCandidate, _, found := strings.Cut(imageRef, "/")
	if !found {
		return "docker.io"
	}

	// first segment is either a registry host[:port] or a namespace
	// if it doesn't look like a host (no dot/colon), default to docker.io
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

	// keep only host part (drop any path like ghcr.io/org or /v2/)
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

func (s *ImageService) syncImagesToDatabase(ctx context.Context, dockerImages []image.Summary, dockerClient *client.Client) error {
	inUseImageIDs := s.getInUseImageIDs(ctx, dockerClient)
	currentDockerImageIDs := make([]string, 0, len(dockerImages))
	var lastErr error

	for _, di := range dockerImages {
		currentDockerImageIDs = append(currentDockerImageIDs, di.ID)
		if err := s.syncSingleImage(ctx, di, inUseImageIDs); err != nil {
			slog.Warn("error syncing image to database", slog.String("image_id", di.ID), slog.Any("err", err))
			lastErr = err
		}
	}

	if err := s.cleanupStaleImages(ctx, currentDockerImageIDs); err != nil {
		lastErr = err
	}

	if err := s.imageUpdateService.CleanupOrphanedRecords(ctx); err != nil {
		slog.Warn("failed to cleanup orphaned image update records", slog.Any("err", err))
		if lastErr == nil {
			lastErr = err
		}
	}

	return lastErr
}

func (s *ImageService) getInUseImageIDs(ctx context.Context, dockerClient *client.Client) map[string]bool {
	inUseImageIDs := make(map[string]bool)
	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		slog.Warn("error listing containers for in-use check; in-use status may be inaccurate", slog.Any("err", err))
		return inUseImageIDs
	}

	for _, cont := range containers {
		inUseImageIDs[cont.ImageID] = true
	}
	return inUseImageIDs
}

func (s *ImageService) syncSingleImage(ctx context.Context, di image.Summary, inUseImageIDs map[string]bool) error {
	_, isInUse := inUseImageIDs[di.ID]

	imageModel := s.buildImageModel(di, isInUse)

	return s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"repo_tags", "repo_digests", "size", "virtual_size", "created", "labels", "repo", "tag", "in_use"}),
	}).Create(&imageModel).Error
}

func (s *ImageService) buildImageModel(di image.Summary, isInUse bool) models.Image {
	imageModel := models.Image{
		RepoTags:    models.StringSlice(di.RepoTags),
		RepoDigests: models.StringSlice(di.RepoDigests),
		Size:        di.Size,
		Created:     time.Unix(di.Created, 0),
		InUse:       isInUse,
	}
	imageModel.ID = di.ID

	if di.Labels != nil {
		labelsJSON := make(map[string]interface{})
		for k, v := range di.Labels {
			labelsJSON[k] = v
		}
		imageModel.Labels = models.JSON(labelsJSON)
	}

	s.setRepoAndTag(&imageModel, di.RepoTags)
	return imageModel
}

func (s *ImageService) setRepoAndTag(imageModel *models.Image, repoTags []string) {
	var repoTag string
	for _, t := range repoTags {
		if t != "" && !strings.Contains(t, "<none>") {
			repoTag = t
			break
		}
	}
	if repoTag == "" && len(repoTags) > 0 {
		repoTag = repoTags[0]
	}

	if repoTag != "" {
		if strings.Contains(repoTag, ":") {
			parts := strings.SplitN(repoTag, ":", 2)
			imageModel.Repo = parts[0]
			imageModel.Tag = parts[1]
		} else {
			imageModel.Repo = repoTag
			imageModel.Tag = "latest"
		}
	} else {
		imageModel.Repo = "<none>"
		imageModel.Tag = "<none>"
	}
}

func (s *ImageService) cleanupStaleImages(ctx context.Context, currentDockerImageIDs []string) error {
	if len(currentDockerImageIDs) > 0 {
		return s.deleteStaleImages(ctx, currentDockerImageIDs)
	}
	return s.deleteAllImages(ctx)
}

func (s *ImageService) deleteStaleImages(ctx context.Context, currentDockerImageIDs []string) error {
	deleteResult := s.db.WithContext(ctx).Where("id NOT IN ?", currentDockerImageIDs).Delete(&models.Image{})
	if deleteResult.Error != nil {
		slog.Warn("error deleting stale images from database", slog.Any("err", deleteResult.Error))
		return deleteResult.Error
	}
	slog.Debug("stale image records deleted from database", slog.Int64("rows_affected", deleteResult.RowsAffected))
	return nil
}

func (s *ImageService) deleteAllImages(ctx context.Context) error {
	slog.Debug("no images found in Docker daemon, attempting to delete all image records from database")
	deleteAllResult := s.db.WithContext(ctx).Delete(&models.Image{}, "1 = 1")
	if deleteAllResult.Error != nil {
		slog.Warn("error deleting all image records from database when Docker is empty", slog.Any("err", deleteAllResult.Error))
		return deleteAllResult.Error
	}
	slog.Debug("all image records deleted from database as Docker reported no images", slog.Int64("rows_affected", deleteAllResult.RowsAffected))
	return nil
}

func (s *ImageService) DeleteImageByDockerID(ctx context.Context, dockerImageID string) error {
	if dockerImageID == "" {
		return fmt.Errorf("docker image ID cannot be empty")
	}

	result := s.db.WithContext(ctx).Where("id = ?", dockerImageID).Delete(&models.Image{})
	if result.Error != nil {
		return fmt.Errorf("failed to delete image %s from database: %w", dockerImageID, result.Error)
	}

	if result.RowsAffected == 0 {
	} else {
		slog.Debug("successfully deleted image from database", slog.String("image_id", dockerImageID))
	}
	return nil
}

func (s *ImageService) ListImagesWithUpdatesPaginated(ctx context.Context, req utils.SortedPaginationRequest) ([]dto.ImageSummaryDto, utils.PaginationResponse, error) {
	err := s.SyncDockerImages(ctx)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to list and sync Docker images: %w", err)
	}
	var images []models.Image
	query := s.db.WithContext(ctx).Model(&models.Image{}).Preload("UpdateRecord")
	if term := strings.TrimSpace(req.Search); term != "" {
		like := "%" + strings.ToLower(term) + "%"
		query = query.Where(`
			LOWER(repo) LIKE ? OR
			LOWER(tag) LIKE ? OR
			LOWER(id) LIKE ? OR
			LOWER(repo || ':' || tag) LIKE ?
		`, like, like, like, like)
	}
	pagination, err := utils.PaginateAndSort(req, query, &images)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to paginate images: %w", err)
	}
	result := make([]dto.ImageSummaryDto, 0, len(images))
	for i := range images {
		result = append(result, dto.NewImageSummaryDto(&images[i]))
	}
	return result, pagination, nil
}

func (s *ImageService) GetTotalImageSize(ctx context.Context) (int64, error) {
	if err := s.SyncDockerImages(ctx); err != nil {
		return 0, fmt.Errorf("failed to sync images: %w", err)
	}
	var total int64
	if err := s.db.WithContext(ctx).Model(&models.Image{}).Select("COALESCE(SUM(size), 0)").Scan(&total).Error; err != nil {
		return 0, fmt.Errorf("failed to sum image sizes: %w", err)
	}
	return total, nil
}
