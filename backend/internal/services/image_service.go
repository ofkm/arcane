package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type ImageService struct {
	db            *database.DB
	dockerService *DockerClientService
}

func NewImageService(db *database.DB, dockerService *DockerClientService) *ImageService {
	return &ImageService{db: db, dockerService: dockerService}
}

// ListImages returns live Docker images, optionally syncing to database
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

	// Optionally sync to database for metadata tracking
	go s.syncImagesToDatabase(ctx, images)

	return images, nil
}

// GetImageByID gets live image info from Docker
func (s *ImageService) GetImageByID(ctx context.Context, id string) (*image.InspectResponse, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	image, _, err := dockerClient.ImageInspectWithRaw(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("image not found: %w", err)
	}

	return &image, nil
}

// RemoveImage removes a Docker image
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

	// Remove from database if exists
	s.db.WithContext(ctx).Delete(&models.Image{}, "id = ?", id)

	return nil
}

// PullImage pulls a Docker image
func (s *ImageService) PullImage(ctx context.Context, imageName string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	reader, err := dockerClient.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}
	defer reader.Close()

	// might want to stream the pull progress to the client
	// For now, we'll just wait for completion
	_, err = dockerClient.ImageInspect(ctx, imageName)
	return err
}

// PruneImages removes unused Docker images
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

// GetImageHistory gets the history of a Docker image
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

// syncImagesToDatabase syncs Docker images to database for metadata tracking (async)
func (s *ImageService) syncImagesToDatabase(ctx context.Context, dockerImages []image.Summary) {
	for _, di := range dockerImages {
		imageModel := &models.Image{
			ID:          di.ID,
			RepoTags:    models.StringSlice(di.RepoTags),
			RepoDigests: models.StringSlice(di.RepoDigests),
			Size:        di.Size,
			Created:     time.Unix(di.Created, 0),
		}

		// Handle Labels - convert map[string]string to models.JSON
		if di.Labels != nil {
			labelsJSON := make(map[string]interface{})
			for k, v := range di.Labels {
				labelsJSON[k] = v
			}
			imageModel.Labels = models.JSON(labelsJSON)
		}

		// Parse repo and tag from RepoTags
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

		// Upsert image record
		s.db.WithContext(ctx).Where("id = ?", di.ID).FirstOrCreate(imageModel)
	}
}

// Keep existing database methods for metadata operations
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
	// Get Docker images first to ensure we have latest data
	_, err := s.ListImages(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to sync Docker images: %w", err)
	}

	// Get images from database with maturity records
	var images []*models.Image
	if err := s.db.WithContext(ctx).Preload("MaturityRecord").Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to get images with maturity data: %w", err)
	}

	return images, nil
}

// Add method to create/update maturity record for an image
func (s *ImageService) UpdateImageMaturity(ctx context.Context, imageID string, maturityData *models.ImageMaturityRecord) error {
	// First ensure the image exists in our database
	var image models.Image
	if err := s.db.WithContext(ctx).Where("id = ?", imageID).First(&image).Error; err != nil {
		return fmt.Errorf("image not found in database: %w", err)
	}

	// Update or create maturity record
	maturityData.ID = imageID
	if err := s.db.WithContext(ctx).Where("id = ?", imageID).FirstOrCreate(maturityData).Error; err != nil {
		return fmt.Errorf("failed to update image maturity: %w", err)
	}

	return nil
}

// Get images that need maturity checking
func (s *ImageService) GetImagesNeedingMaturityCheck(ctx context.Context, olderThan time.Duration) ([]*models.Image, error) {
	cutoff := time.Now().Add(-olderThan)

	var images []*models.Image
	query := s.db.WithContext(ctx).
		Preload("MaturityRecord").
		Where("repo != ? AND tag != ?", "<none>", "<none>"). // Only tagged images
		Where("id NOT IN (SELECT id FROM image_maturity_table WHERE last_checked > ?)", cutoff)

	if err := query.Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to get images needing maturity check: %w", err)
	}

	return images, nil
}
