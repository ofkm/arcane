package bootstrap

import (
	"context"
	"errors"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/ofkm/arcane-backend/internal/api"
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
	Services  *api.Services
	AppCtx    context.Context
	CancelApp context.CancelFunc
}

func InitializeApp() (*App, error) {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	cfg := config.Load()
	appCtx, cancelApp := context.WithCancel(context.Background())

	utils.InitEncryption(cfg)

	db, err := initializeDBAndMigrate(cfg)
	if err != nil {
		cancelApp()
		return nil, fmt.Errorf("db initialization failed: %w", err)
	}

	appServices, dockerClientService, err := initializeServices(db, cfg)
	if err != nil {
		db.Close()
		cancelApp()
		return nil, fmt.Errorf("services initialization failed: %w", err)
	}

	scheduler, err := initializeScheduler()
	if err != nil {
		db.Close()
		cancelApp()
		return nil, fmt.Errorf("scheduler initialization failed: %w", err)
	}

	router := setupRouter(cfg, appServices)

	if dockerClient, err := dockerClientService.CreateConnection(context.Background()); err != nil {
		log.Printf("Warning: Docker connection failed during init: %v. Local Docker features may be unavailable.", err)
	} else {
		dockerClient.Close()
	}

	log.Println("Performing initial Docker image synchronization with the database...")
	if _, err := appServices.Image.ListImages(appCtx); err != nil {
		log.Printf("⚠️ Warning: Initial Docker image synchronization failed: %v. Image data may be stale.", err)
	} else {
		log.Println("Initial Docker image synchronization complete.")
	}

	if err := appServices.User.CreateDefaultAdmin(); err != nil {
		log.Printf("Warning: failed to create default admin user: %v", err)
	}

	if cfg.PublicOidcEnabled {
		if err := appServices.Auth.SyncOidcEnvToDatabase(context.Background()); err != nil {
			log.Printf("⚠️ Warning: Failed to sync OIDC environment variables to database: %v", err)
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

	registerJobs(app.AppCtx, app.Scheduler, app.Services)

	go func() {
		slog.Info("Starting scheduler goroutine")
		if err := app.Scheduler.Run(app.AppCtx); err != nil {
			if !errors.Is(err, context.Canceled) {
				slog.Error("Job scheduler exited with error", slog.Any("error", err))
			}
		}
		slog.Info("Scheduler goroutine finished")
	}()

	srv := &http.Server{
		Addr:              ":" + app.Config.Port,
		Handler:           app.Router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("Starting server on port %s", app.Config.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server and scheduler...")

	app.CancelApp()

	shutdownCtx, cancelShutdown := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancelShutdown()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exiting")
}
