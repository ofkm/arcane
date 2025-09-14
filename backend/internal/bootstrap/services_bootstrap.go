package bootstrap

import (
	"net/http"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/database"
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
	Updater           *services.UpdaterService
	Event             *services.EventService
	Version           *services.VersionService
}

func initializeServices(db *database.DB, cfg *config.Config, httpClient *http.Client) (*Services, *services.DockerClientService, error) {
	svc := &Services{}

	svc.Event = services.NewEventService(db)
	svc.Converter = services.NewConverterService()
	svc.Settings = services.NewSettingsService(db, cfg)
	dockerClient := services.NewDockerClientService(db)
	svc.Docker = dockerClient
	svc.User = services.NewUserService(db)
	svc.ContainerRegistry = services.NewContainerRegistryService(db)
	svc.ImageUpdate = services.NewImageUpdateService(db, svc.Settings, svc.ContainerRegistry, svc.Docker, svc.Event)
	svc.Image = services.NewImageService(db, svc.Docker, svc.ContainerRegistry, svc.ImageUpdate, svc.Event)
	svc.Stack = services.NewStackService(db, svc.Settings, svc.Event, svc.Image)
	svc.Environment = services.NewEnvironmentService(db, httpClient)
	svc.Container = services.NewContainerService(db, svc.Event, svc.Docker)
	svc.Volume = services.NewVolumeService(db, svc.Docker, svc.Event)
	svc.Network = services.NewNetworkService(db, svc.Docker, svc.Event)
	svc.Template = services.NewTemplateService(db, httpClient)
	svc.Auth = services.NewAuthService(svc.User, svc.Settings, svc.Event, cfg.JWTSecret, cfg)
	svc.Oidc = services.NewOidcService(svc.Auth, cfg, httpClient)
	svc.Updater = services.NewUpdaterService(db, svc.Settings, svc.Docker, svc.Stack, svc.ImageUpdate, svc.ContainerRegistry, svc.Event, svc.Image)
	svc.System = services.NewSystemService(db, svc.Docker, svc.Container, svc.Image, svc.Volume, svc.Network, svc.Settings)
	svc.Version = services.NewVersionService(httpClient, cfg.UpdateCheckDisabled)

	return svc, dockerClient, nil
}
