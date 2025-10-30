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

	return s.db.WithContext(ctx).
		Where("project_id = ?", projectID).
		Assign(map[string]interface{}{
			"auto_update":      autoUpdate,
			"auto_update_cron": cron,
		}).
		FirstOrCreate(settings).Error
}

func (s *ProjectSettingsService) DeleteProjectSettings(ctx context.Context, projectID string) error {
	return s.db.WithContext(ctx).
		Where("project_id = ?", projectID).
		Delete(&models.ProjectSettings{}).Error
}

func (s *ProjectSettingsService) getEffectiveSettings(ctx context.Context, projectID string) (autoUpdate bool, cron *string, err error) {
	// 1. Try to get project settings
	projectSettings, err := s.GetProjectSettings(ctx, projectID)
	if err != nil {
		return false, nil, err
	}

	// 2. If project has explicit settings, use those
	if projectSettings != nil && projectSettings.AutoUpdate != nil {
		autoUpdate = *projectSettings.AutoUpdate
		cron = projectSettings.AutoUpdateCron
		return autoUpdate, cron, nil
	}

	// 3. Fall back to global settings
	globalSettings := s.settingsService.GetSettingsConfig()
	autoUpdate = globalSettings.AutoUpdate.IsTrue()

	if globalSettings.AutoUpdateCron.Value != "" {
		cronValue := globalSettings.AutoUpdateCron.Value
		cron = &cronValue
	}

	return autoUpdate, cron, nil
}
