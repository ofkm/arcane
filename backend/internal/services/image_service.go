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

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/registry"
	"github.com/docker/docker/client"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"gorm.io/gorm"
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

func (s *ImageService) ListImages(ctx context.Context) ([]image.Summary, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	images, err := dockerClient.ImageList(ctx, image.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list Docker images: %w", err)
	}

	if syncErr := s.syncImagesToDatabase(ctx, images, dockerClient); syncErr != nil {
		fmt.Printf("Warning: error during image synchronization in ListImages: %v\n", syncErr)
	}

	return images, nil
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

	// Get image details for logging before deletion
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

	// Log image deletion event
	metadata := models.JSON{
		"action":  "delete",
		"imageId": id,
		"force":   force,
	}
	if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImageDelete, id, imageName, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log image deletion action: %s\n", logErr)
	}

	return nil
}

func (s *ImageService) PullImage(ctx context.Context, imageName string, progressWriter io.Writer, user models.User) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	fmt.Printf("Attempting to pull image: %s\n", imageName)

	// Get authentication for the registry
	pullOptions, err := s.getPullOptionsWithAuth(ctx, imageName)
	if err != nil {
		fmt.Printf("Warning: Failed to get registry authentication for %s: %v\n", imageName, err)
		pullOptions = image.PullOptions{} // Fall back to no auth
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
			fmt.Printf("Image pull stream canceled for %s: %v\n", imageName, scanErr)
			return fmt.Errorf("image pull stream canceled for %s: %w", imageName, scanErr)
		}
		return fmt.Errorf("error reading image pull stream for %s: %w", imageName, scanErr)
	}

	fmt.Printf("Image %s pull stream completed, attempting to sync database.\n", imageName)

	latestImages, listErr := dockerClient.ImageList(ctx, image.ListOptions{})
	if listErr != nil {
		fmt.Printf("Warning: failed to list images after pull for sync: %v\n", listErr)
	} else {
		if syncErr := s.syncImagesToDatabase(ctx, latestImages, dockerClient); syncErr != nil {
			fmt.Printf("Warning: error during image synchronization after pull: %v\n", syncErr)
		} else {
			fmt.Printf("Database synchronized successfully after pulling image %s.\n", imageName)
		}
	}

	// Log image pull event
	metadata := models.JSON{
		"action":    "pull",
		"imageName": imageName,
	}
	if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImagePull, "", imageName, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log image pull action: %s\n", logErr)
	}

	return nil
}

// getPullOptionsWithAuth gets pull options with appropriate registry authentication
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

// extractRegistryHost extracts the registry hostname from an image reference
func (s *ImageService) extractRegistryHost(imageRef string) string {
	parts := strings.Split(imageRef, "@")
	if len(parts) > 1 {
		imageRef = parts[0]
	}

	parts = strings.Split(imageRef, ":")
	if len(parts) > 1 {
		imageRef = parts[0]
	}

	parts = strings.Split(imageRef, "/")

	if len(parts) == 1 {
		return "docker.io"
	}

	firstPart := parts[0]
	if strings.Contains(firstPart, ".") || strings.Contains(firstPart, ":") {
		return firstPart
	}

	return "docker.io"
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

	// For other registries, return raw hostname without protocol
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
	}

	report, err := dockerClient.ImagesPrune(ctx, filterArgs)
	if err != nil {
		return nil, fmt.Errorf("failed to prune images: %w", err)
	}

	// Log image prune event using system user since this is typically a system operation
	metadata := models.JSON{
		"action":         "prune",
		"dangling":       dangling,
		"imagesDeleted":  len(report.ImagesDeleted),
		"spaceReclaimed": report.SpaceReclaimed,
	}
	if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImageDelete, "", "bulk_prune", systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log image prune action: %s\n", logErr)
	}

	return &report, nil
}

func (s *ImageService) GetImageHistory(ctx context.Context, id string) ([]image.HistoryResponseItem, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	history, err := dockerClient.ImageHistory(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("failed to get image history: %w", err)
	}

	return history, nil
}

