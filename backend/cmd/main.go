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
		log.Println("⚠️  No .env file found, using environment variables")
	}

	// Initialize configuration
	cfg := config.Load()
	log.Printf("📦 Configuration loaded:")
	log.Printf("   Environment: %s", cfg.Environment)
	log.Printf("   Database URL: %s", cfg.DatabaseURL)

	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	log.Printf("🔌 Connecting to database...")
	db, err := database.Initialize(cfg.DatabaseURL, cfg.Environment)
	if err != nil {
		log.Fatal("❌ Failed to initialize database:", err)
	}
	defer db.Close()

	// Run migrations
	log.Printf("🔄 Running database migrations...")
	if err := db.Migrate(); err != nil {
		log.Fatal("❌ Failed to run migrations:", err)
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
		log.Printf("⚠️ Failed to connect to Docker: %v", err)
	} else {
		log.Printf("✅ Docker connection successful - Client version: %s", dockerClient.ClientVersion())
		dockerClient.Close()
	}

	userService.CreateDefaultAdmin()

	// Initialize JWT secret from environment or generate one
	jwtSecret := cfg.JWTSecret
	if jwtSecret == "default-jwt-secret-change-me" {
		log.Printf("⚠️  Using default JWT secret - please set JWT_SECRET in production!")
	}

	// Create AuthService
	authService := services.NewAuthService(userService, settingsService, jwtSecret)
	oidcService := services.NewOidcService(authService)

	// Initialize Gin router
	r := gin.Default()

	// CORS middleware for development
	if cfg.Environment != "production" {
		corsConfig := cors.DefaultConfig()
		corsConfig.AllowOrigins = []string{
			"http://localhost:3000",
			"http://localhost:5173",
			"http://localhost:4173",
		}
		corsConfig.AllowCredentials = true
		corsConfig.AllowHeaders = []string{
			"Origin",
			"Content-Length",
			"Content-Type",
			"Authorization",
			"X-Requested-With",
			"Accept",
		}
		corsConfig.AllowMethods = []string{
			"GET",
			"POST",
			"PUT",
			"DELETE",
			"OPTIONS",
		}
		r.Use(cors.New(corsConfig))
	}

	// Health check endpoint FIRST
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":      "ok",
			"environment": cfg.Environment,
			"database":    "connected",
		})
	})

	// Create services struct
	services := &api.Services{
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
	api.SetupRoutes(r, services)

	// Register embedded frontend LAST
	if err := frontend.RegisterFrontend(r); err != nil {
		log.Printf("⚠️ Failed to register embedded frontend: %v", err)
		log.Printf("💡 Make sure to copy frontend build to backend/frontend/dist/")
	} else {
		log.Printf("📁 Serving embedded frontend")
	}

	// Start server
	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Arcane server starting...")
	log.Printf("📦 Environment: %s", cfg.Environment)
	log.Printf("🗄️ Database: %s", cfg.DatabaseURL)
	log.Printf("🌐 Server: http://localhost:%s", port)
	log.Printf("🔗 API: http://localhost:%s/api", port)
	log.Printf("❤️ Health: http://localhost:%s/health", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatal("❌ Failed to start server:", err)
	}
}
