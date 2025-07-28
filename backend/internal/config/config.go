package config

import (
	"os"
	"strconv"
	"strings"
)

const (
	defaultSqliteString string = "file:data/arcane.db?_pragma=journal_mode(WAL)&_pragma=busy_timeout(2500)&_txlock=immediate"
)

type Config struct {
	AppUrl      string
	DatabaseURL string
	Port        string
	Environment string
	JWTSecret   string

	OidcEnabled      bool
	OidcClientID     string
	OidcClientSecret string
	OidcIssuerURL    string
	OidcScopes       string

	EncryptionKey string
}

func Load() *Config {
	oidcEnabled, _ := strconv.ParseBool(os.Getenv("OIDC_ENABLED"))

	return &Config{
		AppUrl:        getEnvOrDefault("APP_URL", "http://localhost:8080"),
		DatabaseURL:   getEnvOrDefault("DATABASE_URL", defaultSqliteString),
		Port:          getEnvOrDefault("PORT", "8080"),
		Environment:   getEnvOrDefault("ENVIRONMENT", "production"),
		JWTSecret:     getEnvOrDefault("JWT_SECRET", "default-jwt-secret-change-me"),
		EncryptionKey: getEnvOrDefault("ENCRYPTION_KEY", "arcane-dev-key-32-characters!!!"),

		OidcEnabled:      oidcEnabled,
		OidcClientID:     os.Getenv("OIDC_CLIENT_ID"),
		OidcClientSecret: os.Getenv("OIDC_CLIENT_SECRET"),
		OidcIssuerURL:    os.Getenv("OIDC_ISSUER_URL"),
		OidcScopes:       getEnvOrDefault("OIDC_SCOPES", "openid email profile"),
	}
}

func (c *Config) GetOidcRedirectURI() string {
	baseUrl := strings.TrimSuffix(c.AppUrl, "/")
	return baseUrl + "/auth/oidc/callback"
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
