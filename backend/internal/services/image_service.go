package services

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type ImageService struct {
	db *database.DB
}

func NewImageService(db *database.DB) *ImageService {
	return &ImageService{db: db}
}

func (s *ImageService) ListImages(ctx context.Context) ([]*models.Image, error) {
	var images []*models.Image
	if err := s.db.WithContext(ctx).Order("created DESC").Find(&images).Error; err != nil {
		return nil, fmt.Errorf("failed to list images: %w", err)
	}
	return images, nil
}

func (s *ImageService) GetImageByID(ctx context.Context, id string) (*models.Image, error) {
	var image models.Image
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&image).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("image not found")
		}
		return nil, fmt.Errorf("failed to get image: %w", err)
	}
	return &image, nil
}

func (s *ImageService) UpdateImage(ctx context.Context, image *models.Image) (*models.Image, error) {
	now := time.Now()
	image.UpdatedAt = &now

	if err := s.db.WithContext(ctx).Save(image).Error; err != nil {
		return nil, fmt.Errorf("failed to update image: %w", err)
	}
	return image, nil
}

func (s *ImageService) DeleteImage(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Delete(&models.Image{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete image: %w", err)
	}
	return nil
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

func (s *ImageService) CreateOrUpdateImage(ctx context.Context, imageData *models.Image) (*models.Image, error) {
	// Parse repo and tag from RepoTags
	if len(imageData.RepoTags) > 0 && imageData.RepoTags[0] != "" {
		repoTag := imageData.RepoTags[0]
		if strings.Contains(repoTag, ":") {
			parts := strings.SplitN(repoTag, ":", 2)
			imageData.Repo = parts[0]
			imageData.Tag = parts[1]
		} else {
			imageData.Repo = repoTag
			imageData.Tag = "latest"
		}
	} else {
		imageData.Repo = "<none>"
		imageData.Tag = "<none>"
	}

	// Check if image exists
	existing, err := s.GetImageByID(ctx, imageData.ID)
	if err != nil {
		// Image doesn't exist, create it
		imageData.BaseModel = models.BaseModel{CreatedAt: time.Now()}
		if err := s.db.WithContext(ctx).Create(imageData).Error; err != nil {
			return nil, fmt.Errorf("failed to create image: %w", err)
		}
		return imageData, nil
	}

	// Image exists, update it
	existing.RepoTags = imageData.RepoTags
	existing.RepoDigests = imageData.RepoDigests
	existing.Size = imageData.Size
	existing.VirtualSize = imageData.VirtualSize
	existing.Labels = imageData.Labels
	existing.Repo = imageData.Repo
	existing.Tag = imageData.Tag

	return s.UpdateImage(ctx, existing)
}
