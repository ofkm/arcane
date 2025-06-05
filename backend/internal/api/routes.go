package api

import (
	"github.com/gin-gonic/gin"
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
}

func SetupRoutes(r *gin.Engine, services *Services) {
	api := r.Group("/api")

	setupAuthRoutes(api, services)
	setupUserRoutes(api, services)
	setupStackRoutes(api, services)
	setupAgentRoutes(api, services)
	setupSettingsRoutes(api, services)
	setupDeploymentRoutes(api, services)
	setupImageMaturityRoutes(api, services)
}

func setupAuthRoutes(api *gin.RouterGroup, services *Services) {
	auth := api.Group("/auth")

	authHandler := NewAuthHandler(services.User)

	auth.POST("/login", authHandler.Login)
	auth.POST("/logout", authHandler.Logout)
	auth.GET("/me", authHandler.GetCurrentUser)
	auth.POST("/refresh", authHandler.RefreshToken)
}

func setupUserRoutes(api *gin.RouterGroup, services *Services) {
	users := api.Group("/users")
	// users.Use(AuthMiddleware()) // Add authentication middleware

	userHandler := NewUserHandler(services.User)

	users.GET("", userHandler.ListUsers)
	users.POST("", userHandler.CreateUser)
	users.GET("/:id", userHandler.GetUser)
	users.PUT("/:id", userHandler.UpdateUser)
	users.DELETE("/:id", userHandler.DeleteUser)
}

func setupStackRoutes(api *gin.RouterGroup, services *Services) {
	stacks := api.Group("/stacks")
	// stacks.Use(AuthMiddleware()) // Add authentication middleware

	stackHandler := NewStackHandler(services.Stack)

	stacks.GET("", stackHandler.ListStacks)
	stacks.POST("", stackHandler.CreateStack)
	stacks.GET("/:id", stackHandler.GetStack)
	stacks.PUT("/:id", stackHandler.UpdateStack)
	stacks.DELETE("/:id", stackHandler.DeleteStack)

	// Stack actions
	stacks.POST("/:id/start", stackHandler.StartStack)
	stacks.POST("/:id/stop", stackHandler.StopStack)
	stacks.POST("/:id/restart", stackHandler.RestartStack)
	stacks.POST("/:id/redeploy", stackHandler.RedeployStack)
	stacks.POST("/:id/pull", stackHandler.PullStack)
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
func setupSettingsRoutes(api *gin.RouterGroup, services *Services) {
	settings := api.Group("/settings")

	settingsHandler := NewSettingsHandler(services.Settings)

	settings.GET("", settingsHandler.GetSettings)
	settings.PUT("", settingsHandler.UpdateSettings)

	// Specific settings endpoints
	settings.PUT("/auth", settingsHandler.UpdateAuth)
	settings.PUT("/onboarding", settingsHandler.UpdateOnboarding)
	settings.POST("/registry-credentials", settingsHandler.AddRegistryCredential)
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

	imageMaturityHandler := NewImageMaturityHandler(services.ImageMaturity)

	// List and stats endpoints
	imageMaturity.GET("", imageMaturityHandler.ListMaturityRecords)
	imageMaturity.GET("/stats", imageMaturityHandler.GetMaturityStats)
	imageMaturity.GET("/updates", imageMaturityHandler.GetImagesWithUpdates)
	imageMaturity.GET("/needs-check", imageMaturityHandler.GetImagesNeedingCheck)

	// Batch operations
	imageMaturity.POST("/check", imageMaturityHandler.CheckMaturityBatch)
	imageMaturity.POST("/cleanup", imageMaturityHandler.CleanupOrphanedRecords)

	// Individual image operations
	imageMaturity.GET("/:imageId", imageMaturityHandler.GetImageMaturity)
	imageMaturity.POST("/:imageId", imageMaturityHandler.SetImageMaturity)
	imageMaturity.PUT("/:imageId/status", imageMaturityHandler.UpdateCheckStatus)
	imageMaturity.POST("/:imageId/mark-matured", imageMaturityHandler.MarkAsMatured)
}
