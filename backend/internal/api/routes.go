package api

import (
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/middleware"
	"github.com/ofkm/arcane-backend/internal/services"
)

type Services struct {
	User              *services.UserService
	Stack             *services.StackService
	Environment       *services.EnvironmentService
	Settings          *services.SettingsService
	Container         *services.ContainerService
	Image             *services.ImageService
	Volume            *services.VolumeService
	Network           *services.NetworkService
	ImageUpdate       *services.ImageUpdateService
	Auth              *services.AuthService
	Oidc              *services.OidcService
	Docker            *services.DockerClientService
	Converter         *services.ConverterService
	Template          *services.TemplateService
	ContainerRegistry *services.ContainerRegistryService
	System            *services.SystemService
	AutoUpdate        *services.AutoUpdateService
}

func SetupRoutes(r *gin.Engine, services *Services, appConfig *config.Config) {
	api := r.Group("/api")

	setupAuthRoutes(api, services)
	setupOidcRoutes(api, services, appConfig)
	setupUserRoutes(api, services)
	setupStackRoutes(api, services)
	setupEnvironmentRoutes(api, services)
	setupSettingsRoutes(api, services, appConfig)
	setupSystemRoutes(api, services.Docker, services)
	setupContainerRoutes(api, services)
	setupImageRoutes(api, services)
	setupVolumeRoutes(api, services)
	setupNetworkRoutes(api, services)
	setupTemplateRoutes(api, services)
	setupContainerRegistryRoutes(api, services)
	setupAutoUpdateRoutes(api, services)
	setupConverterRoutes(api, services)
	setupImageUpdateRoutes(api, services)
}

func setupContainerRegistryRoutes(api *gin.RouterGroup, services *Services) {
	registries := api.Group("/container-registries")
	registries.Use(middleware.AuthMiddleware(services.Auth))

	registryHandler := NewContainerRegistryHandler(services.ContainerRegistry)

	registries.GET("", registryHandler.GetRegistries)
	registries.POST("", registryHandler.CreateRegistry)
	registries.GET("/:id", registryHandler.GetRegistry)
	registries.PUT("/:id", registryHandler.UpdateRegistry)
	registries.DELETE("/:id", registryHandler.DeleteRegistry)

	registries.POST("/:id/test", registryHandler.TestRegistry)
}

func setupImageUpdateRoutes(api *gin.RouterGroup, services *Services) {
	imageUpdates := api.Group("/image-updates")
	imageUpdates.Use(middleware.AuthMiddleware(services.Auth))
	imageUpdateHandler := NewImageUpdateHandler(services.ImageUpdate)

	imageUpdates.GET("/check", imageUpdateHandler.CheckImageUpdate)
	imageUpdates.GET("/check/:imageId", imageUpdateHandler.CheckImageUpdateByID)
	imageUpdates.POST("/check-batch", imageUpdateHandler.CheckMultipleImages)
	imageUpdates.GET("/check-all", imageUpdateHandler.CheckAllImages)
	imageUpdates.GET("/summary", imageUpdateHandler.GetUpdateSummary)
	imageUpdates.GET("/versions", imageUpdateHandler.GetImageVersions)
	imageUpdates.POST("/compare", imageUpdateHandler.CompareVersions)
}

func setupOidcRoutes(api *gin.RouterGroup, services *Services, appConfig *config.Config) {
	oidcHandler := NewOidcHandler(services.Auth, services.Oidc, appConfig)
	oidc := api.Group("/oidc")
	{
		oidc.POST("/url", oidcHandler.GetOidcAuthUrl)
		oidc.POST("/callback", oidcHandler.HandleOidcCallback)
		oidc.GET("/config", oidcHandler.GetOidcConfig)
		oidc.GET("/status", oidcHandler.GetOidcStatus)
	}
}

func setupAuthRoutes(api *gin.RouterGroup, services *Services) {
	auth := api.Group("/auth")

	authHandler := NewAuthHandler(services.User, services.Auth, services.Oidc)

	auth.POST("/login", authHandler.Login)
	auth.POST("/logout", authHandler.Logout)
	auth.GET("/me", middleware.AuthMiddleware(services.Auth), authHandler.GetCurrentUser)
	auth.GET("/validate", middleware.AuthMiddleware(services.Auth), authHandler.ValidateSession)
	auth.POST("/refresh", authHandler.RefreshToken)
	auth.POST("/password", middleware.AuthMiddleware(services.Auth), authHandler.ChangePassword)

}

