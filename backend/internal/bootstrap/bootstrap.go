package bootstrap

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/joho/godotenv"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/utils"
	httputils "github.com/ofkm/arcane-backend/internal/utils/http"
)

func Bootstrap(ctx context.Context) error {
	_ = godotenv.Load()
	cfg := config.Load()

	SetupGinLogger(cfg)
	ConfigureGormLogger(cfg)
	slog.InfoContext(ctx, "Arcane is starting")

	appCtx, cancelApp := context.WithCancel(ctx)
	defer cancelApp()

	db, err := initializeDBAndMigrate(cfg)
	if err != nil {
		return fmt.Errorf("failed to initialize database: %w", err)
	}
	defer func(ctx context.Context) {
		// Use background context for shutdown as appCtx is already canceled
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second) //nolint:contextcheck
		defer shutdownCancel()
		if err := db.Close(); err != nil {
			slog.ErrorContext(shutdownCtx, "Error closing database", slog.Any("error", err)) //nolint:contextcheck
		}
	}(appCtx)

	httpClient := httputils.NewHTTPClient()

	appServices, dockerClientService, err := initializeServices(appCtx, db, cfg, httpClient)
	if err != nil {
		return fmt.Errorf("failed to initialize services: %w", err)
	}

	utils.LoadAgentToken(appCtx, cfg, appServices.Settings.GetStringSetting)
	utils.EnsureEncryptionKey(appCtx, cfg, appServices.Settings.EnsureEncryptionKey)
	utils.InitEncryption(cfg)
	utils.InitializeDefaultSettings(appCtx, cfg, appServices.Settings)

	utils.TestDockerConnection(appCtx, func(ctx context.Context) error {
		dockerClient, err := dockerClientService.CreateConnection(ctx)
		if err != nil {
			return err
		}
		dockerClient.Close()
		return nil
	})

	utils.InitializeNonAgentFeatures(appCtx, cfg,
		appServices.User.CreateDefaultAdmin,
		func(ctx context.Context) error {
			_, err := appServices.Settings.SyncOidcEnvToDatabase(ctx)
			return err
		})

	scheduler, err := initializeScheduler()
	if err != nil {
		return fmt.Errorf("failed to create job scheduler: %w", err)
	}
	registerJobs(appCtx, scheduler, appServices, cfg)

	router := setupRouter(cfg, appServices) //nolint:contextcheck

	err = runServices(appCtx, cfg, router, scheduler)
	if err != nil {
		return fmt.Errorf("failed to run services: %w", err)
	}

	slog.InfoContext(appCtx, "Arcane shutdown complete")
	return nil
}

func runServices(appCtx context.Context, cfg *config.Config, router http.Handler, scheduler interface{ Run(context.Context) error }) error {
	go func() {
		slog.InfoContext(appCtx, "Starting scheduler")
		if err := scheduler.Run(appCtx); err != nil {
			if !errors.Is(err, context.Canceled) {
				slog.ErrorContext(appCtx, "Job scheduler exited with error", slog.Any("error", err))
			}
		}
		slog.InfoContext(appCtx, "Scheduler stopped")
	}()

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		slog.InfoContext(appCtx, "Starting HTTP server", slog.String("port", cfg.Port))
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.ErrorContext(appCtx, "Failed to start server", slog.Any("error", err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	select {
	case <-quit:
		slog.InfoContext(appCtx, "Received shutdown signal")
	case <-appCtx.Done():
		slog.InfoContext(appCtx, "Context canceled")
	}

	// Use background context for shutdown as appCtx is already canceled
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second) //nolint:contextcheck
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil { //nolint:contextcheck
		slog.ErrorContext(shutdownCtx, "Server forced to shutdown", slog.Any("error", err)) //nolint:contextcheck
		return err
	}

	slog.InfoContext(shutdownCtx, "Server stopped gracefully") //nolint:contextcheck
	return nil
}