func (s *ImageService) syncImagesToDatabase(ctx context.Context, dockerImages []image.Summary, dockerClient *client.Client) error {
	inUseImageIDs := s.getInUseImageIDs(ctx, dockerClient)
	currentDockerImageIDs := make([]string, 0, len(dockerImages))
	var lastErr error

	for _, di := range dockerImages {
		currentDockerImageIDs = append(currentDockerImageIDs, di.ID)
		if err := s.syncSingleImage(ctx, di, inUseImageIDs); err != nil {
			fmt.Printf("Error syncing image %s to database: %v\n", di.ID, err)
			lastErr = err
		}
	}

	if err := s.cleanupStaleImages(ctx, currentDockerImageIDs); err != nil {
		lastErr = err
	}

	return lastErr
}

func (s *ImageService) getInUseImageIDs(ctx context.Context, dockerClient *client.Client) map[string]bool {
	inUseImageIDs := make(map[string]bool)
	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		fmt.Printf("Error listing containers for InUse check: %v. InUse status may be inaccurate.\n", err)
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
		ID:          di.ID,
		RepoTags:    models.StringSlice(di.RepoTags),
		RepoDigests: models.StringSlice(di.RepoDigests),
		Size:        di.Size,
		Created:     time.Unix(di.Created, 0),
		InUse:       isInUse,
	}

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
	if len(repoTags) > 0 && repoTags[0] != "" {
		repoTag := repoTags[0]
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
		fmt.Printf("Error deleting stale images from database: %v\n", deleteResult.Error)
		return deleteResult.Error
	}
	fmt.Printf("%d stale image records deleted from database.\n", deleteResult.RowsAffected)
	return nil
}

func (s *ImageService) deleteAllImages(ctx context.Context) error {
	fmt.Println("No images found in Docker daemon, attempting to delete all image records from database.")
	deleteAllResult := s.db.WithContext(ctx).Delete(&models.Image{}, "1 = 1")
	if deleteAllResult.Error != nil {
		fmt.Printf("Error deleting all image records from database when Docker is empty: %v\n", deleteAllResult.Error)
		return deleteAllResult.Error
	}
	fmt.Printf("All (%d) image records deleted from database as Docker reported no images.\n", deleteAllResult.RowsAffected)
	return nil
}

func (s *ImageService) GetImageByIDFromDB(ctx context.Context, id string) (*models.Image, error) {
	var image models.Image
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&image).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("image not found")
		}
		return nil, fmt.Errorf("failed to get image: %w", err)
	}
	return &image, nil
}

func (s *ImageService) UpdateImageUsage(ctx context.Context, id string, inUse bool) error {
	if err := s.db.WithContext(ctx).Model(&models.Image{}).Where("id = ?", id).Update("in_use", inUse).Error; err != nil {
		return fmt.Errorf("failed to update image usage: %w", err)
	}
	return nil
}

func (s *ImageService) GetImagesByRepository(ctx context.Context, repo string) ([]*models.Image, error) {
	var images []*models.Image
	if err := s.db.WithContext(ctx).Where("repo = ?", repo).Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to get images by repository: %w", err)
	}
	return images, nil
}

func (s *ImageService) UpdateImageUpdate(ctx context.Context, imageID string, updateData *models.ImageUpdateRecord) error {
	var image models.Image
	if err := s.db.WithContext(ctx).Where("id = ?", imageID).First(&image).Error; err != nil {
		return fmt.Errorf("image not found in database: %w", err)
	}

	updateData.ID = imageID
	if err := s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns: []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{
			"repository", "tag", "has_update", "update_type",
			"current_version", "latest_version", "current_digest",
			"latest_digest", "check_time", "response_time_ms", "last_error",
		}),
	}).Create(updateData).Error; err != nil {
		return fmt.Errorf("failed to update image update record: %w", err)
	}

	return nil
}