func setupUserRoutes(api *gin.RouterGroup, services *Services) {
	users := api.Group("/users")
	users.Use(middleware.AuthMiddleware(services.Auth))

	userHandler := NewUserHandler(services.User)

	users.GET("", userHandler.ListUsers)
	users.POST("", userHandler.CreateUser)
	users.GET("/:id", userHandler.GetUser)
	users.PUT("/:id", userHandler.UpdateUser)
	users.DELETE("/:id", userHandler.DeleteUser)
}

func setupStackRoutes(router *gin.RouterGroup, services *Services) {
	stacks := router.Group("/stacks")
	stacks.Use(middleware.AuthMiddleware(services.Auth))

	stackHandler := NewStackHandler(services.Stack)

	stacks.GET("", stackHandler.ListStacks)
	stacks.POST("", stackHandler.CreateStack)
	stacks.GET("/:id", stackHandler.GetStack)
	stacks.PUT("/:id", stackHandler.UpdateStack)
	stacks.DELETE("/:id", stackHandler.DeleteStack)
	stacks.POST("/:id/deploy", stackHandler.DeployStack)
	stacks.POST("/:id/stop", stackHandler.StopStack)
	stacks.POST("/:id/restart", stackHandler.RestartStack)
	stacks.GET("/:id/services", stackHandler.GetStackServices)
	stacks.POST("/:id/pull", stackHandler.PullImages)
	stacks.POST("/:id/redeploy", stackHandler.RedeployStack)
	stacks.POST("/:id/down", stackHandler.DownStack)
	stacks.DELETE("/:id/destroy", stackHandler.DestroyStack)
	stacks.GET("/:id/logs/stream", stackHandler.GetStackLogsStream)
}

func setupConverterRoutes(api *gin.RouterGroup, services *Services) {
	convert := api.Group("/convert")
	convert.Use(middleware.AuthMiddleware(services.Auth))

	convertHandler := NewConverterHandler(services.Converter)

	convert.POST("", convertHandler.ConvertDockerRun)
}

func setupEnvironmentRoutes(api *gin.RouterGroup, services *Services) {
	environments := api.Group("/environments")
	environments.Use(middleware.AuthMiddleware(services.Auth))

	environmentHandler := NewEnvironmentHandler(
		services.Environment,
		services.Container,
		services.Image,
		services.Network,
		services.Volume,
		services.Stack,
	)

	environments.GET("", environmentHandler.ListEnvironments)
	environments.POST("", environmentHandler.CreateEnvironment)
	environments.GET("/:id", environmentHandler.GetEnvironment)
	environments.PUT("/:id", environmentHandler.UpdateEnvironment)
	environments.DELETE("/:id", environmentHandler.DeleteEnvironment)
	environments.POST("/:id/test", environmentHandler.TestConnection)
	environments.POST("/:id/heartbeat", environmentHandler.UpdateHeartbeat)

	environments.POST("/:id/containers", environmentHandler.CreateContainer)
	environments.GET("/:id/containers", environmentHandler.GetContainers)
	environments.GET("/:id/containers/:containerId", environmentHandler.GetContainer)
	environments.POST("/:id/containers/:containerId/pull", environmentHandler.PullContainerImage)
	environments.POST("/:id/containers/:containerId/start", environmentHandler.StartContainer)
	environments.POST("/:id/containers/:containerId/stop", environmentHandler.StopContainer)
	environments.POST("/:id/containers/:containerId/restart", environmentHandler.RestartContainer)
	environments.DELETE("/:id/containers/:containerId", environmentHandler.RemoveContainer)
	environments.GET("/:id/containers/:containerId/logs", environmentHandler.GetContainerLogs)
	environments.GET("/:id/containers/:containerId/logs/stream", environmentHandler.GetContainerLogsStream)
	environments.GET("/:id/containers/:containerId/stats", environmentHandler.GetContainerStats)
	environments.GET("/:id/containers/:containerId/stats/stream", environmentHandler.GetContainerStatsStream)

	environments.GET("/:id/images", environmentHandler.GetImages)
	environments.GET("/:id/images/:imageId", environmentHandler.GetImage)
	environments.DELETE("/:id/images/:imageId", environmentHandler.RemoveImage)
	environments.POST("/:id/images/pull", environmentHandler.PullImage)
	environments.POST("/:id/images/prune", environmentHandler.PruneImages)

	environments.GET("/:id/networks", environmentHandler.GetNetworks)
	environments.POST("/:id/networks", environmentHandler.CreateNetwork)
	environments.GET("/:id/networks/:networkId", environmentHandler.GetNetwork)
	environments.DELETE("/:id/networks/:networkId", environmentHandler.RemoveNetwork)

	environments.GET("/:id/volumes", environmentHandler.GetVolumes)
	environments.POST("/:id/volumes", environmentHandler.CreateVolume)
	environments.GET("/:id/volumes/:volumeName", environmentHandler.GetVolume)
	environments.DELETE("/:id/volumes/:volumeName", environmentHandler.RemoveVolume)
	environments.GET("/:id/volumes/:volumeName/usage", environmentHandler.GetVolumeUsage)

	environments.POST("/:id/volumes/prune", environmentHandler.PruneVolumes)

	environments.GET("/:id/stacks", environmentHandler.GetStacks)
	environments.POST("/:id/stacks", environmentHandler.CreateStack)
	environments.GET("/:id/stacks/:stackId", environmentHandler.GetStack)
	environments.PUT("/:id/stacks/:stackId", environmentHandler.UpdateStack)
	environments.DELETE("/:id/stacks/:stackId", environmentHandler.DeleteStack)
	environments.POST("/:id/stacks/:stackId/start", environmentHandler.StartStack)
	environments.POST("/:id/stacks/:stackId/deploy", environmentHandler.DeployStack)
	environments.POST("/:id/stacks/:stackId/stop", environmentHandler.StopStack)
	environments.POST("/:id/stacks/:stackId/restart", environmentHandler.RestartStack)
	environments.GET("/:id/stacks/:stackId/services", environmentHandler.GetStackServices)
	environments.POST("/:id/stacks/:stackId/pull", environmentHandler.PullStackImages)
	environments.POST("/:id/stacks/:stackId/redeploy", environmentHandler.RedeployStack)
	environments.POST("/:id/stacks/:stackId/down", environmentHandler.DownStack)
	environments.DELETE("/:id/stacks/:stackId/destroy", environmentHandler.DestroyStack)
	environments.GET("/:id/stacks/:stackId/logs/stream", environmentHandler.GetStackLogsStream)
	environments.POST("/:id/stacks/convert", environmentHandler.ConvertDockerRun)

}

