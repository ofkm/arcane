package main

import (
	"context"
	"log"
	"net/http"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"github.com/ofkm/arcane-backend/frontend"
	"github.com/ofkm/arcane-backend/internal/api"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/services"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	// Initialize configuration
	cfg := config.Load()
	log.Printf("📦 Configuration loaded:")
	log.Printf("   Environment: %s", cfg.Environment)
	log.Printf("   Database URL: %s", cfg.DatabaseURL)
	log.Printf("   OIDC Enabled by Env: %t", cfg.PublicOidcEnabled)
	if cfg.PublicOidcEnabled {
		log.Printf("   OIDC Client ID (Env): %s", cfg.OidcClientID)
	}

	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}

	// Initialize database
	log.Printf("🔌 Connecting to database...")
	db, err := database.Initialize(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()

	// Run migrations
	log.Printf("🔄 Running database migrations...")
	if err := db.Migrate(); err != nil {
		log.Fatalf("Failed to run migrations: %v", err)
	}

	// Initialize all services
	log.Println("🚀 Initializing services...")
	settingsService := services.NewSettingsService(db)
	dockerClientService := services.NewDockerClientService(db)
	userService := services.NewUserService(db)
	stackService := services.NewStackService(db, dockerClientService, settingsService)
	agentService := services.NewAgentService(db)
	deploymentService := services.NewDeploymentService(db)
	containerService := services.NewContainerService(db, dockerClientService)
	imageService := services.NewImageService(db, dockerClientService)
	volumeService := services.NewVolumeService(db, dockerClientService)
	networkService := services.NewNetworkService(db, dockerClientService)
	imageMaturityService := services.NewImageMaturityService(db)

	// Test Docker connection
	log.Println("🐳 Testing Docker connection...")
	dockerClient, err := dockerClientService.CreateConnection(context.Background())
	if err != nil {
		log.Printf("⚠️ Warning: Docker connection failed: %v. Local Docker features will be unavailable.", err)
	} else {
		log.Println("✅ Docker connection successful.")
		dockerClient.Close() // Close the test client
	}

	userService.CreateDefaultAdmin()

	// Create AuthService
	authService := services.NewAuthService(userService, settingsService, cfg.JWTSecret, cfg) // Pass full config
	oidcService := services.NewOidcService(authService)                                      // OidcService gets authService which has config

	// Sync OIDC environment variables to database if PUBLIC_OIDC_ENABLED is true
	if cfg.PublicOidcEnabled {
		log.Println("Attempting to sync OIDC environment variables to database settings...")
		if err := authService.SyncOidcEnvToDatabase(context.Background()); err != nil {
			log.Printf("⚠️ Warning: Failed to sync OIDC environment variables to database: %v", err)
		} else {
			log.Println("✅ OIDC environment variables synced to database settings successfully.")
		}
	}

	// Initialize Gin router
	r := gin.Default()

	// CORS middleware for development
	if cfg.Environment != "production" {
		corsConfig := cors.DefaultConfig()
		corsConfig.AllowOrigins = []string{"http://localhost:5173", "http://127.0.0.1:5173"} // Adjust for your frontend dev server
		corsConfig.AllowCredentials = true
		corsConfig.AddAllowHeaders("Authorization", "Content-Type", "X-CSRF-Token")
		r.Use(cors.New(corsConfig))
	}

	// Health check endpoint FIRST
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP"})
	})

	// Create services struct
	appServices := &api.Services{
		User:          userService,
		Stack:         stackService,
		Agent:         agentService,
		Settings:      settingsService,
		Deployment:    deploymentService,
		Container:     containerService,
		Image:         imageService,
		Volume:        volumeService,
		Network:       networkService,
		ImageMaturity: imageMaturityService,
		Auth:          authService,
		Oidc:          oidcService,
		Docker:        dockerClientService,
	}

	// Setup API routes SECOND
	api.SetupRoutes(r, appServices, cfg) // Pass cfg here

	// Register embedded frontend LAST
	frontend.RegisterFrontend(r)

	// Start server
	log.Printf("🌐 Starting server on port %s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
