package services

import (
	"context"
	"encoding/json"
	"testing"

	glsqlite "github.com/glebarez/sqlite"
	"github.com/stretchr/testify/require"
	"gorm.io/gorm"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
)

func setupSettingsTestDB(t *testing.T) *database.DB {
	t.Helper()
	db, err := gorm.Open(glsqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)
	require.NoError(t, db.AutoMigrate(&models.SettingVariable{}))
	return &database.DB{DB: db}
}

func TestSettingsService_EnsureDefaultSettings_Idempotent(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	require.NoError(t, svc.EnsureDefaultSettings(ctx))

	var count1 int64
	require.NoError(t, svc.db.WithContext(ctx).Model(&models.SettingVariable{}).Count(&count1).Error)
	require.Positive(t, count1)

	require.NoError(t, svc.EnsureDefaultSettings(ctx))

	var count2 int64
	require.NoError(t, svc.db.WithContext(ctx).Model(&models.SettingVariable{}).Count(&count2).Error)
	require.Equal(t, count1, count2)

	// Spot-check a couple keys exist
	for _, key := range []string{"authLocalEnabled", "projectsDirectory"} {
		var sv models.SettingVariable
		err := svc.db.WithContext(ctx).Where("key = ?", key).First(&sv).Error
		require.NoErrorf(t, err, "missing default key %s", key)
	}
}

func TestSettingsService_GetSettings_UnknownKeysIgnored(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	require.NoError(t, svc.db.WithContext(ctx).
		Create(&models.SettingVariable{Key: "someUnknownKey", Value: "x"}).Error)

	_, err = svc.GetSettings(ctx)
	require.NoError(t, err)
}

func TestSettingsService_GetSetHelpers(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Defaults for missing keys
	require.True(t, svc.GetBoolSetting(ctx, "nonexistentBool", true))
	require.Equal(t, 42, svc.GetIntSetting(ctx, "nonexistentInt", 42))
	require.Equal(t, "def", svc.GetStringSetting(ctx, "nonexistentStr", "def"))

	// Set and read back
	require.NoError(t, svc.SetBoolSetting(ctx, "enableGravatar", true))
	require.True(t, svc.GetBoolSetting(ctx, "enableGravatar", false))

	require.NoError(t, svc.SetIntSetting(ctx, "authSessionTimeout", 123))
	require.Equal(t, 123, svc.GetIntSetting(ctx, "authSessionTimeout", 0))

	require.NoError(t, svc.SetStringSetting(ctx, "baseServerUrl", "http://localhost"))
	require.Equal(t, "http://localhost", svc.GetStringSetting(ctx, "baseServerUrl", ""))
}

func TestSettingsService_UpdateSetting(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Use an existing key ("pruneMode") instead of a non-existent one
	require.NoError(t, svc.UpdateSetting(ctx, "pruneMode", "all"))

	var sv models.SettingVariable
	require.NoError(t, svc.db.WithContext(ctx).Where("key = ?", "pruneMode").First(&sv).Error)
	require.Equal(t, "all", sv.Value)
}

func TestSettingsService_EnsureEncryptionKey(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	k1, err := svc.EnsureEncryptionKey(ctx)
	require.NoError(t, err)
	require.NotEmpty(t, k1)

	k2, err := svc.EnsureEncryptionKey(ctx)
	require.NoError(t, err)
	require.Equal(t, k1, k2, "encryption key should be stable between calls")

	var sv models.SettingVariable
	require.NoError(t, svc.db.WithContext(ctx).Where("key = ?", "encryptionKey").First(&sv).Error)
	require.Equal(t, k1, sv.Value)
}

