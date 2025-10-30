package services

import (
	"context"
	"errors"

	"gorm.io/gorm"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
)

type ProjectSettingsService struct {
	db              *database.DB
	settingsService *SettingsService
}

func NewProjectSettingsService(db *database.DB, settingsService *SettingsService) *ProjectSettingsService {
	return &ProjectSettingsService{
		db:              db,
		settingsService: settingsService,
	}
}

func (s *ProjectSettingsService) GetProjectSettings(ctx context.Context, projectID string) (*models.ProjectSettings, error) {
	var settings models.ProjectSettings
	err := s.db.WithContext(ctx).Where("project_id = ?", projectID).First(&settings).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // No settings means follow global
		}
		return nil, err
	}
	return &settings, nil
}

func (s *ProjectSettingsService) UpsertProjectSettings(ctx context.Context, projectID string, autoUpdate *bool, cron *string) error {
	settings := &models.ProjectSettings{
		ProjectID:      projectID,
		AutoUpdate:     autoUpdate,
		AutoUpdateCron: cron,
	}

	// Check if record exists
	var existing models.ProjectSettings
	err := s.db.WithContext(ctx).Where("project_id = ?", projectID).First(&existing).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create new record
		return s.db.WithContext(ctx).Create(settings).Error
	} else if err != nil {
		return err
	}

	// Update existing record
	return s.db.WithContext(ctx).Model(&existing).Updates(map[string]interface{}{
		"auto_update":      autoUpdate,
		"auto_update_cron": cron,
	}).Error
}

func (s *ProjectSettingsService) DeleteProjectSettings(ctx context.Context, projectID string) error {
	return s.db.WithContext(ctx).
		Where("project_id = ?", projectID).
		Delete(&models.ProjectSettings{}).Error
}
