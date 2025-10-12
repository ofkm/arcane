package models

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strconv"
	"strings"
	"time"
)

const (
	redactionMask     = "XXXXXXXXXX"
	keyAuthOidcConfig = "authOidcConfig"
)

// SettingTagAttributes represents parsed tag attributes for efficient lookup
type SettingTagAttributes struct {
	Key         string
	IsPublic    bool
	IsSensitive bool
	IsInternal  bool
	IsAgent     bool // If true, setting applies to both agents and managers
	EnvOverride bool
}

// ParseSettingTag parses a key tag into structured attributes
// Tag format: "key:fieldName[,attribute1,attribute2,...]"
// Supported attributes:
//   - public: visible to non-admin users
//   - sensitive: contains sensitive data (will be redacted)
//   - internal: internal system use only
//   - agent: applies to both agent and manager modes (without this, manager-only)
//   - envOverride: can be overridden by environment variables
func ParseSettingTag(tagValue string) SettingTagAttributes {
	parts := strings.Split(tagValue, ",")
	if len(parts) == 0 {
		return SettingTagAttributes{}
	}

	attrs := SettingTagAttributes{Key: parts[0]}
	for _, attr := range parts[1:] {
		switch attr {
		case "public":
			attrs.IsPublic = true
		case "sensitive":
			attrs.IsSensitive = true
		case "internal":
			attrs.IsInternal = true
		case "agent":
			attrs.IsAgent = true
		case "envOverride":
			attrs.EnvOverride = true
		}
	}
	return attrs
}

type SettingVariable struct {
	Key   string `gorm:"primaryKey;not null"`
	Value string
}

// IsTrue returns true if the value is a truthy string
func (s SettingVariable) IsTrue() bool {
	ok, _ := strconv.ParseBool(s.Value)
	return ok
}

// AsInt returns the value as an integer
func (s SettingVariable) AsInt() int {
	val, _ := strconv.Atoi(s.Value)
	return val
}

// AsDurationSeconds returns the value as a time.Duration in seconds
func (s SettingVariable) AsDurationSeconds() time.Duration {
	val, err := strconv.Atoi(s.Value)
	if err != nil {
		return 0
	}
	return time.Duration(val) * time.Second
}

// Settings represents the application configuration stored in the database.
// Each field uses struct tags to define behavior:
//
// Tag Attributes:
//   - agent: Setting applies to both agent and manager modes. Without this tag,
//     the setting is manager-only and will be excluded in agent mode.
//   - public: Visible to non-admin users via API endpoints
//   - sensitive: Contains sensitive data (passwords, tokens) - will be redacted in responses
//   - internal: Internal system setting (e.g., instanceId) - loaded from DB, not env
//   - envOverride: Can be overridden by environment variables at runtime
//
// Agent vs Manager Settings:
//   - Agent mode (AGENT_MODE=true): Only settings tagged with "agent" are loaded/used.
//     This allows agents to have their own Docker config while managers handle
//     authentication, UI preferences, etc.
//   - Manager mode (default): All settings are available.
//
// Example tags:
//   - `key:"dockerHost,public,agent,envOverride"`: Agent setting, public, can be overridden by DOCKER_HOST env var
//   - `key:"authOidcConfig,sensitive"`: Manager-only, sensitive (will be redacted)
//   - `key:"pollingInterval,agent"`: Agent setting, not public
type Settings struct {
	// Docker - agent settings apply to both agents and managers
	ProjectsDirectory  SettingVariable `key:"projectsDirectory,agent"`
	DiskUsagePath      SettingVariable `key:"diskUsagePath,agent"`
	AutoUpdate         SettingVariable `key:"autoUpdate,agent"`
	AutoUpdateInterval SettingVariable `key:"autoUpdateInterval,agent"`
	PollingEnabled     SettingVariable `key:"pollingEnabled,agent"`
	PollingInterval    SettingVariable `key:"pollingInterval,agent"`
	PruneMode          SettingVariable `key:"dockerPruneMode,agent"`
	BaseServerURL      SettingVariable `key:"baseServerUrl"`
	EnableGravatar     SettingVariable `key:"enableGravatar"`
	DefaultShell       SettingVariable `key:"defaultShell,agent"`
	DockerHost         SettingVariable `key:"dockerHost,public,agent,envOverride"`
	AccentColor        SettingVariable `key:"accentColor,public"`

	// Authentication - manager only
	AuthLocalEnabled   SettingVariable `key:"authLocalEnabled,public"`
	AuthOidcEnabled    SettingVariable `key:"authOidcEnabled,public"`
	AuthSessionTimeout SettingVariable `key:"authSessionTimeout"`
	AuthPasswordPolicy SettingVariable `key:"authPasswordPolicy"`
	AuthOidcConfig     SettingVariable `key:"authOidcConfig,sensitive"`

	// Onboarding - manager only
	OnboardingCompleted SettingVariable `key:"onboardingCompleted,public"`
	OnboardingSteps     SettingVariable `key:"onboardingSteps"`

	// Navigation - manager only (UI-specific)
	MobileNavigationMode         SettingVariable `key:"mobileNavigationMode,public"`
	MobileNavigationShowLabels   SettingVariable `key:"mobileNavigationShowLabels,public"`
	MobileNavigationScrollToHide SettingVariable `key:"mobileNavigationScrollToHide,public"`
	MobileNavigationTapToHide    SettingVariable `key:"mobileNavigationTapToHide,public"`

	InstanceID SettingVariable `key:"instanceId,internal"`
}