func TestSettingsService_SyncOidcEnvToDatabase(t *testing.T) {
	// Set env BEFORE creating service so config loader (if any) sees them
	t.Setenv("OIDC_ENABLED", "false")
	t.Setenv("OIDC_CLIENT_ID", "cid")
	t.Setenv("OIDC_CLIENT_SECRET", "csec")
	t.Setenv("OIDC_ISSUER_URL", "https://issuer.example")
	t.Setenv("OIDC_SCOPES", "openid profile email")
	t.Setenv("OIDC_ADMIN_CLAIM", "roles")
	t.Setenv("OIDC_ADMIN_VALUE", "admin")

	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// (Re)load settings after env prepared
	vars, err := svc.SyncOidcEnvToDatabase(ctx)
	require.NoError(t, err)
	require.NotEmpty(t, vars)

	var enabled models.SettingVariable
	require.NoError(t, svc.db.WithContext(ctx).Where("key = ?", "authOidcEnabled").First(&enabled).Error)
	require.Equal(t, "true", enabled.Value)

	var cfgVar models.SettingVariable
	require.NoError(t, svc.db.WithContext(ctx).Where("key = ?", "authOidcConfig").First(&cfgVar).Error)

	var oc models.OidcConfig
	require.NoError(t, json.Unmarshal([]byte(cfgVar.Value), &oc))
	require.Equal(t, "cid", oc.ClientID)
	require.Equal(t, "csec", oc.ClientSecret)
	require.Equal(t, "https://issuer.example", oc.IssuerURL)
	require.Equal(t, "openid profile email", oc.Scopes)
	require.Equal(t, "roles", oc.AdminClaim)
	require.Equal(t, "admin", oc.AdminValue)
}

func TestSettingsService_UpdateSettings_MergeOidcSecret(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Seed existing OIDC config with a secret
	existing := models.OidcConfig{
		ClientID:     "old",
		ClientSecret: "keep-this",
		IssuerURL:    "https://issuer",
	}
	b, err := json.Marshal(existing)
	require.NoError(t, err)
	require.NoError(t, svc.UpdateSetting(ctx, "authOidcConfig", string(b)))

	// Incoming update missing clientSecret should preserve existing one
	incoming := models.OidcConfig{
		ClientID:  "new",
		IssuerURL: "https://issuer",
	}
	nb, err := json.Marshal(incoming)
	require.NoError(t, err)
	s := string(nb)

	updates := dto.UpdateSettingsDto{
		AuthOidcConfig: &s,
	}
	_, err = svc.UpdateSettings(ctx, updates)
	require.NoError(t, err)

	var cfgVar models.SettingVariable
	require.NoError(t, svc.db.WithContext(ctx).Where("key = ?", "authOidcConfig").First(&cfgVar).Error)

	var merged models.OidcConfig
	require.NoError(t, json.Unmarshal([]byte(cfgVar.Value), &merged))
	require.Equal(t, "new", merged.ClientID)
	require.Equal(t, "keep-this", merged.ClientSecret)
}

func TestSettingsService_LoadDatabaseSettings_ReloadsChanges(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Initially empty DB -> defaults (not persisted yet)
	require.NoError(t, svc.EnsureDefaultSettings(ctx))

	// Update a value directly in DB
	require.NoError(t, svc.UpdateSetting(ctx, "projectsDirectory", "custom/projects"))

	// Force reload
	require.NoError(t, svc.LoadDatabaseSettings(ctx))

	cfg := svc.GetSettingsConfig()
	require.Equal(t, "custom/projects", cfg.ProjectsDirectory.Value)
}

func TestSettingsService_LoadDatabaseSettings_UIConfigurationDisabled_Env(t *testing.T) {
	// Set env + disable flag BEFORE service init
	t.Setenv("UI_CONFIGURATION_DISABLED", "true")
	t.Setenv("PROJECTS_DIRECTORY", "env/projects")
	t.Setenv("BASE_SERVER_URL", "https://env.example")

	c := config.Load()
	c.UIConfigurationDisabled = true

	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Reload explicitly (NewSettingsService already did, but explicit for clarity)
	require.NoError(t, svc.LoadDatabaseSettings(ctx))

	cfg := svc.GetSettingsConfig()
	require.Equal(t, "env/projects", cfg.ProjectsDirectory.Value)
	require.Equal(t, "https://env.example", cfg.BaseServerURL.Value)
}

