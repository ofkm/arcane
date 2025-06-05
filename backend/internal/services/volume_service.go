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

type VolumeService struct {
	db *database.DB
}

func NewVolumeService(db *database.DB) *VolumeService {
	return &VolumeService{db: db}
}

func (s *VolumeService) ListVolumes(ctx context.Context) ([]*models.Volume, error) {
	var volumes []*models.Volume
	if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&volumes).Error; err != nil {
		return nil, fmt.Errorf("failed to list volumes: %w", err)
	}
	return volumes, nil
}

func (s *VolumeService) GetVolumeByName(ctx context.Context, name string) (*models.Volume, error) {
	var volume models.Volume
	if err := s.db.WithContext(ctx).Where("name = ?", name).First(&volume).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("volume not found")
		}
		return nil, fmt.Errorf("failed to get volume: %w", err)
	}
	return &volume, nil
}

func (s *VolumeService) CreateVolume(ctx context.Context, volume *models.Volume) (*models.Volume, error) {
	volume.BaseModel = models.BaseModel{CreatedAt: time.Now()}

	if err := s.db.WithContext(ctx).Create(volume).Error; err != nil {
		return nil, fmt.Errorf("failed to create volume: %w", err)
	}
	return volume, nil
}

func (s *VolumeService) UpdateVolume(ctx context.Context, volume *models.Volume) (*models.Volume, error) {
	now := time.Now()
	volume.UpdatedAt = &now

	if err := s.db.WithContext(ctx).Save(volume).Error; err != nil {
		return nil, fmt.Errorf("failed to update volume: %w", err)
	}
	return volume, nil
}

func (s *VolumeService) DeleteVolume(ctx context.Context, name string) error {
	if err := s.db.WithContext(ctx).Delete(&models.Volume{}, "name = ?", name).Error; err != nil {
		return fmt.Errorf("failed to delete volume: %w", err)
	}
	return nil
}

func (s *VolumeService) UpdateVolumeUsage(ctx context.Context, name string, inUse bool) error {
	if err := s.db.WithContext(ctx).Model(&models.Volume{}).Where("name = ?", name).Update("in_use", inUse).Error; err != nil {
		return fmt.Errorf("failed to update volume usage: %w", err)
	}
	return nil
}

func (s *VolumeService) GetVolumesByDriver(ctx context.Context, driver string) ([]*models.Volume, error) {
	var volumes []*models.Volume
	if err := s.db.WithContext(ctx).Where("driver = ?", driver).Find(&volumes).Error; err != nil {
		return nil, fmt.Errorf("failed to get volumes by driver: %w", err)
	}
	return volumes, nil
}
