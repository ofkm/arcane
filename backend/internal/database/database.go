package database

import (
	"errors"
	"fmt"
	"log"
	"log/slog"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/golang-migrate/migrate/v4"
	"github.com/golang-migrate/migrate/v4/database"
	postgresMigrate "github.com/golang-migrate/migrate/v4/database/postgres"
	sqliteMigrate "github.com/golang-migrate/migrate/v4/database/sqlite3"
	"github.com/golang-migrate/migrate/v4/source/iofs"
	"gorm.io/driver/postgres"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"

	"github.com/ofkm/arcane-backend/resources"
)

type DB struct {
	*gorm.DB
}

func Initialize(databaseURL string, environment string) (*DB, error) {
	// First connect to database
	db, err := connectDatabase(databaseURL, environment)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to database: %w", err)
	}

	// Get underlying sql.DB for migrations
	sqlDB, err := db.DB.DB()
	if err != nil {
		return nil, fmt.Errorf("failed to get sql.DB: %w", err)
	}

	// Determine database provider for migrations
	var dbProvider string
	switch {
	case strings.HasPrefix(databaseURL, "file:"):
		dbProvider = "sqlite"
	case strings.HasPrefix(databaseURL, "postgres"):
		dbProvider = "postgres"
	default:
		return nil, fmt.Errorf("unsupported database type in URL: %s", databaseURL)
	}

	// Choose the correct driver for migrations
	var driver database.Driver
	switch dbProvider {
	case "sqlite":
		driver, err = sqliteMigrate.WithInstance(sqlDB, &sqliteMigrate.Config{})
	case "postgres":
		driver, err = postgresMigrate.WithInstance(sqlDB, &postgresMigrate.Config{})
	default:
		return nil, fmt.Errorf("unsupported database provider: %s", dbProvider)
	}
	if err != nil {
		return nil, fmt.Errorf("failed to create migration driver: %w", err)
	}

	// Run migrations with backup on failure
	if err := migrateDatabase(driver, dbProvider, databaseURL); err != nil {
		slog.Error("Failed to run migrations", "error", err)

		// If migration fails and it's SQLite, try to backup and retry
		if dbProvider == "sqlite" {
			if backupErr := backupSQLiteDatabase(databaseURL); backupErr != nil {
				slog.Error("Failed to backup database", "error", backupErr)
				return nil, fmt.Errorf("failed to run migrations and backup failed: %w", err)
			}

			slog.Info("Database backed up to arcane-db.old, retrying migrations with fresh database")

			// Close current connection
			db.Close()

			// Reconnect and try migrations again
			db, err = connectDatabase(databaseURL, environment)
			if err != nil {
				return nil, fmt.Errorf("failed to reconnect after backup: %w", err)
			}

			sqlDB, err = db.DB.DB()
			if err != nil {
				return nil, fmt.Errorf("failed to get sql.DB after backup: %w", err)
			}

			driver, err = sqliteMigrate.WithInstance(sqlDB, &sqliteMigrate.Config{})
			if err != nil {
				return nil, fmt.Errorf("failed to create migration driver after backup: %w", err)
			}

			if retryErr := migrateDatabase(driver, dbProvider, databaseURL); retryErr != nil {
				return nil, fmt.Errorf("failed to run migrations even after backup: %w", retryErr)
			}
		} else {
			return nil, fmt.Errorf("failed to run migrations: %w", err)
		}
	}

	// Set connection pool settings
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	return db, nil
}

func connectDatabase(databaseURL string, environment string) (*DB, error) {
	var dialector gorm.Dialector

	switch {
	case strings.HasPrefix(databaseURL, "file:"):
		connString, err := parseSqliteConnectionString(databaseURL)
		if err != nil {
			return nil, fmt.Errorf("failed to parse SQLite connection string: %w", err)
		}
		dialector = sqlite.Open(connString)
	case strings.HasPrefix(databaseURL, "postgres"):
		dialector = postgres.Open(databaseURL)
	default:
		return nil, fmt.Errorf("unsupported database type in URL: %s", databaseURL)
	}

	gormLogger := getLogger(environment)

	// Retry connection up to 3 times
	var db *gorm.DB
	var err error
	for i := 1; i <= 3; i++ {
		db, err = gorm.Open(dialector, &gorm.Config{
			Logger: gormLogger,
			NowFunc: func() time.Time {
				return time.Now().UTC()
			},
			PrepareStmt:                      true,
			IgnoreRelationshipsWhenMigrating: true,
		})
		if err == nil {
			return &DB{db}, nil
		}

		slog.Info("Failed to initialize database", slog.Int("attempt", i))
		if i < 3 {
			time.Sleep(3 * time.Second)
		}
	}

	return nil, err
}

