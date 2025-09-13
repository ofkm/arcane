package services

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
)

type SettingsService struct {
	db     *database.DB
	config *config.Config
}

func NewSettingsService(db *database.DB, cfg *config.Config) *SettingsService {
	return &SettingsService{
		db:     db,
		config: cfg,
	}
}

func (s *SettingsService) GetSettings(ctx context.Context) (*models.Settings, error) {
	var settingVars []models.SettingVariable
	err := s.db.WithContext(ctx).Find(&settingVars).Error
	if err != nil {
		return nil, err
	}

	settings := &models.Settings{}

	for _, sv := range settingVars {
		if err := settings.UpdateField(sv.Key, sv.Value, false); err != nil {
			// If key not found, it's okay
			var notFoundErr models.SettingKeyNotFoundError
			if !errors.As(err, &notFoundErr) {
				return nil, fmt.Errorf("failed to load setting %s: %w", sv.Key, err)
			}
		}
	}

	return settings, nil
}

func (s *SettingsService) getDefaultSettings() *models.Settings {
	return &models.Settings{
		// Docker settings
		StacksDirectory:    models.SettingVariable{Value: "data/projects"},
		AutoUpdate:         models.SettingVariable{Value: "false"},
		AutoUpdateInterval: models.SettingVariable{Value: "1440"},
		PollingEnabled:     models.SettingVariable{Value: "true"},
		PollingInterval:    models.SettingVariable{Value: "60"},
		PruneMode:          models.SettingVariable{Value: "dangling"},
		BaseServerURL:      models.SettingVariable{Value: ""},
		EnableGravatar:     models.SettingVariable{Value: "true"},

		// Authentication settings
		AuthLocalEnabled:   models.SettingVariable{Value: "true"},
		AuthOidcEnabled:    models.SettingVariable{Value: "false"},
		AuthSessionTimeout: models.SettingVariable{Value: "1440"},
		AuthPasswordPolicy: models.SettingVariable{Value: "strong"},
		AuthOidcConfig:     models.SettingVariable{Value: "{}"},

		// Onboarding settings
		OnboardingCompleted: models.SettingVariable{Value: "false"},
		OnboardingSteps:     models.SettingVariable{Value: "[]"},
	}
}

func (s *SettingsService) SyncOidcEnvToDatabase(ctx context.Context) ([]models.SettingVariable, error) {
	if !s.config.OidcEnabled {
		return nil, errors.New("OIDC sync called but OIDC_ENABLED is false")
	}

	if s.config.OidcClientID == "" || s.config.OidcIssuerURL == "" {
		return nil, errors.New("required OIDC environment variables are missing (OIDC_CLIENT_ID or OIDC_ISSUER_URL)")
	}

	envOidcConfig := models.OidcConfig{
		ClientID:     s.config.OidcClientID,
		ClientSecret: s.config.OidcClientSecret,
		IssuerURL:    s.config.OidcIssuerURL,
		Scopes:       s.config.OidcScopes,
		AdminClaim:   s.config.OidcAdminClaim,
		AdminValue:   s.config.OidcAdminValue,
	}

	oidcConfigBytes, err := json.Marshal(envOidcConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal OIDC config from env: %w", err)
	}

	// Force update the settings directly to bypass empty value checks
	err = s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Force update AuthOidcEnabled
		if err := tx.Save(&models.SettingVariable{
			Key:   "authOidcEnabled",
			Value: "true",
		}).Error; err != nil {
			return fmt.Errorf("failed to update authOidcEnabled: %w", err)
		}

		// Force update AuthOidcConfig
		if err := tx.Save(&models.SettingVariable{
			Key:   "authOidcConfig",
			Value: string(oidcConfigBytes),
		}).Error; err != nil {
			return fmt.Errorf("failed to update authOidcConfig: %w", err)
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to sync OIDC settings to database: %w", err)
	}

	// Return the updated settings
	settings, err := s.GetSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve updated settings: %w", err)
	}

	return settings.ToSettingVariableSlice(false, false), nil
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

//nolint:gocognit
func (s *SettingsService) UpdateSettings(ctx context.Context, updates dto.UpdateSettingsDto) ([]models.SettingVariable, error) {
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

		// Determine the actual value to use and save
		var valueToSave string
		var err error

		if value == "" {
			// Use default value for empty strings
			defaultValue, _, _, _ := defaultCfg.FieldByKey(key)
			valueToSave = defaultValue
			err = cfg.UpdateField(key, defaultValue, true)
		} else {
			// Use the provided value
			valueToSave = value
			err = cfg.UpdateField(key, value, true)
		}

		// Handle internal field errors
		if errors.Is(err, models.SettingSensitiveForbiddenError{}) {
			continue
		} else if err != nil {
			return nil, fmt.Errorf("failed to update in-memory config for key '%s': %w", key, err)
		}

		// Save the correct value to database
		valuesToUpdate = append(valuesToUpdate, models.SettingVariable{
			Key:   key,
			Value: valueToSave,
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

	// Merge OIDC config to avoid clearing secret when not provided
	if updates.AuthOidcConfig != nil {
		newCfgStr := *updates.AuthOidcConfig

		var incoming models.OidcConfig
		if err := json.Unmarshal([]byte(newCfgStr), &incoming); err != nil {
			return nil, fmt.Errorf("invalid authOidcConfig JSON: %w", err)
		}

		// Get current settings to preserve existing secret if empty
		current, err := s.GetSettings(ctx)
		if err != nil {
			return nil, fmt.Errorf("failed to load current settings: %w", err)
		}

		if current.AuthOidcConfig.Value != "" {
			var existing models.OidcConfig
			if err := json.Unmarshal([]byte(current.AuthOidcConfig.Value), &existing); err == nil {
				if incoming.ClientSecret == "" {
					incoming.ClientSecret = existing.ClientSecret
				}
			}
		}

		mergedBytes, err := json.Marshal(incoming)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal merged OIDC config: %w", err)
		}

		if err := s.UpdateSetting(ctx, "authOidcConfig", string(mergedBytes)); err != nil {
			return nil, fmt.Errorf("failed to update authOidcConfig: %w", err)
		}
	}

	settings, err := s.GetSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to retrieve updated settings: %w", err)
	}

	return settings.ToSettingVariableSlice(false, false), nil
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

func (s *SettingsService) EnsureEncryptionKey(ctx context.Context) (string, error) {
	const keyName = "encryptionKey"

	var sv models.SettingVariable
	err := s.db.WithContext(ctx).
		Where("key = ?", keyName).
		First(&sv).Error

	if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return "", fmt.Errorf("failed to load encryption key: %w", err)
	}

	if sv.Value != "" {
		return sv.Value, nil
	}

	// Generate uuid -> sha256 -> base64 key (32 bytes)
	u := uuid.New().String()
	sum := sha256.Sum256([]byte(u))
	key := base64.StdEncoding.EncodeToString(sum[:])

	if errors.Is(err, gorm.ErrRecordNotFound) {
		if createErr := s.db.WithContext(ctx).
			Create(&models.SettingVariable{Key: keyName, Value: key}).Error; createErr != nil {
			return "", fmt.Errorf("failed to persist encryption key: %w", createErr)
		}
		return key, nil
	}

	if updErr := s.db.WithContext(ctx).
		Model(&models.SettingVariable{}).
		Where("key = ?", keyName).
		Update("value", key).Error; updErr != nil {
		return "", fmt.Errorf("failed to update encryption key: %w", updErr)
	}

	return key, nil
}
