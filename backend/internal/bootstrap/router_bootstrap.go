package bootstrap

import (
	"log/slog"
	"net/http"
	"path"
	"strings"

	"github.com/gin-gonic/gin"
	sloggin "github.com/samber/slog-gin"

	"github.com/ofkm/arcane-backend/frontend"
	"github.com/ofkm/arcane-backend/internal/api"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/middleware"
)

var registerPlaywrightRoutes []func(apiGroup *gin.RouterGroup, services *Services)

func setupRouter(cfg *config.Config, appServices *Services) *gin.Engine {

	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	} else {
		gin.SetMode(gin.DebugMode)
	}
	router := gin.New()
	router.Use(gin.Recovery())

	loggerSkipPatterns := []string{
		"GET /api/containers/*/stats/stream",
		"GET /api/containers/*/logs/stream",
		"GET /_app",
		"GET /img",
		"GET /fonts",
		"GET /api/system/stats",
		"GET /health",
		"HEAD /health",
	}

	router.Use(sloggin.NewWithConfig(slog.Default(), sloggin.Config{
		Filters: []sloggin.Filter{
			func(c *gin.Context) bool {
				mp := c.Request.Method + " " + c.Request.URL.Path
				for _, pat := range loggerSkipPatterns {
					if pat == mp {
						return false
					}
					if ok, _ := path.Match(pat, mp); ok {
						return false
					}
					if strings.HasSuffix(pat, "/") && strings.HasPrefix(mp, pat) {
						return false
					}
				}
				return true
			},
		},
	}))

	authMiddleware := middleware.NewAuthMiddleware(appServices.Auth, cfg)
	corsMiddleware := middleware.NewCORSMiddleware(cfg).Add()
	router.Use(corsMiddleware)

	// TODO :- Refactor to a api endpoint
	router.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{"status": "UP"})
	})

	apiGroup := router.Group("/api")

	if cfg.AgentMode {
		api.NewEnvironmentHandler(apiGroup, appServices.Environment, appServices.Container, appServices.Image, appServices.ImageUpdate, appServices.Updater, appServices.Network, appServices.Volume, appServices.Stack, appServices.Settings, authMiddleware, cfg)
		return router
	}

	api.NewAuthHandler(apiGroup, appServices.User, appServices.Auth, appServices.Oidc, authMiddleware)
	api.NewContainerHandler(apiGroup, appServices.Container, appServices.Image, authMiddleware)
	api.NewContainerRegistryHandler(apiGroup, appServices.ContainerRegistry, authMiddleware)
	api.NewConverterHandler(apiGroup, appServices.Converter, authMiddleware)
	api.NewEnvironmentHandler(apiGroup, appServices.Environment, appServices.Container, appServices.Image, appServices.ImageUpdate, appServices.Updater, appServices.Network, appServices.Volume, appServices.Stack, appServices.Settings, authMiddleware, cfg)
	api.NewEventHandler(apiGroup, appServices.Event, authMiddleware)
	api.NewImageHandler(apiGroup, appServices.Image, appServices.ImageUpdate, authMiddleware)
	api.NewImageUpdateHandler(apiGroup, appServices.ImageUpdate, authMiddleware)
	api.NewNetworkHandler(apiGroup, appServices.Network, authMiddleware)
	api.NewOidcHandler(apiGroup, appServices.Auth, appServices.Oidc, cfg)
	api.NewSettingsHandler(apiGroup, appServices.Settings, authMiddleware)
	api.NewSystemHandler(apiGroup, appServices.Docker, appServices.System, authMiddleware)
	api.NewTemplateHandler(apiGroup, appServices.Template, authMiddleware)
	api.NewUpdaterHandler(apiGroup, appServices.Updater, authMiddleware)
	api.NewUserHandler(apiGroup, appServices.User, authMiddleware)
	api.NewVolumeHandler(apiGroup, appServices.Volume, authMiddleware)

	if cfg.Environment != "production" {
		for _, registerFunc := range registerPlaywrightRoutes {
			registerFunc(apiGroup, appServices)
		}
	}

	if err := frontend.RegisterFrontend(router); err != nil {
		_, _ = gin.DefaultErrorWriter.Write([]byte("Failed to register frontend: " + err.Error() + "\n"))
	}

	return router
}
