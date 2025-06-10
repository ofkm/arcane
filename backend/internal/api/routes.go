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
	Agent             *services.AgentService
	Settings          *services.SettingsService
	Deployment        *services.DeploymentService
	Container         *services.ContainerService
	Image             *services.ImageService
	Volume            *services.VolumeService
	Network           *services.NetworkService
	ImageMaturity     *services.ImageMaturityService
	Auth              *services.AuthService
	Oidc              *services.OidcService
	Docker            *services.DockerClientService
	Converter         *services.ConverterService
	Template          *services.TemplateService
	ContainerRegistry *services.ContainerRegistryService
	System            *services.SystemService
}

func SetupRoutes(r *gin.Engine, services *Services, appConfig *config.Config) {
	api := r.Group("/api")

	setupAuthRoutes(api, services, appConfig)
	setupUserRoutes(api, services)
	setupStackRoutes(api, services)
	setupAgentRoutes(api, services)
	setupSettingsRoutes(api, services, appConfig)
	setupDeploymentRoutes(api, services)
	setupImageMaturityRoutes(api, services)
	setupSystemRoutes(api, services.Docker, services)
	setupContainerRoutes(api, services)
	setupImageRoutes(api, services)
	setupVolumeRoutes(api, services)
	setupNetworkRoutes(api, services)
	setupTemplateRoutes(api, services)
	setupContainerRegistryRoutes(api, services)
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

func setupAuthRoutes(api *gin.RouterGroup, services *Services, appConfig *config.Config) {
	auth := api.Group("/auth")

	authHandler := NewAuthHandler(services.User, services.Auth, services.Oidc)

	auth.POST("/login", authHandler.Login)
	auth.POST("/logout", authHandler.Logout)
	auth.GET("/me", middleware.AuthMiddleware(services.Auth), authHandler.GetCurrentUser)
	auth.GET("/validate", middleware.AuthMiddleware(services.Auth), authHandler.ValidateSession)
	auth.POST("/refresh", authHandler.RefreshToken)
	auth.POST("/password", middleware.AuthMiddleware(services.Auth), authHandler.ChangePassword)

	oidcHandler := NewOidcHandler(services.Auth, services.Oidc, appConfig)
	oidc := auth.Group("/oidc")
	{
		oidc.POST("/url", oidcHandler.GetOidcAuthUrl)
		oidc.POST("/callback", oidcHandler.HandleOidcCallback)
		oidc.GET("/config", oidcHandler.GetOidcConfig)
		oidc.GET("/status", oidcHandler.GetOidcStatus)
	}
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
	stacks.POST("/convert", stackHandler.ConvertDockerRun)
}

func setupAgentRoutes(api *gin.RouterGroup, services *Services) {
	agents := api.Group("/agents")

	agentHandler := NewAgentHandler(services.Agent, services.Deployment)
	agents.GET("", middleware.AuthMiddleware(services.Auth), agentHandler.ListAgents)
	agents.GET("/:agentId", middleware.AuthMiddleware(services.Auth), agentHandler.GetAgent)
	agents.DELETE("/:agentId", middleware.AuthMiddleware(services.Auth), agentHandler.DeleteAgent)
	agents.GET("/:agentId/tasks", middleware.AuthMiddleware(services.Auth), agentHandler.GetAgentTasks)
	agents.POST("/:agentId/tasks", middleware.AuthMiddleware(services.Auth), agentHandler.CreateTask)
	agents.GET("/:agentId/tasks/:taskId", middleware.AuthMiddleware(services.Auth), agentHandler.GetTask)
	agents.POST("/:agentId/tasks/:taskId/result", middleware.AuthMiddleware(services.Auth), agentHandler.SubmitTaskResult)
	agents.GET("/:agentId/deployments", middleware.AuthMiddleware(services.Auth), agentHandler.GetAgentDeployments)
	agents.POST("/:agentId/deploy/stack", middleware.AuthMiddleware(services.Auth), agentHandler.DeployStack)
	agents.POST("/:agentId/deploy/container", middleware.AuthMiddleware(services.Auth), agentHandler.DeployContainer)
	agents.POST("/:agentId/deploy/image", middleware.AuthMiddleware(services.Auth), agentHandler.DeployImage)
	agents.GET("/:agentId/stacks", middleware.AuthMiddleware(services.Auth), agentHandler.GetAgentStacks)
	agents.POST("/:agentId/health-check", middleware.AuthMiddleware(services.Auth), agentHandler.SendHealthCheck)
	agents.POST("/:agentId/stack-list", middleware.AuthMiddleware(services.Auth), agentHandler.GetStackList)
}

func setupSettingsRoutes(api *gin.RouterGroup, services *Services, appConfig *config.Config) {
	settings := api.Group("/settings")

	settingsHandler := NewSettingsHandler(services.Settings)
	settings.GET("/public", settingsHandler.GetPublicSettings)
	settings.GET("", settingsHandler.GetSettings)
	settings.PUT("", settingsHandler.UpdateSettings)
	settings.PUT("/auth", settingsHandler.UpdateAuth)
	settings.PUT("/onboarding", settingsHandler.UpdateOnboarding)
	settings.POST("/registry-credentials", settingsHandler.AddRegistryCredential)
	oidcHandler := NewOidcHandler(services.Auth, services.Oidc, appConfig)
	settings.GET("/oidc/status", oidcHandler.GetOidcStatus)
	settings.GET("/oidc/config", oidcHandler.GetOidcConfig)
	settings.POST("/oidc/url", oidcHandler.GetOidcAuthUrl)
	settings.POST("/oidc/callback", oidcHandler.HandleOidcCallback)
}

func setupDeploymentRoutes(api *gin.RouterGroup, services *Services) {
	deployments := api.Group("/deployments")
	deployments.Use(middleware.AuthMiddleware(services.Auth))

	deploymentHandler := NewDeploymentHandler(services.Deployment)

	deployments.GET("", deploymentHandler.ListDeployments)
	deployments.GET("/recent", deploymentHandler.GetRecentDeployments)
	deployments.GET("/stats", deploymentHandler.GetDeploymentStats)
	deployments.GET("/:deploymentId", deploymentHandler.GetDeployment)
	deployments.PUT("/:deploymentId/status", deploymentHandler.UpdateDeploymentStatus)
	deployments.DELETE("/:deploymentId", deploymentHandler.DeleteDeployment)
}

func setupImageMaturityRoutes(api *gin.RouterGroup, services *Services) {
	imageMaturity := api.Group("/images/maturity")
	imageMaturity.Use(middleware.AuthMiddleware(services.Auth))

	imageMaturityHandler := NewImageMaturityHandler(services.ImageMaturity, services.Image)

	imageMaturity.GET("", imageMaturityHandler.ListMaturityRecords)
	imageMaturity.GET("/stats", imageMaturityHandler.GetMaturityStats)
	imageMaturity.GET("/updates", imageMaturityHandler.GetImagesWithUpdates)
	imageMaturity.GET("/needs-check", imageMaturityHandler.GetImagesNeedingCheck)
	imageMaturity.POST("/check", imageMaturityHandler.TriggerMaturityCheck)
	imageMaturity.GET("/repository/:repository", imageMaturityHandler.GetMaturityByRepository)
	imageMaturity.GET("/:imageId", imageMaturityHandler.GetImageMaturity)
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

	//		{
	//	  "containers": true,
	//	  "images": true,
	//	  "volumes": true,
	//	  "networks": true,
	//	  "dangling": true
	//	}
}

func setupContainerRoutes(api *gin.RouterGroup, services *Services) {
	containers := api.Group("/containers")
	containers.Use(middleware.AuthMiddleware(services.Auth))

	containerHandler := NewContainerHandler(services.Container)

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

	imageHandler := NewImageHandler(services.Image, services.ImageMaturity)

	images.GET("", imageHandler.List)
	images.GET("/:id", imageHandler.GetByID)
	images.DELETE("/:id", imageHandler.Remove)
	images.POST("/pull", imageHandler.Pull)
	images.POST("/prune", imageHandler.Prune)
	images.GET("/:id/history", imageHandler.GetHistory)
	images.POST("/:id/maturity", imageHandler.CheckMaturity)
}

func setupVolumeRoutes(api *gin.RouterGroup, services *Services) {
	volumes := api.Group("/volumes")
	volumes.Use(middleware.AuthMiddleware(services.Auth))

	volumeHandler := NewVolumeHandler(services.Volume)

	volumes.GET("", volumeHandler.List)
	volumes.GET("/:name", volumeHandler.GetByName)
	volumes.POST("", volumeHandler.Create)
	volumes.DELETE("/:name", volumeHandler.Remove)
	volumes.POST("/prune", volumeHandler.Prune)
	volumes.GET("/:name/usage", volumeHandler.GetUsage)
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
		templatesAuth.GET("/env/default", templateHandler.GetEnvTemplate)
		templatesAuth.POST("/env/default", templateHandler.SaveEnvTemplate)
		templatesAuth.GET("/registries", templateHandler.GetRegistries)
		templatesAuth.POST("/registries", templateHandler.CreateRegistry)
		templatesAuth.PUT("/registries/:id", templateHandler.UpdateRegistry)
		templatesAuth.DELETE("/registries/:id", templateHandler.DeleteRegistry)
	}
}