func (SettingVariable) TableName() string {
	return "settings"
}

func (s *Settings) ToSettingVariableSlice(showAll bool, redactSensitiveValues bool) []SettingVariable {
	cfgValue := reflect.ValueOf(s).Elem()
	cfgType := cfgValue.Type()

	var res []SettingVariable

	for i := 0; i < cfgType.NumField(); i++ {
		field := cfgType.Field(i)

		tagValue := field.Tag.Get("key")
		if tagValue == "" {
			continue
		}

		attrs := ParseSettingTag(tagValue)

		if !showAll && !attrs.IsPublic {
			continue
		}

		value := cfgValue.Field(i).FieldByName("Value").String()
		if redactSensitiveValues && attrs.IsSensitive {
			value = redactSettingValue(attrs.Key, value, attrs.IsSensitive)
		}

		settingVariable := SettingVariable{
			Key:   attrs.Key,
			Value: value,
		}
		res = append(res, settingVariable)
	}

	return res
}

// GetAgentSettings returns all settings that apply to agent mode
func (s *Settings) GetAgentSettings(redactSensitiveValues bool) []SettingVariable {
	cfgValue := reflect.ValueOf(s).Elem()
	cfgType := cfgValue.Type()

	var res []SettingVariable

	for i := 0; i < cfgType.NumField(); i++ {
		field := cfgType.Field(i)

		tagValue := field.Tag.Get("key")
		if tagValue == "" {
			continue
		}

		attrs := ParseSettingTag(tagValue)

		// Include only agent-applicable or internal settings
		if !attrs.IsAgent && !attrs.IsInternal {
			continue
		}

		value := cfgValue.Field(i).FieldByName("Value").String()
		if redactSensitiveValues && attrs.IsSensitive {
			value = redactSettingValue(attrs.Key, value, attrs.IsSensitive)
		}

		settingVariable := SettingVariable{
			Key:   attrs.Key,
			Value: value,
		}
		res = append(res, settingVariable)
	}

	return res
}