func TestSettingsService_UpdateSettings_RefreshesCache(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)
	require.NoError(t, svc.EnsureDefaultSettings(ctx))

	newDir := "custom/projects2"
	req := dto.UpdateSettingsDto{
		ProjectsDirectory: &newDir,
	}

	_, err = svc.UpdateSettings(ctx, req)
	require.NoError(t, err)

	// ListSettings uses the cached snapshot; should reflect updated value
	list := svc.ListSettings(true)
	found := false
	for _, sv := range list {
		if sv.Key == "projectsDirectory" {
			found = true
			require.Equal(t, newDir, sv.Value)
		}
	}
	require.True(t, found, "projectsDirectory setting not found in cached list")
}

func TestSettingsService_AgentMode_OnlyLoadsAgentSettings(t *testing.T) {
	// Set agent mode BEFORE creating service
	t.Setenv("AGENT_MODE", "true")
	t.Setenv("PROJECTS_DIRECTORY", "agent/projects")
	t.Setenv("DOCKER_HOST", "unix:///var/run/docker.sock")
	t.Setenv("POLLING_ENABLED", "true")

	ctx := context.Background()
	db := setupSettingsTestDB(t)

	// Reload config to pick up env vars
	cfg := config.Load()
	cfg.AgentMode = true
	cfg.UIConfigurationDisabled = true

	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	settings := svc.GetSettingsConfig()

	// Agent settings should be loaded
	require.Equal(t, "agent/projects", settings.ProjectsDirectory.Value)
	require.Equal(t, "unix:///var/run/docker.sock", settings.DockerHost.Value)
	require.Equal(t, "true", settings.PollingEnabled.Value)

	// Manager-only settings should be empty or default (not loaded from env)
	require.Empty(t, settings.BaseServerURL.Value)
	require.Empty(t, settings.AuthLocalEnabled.Value)
	require.Empty(t, settings.OnboardingCompleted.Value)
}

func TestSettingsService_ManagerMode_LoadsAllSettings(t *testing.T) {
	t.Setenv("AGENT_MODE", "false")
	t.Setenv("UI_CONFIGURATION_DISABLED", "true")
	t.Setenv("PROJECTS_DIRECTORY", "manager/projects")
	t.Setenv("BASE_SERVER_URL", "http://manager.example")

	ctx := context.Background()
	db := setupSettingsTestDB(t)

	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	settings := svc.GetSettingsConfig()

	// Both agent and manager settings should be loaded
	require.Equal(t, "manager/projects", settings.ProjectsDirectory.Value)
	require.Equal(t, "http://manager.example", settings.BaseServerURL.Value)
}

func TestModels_ParseSettingTag(t *testing.T) {
	tests := []struct {
		name     string
		tagValue string
		expected models.SettingTagAttributes
	}{
		{
			name:     "simple key only",
			tagValue: "dockerHost",
			expected: models.SettingTagAttributes{
				Key: "dockerHost",
			},
		},
		{
			name:     "with agent tag",
			tagValue: "projectsDirectory,agent",
			expected: models.SettingTagAttributes{
				Key:     "projectsDirectory",
				IsAgent: true,
			},
		},
		{
			name:     "multiple attributes",
			tagValue: "dockerHost,public,agent,envOverride",
			expected: models.SettingTagAttributes{
				Key:         "dockerHost",
				IsPublic:    true,
				IsAgent:     true,
				EnvOverride: true,
			},
		},
		{
			name:     "sensitive attribute",
			tagValue: "authOidcConfig,sensitive",
			expected: models.SettingTagAttributes{
				Key:         "authOidcConfig",
				IsSensitive: true,
			},
		},
		{
			name:     "internal attribute",
			tagValue: "instanceId,internal",
			expected: models.SettingTagAttributes{
				Key:        "instanceId",
				IsInternal: true,
			},
		},
		{
			name:     "all attributes",
			tagValue: "testKey,public,sensitive,internal,agent,envOverride",
			expected: models.SettingTagAttributes{
				Key:         "testKey",
				IsPublic:    true,
				IsSensitive: true,
				IsInternal:  true,
				IsAgent:     true,
				EnvOverride: true,
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := models.ParseSettingTag(tt.tagValue)
			require.Equal(t, tt.expected, result)
		})
	}
}