func migrateDatabase(driver database.Driver, dbProvider string, databaseURL string) error {
	// Use the embedded migrations
	source, err := iofs.New(resources.FS, "migrations/"+dbProvider)
	if err != nil {
		return fmt.Errorf("failed to create embedded migration source: %w", err)
	}

	m, err := migrate.NewWithInstance("iofs", source, "arcane", driver)
	if err != nil {
		return fmt.Errorf("failed to create migration instance: %w", err)
	}

	err = m.Up()
	if err != nil && !errors.Is(err, migrate.ErrNoChange) {
		return fmt.Errorf("failed to apply migrations: %w", err)
	}

	if errors.Is(err, migrate.ErrNoChange) {
		slog.Info("Database schema is up to date")
	} else {
		slog.Info("Database migrations completed successfully")
	}

	return nil
}

func backupSQLiteDatabase(databaseURL string) error {
	// Extract file path from SQLite URL
	connStringUrl, err := url.Parse(databaseURL)
	if err != nil {
		return fmt.Errorf("failed to parse database URL: %w", err)
	}

	dbPath := connStringUrl.Path
	if dbPath == "" {
		return fmt.Errorf("empty database path in URL")
	}

	// Check if database file exists
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		// Database doesn't exist, no need to backup
		slog.Info("Database file doesn't exist, no backup needed")
		return nil
	}

	backupPath := strings.TrimSuffix(dbPath, ".db") + ".old"

	// Remove existing backup if it exists
	if _, err := os.Stat(backupPath); err == nil {
		if err := os.Remove(backupPath); err != nil {
			return fmt.Errorf("failed to remove existing backup: %w", err)
		}
	}

	// Move current database to backup
	if err := os.Rename(dbPath, backupPath); err != nil {
		return fmt.Errorf("failed to backup database: %w", err)
	}

	slog.Info("Database backed up successfully", "backup_path", backupPath)
	return nil
}

func parseSqliteConnectionString(connString string) (string, error) {
	if !strings.HasPrefix(connString, "file:") {
		connString = "file:" + connString
	}

	connStringUrl, err := url.Parse(connString)
	if err != nil {
		return "", fmt.Errorf("failed to parse SQLite connection string: %w", err)
	}

	qs := make(url.Values, len(connStringUrl.Query()))
	for k, v := range connStringUrl.Query() {
		switch k {
		case "_auto_vacuum", "_vacuum":
			qs.Add("_pragma", "auto_vacuum("+v[0]+")")
		case "_busy_timeout", "_timeout":
			qs.Add("_pragma", "busy_timeout("+v[0]+")")
		case "_case_sensitive_like", "_cslike":
			qs.Add("_pragma", "case_sensitive_like("+v[0]+")")
		case "_foreign_keys", "_fk":
			qs.Add("_pragma", "foreign_keys("+v[0]+")")
		case "_locking_mode", "_locking":
			qs.Add("_pragma", "locking_mode("+v[0]+")")
		case "_secure_delete":
			qs.Add("_pragma", "secure_delete("+v[0]+")")
		case "_synchronous", "_sync":
			qs.Add("_pragma", "synchronous("+v[0]+")")
		case "_journal_mode":
			qs.Add("_pragma", "journal_mode("+v[0]+")")
		case "_txlock":
			qs.Add("_txlock", v[0])
		default:
			qs[k] = v
		}
	}

	connStringUrl.RawQuery = qs.Encode()
	return connStringUrl.String(), nil
}

func getLogger(environment string) logger.Interface {
	var logLevel logger.LogLevel
	switch environment {
	case "development":
		logLevel = logger.Info
	case "production":
		logLevel = logger.Silent
	default:
		logLevel = logger.Warn
	}

	return logger.New(
		log.New(os.Stdout, "\r\n", log.LstdFlags),
		logger.Config{
			SlowThreshold:             200 * time.Millisecond,
			LogLevel:                  logLevel,
			IgnoreRecordNotFoundError: true,
			Colorful:                  environment == "development",
		},
	)
}

func (db *DB) Close() error {
	sqlDB, err := db.DB.DB()
	if err != nil {
		return err
	}
	return sqlDB.Close()
}
