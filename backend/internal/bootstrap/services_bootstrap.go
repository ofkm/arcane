package bootstrap

import (
	"log"

	"github.com/ofkm/arcane-backend/internal/api"
	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/services"
)

func initializeServices(db *database.DB, cfg *config.Config) (*api.Services, *services.DockerClientService, error) {
	log.Println("Initializing services...")
	converterService := services.NewConverterService()
	settingsService := services.NewSettingsService(db)
	dockerClientService := services.NewDockerClientService(db)
	userService := services.NewUserService(db)
	stackService := services.NewStackService(db, settingsService)
	environmentService := services.NewEnvironmentService(db)
	containerService := services.NewContainerService(db, dockerClientService)
	containerRegistry := services.NewContainerRegistryService(db)
	imageService := services.NewImageService(db, dockerClientService, containerRegistry)
	volumeService := services.NewVolumeService(db, dockerClientService)
	networkService := services.NewNetworkService(db, dockerClientService)
	imageMaturityService := services.NewImageMaturityService(db, settingsService, containerRegistry)
	templateService := services.NewTemplateService(db)
	authService := services.NewAuthService(userService, settingsService, cfg.JWTSecret, cfg)
	oidcService := services.NewOidcService(authService)
	autoUpdate := services.NewAutoUpdateService(db, dockerClientService, settingsService, containerService, stackService, imageService, containerRegistry)
	systemService := services.NewSystemService(db, dockerClientService, containerService, imageService, volumeService, networkService, settingsService)

	appServices := &api.Services{
		User:              userService,
		Stack:             stackService,
		Environment:       environmentService,
		Settings:          settingsService,
		Container:         containerService,
		Image:             imageService,
		Volume:            volumeService,
		Network:           networkService,
		ImageMaturity:     imageMaturityService,
		Auth:              authService,
		Oidc:              oidcService,
		Docker:            dockerClientService,
		Converter:         converterService,
		Template:          templateService,
		ContainerRegistry: containerRegistry,
		System:            systemService,
		AutoUpdate:        autoUpdate,
	}

	return appServices, dockerClientService, nil
}
