package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type ContainerService struct {
	db *database.DB
}

func NewContainerService(db *database.DB) *ContainerService {
	return &ContainerService{db: db}
}

func (s *ContainerService) ListContainers(ctx context.Context, includeAll bool) ([]*models.Container, error) {
	query := s.db.WithContext(ctx).Preload("Stack")

	if !includeAll {
		query = query.Where("status != ?", "exited")
	}

	var containers []*models.Container
	if err := query.Order("created_at DESC").Find(&containers).Error; err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}
	return containers, nil
}

func (s *ContainerService) GetContainerByID(ctx context.Context, id string) (*models.Container, error) {
	var container models.Container
	if err := s.db.WithContext(ctx).Preload("Stack").Where("id = ?", id).First(&container).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("container not found")
		}
		return nil, fmt.Errorf("failed to get container: %w", err)
	}
	return &container, nil
}

func (s *ContainerService) UpdateContainer(ctx context.Context, container *models.Container) (*models.Container, error) {
	now := time.Now()
	container.UpdatedAt = &now

	if err := s.db.WithContext(ctx).Save(container).Error; err != nil {
		return nil, fmt.Errorf("failed to update container: %w", err)
	}
	return container, nil
}

func (s *ContainerService) DeleteContainer(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Delete(&models.Container{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete container: %w", err)
	}
	return nil
}

func (s *ContainerService) GetContainersByStack(ctx context.Context, stackID string) ([]*models.Container, error) {
	var containers []*models.Container
	if err := s.db.WithContext(ctx).Where("stack_id = ?", stackID).Find(&containers).Error; err != nil {
		return nil, fmt.Errorf("failed to get containers by stack: %w", err)
	}
	return containers, nil
}

func (s *ContainerService) UpdateContainerStatus(ctx context.Context, id, status, state string) error {
	updates := map[string]interface{}{
		"status":     status,
		"state":      state,
		"updated_at": time.Now(),
	}

	if err := s.db.WithContext(ctx).Model(&models.Container{}).Where("id = ?", id).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update container status: %w", err)
	}
	return nil
}