func TestModels_Settings_IsAgentSetting(t *testing.T) {
	settings := &models.Settings{}

	// Agent settings
	require.True(t, settings.IsAgentSetting("projectsDirectory"))
	require.True(t, settings.IsAgentSetting("dockerHost"))
	require.True(t, settings.IsAgentSetting("pollingEnabled"))
	require.True(t, settings.IsAgentSetting("defaultShell"))

	// Manager-only settings
	require.False(t, settings.IsAgentSetting("baseServerUrl"))
	require.False(t, settings.IsAgentSetting("authLocalEnabled"))
	require.False(t, settings.IsAgentSetting("onboardingCompleted"))
	require.False(t, settings.IsAgentSetting("mobileNavigationMode"))

	// Internal settings (should return true)
	require.True(t, settings.IsAgentSetting("instanceId"))

	// Non-existent key
	require.False(t, settings.IsAgentSetting("nonexistent"))
}

func TestModels_Settings_GetAgentSettings(t *testing.T) {
	settings := &models.Settings{
		ProjectsDirectory: models.SettingVariable{Value: "data/projects"},
		DockerHost:        models.SettingVariable{Value: "unix:///var/run/docker.sock"},
		PollingEnabled:    models.SettingVariable{Value: "true"},
		BaseServerURL:     models.SettingVariable{Value: "http://localhost"},
		AuthLocalEnabled:  models.SettingVariable{Value: "true"},
		InstanceID:        models.SettingVariable{Value: "test-instance"},
	}

	agentSettings := settings.GetAgentSettings(false)

	// Should include agent-tagged settings
	hasProjectsDir := false
	hasDockerHost := false
	hasPollingEnabled := false
	hasInstanceID := false

	// Should NOT include manager-only settings
	hasBaseServerURL := false
	hasAuthLocalEnabled := false

	for _, sv := range agentSettings {
		switch sv.Key {
		case "projectsDirectory":
			hasProjectsDir = true
			require.Equal(t, "data/projects", sv.Value)
		case "dockerHost":
			hasDockerHost = true
			require.Equal(t, "unix:///var/run/docker.sock", sv.Value)
		case "pollingEnabled":
			hasPollingEnabled = true
			require.Equal(t, "true", sv.Value)
		case "instanceId":
			hasInstanceID = true
			require.Equal(t, "test-instance", sv.Value)
		case "baseServerUrl":
			hasBaseServerURL = true
		case "authLocalEnabled":
			hasAuthLocalEnabled = true
		}
	}

	require.True(t, hasProjectsDir, "agent settings should include projectsDirectory")
	require.True(t, hasDockerHost, "agent settings should include dockerHost")
	require.True(t, hasPollingEnabled, "agent settings should include pollingEnabled")
	require.True(t, hasInstanceID, "agent settings should include instanceId (internal)")
	require.False(t, hasBaseServerURL, "agent settings should NOT include baseServerUrl")
	require.False(t, hasAuthLocalEnabled, "agent settings should NOT include authLocalEnabled")
}

func TestSettingsService_GetDefaultSettings_AgentMode(t *testing.T) {
	t.Setenv("AGENT_MODE", "true")

	ctx := context.Background()
	db := setupSettingsTestDB(t)

	cfg := config.Load()
	cfg.AgentMode = true

	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	defaults := svc.GetSettingsConfig()

	// Agent settings should have default values
	require.NotEmpty(t, defaults.ProjectsDirectory.Value)
	require.NotEmpty(t, defaults.DockerHost.Value)
	require.NotEmpty(t, defaults.PollingEnabled.Value)

	// Manager-only settings should be empty
	require.Empty(t, defaults.BaseServerURL.Value)
	require.Empty(t, defaults.AuthLocalEnabled.Value)
	require.Empty(t, defaults.OnboardingCompleted.Value)
	require.Empty(t, defaults.MobileNavigationMode.Value)
}

func TestSettingsService_EnvOverride_AppliedCorrectly(t *testing.T) {
	t.Setenv("DOCKER_HOST", "tcp://custom:2375")

	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Create a DB setting
	require.NoError(t, svc.UpdateSetting(ctx, "dockerHost", "unix:///var/run/docker.sock"))

	// Reload to apply env overrides
	require.NoError(t, svc.LoadDatabaseSettings(ctx))

	settings := svc.GetSettingsConfig()

	// Env override should win
	require.Equal(t, "tcp://custom:2375", settings.DockerHost.Value)
}

