package services

import (
	"context"
	"encoding/json"
	"testing"

	glsqlite "github.com/glebarez/sqlite"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

func setupSettingsTestDB(t *testing.T) *database.DB {
	t.Helper()
	db, err := gorm.Open(glsqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("open db: %v", err)
	}
	if err := db.AutoMigrate(&models.SettingVariable{}); err != nil {
		t.Fatalf("migrate: %v", err)
	}
	return &database.DB{DB: db}
}

func TestSettingsService_EnsureDefaultSettings_Idempotent(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc := NewSettingsService(db, &config.Config{})

	if err := svc.EnsureDefaultSettings(ctx); err != nil {
		t.Fatalf("EnsureDefaultSettings: %v", err)
	}

	var count1 int64
	if err := svc.db.WithContext(ctx).Model(&models.SettingVariable{}).Count(&count1).Error; err != nil {
		t.Fatalf("count: %v", err)
	}
	if count1 == 0 {
		t.Fatalf("expected defaults inserted")
	}

	// Run again (should not duplicate)
	if err := svc.EnsureDefaultSettings(ctx); err != nil {
		t.Fatalf("EnsureDefaultSettings 2nd run: %v", err)
	}

	var count2 int64
	if err := svc.db.WithContext(ctx).Model(&models.SettingVariable{}).Count(&count2).Error; err != nil {
		t.Fatalf("count2: %v", err)
	}
	if count2 != count1 {
		t.Fatalf("defaults not idempotent: first=%d second=%d", count1, count2)
	}

	// Spot-check a couple keys exist
	for _, key := range []string{"authLocalEnabled", "stacksDirectory"} {
		var sv models.SettingVariable
		err := svc.db.WithContext(ctx).Where("key = ?", key).First(&sv).Error
		if err != nil {
			t.Fatalf("missing default key %s: %v", key, err)
		}
	}
}

func TestSettingsService_GetSettings_UnknownKeysIgnored(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc := NewSettingsService(db, &config.Config{})

	// Unknown key should not break loading
	if err := svc.db.WithContext(ctx).Create(&models.SettingVariable{Key: "someUnknownKey", Value: "x"}).Error; err != nil {
		t.Fatalf("seed: %v", err)
	}
	if _, err := svc.GetSettings(ctx); err != nil {
		t.Fatalf("GetSettings should ignore unknown key: %v", err)
	}
}

func TestSettingsService_GetSetHelpers(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc := NewSettingsService(db, &config.Config{})

	// Defaults for missing keys
	if got := svc.GetBoolSetting(ctx, "nonexistentBool", true); got != true {
		t.Fatalf("GetBoolSetting default mismatch: got %v", got)
	}
	if got := svc.GetIntSetting(ctx, "nonexistentInt", 42); got != 42 {
		t.Fatalf("GetIntSetting default mismatch: got %v", got)
	}
	if got := svc.GetStringSetting(ctx, "nonexistentStr", "def"); got != "def" {
		t.Fatalf("GetStringSetting default mismatch: got %v", got)
	}

	// Set and read back
	if err := svc.SetBoolSetting(ctx, "enableGravatar", true); err != nil {
		t.Fatalf("SetBoolSetting: %v", err)
	}
	if got := svc.GetBoolSetting(ctx, "enableGravatar", false); !got {
		t.Fatalf("GetBoolSetting persisted mismatch")
	}

	if err := svc.SetIntSetting(ctx, "authSessionTimeout", 123); err != nil {
		t.Fatalf("SetIntSetting: %v", err)
	}
	if got := svc.GetIntSetting(ctx, "authSessionTimeout", 0); got != 123 {
		t.Fatalf("GetIntSetting persisted mismatch: %v", got)
	}

	if err := svc.SetStringSetting(ctx, "baseServerUrl", "http://localhost"); err != nil {
		t.Fatalf("SetStringSetting: %v", err)
	}
	if got := svc.GetStringSetting(ctx, "baseServerUrl", ""); got != "http://localhost" {
		t.Fatalf("GetStringSetting persisted mismatch: %q", got)
	}
}

func TestSettingsService_UpdateSetting(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc := NewSettingsService(db, &config.Config{})

	if err := svc.UpdateSetting(ctx, "dockerPruneMode", "all"); err != nil {
		t.Fatalf("UpdateSetting: %v", err)
	}
	var sv models.SettingVariable
	if err := svc.db.WithContext(ctx).Where("key = ?", "dockerPruneMode").First(&sv).Error; err != nil {
		t.Fatalf("query: %v", err)
	}
	if sv.Value != "all" {
		t.Fatalf("value mismatch: %q", sv.Value)
	}
}

func TestSettingsService_EnsureEncryptionKey(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc := NewSettingsService(db, &config.Config{})

	k1, err := svc.EnsureEncryptionKey(ctx)
	if err != nil {
		t.Fatalf("EnsureEncryptionKey: %v", err)
	}
	if k1 == "" {
		t.Fatalf("empty key")
	}

	// Key should be persisted and reused
	k2, err := svc.EnsureEncryptionKey(ctx)
	if err != nil {
		t.Fatalf("EnsureEncryptionKey 2nd: %v", err)
	}
	if k2 != k1 {
		t.Fatalf("key not stable: first=%q second=%q", k1, k2)
	}

	var sv models.SettingVariable
	if err := svc.db.WithContext(ctx).Where("key = ?", "encryptionKey").First(&sv).Error; err != nil {
		t.Fatalf("query encryptionKey: %v", err)
	}
	if sv.Value != k1 {
		t.Fatalf("stored key mismatch")
	}
}

func TestSettingsService_SyncOidcEnvToDatabase(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	cfg := &config.Config{
		OidcEnabled:      true,
		OidcClientID:     "cid",
		OidcClientSecret: "csec",
		OidcIssuerURL:    "https://issuer.example",
		OidcScopes:       "openid profile email",
		OidcAdminClaim:   "roles",
		OidcAdminValue:   "admin",
	}
	svc := NewSettingsService(db, cfg)

	vars, err := svc.SyncOidcEnvToDatabase(ctx)
	if err != nil {
		t.Fatalf("SyncOidcEnvToDatabase: %v", err)
	}
	if len(vars) == 0 {
		t.Fatalf("expected settings slice returned")
	}

	// Verify persisted values
	var enabled models.SettingVariable
	if err := svc.db.WithContext(ctx).Where("key = ?", "authOidcEnabled").First(&enabled).Error; err != nil {
		t.Fatalf("query authOidcEnabled: %v", err)
	}
	if enabled.Value != "true" {
		t.Fatalf("authOidcEnabled not true: %q", enabled.Value)
	}

	var cfgVar models.SettingVariable
	if err := svc.db.WithContext(ctx).Where("key = ?", "authOidcConfig").First(&cfgVar).Error; err != nil {
		t.Fatalf("query authOidcConfig: %v", err)
	}
	var oc models.OidcConfig
	if err := json.Unmarshal([]byte(cfgVar.Value), &oc); err != nil {
		t.Fatalf("unmarshal oidc cfg: %v", err)
	}
	if oc.ClientID != "cid" || oc.ClientSecret != "csec" || oc.IssuerURL != "https://issuer.example" {
		t.Fatalf("oidc cfg mismatch: %+v", oc)
	}
	if oc.Scopes != "openid profile email" || oc.AdminClaim != "roles" || oc.AdminValue != "admin" {
		t.Fatalf("oidc cfg extras mismatch: %+v", oc)
	}
}

func TestSettingsService_UpdateSettings_MergeOidcSecret(t *testing.T) {
	ctx := context.Background()
	db := setupSettingsTestDB(t)
	svc := NewSettingsService(db, &config.Config{})

	// Seed existing OIDC config with a secret
	existing := models.OidcConfig{
		ClientID:     "old",
		ClientSecret: "keep-this",
		IssuerURL:    "https://issuer",
	}
	b, err := json.Marshal(existing)
	if err != nil {
		t.Fatalf("marshal existing oidc config: %v", err)
	}
	if err := svc.UpdateSetting(ctx, "authOidcConfig", string(b)); err != nil {
		t.Fatalf("seed: %v", err)
	}

	// Incoming update missing clientSecret should preserve existing one
	incoming := models.OidcConfig{
		ClientID:  "new",
		IssuerURL: "https://issuer",
	}
	nb, err := json.Marshal(incoming)
	if err != nil {
		t.Fatalf("marshal incoming oidc config: %v", err)
	}
	s := string(nb)

	updates := dto.UpdateSettingsDto{
		AuthOidcConfig: &s,
	}
	if _, err := svc.UpdateSettings(ctx, updates); err != nil {
		t.Fatalf("UpdateSettings: %v", err)
	}

	var cfgVar models.SettingVariable
	if err := svc.db.WithContext(ctx).Where("key = ?", "authOidcConfig").First(&cfgVar).Error; err != nil {
		t.Fatalf("query: %v", err)
	}
	var merged models.OidcConfig
	if err := json.Unmarshal([]byte(cfgVar.Value), &merged); err != nil {
		t.Fatalf("unmarshal merged: %v", err)
	}
	if merged.ClientID != "new" {
		t.Fatalf("clientId not updated: %q", merged.ClientID)
	}
	if merged.ClientSecret != "keep-this" {
		t.Fatalf("clientSecret not preserved: %q", merged.ClientSecret)
	}
}
