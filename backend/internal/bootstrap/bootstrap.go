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

	db, err := initializeDBAndMigrate(cfg)
	if err != nil {
		return fmt.Errorf("failed to initialize database: %w", err)
	}

	httpClient := httputils.NewHTTPClient()

	appServices, dockerClientService, err := initializeServices(ctx, db, cfg, httpClient)
	if err != nil {
		db.Close()
		return fmt.Errorf("failed to initialize services: %w", err)
	}

	utils.LoadAgentToken(ctx, cfg, appServices.Settings.GetStringSetting)
	utils.EnsureEncryptionKey(ctx, cfg, appServices.Settings.EnsureEncryptionKey)
	utils.InitEncryption(cfg)
	utils.InitializeDefaultSettings(ctx, cfg, appServices.Settings)

	utils.TestDockerConnection(ctx, func(ctx context.Context) error {
		dockerClient, err := dockerClientService.CreateConnection(ctx)
		if err != nil {
			return err
		}
		dockerClient.Close()
		return nil
	})

	utils.InitializeNonAgentFeatures(ctx, cfg,
		appServices.User.CreateDefaultAdmin,
		func(ctx context.Context) error {
			_, err := appServices.Settings.SyncOidcEnvToDatabase(ctx)
			return err
		})

	scheduler, err := initializeScheduler()
	if err != nil {
		db.Close()
		return fmt.Errorf("failed to create job scheduler: %w", err)
	}
	registerJobs(ctx, scheduler, appServices, cfg)

	router := setupRouter(cfg, appServices)

	err = runServices(ctx, cfg, router, scheduler)
	if err != nil {
		return fmt.Errorf("failed to run services: %w", err)
	}

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := db.Close(); err != nil {
		slog.ErrorContext(shutdownCtx, "Error closing database", slog.Any("error", err))
	}

	slog.InfoContext(shutdownCtx, "Arcane shutdown complete")
	return nil
}

func runServices(ctx context.Context, cfg *config.Config, router http.Handler, scheduler interface{ Run(context.Context) error }) error {
	appCtx, cancelApp := context.WithCancel(ctx)
	defer cancelApp()

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
			cancelApp()
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

	cancelApp()

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.ErrorContext(shutdownCtx, "Server forced to shutdown", slog.Any("error", err))
		return err
	}

	slog.InfoContext(shutdownCtx, "Server stopped gracefully")
	return nil
}