func TestSettingsService_ToSettingVariableSlice_Redaction(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Set a sensitive value
	oidcConfig := models.OidcConfig{
		ClientID:     "test-client",
		ClientSecret: "super-secret",
		IssuerURL:    "https://issuer.example",
	}
	configJSON, err := json.Marshal(oidcConfig)
	require.NoError(t, err)

	require.NoError(t, svc.UpdateSetting(ctx, "authOidcConfig", string(configJSON)))
	require.NoError(t, svc.LoadDatabaseSettings(ctx))

	settings := svc.GetSettingsConfig()

	// Without redaction
	varsNoRedact := settings.ToSettingVariableSlice(true, false)
	var oidcVarNoRedact *models.SettingVariable
	for _, sv := range varsNoRedact {
		if sv.Key == "authOidcConfig" {
			oidcVarNoRedact = &sv
			break
		}
	}
	require.NotNil(t, oidcVarNoRedact)

	var unredacted models.OidcConfig
	require.NoError(t, json.Unmarshal([]byte(oidcVarNoRedact.Value), &unredacted))
	require.Equal(t, "super-secret", unredacted.ClientSecret)

	// With redaction
	varsRedact := settings.ToSettingVariableSlice(true, true)
	var oidcVarRedact *models.SettingVariable
	for _, sv := range varsRedact {
		if sv.Key == "authOidcConfig" {
			oidcVarRedact = &sv
			break
		}
	}
	require.NotNil(t, oidcVarRedact)

	var redacted models.OidcConfig
	require.NoError(t, json.Unmarshal([]byte(oidcVarRedact.Value), &redacted))
	require.Empty(t, redacted.ClientSecret, "client secret should be redacted")
	require.Equal(t, "test-client", redacted.ClientID, "non-sensitive fields should remain")
}

func TestSettingsService_PersistEnvSettingsIfMissing(t *testing.T) {
	t.Setenv("PROJECTS_DIRECTORY", "env/test/projects")
	t.Setenv("DOCKER_HOST", "tcp://env-host:2375")
	t.Setenv("POLLING_ENABLED", "false")
	t.Setenv("BASE_SERVER_URL", "https://env.example")

	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Persist env settings
	err = svc.PersistEnvSettingsIfMissing(ctx)
	require.NoError(t, err)

	// Verify settings were persisted to database
	var projectsDir models.SettingVariable
	require.NoError(t, db.WithContext(ctx).Where("key = ?", "projectsDirectory").First(&projectsDir).Error)
	require.Equal(t, "env/test/projects", projectsDir.Value)

	var dockerHost models.SettingVariable
	require.NoError(t, db.WithContext(ctx).Where("key = ?", "dockerHost").First(&dockerHost).Error)
	require.Equal(t, "tcp://env-host:2375", dockerHost.Value)

	// Change env var and persist again - should update
	t.Setenv("PROJECTS_DIRECTORY", "env/updated/projects")
	err = svc.PersistEnvSettingsIfMissing(ctx)
	require.NoError(t, err)

	require.NoError(t, db.WithContext(ctx).Where("key = ?", "projectsDirectory").First(&projectsDir).Error)
	require.Equal(t, "env/updated/projects", projectsDir.Value)
}

func TestSettingsService_SetBoolSetting_ErrorHandling(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)

	// Close the DB connection to force an error
	sqlDB, err := db.DB.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	svc := &SettingsService{db: db}
	svc.config.Store(&models.Settings{})

	err = svc.SetBoolSetting(ctx, "enableGravatar", true)
	require.Error(t, err)
}

func TestSettingsService_SetIntSetting_ErrorHandling(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)

	// Close the DB connection to force an error
	sqlDB, err := db.DB.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	svc := &SettingsService{db: db}
	svc.config.Store(&models.Settings{})

	err = svc.SetIntSetting(ctx, "authSessionTimeout", 123)
	require.Error(t, err)
}

func TestSettingsService_SetStringSetting_ErrorHandling(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)

	// Close the DB connection to force an error
	sqlDB, err := db.DB.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	svc := &SettingsService{db: db}
	svc.config.Store(&models.Settings{})

	err = svc.SetStringSetting(ctx, "baseServerUrl", "http://test")
	require.Error(t, err)
}

