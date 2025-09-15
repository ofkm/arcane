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
	AppUrl        string
	DatabaseURL   string
	Port          string
	Environment   string
	JWTSecret     string
	EncryptionKey string

	OidcEnabled      bool
	OidcClientID     string
	OidcClientSecret string
	OidcIssuerURL    string
	OidcScopes       string
	OidcAdminClaim   string
	OidcAdminValue   string

	LogJson             bool
	LogLevel            string
	AgentMode           bool
	AgentToken          string
	AgentBootstrapToken string
	UpdateCheckDisabled bool

	AnalyticsDisabled bool
}

func Load() *Config {
	return &Config{
		AppUrl:        getEnvOrDefault("APP_URL", "http://localhost:3552"),
		DatabaseURL:   getEnvOrDefault("DATABASE_URL", defaultSqliteString),
		Port:          getEnvOrDefault("PORT", "3552"),
		Environment:   getEnvOrDefault("ENVIRONMENT", "production"),
		JWTSecret:     getEnvOrDefault("JWT_SECRET", "default-jwt-secret-change-me"),
		EncryptionKey: getEnvOrDefault("ENCRYPTION_KEY", "arcane-dev-key-32-characters!!!"),

		OidcEnabled:      getBoolEnvOrDefault("OIDC_ENABLED", false),
		OidcClientID:     os.Getenv("OIDC_CLIENT_ID"),
		OidcClientSecret: os.Getenv("OIDC_CLIENT_SECRET"),
		OidcIssuerURL:    os.Getenv("OIDC_ISSUER_URL"),
		OidcScopes:       getEnvOrDefault("OIDC_SCOPES", "openid email profile"),
		OidcAdminClaim:   getEnvOrDefault("OIDC_ADMIN_CLAIM", ""),
		OidcAdminValue:   getEnvOrDefault("OIDC_ADMIN_VALUE", ""),

		LogJson:             getBoolEnvOrDefault("LOG_JSON", false),
		LogLevel:            strings.ToLower(getEnvOrDefault("LOG_LEVEL", "info")),
		AgentMode:           getBoolEnvOrDefault("AGENT_MODE", false),
		AgentToken:          os.Getenv("AGENT_TOKEN"),
		AgentBootstrapToken: os.Getenv("AGENT_BOOTSTRAP_TOKEN"),
		UpdateCheckDisabled: getBoolEnvOrDefault("UPDATE_CHECK_DISABLED", false),

		AnalyticsDisabled: getBoolEnvOrDefault("ANALYTICS_DISABLED", false),
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

func getBoolEnvOrDefault(key string, defaultValue bool) bool {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return defaultValue
}
