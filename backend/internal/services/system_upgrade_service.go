package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"time"

	"github.com/docker/docker/api/types"
	containertypes "github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/ofkm/arcane-backend/internal/models"
)

var (
	ErrNotRunningInDocker = errors.New("Arcane is not running in a Docker container")
	ErrContainerNotFound  = errors.New("could not find Arcane container")
	ErrUpgradeInProgress  = errors.New("an upgrade is already in progress")
	ErrDockerSocketAccess = errors.New("Docker socket is not accessible")
)

type SystemUpgradeService struct {
	dockerService  *DockerClientService
	versionService *VersionService
	eventService   *EventService
	upgrading      bool
}

func NewSystemUpgradeService(
	dockerService *DockerClientService,
	versionService *VersionService,
	eventService *EventService,
) *SystemUpgradeService {
	return &SystemUpgradeService{
		dockerService:  dockerService,
		versionService: versionService,
		eventService:   eventService,
		upgrading:      false,
	}
}

// CanUpgrade checks if self-upgrade is possible
func (s *SystemUpgradeService) CanUpgrade(ctx context.Context) (bool, error) {
	// Check if running in Docker
	containerId, err := s.getCurrentContainerID()
	if err != nil {
		return false, ErrNotRunningInDocker
	}

	// Verify we can access Docker
	_, err = s.dockerService.CreateConnection(ctx)
	if err != nil {
		return false, ErrDockerSocketAccess
	}

	// Verify we can find our container
	_, err = s.findArcaneContainer(ctx, containerId)
	if err != nil {
		return false, err
	}

	return true, nil
}

// UpgradeToLatest performs the self-upgrade
func (s *SystemUpgradeService) UpgradeToLatest(ctx context.Context, user models.User) error {
	if s.upgrading {
		return ErrUpgradeInProgress
	}
	s.upgrading = true
	defer func() { s.upgrading = false }()

	// 1. Get current container ID
	currentContainerId, err := s.getCurrentContainerID()
	if err != nil {
		return fmt.Errorf("get current container: %w", err)
	}

	slog.Info("Starting self-upgrade", "containerId", currentContainerId, "user", user.Username)

	// Log upgrade event
	metadata := models.JSON{
		"action":      "system_upgrade",
		"containerId": currentContainerId,
	}
	if err := s.eventService.LogUserEvent(ctx, models.EventTypeSystemAutoUpdate, user.ID, user.Username, metadata); err != nil {
		slog.Warn("Failed to log upgrade event", "error", err)
	}

	// 2. Inspect current container
	currentContainer, err := s.findArcaneContainer(ctx, currentContainerId)
	if err != nil {
		return fmt.Errorf("inspect container: %w", err)
	}

	// 3. Determine image to pull
	imageName := s.determineImageName(currentContainer)
	slog.Info("Pulling new image", "image", imageName)

	// 4. Pull new image
	if err := s.pullImage(ctx, imageName); err != nil {
		return fmt.Errorf("pull image: %w", err)
	}

	// 5. Create new container with same config
	newContainerId, err := s.recreateContainer(ctx, currentContainer, imageName)
	if err != nil {
		return fmt.Errorf("recreate container: %w", err)
	}

	slog.Info("Successfully upgraded Arcane",
		"oldContainer", currentContainerId,
		"newContainer", newContainerId,
		"image", imageName,
	)

	// 6. Stop current container (this will terminate Arcane)
	// The new container is already running at this point
	// We do this in a goroutine so the response can be sent first
	go func() {
		time.Sleep(2 * time.Second)
		stopCtx := context.Background()
		dockerClient, err := s.dockerService.CreateConnection(stopCtx)
		if err != nil {
			slog.Error("Failed to create Docker client for cleanup", "error", err)
			return
		}
		defer dockerClient.Close()

		timeout := 10
		if err := dockerClient.ContainerStop(stopCtx, currentContainerId, containertypes.StopOptions{Timeout: &timeout}); err != nil {
			slog.Warn("Failed to stop old container", "error", err)
		}

		// Remove old container
		if err := dockerClient.ContainerRemove(stopCtx, currentContainerId, containertypes.RemoveOptions{}); err != nil {
			slog.Warn("Failed to remove old container", "error", err)
		}
	}()

	return nil
}

// getCurrentContainerID detects if we're running in Docker and returns container ID
func (s *SystemUpgradeService) getCurrentContainerID() (string, error) {
	// Try reading from /proc/self/cgroup (Linux)
	data, err := os.ReadFile("/proc/self/cgroup")
	if err == nil {
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			// Look for docker in the cgroup path
			if strings.Contains(line, "docker") || strings.Contains(line, "containerd") {
				parts := strings.Split(line, "/")
				if len(parts) > 0 {
					id := strings.TrimSpace(parts[len(parts)-1])
					// Container IDs are typically 64 chars but we accept anything >= 12
					if len(id) >= 12 {
						return id, nil
					}
				}
			}
		}
	}

	// Try reading from /proc/self/mountinfo (alternative method)
	data, err = os.ReadFile("/proc/self/mountinfo")
	if err == nil {
		lines := strings.Split(string(data), "\n")
		for _, line := range lines {
			if strings.Contains(line, "/docker/containers/") {
				parts := strings.Split(line, "/docker/containers/")
				if len(parts) > 1 {
					idParts := strings.Split(parts[1], "/")
					if len(idParts) > 0 && len(idParts[0]) >= 12 {
						return idParts[0], nil
					}
				}
			}
		}
	}

	// Try hostname (works in many Docker setups)
	hostname, err := os.Hostname()
	if err == nil && len(hostname) == 12 || len(hostname) == 64 {
		// Likely a Docker container ID
		return hostname, nil
	}

	return "", ErrNotRunningInDocker
}