func (s *Settings) FieldByKey(key string) (defaultValue string, isPublic bool, isSensitive bool, err error) {
	rv := reflect.ValueOf(s).Elem()
	rt := rv.Type()

	for i := 0; i < rt.NumField(); i++ {
		tagValue := rt.Field(i).Tag.Get("key")
		if tagValue == "" {
			continue
		}

		attrs := ParseSettingTag(tagValue)
		if attrs.Key != key {
			continue
		}

		valueField := rv.Field(i).FieldByName("Value")
		return valueField.String(), attrs.IsPublic, attrs.IsSensitive, nil
	}

	return "", false, false, SettingKeyNotFoundError{field: key}
}

func (s *Settings) UpdateField(key string, value string, noSensitive bool) error {
	rv := reflect.ValueOf(s).Elem()
	rt := rv.Type()

	for i := 0; i < rt.NumField(); i++ {
		tagValue := rt.Field(i).Tag.Get("key")
		if tagValue == "" {
			continue
		}

		attrs := ParseSettingTag(tagValue)
		if attrs.Key != key {
			continue
		}

		// If the field is sensitive and noSensitive is true, we skip that
		if noSensitive && attrs.IsSensitive {
			return SettingSensitiveForbiddenError{field: key}
		}

		valueField := rv.Field(i).FieldByName("Value")
		if !valueField.CanSet() {
			return fmt.Errorf("field Value in SettingVariable is not settable for config key '%s'", key)
		}

		valueField.SetString(value)
		return nil
	}

	return SettingKeyNotFoundError{field: key}
}

// IsAgentSetting checks if a setting key is applicable to agent mode
func (s *Settings) IsAgentSetting(key string) bool {
	rt := reflect.ValueOf(s).Elem().Type()

	for i := 0; i < rt.NumField(); i++ {
		tagValue := rt.Field(i).Tag.Get("key")
		if tagValue == "" {
			continue
		}

		attrs := ParseSettingTag(tagValue)
		if attrs.Key == key {
			return attrs.IsAgent || attrs.IsInternal
		}
	}

	return false
}

// helper keeps redaction logic in one place
func redactSettingValue(key, value string, isSensitive bool) string {
	if value == "" || !isSensitive {
		return value
	}

	if key == keyAuthOidcConfig {
		var cfg OidcConfig
		if err := json.Unmarshal([]byte(value), &cfg); err == nil {
			cfg.ClientSecret = ""
			if redacted, err := json.Marshal(cfg); err == nil {
				return string(redacted)
			}
			return redactionMask
		}
		return redactionMask
	}

	return redactionMask
}

type SettingKeyNotFoundError struct {
	field string
}

func (e SettingKeyNotFoundError) Error() string {
	return "cannot find setting key '" + e.field + "'"
}

func (e SettingKeyNotFoundError) Is(target error) bool {
	x := SettingKeyNotFoundError{}
	return errors.As(target, &x)
}

type SettingSensitiveForbiddenError struct {
	field string
}

func (e SettingSensitiveForbiddenError) Error() string {
	return "field '" + e.field + "' is sensitive and can't be updated"
}

func (e SettingSensitiveForbiddenError) Is(target error) bool {
	x := SettingSensitiveForbiddenError{}
	return errors.As(target, &x)
}

type OidcConfig struct {
	ClientID     string `json:"clientId"`
	ClientSecret string `json:"clientSecret"`
	IssuerURL    string `json:"issuerUrl"`
	Scopes       string `json:"scopes"`

	AuthorizationEndpoint string `json:"authorizationEndpoint,omitempty"`
	TokenEndpoint         string `json:"tokenEndpoint,omitempty"`
	UserinfoEndpoint      string `json:"userinfoEndpoint,omitempty"`
	JwksURI               string `json:"jwksUri,omitempty"`

	// Admin mapping: evaluate this claim to grant admin.
	// Examples:
	// - adminClaim: "admin", adminValue: "true"        (boolean or string "true")
	// - adminClaim: "roles", adminValue: "admin"       (array membership)
	// - adminClaim: "realm_access.roles", adminValue: "admin" (Keycloak)
	AdminClaim string `json:"adminClaim,omitempty"`
	AdminValue string `json:"adminValue,omitempty"`
}
