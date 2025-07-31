package bootstrap

import (
	"fmt"
	"log"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/database"
)

func initializeDBAndMigrate(cfg *config.Config) (*database.DB, error) {
	db, err := database.Initialize(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize database: %w", err)
	}

	log.Printf("Database initialized successfully")
	return db, nil
}
