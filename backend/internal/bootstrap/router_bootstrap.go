package bootstrap

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/frontend"
	"github.com/ofkm/arcane-backend/internal/api"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/middleware"
)

var registerPlaywrightRoutes []func(apiGroup *gin.RouterGroup, services *api.Services)

func setupRouter(cfg *config.Config, appServices *api.Services) *gin.Engine {
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}
	router := gin.Default()

	router.Use(middleware.SetupCORS(cfg))
	loggingMiddleware := middleware.LoggingMiddleware(
		"/api/containers/*/stats/stream",
		"/api/containers/*/logs/stream",
		"/api/system/stats",
	)
	router.Use(loggingMiddleware)

	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP"})
	})

	api.SetupRoutes(router, appServices, cfg)

	// Register playwright routes if available
	if registerPlaywrightRoutes != nil {
		apiGroup := router.Group("/api")
		for _, registerFunc := range registerPlaywrightRoutes {
			registerFunc(apiGroup, appServices)
		}
	}

	if err := frontend.RegisterFrontend(router); err != nil {
		_, _ = gin.DefaultErrorWriter.Write([]byte("Failed to register frontend: " + err.Error() + "\n"))
	}

	return router
}
