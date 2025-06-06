package database

import (
	"fmt"
	"log"
	"strings"
	"time"

	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/ofkm/arcane-backend/internal/models"
)

type DB struct {
	*gorm.DB
}

func Initialize(databaseURL string) (*DB, error) {
	var dialector gorm.Dialector

	if strings.HasPrefix(databaseURL, "sqlite://") || strings.HasPrefix(databaseURL, "sqlite3://") {
		// Handle both sqlite:// and sqlite3:// prefixes
		dbPath := databaseURL
		if strings.HasPrefix(databaseURL, "sqlite://") {
			dbPath = strings.TrimPrefix(databaseURL, "sqlite://")
		} else if strings.HasPrefix(databaseURL, "sqlite3://") {
			dbPath = strings.TrimPrefix(databaseURL, "sqlite3://")
		}
		dialector = sqlite.Open(dbPath)
	} else if strings.HasPrefix(databaseURL, "postgres") {
		dialector = postgres.Open(databaseURL)
	} else {
		return nil, fmt.Errorf("unsupported database type in URL: %s", databaseURL)
	}

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	return &DB{db}, nil
}

func (db *DB) Migrate() error {
	// Auto-migrate all models
	err := db.AutoMigrate(
		&models.Settings{},
		&models.User{},
		&models.UserSession{},
		&models.Stack{},
		&models.Agent{},
		&models.AgentTask{},
		&models.AgentToken{},
		&models.Deployment{},
		&models.Container{},
		&models.Image{},
		&models.Volume{},
		&models.Network{},
		&models.ImageMaturityRecord{},
	)

	if err != nil {
		return fmt.Errorf("failed to run migrations: %w", err)
	}

	log.Println("Database migration completed successfully")
	return nil
}

func (db *DB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
