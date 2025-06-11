package services

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/client"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type ImageService struct {
	db                   *database.DB
	dockerService        *DockerClientService
	imageMaturityService *ImageMaturityService
}

func NewImageService(db *database.DB, dockerService *DockerClientService) *ImageService {
	return &ImageService{
		db:            db,
		dockerService: dockerService,
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

func (s *ImageService) RemoveImage(ctx context.Context, id string, force bool) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	options := image.RemoveOptions{
		Force:         force,
		PruneChildren: true,
	}

	_, err = dockerClient.ImageRemove(ctx, id, options)
	if err != nil {
		return fmt.Errorf("failed to remove image: %w", err)
	}

	s.db.WithContext(ctx).Delete(&models.Image{}, "id = ?", id)

	return nil
}

func (s *ImageService) PullImage(ctx context.Context, imageName string, progressWriter io.Writer) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	fmt.Printf("Attempting to pull image: %s\n", imageName)
	reader, err := dockerClient.ImagePull(ctx, imageName, image.PullOptions{})
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

	return nil
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
	inUseImageIDs := make(map[string]bool)
	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		fmt.Printf("Error listing containers for InUse check: %v. InUse status may be inaccurate.\n", err)
	} else {
		for _, cont := range containers {
			inUseImageIDs[cont.ImageID] = true
		}
	}

	var lastErr error
	currentDockerImageIDs := make([]string, 0, len(dockerImages))

	for _, di := range dockerImages {
		currentDockerImageIDs = append(currentDockerImageIDs, di.ID)
		_, isInUse := inUseImageIDs[di.ID]

		imageModel := models.Image{
			ID:          di.ID,
			RepoTags:    models.StringSlice(di.RepoTags),
			RepoDigests: models.StringSlice(di.RepoDigests),
			Size:        di.Size,
			VirtualSize: di.VirtualSize,
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

		if len(di.RepoTags) > 0 && di.RepoTags[0] != "" {
			repoTag := di.RepoTags[0]
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

		dbErr := s.db.WithContext(ctx).Clauses(clause.OnConflict{
			Columns:   []clause.Column{{Name: "id"}},
			DoUpdates: clause.AssignmentColumns([]string{"repo_tags", "repo_digests", "size", "virtual_size", "created", "labels", "repo", "tag", "in_use"}),
		}).Create(&imageModel).Error

		if dbErr != nil {
			fmt.Printf("Error syncing image %s to database: %v\n", di.ID, dbErr)
			lastErr = dbErr
		}
	}

	if len(currentDockerImageIDs) > 0 {
		deleteResult := s.db.WithContext(ctx).Where("id NOT IN ?", currentDockerImageIDs).Delete(&models.Image{})
		if deleteResult.Error != nil {
			errMsg := fmt.Sprintf("Error deleting stale images from database: %v", deleteResult.Error)
			fmt.Println(errMsg)
			if lastErr == nil {
				lastErr = deleteResult.Error
			}
		} else {
			fmt.Printf("%d stale image records deleted from database.\n", deleteResult.RowsAffected)
		}
	} else {
		fmt.Println("No images found in Docker daemon, attempting to delete all image records from database.")
		deleteAllResult := s.db.WithContext(ctx).Delete(&models.Image{}, "1 = 1")
		if deleteAllResult.Error != nil {
			errMsg := fmt.Sprintf("Error deleting all image records from database when Docker is empty: %v", deleteAllResult.Error)
			fmt.Println(errMsg)
			if lastErr == nil {
				lastErr = deleteAllResult.Error
			}
		} else {
			fmt.Printf("All (%d) image records deleted from database as Docker reported no images.\n", deleteAllResult.RowsAffected)
		}
	}

	return lastErr
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

func (s *ImageService) ListImagesWithMaturity(ctx context.Context) ([]*models.Image, error) {
	_, err := s.ListImages(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list and sync Docker images: %w", err)
	}

	var images []*models.Image
	if err := s.db.WithContext(ctx).Preload("MaturityRecord").Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to get images with maturity data from DB: %w", err)
	}

	return images, nil
}

func (s *ImageService) UpdateImageMaturity(ctx context.Context, imageID string, maturityData *models.ImageMaturityRecord) error {
	var image models.Image
	if err := s.db.WithContext(ctx).Where("id = ?", imageID).First(&image).Error; err != nil {
		return fmt.Errorf("image not found in database: %w", err)
	}

	maturityData.ID = imageID
	if err := s.db.WithContext(ctx).Where("id = ?", imageID).FirstOrCreate(maturityData).Error; err != nil {
		return fmt.Errorf("failed to update image maturity: %w", err)
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

func (s *ImageService) GetImagesWithMaturity(ctx context.Context) ([]map[string]interface{}, error) {
	images, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer images.Close()

	dockerImages, err := images.ImageList(ctx, image.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}

	var result []map[string]interface{}

	for _, img := range dockerImages {
		imageData := map[string]interface{}{
			"Id":          img.ID,
			"ParentId":    img.ParentID,
			"RepoTags":    img.RepoTags,
			"RepoDigests": img.RepoDigests,
			"Created":     img.Created,
			"Size":        img.Size,
			"VirtualSize": img.VirtualSize,
			"SharedSize":  img.SharedSize,
			"Labels":      img.Labels,
			"Containers":  img.Containers,
		}

		if s.imageMaturityService != nil {
			maturityRecord, err := s.imageMaturityService.GetImageMaturity(ctx, img.ID)
			if err == nil {
				imageData["maturity"] = map[string]interface{}{
					"updatesAvailable": maturityRecord.UpdatesAvailable,
					"status":           maturityRecord.Status,
					"version":          maturityRecord.CurrentVersion,
					"date":             maturityRecord.CurrentImageDate,
				}
			}
		}

		result = append(result, imageData)
	}

	return result, nil
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