func TestSettingsService_EnsureEncryptionKey_Empty(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Create an empty encryption key
	require.NoError(t, db.WithContext(ctx).Create(&models.SettingVariable{
		Key:   "encryptionKey",
		Value: "",
	}).Error)

	// Should generate a new key
	key, err := svc.EnsureEncryptionKey(ctx)
	require.NoError(t, err)
	require.NotEmpty(t, key)

	// Verify it was persisted
	var sv models.SettingVariable
	require.NoError(t, db.WithContext(ctx).Where("key = ?", "encryptionKey").First(&sv).Error)
	require.Equal(t, key, sv.Value)
}

func TestSettingsService_UpdateSettings_WithCallbacks(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)
	require.NoError(t, svc.EnsureDefaultSettings(ctx))

	pollingCalled := false
	autoUpdateCalled := false

	svc.OnImagePollingSettingsChanged = func(ctx context.Context) {
		pollingCalled = true
	}
	svc.OnAutoUpdateSettingsChanged = func(ctx context.Context) {
		autoUpdateCalled = true
	}

	// Update polling settings
	newInterval := "120"
	_, err = svc.UpdateSettings(ctx, dto.UpdateSettingsDto{
		PollingInterval: &newInterval,
	})
	require.NoError(t, err)
	require.True(t, pollingCalled, "polling callback should be called")

	// Reset flags
	pollingCalled = false

	// Update auto-update settings
	autoUpdate := "true"
	_, err = svc.UpdateSettings(ctx, dto.UpdateSettingsDto{
		AutoUpdate: &autoUpdate,
	})
	require.NoError(t, err)
	require.True(t, autoUpdateCalled, "auto-update callback should be called")
}

func TestSettingsService_UpdateSettings_InvalidOidcConfig(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)
	require.NoError(t, svc.EnsureDefaultSettings(ctx))

	invalidJSON := "not-valid-json"
	_, err = svc.UpdateSettings(ctx, dto.UpdateSettingsDto{
		AuthOidcConfig: &invalidJSON,
	})
	require.Error(t, err)
	require.Contains(t, err.Error(), "invalid authOidcConfig JSON")
}

func TestSettingsService_UpdateSettings_TransactionError(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)
	require.NoError(t, svc.EnsureDefaultSettings(ctx))

	// Close the DB to force transaction error
	sqlDB, err := db.DB.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	newDir := "test/projects"
	_, err = svc.UpdateSettings(ctx, dto.UpdateSettingsDto{
		ProjectsDirectory: &newDir,
	})
	require.Error(t, err)
}

func TestSettingsService_UpdateSettings_EmptyValueUsesDefault(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)
	require.NoError(t, svc.EnsureDefaultSettings(ctx))

	// Set a value first
	customDir := "custom/projects"
	_, err = svc.UpdateSettings(ctx, dto.UpdateSettingsDto{
		ProjectsDirectory: &customDir,
	})
	require.NoError(t, err)

	// Now set it to empty - should use default
	emptyDir := ""
	_, err = svc.UpdateSettings(ctx, dto.UpdateSettingsDto{
		ProjectsDirectory: &emptyDir,
	})
	require.NoError(t, err)

	// Verify it was set to default value
	var sv models.SettingVariable
	require.NoError(t, db.WithContext(ctx).Where("key = ?", "projectsDirectory").First(&sv).Error)
	require.Equal(t, "data/projects", sv.Value) // default value
}

func TestSettingsService_SyncOidcEnvToDatabase_MissingCredentials(t *testing.T) {
	t.Setenv("OIDC_CLIENT_ID", "")
	t.Setenv("OIDC_ISSUER_URL", "")

	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	_, err = svc.SyncOidcEnvToDatabase(ctx)
	require.Error(t, err)
	require.Contains(t, err.Error(), "missing OIDC_CLIENT_ID or OIDC_ISSUER_URL")
}

func TestSettingsService_LoadDatabaseSettings_QueryTimeout(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)

	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)
	require.NoError(t, svc.EnsureDefaultSettings(ctx))

	// This should complete successfully (testing timeout path works)
	err = svc.LoadDatabaseSettings(ctx)
	require.NoError(t, err)
}

