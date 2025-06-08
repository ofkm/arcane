package api

import (
	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/services"
)

type Services struct {
	User          *services.UserService
	Stack         *services.StackService
	Agent         *services.AgentService
	Settings      *services.SettingsService
	Deployment    *services.DeploymentService
	Container     *services.ContainerService
	Image         *services.ImageService
	Volume        *services.VolumeService
	Network       *services.NetworkService
	ImageMaturity *services.ImageMaturityService
	Auth          *services.AuthService
	Oidc          *services.OidcService
	Docker        *services.DockerClientService
	Converter     *services.ConverterService
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
	setupSystemRoutes(api, services.Docker)
	setupContainerRoutes(api, services)
	setupImageRoutes(api, services)
	setupVolumeRoutes(api, services)
	setupNetworkRoutes(api, services)
}

func setupAuthRoutes(api *gin.RouterGroup, services *Services, appConfig *config.Config) {
	auth := api.Group("/auth")

	authHandler := NewAuthHandler(services.User, services.Auth, services.Oidc)

	auth.POST("/login", authHandler.Login)
	auth.POST("/logout", authHandler.Logout)
	auth.GET("/me", AuthMiddleware(services.Auth), authHandler.GetCurrentUser)
	auth.GET("/validate", AuthMiddleware(services.Auth), authHandler.ValidateSession)
	auth.POST("/refresh", authHandler.RefreshToken)
	auth.POST("/password", AuthMiddleware(services.Auth), authHandler.ChangePassword)

	// OIDC endpoints
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
	users.Use(AuthMiddleware(services.Auth))

	userHandler := NewUserHandler(services.User)

	users.GET("", userHandler.ListUsers)
	users.POST("", userHandler.CreateUser)
	users.GET("/:id", userHandler.GetUser)
	users.PUT("/:id", userHandler.UpdateUser)
	users.DELETE("/:id", userHandler.DeleteUser)
}

func setupStackRoutes(router *gin.RouterGroup, services *Services) {
	stacks := router.Group("/stacks")
	stacks.Use(AuthMiddleware(services.Auth))

	stackHandler := NewStackHandler(services.Stack)

	stacks.GET("", stackHandler.ListStacks)
	stacks.POST("", stackHandler.CreateStack)
	stacks.GET("/:id", stackHandler.GetStack)
	stacks.PUT("/:id", stackHandler.UpdateStack)
	stacks.DELETE("/:id", stackHandler.DeleteStack)

	// Docker Compose operations
	stacks.POST("/:id/deploy", stackHandler.DeployStack)
	stacks.POST("/:id/stop", stackHandler.StopStack)
	stacks.POST("/:id/restart", stackHandler.RestartStack)
	stacks.GET("/:id/services", stackHandler.GetStackServices)
	stacks.POST("/:id/pull", stackHandler.PullImages)
	stacks.POST("/:id/redeploy", stackHandler.RedeployStack)
	stacks.POST("/:id/down", stackHandler.DownStack)
	stacks.DELETE("/:id/destroy", stackHandler.DestroyStack)

	stacks.POST("/convert", stackHandler.ConvertDockerRun)
}

// setupAgentRoutes handles agent management endpoints
func setupAgentRoutes(api *gin.RouterGroup, services *Services) {
	agents := api.Group("/agents")

	agentHandler := NewAgentHandler(services.Agent, services.Deployment)

	// Agent management
	agents.GET("", agentHandler.ListAgents)
	agents.GET("/:agentId", agentHandler.GetAgent)
	agents.DELETE("/:agentId", agentHandler.DeleteAgent)

	// Agent tasks
	agents.GET("/:agentId/tasks", agentHandler.GetAgentTasks)
	agents.POST("/:agentId/tasks", agentHandler.CreateTask)
	agents.GET("/:agentId/tasks/:taskId", agentHandler.GetTask)
	agents.POST("/:agentId/tasks/:taskId/result", agentHandler.SubmitTaskResult)

	// Agent deployments
	agents.GET("/:agentId/deployments", agentHandler.GetAgentDeployments)
	agents.POST("/:agentId/deploy/stack", agentHandler.DeployStack)
	agents.POST("/:agentId/deploy/container", agentHandler.DeployContainer)
	agents.POST("/:agentId/deploy/image", agentHandler.DeployImage)

	// Agent stacks
	agents.GET("/:agentId/stacks", agentHandler.GetAgentStacks)

	// Agent utilities
	agents.POST("/:agentId/health-check", agentHandler.SendHealthCheck)
	agents.POST("/:agentId/stack-list", agentHandler.GetStackList)
}