func setupSettingsRoutes(api *gin.RouterGroup, services *Services, appConfig *config.Config) {
	settings := api.Group("/settings")

	settingsHandler := NewSettingsHandler(services.Settings)
	settings.GET("/public", settingsHandler.GetPublicSettings)
	settings.GET("", settingsHandler.GetSettings)
	settings.PUT("", settingsHandler.UpdateSettings)
	// settings.PUT("/auth", settingsHandler.UpdateAuth)
	// settings.PUT("/onboarding", settingsHandler.UpdateOnboarding)
	// settings.POST("/registry-credentials", settingsHandler.AddRegistryCredential)
	oidcHandler := NewOidcHandler(services.Auth, services.Oidc, appConfig)
	settings.GET("/oidc/status", oidcHandler.GetOidcStatus)
	settings.GET("/oidc/config", oidcHandler.GetOidcConfig)
	settings.POST("/oidc/url", oidcHandler.GetOidcAuthUrl)
	settings.POST("/oidc/callback", oidcHandler.HandleOidcCallback)
}

func setupSystemRoutes(api *gin.RouterGroup, dockerService *services.DockerClientService, services *Services) {
	system := api.Group("/system")
	system.Use(middleware.AuthMiddleware(services.Auth))

	systemHandler := NewSystemHandler(dockerService, services.System)

	system.GET("/stats", systemHandler.GetStats)
	system.GET("/docker/info", systemHandler.GetDockerInfo)

	system.POST("/prune", systemHandler.PruneAll)
	system.POST("/containers/start-all", systemHandler.StartAllContainers)
	system.POST("/containers/start-stopped", systemHandler.StartAllStoppedContainers)
	system.POST("/containers/stop-all", systemHandler.StopAllContainers)
}

func setupAutoUpdateRoutes(api *gin.RouterGroup, services *Services) {
	autoUpdate := api.Group("/updates")
	autoUpdate.Use(middleware.AuthMiddleware(services.Auth))

	autoUpdateHandler := NewAutoUpdateHandler(services.AutoUpdate)

	autoUpdate.POST("/check", autoUpdateHandler.CheckForUpdates)
	autoUpdate.POST("/check/containers", autoUpdateHandler.CheckContainers)
	autoUpdate.POST("/check/compose", autoUpdateHandler.CheckStacks)
	autoUpdate.GET("/history", autoUpdateHandler.GetUpdateHistory)
	autoUpdate.GET("/status", autoUpdateHandler.GetUpdateStatus)
}