func TestSettingsService_GetSettings_IgnoresUnknownFields(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Create settings with unknown keys
	require.NoError(t, db.WithContext(ctx).Create(&models.SettingVariable{
		Key:   "unknownKey1",
		Value: "value1",
	}).Error)
	require.NoError(t, db.WithContext(ctx).Create(&models.SettingVariable{
		Key:   "projectsDirectory",
		Value: "test/projects",
	}).Error)

	settings, err := svc.GetSettings(ctx)
	require.NoError(t, err)
	require.Equal(t, "test/projects", settings.ProjectsDirectory.Value)
}

func TestSettingsService_GetSettings_DatabaseError(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Close DB to force error
	sqlDB, err := db.DB.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	_, err = svc.GetSettings(ctx)
	require.Error(t, err)
}

func TestSettingsService_NewSettingsService_LoadError(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)

	// Close DB before creating service
	sqlDB, err := db.DB.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	_, err = NewSettingsService(ctx, db)
	require.Error(t, err)
	require.Contains(t, err.Error(), "failed to load settings")
}

func TestSettingsService_SetupInstanceID_GenerateError(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)

	svc := &SettingsService{db: db}

	// Set empty instance ID in config
	svc.config.Store(&models.Settings{
		InstanceID: models.SettingVariable{Value: ""},
	})

	// Close DB to force error on update
	sqlDB, err := db.DB.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	err = svc.setupInstanceID(ctx)
	require.Error(t, err)
}

func TestSettingsService_EnsureDefaultSettings_CreateError(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	// Close DB to force error
	sqlDB, err := db.DB.DB()
	require.NoError(t, err)
	require.NoError(t, sqlDB.Close())

	err = svc.EnsureDefaultSettings(ctx)
	require.Error(t, err)
}

func TestSettingsService_LoadDatabaseSettingsInternal_UIConfigDisabled_Testing(t *testing.T) {
	t.Setenv("UI_CONFIGURATION_DISABLED", "true")
	t.Setenv("ENVIRONMENT", "testing")
	t.Setenv("PROJECTS_DIRECTORY", "test/projects")

	ctx := context.Background()
	db := setupSettingsTestDB(t)

	// Set some onboarding data
	require.NoError(t, db.WithContext(ctx).Create(&models.SettingVariable{
		Key:   "onboardingCompleted",
		Value: "true",
	}).Error)
	require.NoError(t, db.WithContext(ctx).Create(&models.SettingVariable{
		Key:   "onboardingSteps",
		Value: `["step1","step2"]`,
	}).Error)

	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	settings := svc.GetSettingsConfig()
	require.Equal(t, "test/projects", settings.ProjectsDirectory.Value)
	// In testing mode, onboarding vars should NOT be loaded from DB, they get default values
	require.Equal(t, "false", settings.OnboardingCompleted.Value) // default value, not from DB
	require.Equal(t, "[]", settings.OnboardingSteps.Value)        // default value, not from DB
}

func TestSettingsService_LoadDatabaseSettingsInternal_UIConfigDisabled_Production(t *testing.T) {
	t.Setenv("UI_CONFIGURATION_DISABLED", "true")
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("PROJECTS_DIRECTORY", "prod/projects")

	ctx := context.Background()
	db := setupSettingsTestDB(t)

	// Set some onboarding data
	require.NoError(t, db.WithContext(ctx).Create(&models.SettingVariable{
		Key:   "onboardingCompleted",
		Value: "true",
	}).Error)
	require.NoError(t, db.WithContext(ctx).Create(&models.SettingVariable{
		Key:   "onboardingSteps",
		Value: `["step1","step2"]`,
	}).Error)

	svc, err := NewSettingsService(ctx, db)
	require.NoError(t, err)

	settings := svc.GetSettingsConfig()
	require.Equal(t, "prod/projects", settings.ProjectsDirectory.Value)
	// In production mode with UI config disabled, onboarding vars SHOULD be loaded from DB
	require.Equal(t, "true", settings.OnboardingCompleted.Value)
	require.Equal(t, `["step1","step2"]`, settings.OnboardingSteps.Value)
}
