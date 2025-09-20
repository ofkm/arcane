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

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/job"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type App struct {
	Config    *config.Config
	DB        *database.DB
	Router    *gin.Engine
	Scheduler *job.Scheduler
	Services  *Services
	AppCtx    context.Context
	CancelApp context.CancelFunc
}

func InitializeApp() (*App, error) {
	ctx := context.Background()
	loadErr := godotenv.Load()
	cfg := config.Load()

	SetupLogger(cfg)
	ConfigureGormLogger(cfg)

	if loadErr != nil {
		slog.InfoContext(ctx, "No .env file found, using environment variables")
	}

	appCtx, cancelApp := context.WithCancel(ctx)

	db, err := initializeDBAndMigrate(cfg)
	if err != nil {
		cancelApp()
		return nil, fmt.Errorf("db initialization failed: %w", err)
	}

	httpClient := newHTTPClient()

	appServices, dockerClientService, err := initializeServices(appCtx, db, cfg, httpClient)
	if err != nil {
		db.Close()
		cancelApp()
		return nil, fmt.Errorf("services initialization failed: %w", err)
	}

	if cfg.AgentMode && cfg.AgentToken == "" {
		if tok := appServices.Settings.GetStringSetting(appCtx, "agentToken", ""); tok != "" {
			cfg.AgentToken = tok
			slog.InfoContext(appCtx, "Loaded agent token from database")
		}
	}

	if cfg.AgentMode || cfg.Environment != "production" {
		if key, err := appServices.Settings.EnsureEncryptionKey(appCtx); err != nil {
			slog.WarnContext(appCtx, "Failed to ensure encryption key; falling back to derived behavior",
				slog.String("error", err.Error()))
		} else {
			cfg.EncryptionKey = key
		}
	}
	utils.InitEncryption(cfg)

	// Ensure default settings but skip user bootstrap in agent mode
	slog.InfoContext(appCtx, "Ensuring default settings are initialized")
	if err := appServices.Settings.EnsureDefaultSettings(appCtx); err != nil {
		slog.WarnContext(appCtx, "Failed to initialize default settings", slog.String("error", err.Error()))
	} else {
		slog.InfoContext(appCtx, "Default settings initialized successfully")
	}

	scheduler, err := initializeScheduler()
	if err != nil {
		db.Close()
		cancelApp()
		return nil, fmt.Errorf("scheduler initialization failed: %w", err)
	}

	router := setupRouter(cfg, appServices)

	if dockerClient, err := dockerClientService.CreateConnection(appCtx); err != nil {
		slog.WarnContext(appCtx, "Docker connection failed during init, local Docker features may be unavailable",
			slog.String("error", err.Error()))
	} else {
		dockerClient.Close()
	}

	slog.InfoContext(appCtx, "Performing initial Docker image synchronization with the database")
	if err := appServices.Image.SyncDockerImages(appCtx); err != nil {
		slog.WarnContext(appCtx, "Initial Docker image synchronization failed, image data may be stale",
			slog.String("error", err.Error()))
	} else {
		slog.InfoContext(appCtx, "Initial Docker image synchronization complete")
	}

	if !cfg.AgentMode {
		if err := appServices.User.CreateDefaultAdmin(); err != nil {
			slog.WarnContext(appCtx, "Failed to create default admin user",
				slog.String("error", err.Error()))
		}

		if cfg.OidcEnabled {
			if _, err := appServices.Settings.SyncOidcEnvToDatabase(appCtx); err != nil {
				slog.WarnContext(appCtx, "Failed to sync OIDC environment variables to database",
					slog.String("error", err.Error()))
			}
		}
	}

	return &App{
		Config:    cfg,
		DB:        db,
		Router:    router,
		Scheduler: scheduler,
		Services:  appServices,
		AppCtx:    appCtx,
		CancelApp: cancelApp,
	}, nil
}

func (app *App) Start() {
	defer app.DB.Close()
	defer app.CancelApp()

	registerJobs(app.AppCtx, app.Scheduler, app.Services, app.Config)

	go func() {
		slog.InfoContext(app.AppCtx, "Starting scheduler goroutine")
		if err := app.Scheduler.Run(app.AppCtx); err != nil {
			if !errors.Is(err, context.Canceled) {
				slog.ErrorContext(app.AppCtx, "Job scheduler exited with error", slog.Any("error", err))
			}
		}
		slog.InfoContext(app.AppCtx, "Scheduler goroutine finished")
	}()

	srv := &http.Server{
		Addr:              ":" + app.Config.Port,
		Handler:           app.Router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		slog.InfoContext(app.AppCtx, "Starting server", slog.String("port", app.Config.Port))
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.ErrorContext(app.AppCtx, "Failed to start server", slog.String("error", err.Error()))
			os.Exit(1)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	slog.InfoContext(app.AppCtx, "Shutting down server and scheduler")

	app.CancelApp()

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		slog.ErrorContext(shutdownCtx, "Server forced to shutdown", slog.String("error", err.Error()))
	}

	slog.InfoContext(app.AppCtx, "Server exiting")
}

// newHTTPClient returns a shared HTTP client for outbound requests.
func newHTTPClient() *http.Client {
	transport := &http.Transport{
		Proxy:                 http.ProxyFromEnvironment,
		MaxIdleConns:          100,
		IdleConnTimeout:       90 * time.Second,
		TLSHandshakeTimeout:   5 * time.Second,
		ExpectContinueTimeout: 1 * time.Second,
	}
	return &http.Client{
		Transport: transport,
		Timeout:   10 * time.Second,
	}
}
