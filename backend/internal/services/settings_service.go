package services

import (
	"context"
	"errors"
	"fmt"
	"reflect"
	"strings"

	"gorm.io/gorm"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
)

type SettingsService struct {
	db *database.DB
}

func NewSettingsService(db *database.DB) *SettingsService {
	return &SettingsService{db: db}
}

func (s *SettingsService) GetSettings(ctx context.Context) (*models.Settings, error) {
	var settingVars []models.SettingVariable
	err := s.db.WithContext(ctx).Find(&settingVars).Error
	if err != nil {
		return nil, err
	}

	settings := &models.Settings{}

	// Load values from database into the struct
	for _, sv := range settingVars {
		if err := settings.UpdateField(sv.Key, sv.Value, false); err != nil {
			// If key not found, it's okay - might be a deprecated setting
			if _, ok := err.(models.SettingKeyNotFoundError); !ok {
				return nil, fmt.Errorf("failed to load setting %s: %w", sv.Key, err)
			}
		}
	}

	return settings, nil
}

func (s *SettingsService) getDefaultSettings() *models.Settings {
	return &models.Settings{
		// Docker settings
		StacksDirectory:    models.SettingVariable{Value: "data/stacks"},
		AutoUpdate:         models.SettingVariable{Value: "true"},
		AutoUpdateInterval: models.SettingVariable{Value: "3600"},
		PollingEnabled:     models.SettingVariable{Value: "true"},
		PollingInterval:    models.SettingVariable{Value: "300"}, // 5 minutes in seconds
		PruneMode:          models.SettingVariable{Value: "dangling"},
		BaseServerURL:      models.SettingVariable{Value: ""},

		// Authentication settings
		AuthLocalEnabled:   models.SettingVariable{Value: "true"},
		AuthOidcEnabled:    models.SettingVariable{Value: "false"},
		AuthSessionTimeout: models.SettingVariable{Value: "86400"}, // 24 hours in seconds
		AuthPasswordPolicy: models.SettingVariable{Value: "strong"},
		AuthRbacEnabled:    models.SettingVariable{Value: "false"},
		AuthOidcConfig:     models.SettingVariable{Value: "{}"},

		// Onboarding settings
		OnboardingCompleted: models.SettingVariable{Value: "false"},
		OnboardingSteps:     models.SettingVariable{Value: "[]"},

		// Registry settings
		RegistryCredentials: models.SettingVariable{Value: "[]"},
		TemplateRegistries:  models.SettingVariable{Value: "[]"},
	}
}

func (s *SettingsService) GetPublicSettings(ctx context.Context) ([]models.SettingVariable, error) {
	settings, err := s.GetSettings(ctx)
	if err != nil {
		return nil, err
	}

	return settings.ToSettingVariableSlice(false, false), nil
}

func (s *SettingsService) UpdateSetting(ctx context.Context, key, value string) error {
	settingVar := &models.SettingVariable{
		Key:   key,
		Value: value,
	}

	return s.db.WithContext(ctx).Save(settingVar).Error
}

func (s *SettingsService) UpdateSettings(ctx context.Context, updates dto.UpdateSettingsDto) ([]models.SettingVariable, error) {
	// Load current and default settings
	defaultCfg := s.getDefaultSettings()
	cfg, err := s.GetSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load current settings: %w", err)
	}

	rt := reflect.TypeOf(updates)
	rv := reflect.ValueOf(updates)
	valuesToUpdate := make([]models.SettingVariable, 0)

	// Iterate through fields using reflection
	for i := 0; i < rt.NumField(); i++ {
		field := rt.Field(i)
		fieldValue := rv.Field(i)

		// Skip if the field is nil (not provided in request)
		if fieldValue.Kind() == reflect.Ptr && fieldValue.IsNil() {
			continue
		}

		// Get the value and json key
		key, _, _ := strings.Cut(field.Tag.Get("json"), ",")
		var value string
		if fieldValue.Kind() == reflect.Ptr {
			value = fieldValue.Elem().String()
		}

		// Handle empty values by using defaults
		var err error
		if value == "" {
			defaultValue, _, _, _ := defaultCfg.FieldByKey(key)
			err = cfg.UpdateField(key, defaultValue, true)
		} else {
			err = cfg.UpdateField(key, value, true)
		}

		// Handle internal field errors
		if errors.Is(err, models.SettingSensitiveForbiddenError{}) {
			continue
		} else if err != nil {
			return nil, fmt.Errorf("failed to update in-memory config for key '%s': %w", key, err)
		}

		valuesToUpdate = append(valuesToUpdate, models.SettingVariable{
			Key:   key,
			Value: value,
		})
	}

	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, setting := range valuesToUpdate {
			if err := tx.Save(&setting).Error; err != nil {
				return fmt.Errorf("failed to update setting %s: %w", setting.Key, err)
			}
		}
		return nil
	})

	if err != nil {
		return nil, err
	}

	settings, err := s.GetSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve updated settings: %w", err)
	}

	return settings.ToSettingVariableSlice(true, false), nil
}

func (s *SettingsService) EnsureDefaultSettings(ctx context.Context) error {
	defaultSettings := s.getDefaultSettings()
	defaultSettingVars := defaultSettings.ToSettingVariableSlice(true, false)

	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, defaultSetting := range defaultSettingVars {
			var existing models.SettingVariable
			err := tx.Where("key = ?", defaultSetting.Key).First(&existing).Error

			if errors.Is(err, gorm.ErrRecordNotFound) {
				if err := tx.Create(&defaultSetting).Error; err != nil {
					return fmt.Errorf("failed to create default setting %s: %w", defaultSetting.Key, err)
				}
			} else if err != nil {
				return fmt.Errorf("failed to check for existing setting %s: %w", defaultSetting.Key, err)
			}
			// If setting exists, leave it as is (don't overwrite user values)
		}
		return nil
	})
}

func (s *SettingsService) GetBoolSetting(ctx context.Context, key string, defaultValue bool) bool {
	var sv models.SettingVariable
	err := s.db.WithContext(ctx).Where("key = ?", key).First(&sv).Error
	if err != nil {
		return defaultValue
	}
	return sv.IsTrue()
}

func (s *SettingsService) GetIntSetting(ctx context.Context, key string, defaultValue int) int {
	var sv models.SettingVariable
	err := s.db.WithContext(ctx).Where("key = ?", key).First(&sv).Error
	if err != nil {
		return defaultValue
	}
	return sv.AsInt()
}

func (s *SettingsService) GetStringSetting(ctx context.Context, key, defaultValue string) string {
	var sv models.SettingVariable
	err := s.db.WithContext(ctx).Where("key = ?", key).First(&sv).Error
	if err != nil {
		return defaultValue
	}
	return sv.Value
}

func (s *SettingsService) SetBoolSetting(ctx context.Context, key string, value bool) error {
	return s.UpdateSetting(ctx, key, fmt.Sprintf("%t", value))
}

func (s *SettingsService) SetIntSetting(ctx context.Context, key string, value int) error {
	return s.UpdateSetting(ctx, key, fmt.Sprintf("%d", value))
}

func (s *SettingsService) SetStringSetting(ctx context.Context, key, value string) error {
	return s.UpdateSetting(ctx, key, value)
}