// setupSettingsRoutes handles settings endpoints
func setupSettingsRoutes(api *gin.RouterGroup, services *Services, appConfig *config.Config) {
	settings := api.Group("/settings")

	settingsHandler := NewSettingsHandler(services.Settings)

	// Public endpoint for login page (no auth required)
	settings.GET("/public", settingsHandler.GetPublicSettings)

	// settings.Use(AuthMiddleware(services.Auth))
	settings.GET("", settingsHandler.GetSettings)
	settings.PUT("", settingsHandler.UpdateSettings)

	// Specific settings endpoints
	settings.PUT("/auth", settingsHandler.UpdateAuth)
	settings.PUT("/onboarding", settingsHandler.UpdateOnboarding)
	settings.POST("/registry-credentials", settingsHandler.AddRegistryCredential)

	// Add OIDC endpoints under settings as well for frontend compatibility
	oidcHandler := NewOidcHandler(services.Auth, services.Oidc, appConfig)
	settings.GET("/oidc/status", oidcHandler.GetOidcStatus)
	settings.GET("/oidc/config", oidcHandler.GetOidcConfig)
	settings.POST("/oidc/url", oidcHandler.GetOidcAuthUrl)
	settings.POST("/oidc/callback", oidcHandler.HandleOidcCallback)
}

// setupDeploymentRoutes handles deployment endpoints
func setupDeploymentRoutes(api *gin.RouterGroup, services *Services) {
	deployments := api.Group("/deployments")

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

	imageMaturityHandler := NewImageMaturityHandler(services.ImageMaturity, services.Image)

	imageMaturity.GET("", imageMaturityHandler.ListMaturityRecords)
	imageMaturity.GET("/stats", imageMaturityHandler.GetMaturityStats)
	imageMaturity.GET("/updates", imageMaturityHandler.GetImagesWithUpdates)
	imageMaturity.GET("/needs-check", imageMaturityHandler.GetImagesNeedingCheck)
	imageMaturity.POST("/check", imageMaturityHandler.TriggerMaturityCheck)
	imageMaturity.GET("/repository/:repository", imageMaturityHandler.GetMaturityByRepository)
	imageMaturity.GET("/:imageId", imageMaturityHandler.GetImageMaturity)
}

func setupSystemRoutes(api *gin.RouterGroup, dockerService *services.DockerClientService) {
	system := api.Group("/system")
	// system.Use(AuthMiddleware(services.Auth)) // Add when ready

	systemHandler := NewSystemHandler(dockerService)

	system.GET("/stats", systemHandler.GetStats)
	system.GET("/docker/info", systemHandler.GetDockerInfo)
}

func setupContainerRoutes(api *gin.RouterGroup, services *Services) {
	containers := api.Group("/containers")
	containers.Use(AuthMiddleware(services.Auth))

	containerHandler := NewContainerHandler(services.Container)

	containers.GET("", containerHandler.List)
	containers.GET("/:id", containerHandler.GetByID)
	containers.POST("/:id/start", containerHandler.Start)
	containers.POST("/:id/stop", containerHandler.Stop)
	containers.POST("/:id/restart", containerHandler.Restart)
	containers.DELETE("/:id", containerHandler.Delete)
	containers.GET("/:id/logs", containerHandler.GetLogs)
	containers.GET("/image-usage/:id", containerHandler.IsImageInUse)
}

func setupImageRoutes(api *gin.RouterGroup, services *Services) {
	images := api.Group("/images")
	images.Use(AuthMiddleware(services.Auth))

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
	volumes.Use(AuthMiddleware(services.Auth))

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
	networks.Use(AuthMiddleware(services.Auth))

	networkHandler := NewNetworkHandler(services.Network)

	networks.GET("", networkHandler.List)
	networks.GET("/:id", networkHandler.GetByID)
	networks.POST("", networkHandler.Create)
	networks.DELETE("/:id", networkHandler.Remove)
	networks.POST("/:id/connect", networkHandler.ConnectContainer)
	networks.POST("/:id/disconnect", networkHandler.DisconnectContainer)
	networks.POST("/prune", networkHandler.Prune)
}
