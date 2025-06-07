package config

import (
	"os"
)

type Config struct {
	DatabaseURL string
	Port        string
	Environment string
	JWTSecret   string
}

func Load() *Config {
	return &Config{
		DatabaseURL: getEnvOrDefault("DATABASE_URL", "sqlite3://./data/arcane.db"),
		Port:        getEnvOrDefault("PORT", "8080"),
		Environment: getEnvOrDefault("ENVIRONMENT", "development"),
		JWTSecret:   getEnvOrDefault("JWT_SECRET", "default-jwt-secret-change-me"),
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