func setupContainerRoutes(api *gin.RouterGroup, services *Services) {
	containers := api.Group("/containers")
	containers.Use(middleware.AuthMiddleware(services.Auth))

	containerHandler := NewContainerHandler(services.Container, services.Image)

	containers.GET("", containerHandler.List)
	containers.POST("", containerHandler.Create)
	containers.GET("/:id", containerHandler.GetByID)
	containers.GET("/:id/stats", containerHandler.GetStats)
	containers.GET("/:id/stats/stream", containerHandler.GetStatsStream)
	containers.POST("/:id/start", containerHandler.Start)
	containers.POST("/:id/stop", containerHandler.Stop)
	containers.POST("/:id/restart", containerHandler.Restart)
	containers.GET("/:id/logs", containerHandler.GetLogs)
	containers.GET("/:id/logs/stream", containerHandler.GetLogsStream)
	containers.DELETE("/:id", containerHandler.Delete)
}

func setupImageRoutes(api *gin.RouterGroup, services *Services) {
	images := api.Group("/images")
	images.Use(middleware.AuthMiddleware(services.Auth))

	imageHandler := NewImageHandler(services.Image, services.ImageUpdate)

	images.GET("", imageHandler.List)
	images.GET("/:id", imageHandler.GetByID)
	images.DELETE("/:id", imageHandler.Remove)
	images.POST("/pull", imageHandler.Pull)
	images.POST("/prune", imageHandler.Prune)
	images.GET("/:id/history", imageHandler.GetHistory)
}

func setupVolumeRoutes(api *gin.RouterGroup, services *Services) {
	volumes := api.Group("/volumes")
	volumes.Use(middleware.AuthMiddleware(services.Auth))

	volumeHandler := NewVolumeHandler(services.Volume)

	volumes.GET("", volumeHandler.List)
	volumes.GET("/:volumeName", volumeHandler.GetByName)
	volumes.POST("", volumeHandler.Create)
	volumes.DELETE("/:volumeName", volumeHandler.Remove)
	volumes.POST("/prune", volumeHandler.Prune)
	volumes.GET("/:volumeName/usage", volumeHandler.GetUsage)
}

func setupNetworkRoutes(api *gin.RouterGroup, services *Services) {
	networks := api.Group("/networks")
	networks.Use(middleware.AuthMiddleware(services.Auth))

	networkHandler := NewNetworkHandler(services.Network)

	networks.GET("", networkHandler.List)
	networks.GET("/:id", networkHandler.GetByID)
	networks.POST("", networkHandler.Create)
	networks.DELETE("/:id", networkHandler.Remove)
	networks.POST("/:id/connect", networkHandler.ConnectContainer)
	networks.POST("/:id/disconnect", networkHandler.DisconnectContainer)
	networks.POST("/prune", networkHandler.Prune)
}

func setupTemplateRoutes(router *gin.RouterGroup, services *Services) {
	templates := router.Group("/templates")

	templateHandler := NewTemplateHandler(services.Template)

	templates.GET("/fetch", templateHandler.FetchRegistry)

	templates.GET("", middleware.OptionalAuthMiddleware(services.Auth), templateHandler.GetAllTemplates)
	templates.GET("/:id", middleware.OptionalAuthMiddleware(services.Auth), templateHandler.GetTemplate)
	templates.GET("/:id/content", middleware.OptionalAuthMiddleware(services.Auth), templateHandler.GetTemplateContent)

	templatesAuth := templates.Group("/")
	templatesAuth.Use(middleware.AuthMiddleware(services.Auth))
	{
		templatesAuth.POST("", templateHandler.CreateTemplate)
		templatesAuth.PUT("/:id", templateHandler.UpdateTemplate)
		templatesAuth.DELETE("/:id", templateHandler.DeleteTemplate)
		templatesAuth.POST("/:id/download", templateHandler.DownloadTemplate)
		templatesAuth.GET("/env/default", templateHandler.GetEnvTemplate)
		templatesAuth.POST("/env/default", templateHandler.SaveEnvTemplate)
		templatesAuth.GET("/registries", templateHandler.GetRegistries)
		templatesAuth.POST("/registries", templateHandler.CreateRegistry)
		templatesAuth.PUT("/registries/:id", templateHandler.UpdateRegistry)
		templatesAuth.DELETE("/registries/:id", templateHandler.DeleteRegistry)
	}
}