func (s *ImageService) GetImagesNeedingMaturityCheck(ctx context.Context, olderThan time.Duration) ([]*models.Image, error) {
	cutoff := time.Now().Add(-olderThan)

	var images []*models.Image
	query := s.db.WithContext(ctx).
		Preload("MaturityRecord").
		Where("repo != ? AND tag != ?", "<none>", "<none>").
		Where("id NOT IN (SELECT id FROM image_maturity_table WHERE last_checked > ?)", cutoff)

	if err := query.Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to get images needing maturity check: %w", err)
	}

	return images, nil
}

func (s *ImageService) GetImagesNeedingUpdateCheck(ctx context.Context, olderThan time.Duration) ([]*models.Image, error) {
	cutoff := time.Now().Add(-olderThan)

	var images []*models.Image
	query := s.db.WithContext(ctx).
		Preload("UpdateRecord").
		Where("repo != ? AND tag != ?", "<none>", "<none>").
		Where("id NOT IN (SELECT id FROM image_update_table WHERE check_time > ?)", cutoff)

	if err := query.Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to get images needing update check: %w", err)
	}

	return images, nil
}

func (s *ImageService) ListImagesWithUpdates(ctx context.Context) ([]*models.Image, error) {
	_, err := s.ListImages(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list and sync Docker images: %w", err)
	}

	var images []*models.Image
	if err := s.db.WithContext(ctx).Preload("UpdateRecord").Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to get images with update data from DB: %w", err)
	}

	return images, nil
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
		fmt.Printf("Successfully deleted image %s from database.\n", dockerImageID)
	}
	return nil
}

func (s *ImageService) ListImagesWithUpdatesPaginated(ctx context.Context, req utils.SortedPaginationRequest) ([]map[string]interface{}, utils.PaginationResponse, error) {
	_, err := s.ListImages(ctx)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to list and sync Docker images: %w", err)
	}

	var images []*models.Image
	query := s.db.WithContext(ctx).Model(&models.Image{}).Preload("UpdateRecord")

	pagination, err := utils.PaginateAndSort(req, query, &images)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to paginate images: %w", err)
	}

	var result []map[string]interface{}
	for _, img := range images {
		imageData := map[string]interface{}{
			"Id":          img.ID,
			"RepoTags":    img.RepoTags,
			"RepoDigests": img.RepoDigests,
			"Created":     img.Created.Unix(),
			"Size":        img.Size,
			"VirtualSize": img.VirtualSize,
			"Labels":      img.Labels,
			"InUse":       img.InUse,
			"Repo":        img.Repo,
			"Tag":         img.Tag,
		}

		if img.UpdateRecord != nil {
			imageData["updateInfo"] = map[string]interface{}{
				"hasUpdate":      img.UpdateRecord.HasUpdate,
				"updateType":     img.UpdateRecord.UpdateType,
				"currentVersion": img.UpdateRecord.CurrentVersion,
				"latestVersion":  img.UpdateRecord.LatestVersion,
				"currentDigest":  img.UpdateRecord.CurrentDigest,
				"latestDigest":   img.UpdateRecord.LatestDigest,
				"checkTime":      img.UpdateRecord.CheckTime,
				"responseTimeMs": img.UpdateRecord.ResponseTimeMs,
				"error":          img.UpdateRecord.LastError,
			}
		}

		result = append(result, imageData)
	}

	return result, pagination, nil
}

func (s *ImageService) CleanupOrphanedUpdateRecords(ctx context.Context, existingImageIDs []string) (int64, error) {
	var result *gorm.DB
	if len(existingImageIDs) == 0 {
		result = s.db.WithContext(ctx).Delete(&models.ImageUpdateRecord{})
	} else {
		result = s.db.WithContext(ctx).Where("id NOT IN ?", existingImageIDs).Delete(&models.ImageUpdateRecord{})
	}

	if result.Error != nil {
		return 0, fmt.Errorf("failed to cleanup orphaned update records: %w", result.Error)
	}

	return result.RowsAffected, nil
}
