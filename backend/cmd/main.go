package main

import (
	"log"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

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

	// Set Gin mode based on environment
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Initialize database
	db, err := database.Initialize(cfg.DatabaseURL)
	if err != nil {
		log.Fatal("Failed to initialize database:", err)
	}
	defer db.Close()

	// Run migrations
	if err := db.Migrate(); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize all services
	log.Println("Initializing services...")
	userService := services.NewUserService(db)
	stackService := services.NewStackService(db)
	agentService := services.NewAgentService(db)
	settingsService := services.NewSettingsService(db)
	deploymentService := services.NewDeploymentService(db)
	containerService := services.NewContainerService(db)
	imageService := services.NewImageService(db)
	volumeService := services.NewVolumeService(db)
	networkService := services.NewNetworkService(db)
	imageMaturityService := services.NewImageMaturityService(db)

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

	// Setup static file serving
	setupStaticFiles(r, cfg)

	// Health check endpoint
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
	}

	// Setup API routes
	api.SetupRoutes(r, services)

	// Start server
	port := cfg.Port
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Arcane server starting...")
	log.Printf("📦 Environment: %s", cfg.Environment)
	log.Printf("🗄️  Database: %s", cfg.DatabaseURL)
	log.Printf("🌐 Server: http://localhost:%s", port)
	log.Printf("🔗 API: http://localhost:%s/api", port)
	log.Printf("❤️  Health: http://localhost:%s/health", port)

	if err := r.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func setupStaticFiles(r *gin.Engine, cfg *config.Config) {
	staticPath := cfg.StaticPath
	if staticPath == "" {
		staticPath = "./static"
	}

	// Check if static directory exists
	if _, err := os.Stat(staticPath); err == nil {
		log.Printf("📁 Serving static files from: %s", staticPath)

		// Serve static assets with cache headers for production
		if cfg.Environment == "production" {
			r.Static("/assets", filepath.Join(staticPath, "assets"))
			r.StaticFile("/favicon.ico", filepath.Join(staticPath, "favicon.ico"))
			r.StaticFile("/robots.txt", filepath.Join(staticPath, "robots.txt"))
			r.StaticFile("/manifest.json", filepath.Join(staticPath, "manifest.json"))
		} else {
			// Development: serve without cache headers
			r.Static("/assets", filepath.Join(staticPath, "assets"))
			r.StaticFile("/favicon.ico", filepath.Join(staticPath, "favicon.ico"))
			r.StaticFile("/robots.txt", filepath.Join(staticPath, "robots.txt"))
		}

		// Serve the main HTML file for all non-API routes (SPA support)
		r.NoRoute(func(c *gin.Context) {
			// Check if this is an API request
			if len(c.Request.URL.Path) >= 4 && c.Request.URL.Path[:4] == "/api" {
				c.JSON(http.StatusNotFound, gin.H{
					"success": false,
					"error":   "API endpoint not found",
					"path":    c.Request.URL.Path,
				})
				return
			}

			// Serve the main HTML file for all other routes
			indexPath := filepath.Join(staticPath, "index.html")
			if _, err := os.Stat(indexPath); err == nil {
				c.File(indexPath)
			} else {
				c.JSON(http.StatusNotFound, gin.H{
					"success": false,
					"error":   "Frontend not found",
					"message": "Run 'npm run build' to generate static files",
				})
			}
		})
	} else {
		log.Printf("⚠️  Static directory not found: %s", staticPath)
		log.Printf("💡 Run 'npm run build' in the frontend directory to generate static files")

		// In development, provide helpful error messages
		r.NoRoute(func(c *gin.Context) {
			if len(c.Request.URL.Path) >= 4 && c.Request.URL.Path[:4] == "/api" {
				c.JSON(http.StatusNotFound, gin.H{
					"success": false,
					"error":   "API endpoint not found",
					"path":    c.Request.URL.Path,
				})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"message": "Frontend not built. Run 'npm run build' in the frontend directory to generate static files.",
				"path":    c.Request.URL.Path,
				"api":     "http://localhost:" + c.Request.Host + "/api",
				"health":  "http://localhost:" + c.Request.Host + "/health",
			})
		})
	}
}
