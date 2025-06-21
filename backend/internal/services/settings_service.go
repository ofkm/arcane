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

type SettingsService struct {
	db *database.DB
}

func NewSettingsService(db *database.DB) *SettingsService {
	return &SettingsService{db: db}
}

func (s *SettingsService) GetSettings(ctx context.Context) (*models.Settings, error) {
	var settings models.Settings
	if err := s.db.WithContext(ctx).First(&settings).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return s.createDefaultSettings(ctx)
		}
		return nil, fmt.Errorf("failed to get settings: %w", err)
	}
	return &settings, nil
}

func (s *SettingsService) UpdateSettings(ctx context.Context, settings *models.Settings) (*models.Settings, error) {
	now := time.Now()
	settings.UpdatedAt = &now

	if err := s.db.WithContext(ctx).Save(settings).Error; err != nil {
		return nil, fmt.Errorf("failed to update settings: %w", err)
	}
	return settings, nil
}

func (s *SettingsService) createDefaultSettings(ctx context.Context) (*models.Settings, error) {
	defaultAuth := models.JSON{
		"localAuthEnabled": true,
		"oidcEnabled":      false,
		"sessionTimeout":   3600,
		"passwordPolicy":   "basic",
		"rbacEnabled":      false,
	}

	defaultPruneMode := "dangling"

	settings := &models.Settings{
		StacksDirectory:       "data/stacks",
		AutoUpdate:            false,
		AutoUpdateInterval:    300,
		PollingEnabled:        true,
		PollingInterval:       5,
		PruneMode:             &defaultPruneMode,
		RegistryCredentials:   models.JSON{},
		TemplateRegistries:    models.JSON{},
		Auth:                  defaultAuth,
		MaturityThresholdDays: 30,
		BaseModel: models.BaseModel{
			CreatedAt: time.Now(),
		},
	}

	if err := s.db.WithContext(ctx).Create(settings).Error; err != nil {
		return nil, fmt.Errorf("failed to create default settings: %w", err)
	}

	return settings, nil
}
