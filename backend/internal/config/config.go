package config

import (
	"os"
)

type Config struct {
	DatabaseURL string
	JWTSecret   string
	Port        string
	Environment string
	StaticPath  string
}

func Load() *Config {
	return &Config{
		DatabaseURL: getEnv("DATABASE_URL", "sqlite:///tmp/arcane.db"),
		JWTSecret:   getEnv("JWT_SECRET", "your-secret-key"),
		Port:        getEnv("PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),
		StaticPath:  getEnv("STATIC_PATH", "./static"),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}
