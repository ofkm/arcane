package models

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"slices"
	"strconv"
	"strings"
	"time"
)

const (
	redactionMask     = "XXXXXXXXXX"
	keyAuthOidcConfig = "authOidcConfig"
)

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

type Settings struct {
	// Docker
	ProjectsDirectory  SettingVariable `key:"projectsDirectory"`
	AutoUpdate         SettingVariable `key:"autoUpdate"`
	AutoUpdateInterval SettingVariable `key:"autoUpdateInterval"`
	PollingEnabled     SettingVariable `key:"pollingEnabled"`
	PollingInterval    SettingVariable `key:"pollingInterval"`
	PruneMode          SettingVariable `key:"dockerPruneMode"`
	BaseServerURL      SettingVariable `key:"baseServerUrl"`
	EnableGravatar     SettingVariable `key:"enableGravatar"`

	// Authentication
	AuthLocalEnabled   SettingVariable `key:"authLocalEnabled,public"`
	AuthOidcEnabled    SettingVariable `key:"authOidcEnabled,public"`
	AuthSessionTimeout SettingVariable `key:"authSessionTimeout"`
	AuthPasswordPolicy SettingVariable `key:"authPasswordPolicy"`
	AuthOidcConfig     SettingVariable `key:"authOidcConfig,sensitive"`

	// Onboarding
	OnboardingCompleted SettingVariable `key:"onboardingCompleted,public"`
	OnboardingSteps     SettingVariable `key:"onboardingSteps"`

	// Navigation
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

		key, attrs, _ := strings.Cut(field.Tag.Get("key"), ",")
		if key == "" {
			continue
		}

		if !showAll && attrs != "public" {
			continue
		}

		value := cfgValue.Field(i).FieldByName("Value").String()
		value = redactSettingValue(key, value, attrs, redactSensitiveValues)

		settingVariable := SettingVariable{
			Key:   key,
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
		tagValue := strings.Split(rt.Field(i).Tag.Get("key"), ",")
		keyFromTag := tagValue[0]
		isPublic = slices.Contains(tagValue, "public")
		isSensitive = slices.Contains(tagValue, "sensitive")

		if keyFromTag != key {
			continue
		}

		valueField := rv.Field(i).FieldByName("Value")
		return valueField.String(), isPublic, isSensitive, nil
	}

	return "", false, false, SettingKeyNotFoundError{field: key}
}

func (s *Settings) UpdateField(key string, value string, noSensitive bool) error {
	rv := reflect.ValueOf(s).Elem()
	rt := rv.Type()

	for i := 0; i < rt.NumField(); i++ {
		tagValue, attrs, _ := strings.Cut(rt.Field(i).Tag.Get("key"), ",")
		if tagValue != key {
			continue
		}

		// If the field is sensitive and noSensitive is true, we skip that
		if noSensitive && attrs == "sensitive" {
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

// helper keeps redaction logic in one place; behavior unchanged
func redactSettingValue(key, value, attrs string, redact bool) string {
	if value == "" || !redact || attrs != "sensitive" {
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
