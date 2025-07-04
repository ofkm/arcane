package config

import (
	"os"
	"strconv"
)

type Config struct {
	AppUrl      string
	DatabaseURL string
	Port        string
	Environment string
	JWTSecret   string

	OidcEnabled               bool
	OidcClientID              string
	OidcClientSecret          string
	OidcRedirectURI           string
	OidcAuthorizationEndpoint string
	OidcTokenEndpoint         string
	OidcUserinfoEndpoint      string
	OidcScopes                string

	EncryptionKey string
}

func Load() *Config {
	publicOidcEnabled, _ := strconv.ParseBool(os.Getenv("OIDC_ENABLED"))

	return &Config{
		AppUrl:        getEnvOrDefault("APP_URL", "http://localhost:8080"),
		DatabaseURL:   getEnvOrDefault("DATABASE_URL", "sqlite3://./data/arcane.db"),
		Port:          getEnvOrDefault("PORT", "8080"),
		Environment:   getEnvOrDefault("ENVIRONMENT", "development"),
		JWTSecret:     getEnvOrDefault("JWT_SECRET", "default-jwt-secret-change-me"),
		EncryptionKey: getEnvOrDefault("ENCRYPTION_KEY", "arcane-dev-key-32-characters!!!"),

		OidcEnabled:               publicOidcEnabled,
		OidcClientID:              os.Getenv("OIDC_CLIENT_ID"),
		OidcClientSecret:          os.Getenv("OIDC_CLIENT_SECRET"),
		OidcRedirectURI:           os.Getenv("OIDC_REDIRECT_URI"),
		OidcAuthorizationEndpoint: os.Getenv("OIDC_AUTHORIZATION_ENDPOINT"),
		OidcTokenEndpoint:         os.Getenv("OIDC_TOKEN_ENDPOINT"),
		OidcUserinfoEndpoint:      os.Getenv("OIDC_USERINFO_ENDPOINT"),
		OidcScopes:                getEnvOrDefault("OIDC_SCOPES", "openid email profile"),
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
