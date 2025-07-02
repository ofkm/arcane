package database

import (
	"fmt"
	"log"
	"os"
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

func Initialize(databaseURL string, environment string) (*DB, error) {
	var dialector gorm.Dialector

	switch {
	case strings.HasPrefix(databaseURL, "sqlite://"):
		dbPath := strings.TrimPrefix(databaseURL, "sqlite://")
		dialector = sqlite.Open(dbPath)
	case strings.HasPrefix(databaseURL, "sqlite3://"):
		dbPath := strings.TrimPrefix(databaseURL, "sqlite3://")
		dialector = sqlite.Open(dbPath)
	case strings.HasPrefix(databaseURL, "postgres"):
		dialector = postgres.Open(databaseURL)
	default:
		return nil, fmt.Errorf("unsupported database type in URL: %s", databaseURL)
	}

	var logLevel logger.LogLevel
	switch environment {
	case "development":
		logLevel = logger.Info // Show all SQL queries and info
	case "production":
		logLevel = logger.Silent // Show nothing
	default:
		logLevel = logger.Warn // Show warnings and errors only
	}

	gormLogger := logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             time.Second,
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			Colorful:                  environment == "development",
		},
	)

	db, err := gorm.Open(dialector, &gorm.Config{
		Logger: gormLogger,
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
		PrepareStmt: true,
	})

	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get underlying sql.DB: %w", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return &DB{db}, nil
}

func (db *DB) Migrate() error {
	err := db.AutoMigrate(
		&models.Settings{},
		&models.User{},
		&models.UserSession{},
		&models.Stack{},
		&models.Environment{},
		&models.Container{},
		&models.Image{},
		&models.Volume{},
		&models.Network{},
		&models.ImageMaturityRecord{},
		&models.TemplateRegistry{},
		&models.ComposeTemplate{},
		&models.ContainerRegistry{},
	)

	if err != nil {
		return fmt.Errorf("failed to migrate database: %w", err)
	}

	return nil
}

func (db *DB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