// findArcaneContainer finds the container using the ID
func (s *SystemUpgradeService) findArcaneContainer(ctx context.Context, containerId string) (types.ContainerJSON, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return types.ContainerJSON{}, err
	}
	defer dockerClient.Close()

	// Try to inspect the container directly
	container, err := dockerClient.ContainerInspect(ctx, containerId)
	if err == nil {
		return container, nil
	}

	// Fallback: search for containers with arcane image
	filter := filters.NewArgs()
	filter.Add("ancestor", "ofkm/arcane")

	containers, err := dockerClient.ContainerList(ctx, containertypes.ListOptions{
		All:     true,
		Filters: filter,
	})
	if err != nil {
		return types.ContainerJSON{}, err
	}

	for _, c := range containers {
		if strings.HasPrefix(c.ID, containerId) {
			return dockerClient.ContainerInspect(ctx, c.ID)
		}
	}

	// Try without filter - search all containers
	allContainers, err := dockerClient.ContainerList(ctx, containertypes.ListOptions{All: true})
	if err != nil {
		return types.ContainerJSON{}, err
	}

	for _, c := range allContainers {
		if strings.HasPrefix(c.ID, containerId) || c.ID == containerId {
			return dockerClient.ContainerInspect(ctx, c.ID)
		}
	}

	return types.ContainerJSON{}, ErrContainerNotFound
}

// determineImageName extracts image name from container or uses default
func (s *SystemUpgradeService) determineImageName(container types.ContainerJSON) string {
	imageName := container.Config.Image

	// Strip digest if present
	if idx := strings.Index(imageName, "@sha256:"); idx != -1 {
		imageName = imageName[:idx]
	}

	// If no tag is specified, add :latest
	if !strings.Contains(imageName, ":") {
		imageName = imageName + ":latest"
	}

	// Ensure it's an ofkm/arcane image
	if !strings.Contains(imageName, "arcane") {
		slog.Warn("Container is not running arcane image, using ofkm/arcane:latest", "currentImage", imageName)
		return "ofkm/arcane:latest"
	}

	return imageName
}

// pullImage pulls the specified image
func (s *SystemUpgradeService) pullImage(ctx context.Context, imageName string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return err
	}
	defer dockerClient.Close()

	slog.Info("Starting image pull", "image", imageName)

	reader, err := dockerClient.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image: %w", err)
	}
	defer reader.Close()

	// Read the pull output to ensure completion and log progress
	_, err = io.Copy(io.Discard, reader)
	if err != nil {
		return fmt.Errorf("error during image pull: %w", err)
	}

	slog.Info("Image pull completed", "image", imageName)
	return nil
}

// recreateContainer creates and starts a new container with the new image
func (s *SystemUpgradeService) recreateContainer(
	ctx context.Context,
	oldContainer types.ContainerJSON,
	newImage string,
) (string, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return "", err
	}
	defer dockerClient.Close()

	// Create new container config based on old one
	config := oldContainer.Config
	config.Image = newImage

	hostConfig := oldContainer.HostConfig

	// Build network config from existing networks
	networkConfig := &network.NetworkingConfig{
		EndpointsConfig: make(map[string]*network.EndpointSettings),
	}

	// Copy network settings from old container
	for networkName, networkSettings := range oldContainer.NetworkSettings.Networks {
		networkConfig.EndpointsConfig[networkName] = &network.EndpointSettings{
			Aliases:   networkSettings.Aliases,
			IPAddress: networkSettings.IPAddress,
		}
	}

	// Generate new container name
	oldName := strings.TrimPrefix(oldContainer.Name, "/")
	newName := oldName

	slog.Info("Creating new container",
		"name", newName,
		"image", newImage,
		"volumes", len(hostConfig.Binds),
		"networks", len(networkConfig.EndpointsConfig),
	)

	// Create container
	resp, err := dockerClient.ContainerCreate(
		ctx,
		config,
		hostConfig,
		networkConfig,
		nil,
		newName,
	)
	if err != nil {
		// If name conflict, try with a timestamp suffix
		if strings.Contains(err.Error(), "already in use") {
			newName = fmt.Sprintf("%s-new", oldName)
			resp, err = dockerClient.ContainerCreate(
				ctx,
				config,
				hostConfig,
				networkConfig,
				nil,
				newName,
			)
		}

		if err != nil {
			return "", fmt.Errorf("create container: %w", err)
		}
	}

	slog.Info("New container created", "id", resp.ID, "name", newName)

	// Start the new container
	if err := dockerClient.ContainerStart(ctx, resp.ID, containertypes.StartOptions{}); err != nil {
		// Cleanup on failure
		_ = dockerClient.ContainerRemove(ctx, resp.ID, containertypes.RemoveOptions{Force: true})
		return "", fmt.Errorf("start container: %w", err)
	}

	slog.Info("New container started successfully", "id", resp.ID)

	return resp.ID, nil
}
