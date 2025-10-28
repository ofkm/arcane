package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"strings"
	"sync/atomic"
	"time"

	containertypes "github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/ofkm/arcane-backend/internal/models"
)

var (
	ErrNotRunningInDocker = errors.New("arcane is not running in a Docker container")
	ErrContainerNotFound  = errors.New("could not find Arcane container")
	ErrUpgradeInProgress  = errors.New("an upgrade is already in progress")
	ErrDockerSocketAccess = errors.New("docker socket is not accessible")
)

type SystemUpgradeService struct {
	upgrading      atomic.Bool
	dockerService  *DockerClientService
	versionService *VersionService
	eventService   *EventService
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

// TriggerUpgradeViaCLI spawns the upgrade CLI command in a separate container
// This avoids self-termination issues by running the upgrade from outside
func (s *SystemUpgradeService) TriggerUpgradeViaCLI(ctx context.Context, user models.User) error {
	if !s.upgrading.CompareAndSwap(false, true) {
		return ErrUpgradeInProgress
	}
	defer s.upgrading.Store(false)

	// Get current container name
	containerId, err := s.getCurrentContainerID()
	if err != nil {
		return fmt.Errorf("get current container: %w", err)
	}

	currentContainer, err := s.findArcaneContainer(ctx, containerId)
	if err != nil {
		return fmt.Errorf("inspect container: %w", err)
	}

	containerName := strings.TrimPrefix(currentContainer.Name, "/")

	// Log upgrade event
	metadata := models.JSON{
		"action":        "system_upgrade_cli",
		"containerId":   containerId,
		"containerName": containerName,
		"method":        "cli",
	}
	if err := s.eventService.LogUserEvent(ctx, models.EventTypeSystemUpgrade, user.ID, user.Username, metadata); err != nil {
		slog.Warn("Failed to log upgrade event", "error", err)
	}

	// Get the current image to determine which image to use for the upgrader
	currentImage := currentContainer.Config.Image
	if idx := strings.Index(currentImage, "@"); idx != -1 {
		currentImage = currentImage[:idx]
	}

	slog.Info("Spawning upgrade CLI command",
		"containerName", containerName,
		"upgraderImage", currentImage,
	)

	// Spawn the upgrade command in a detached container
	// This will run independently of the current container
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	// Create the upgrader container config
	config := &containertypes.Config{
		Image: currentImage,
		Cmd:   []string{"upgrade", "--container", containerName},
	}

	hostConfig := &containertypes.HostConfig{
		AutoRemove: true, // Clean up after completion
		Binds: []string{
			"/var/run/docker.sock:/var/run/docker.sock",
		},
	}

	containerName = fmt.Sprintf("%s-upgrader-%d", containerName, time.Now().Unix())

	resp, err := dockerClient.ContainerCreate(ctx, config, hostConfig, nil, nil, containerName)
	if err != nil {
		return fmt.Errorf("create upgrader container: %w", err)
	}

	// Start the upgrader container - it will run the upgrade and auto-remove
	if err := dockerClient.ContainerStart(ctx, resp.ID, containertypes.StartOptions{}); err != nil {
		_ = dockerClient.ContainerRemove(ctx, resp.ID, containertypes.RemoveOptions{Force: true})
		return fmt.Errorf("start upgrader container: %w", err)
	}

	slog.Info("Upgrade container started",
		"upgraderId", resp.ID[:12],
		"upgraderName", containerName,
	)

	return nil
}

// UpgradeToLatest performs the self-upgrade (DEPRECATED - use TriggerUpgradeViaCLI instead)
func (s *SystemUpgradeService) UpgradeToLatest(ctx context.Context, user models.User) error {
	if !s.upgrading.CompareAndSwap(false, true) {
		return ErrUpgradeInProgress
	}

	defer s.upgrading.Store(false)

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
	imageName := s.determineImageName(ctx, currentContainer)
	slog.Info("Pulling new image", "image", imageName)

	// 4. Pull new image
	if err := s.pullImage(ctx, imageName); err != nil {
		return fmt.Errorf("pull image: %w", err)
	}

	// 5. Create and start replacement container with coordinated switchover
	// We must stop the old container first to free ports, but do cleanup asynchronously
	// to allow the HTTP response to complete before we fully terminate.
	originalName := strings.TrimPrefix(currentContainer.Name, "/")
	newContainerId, err := s.recreateContainerWithSwitchover(ctx, currentContainer, imageName, currentContainerId, originalName)
	if err != nil {
		return fmt.Errorf("recreate container: %w", err)
	}

	slog.Info("Successfully upgraded Arcane",
		"oldContainer", currentContainerId,
		"newContainer", newContainerId,
		"image", imageName,
	)

	return nil
}

// getCurrentContainerID detects if we're running in Docker and returns container ID
func (s *SystemUpgradeService) getCurrentContainerID() (string, error) {
	// Try reading from /proc/self/cgroup (Linux)
	if id, err := s.getContainerIDFromCgroup(); err == nil {
		return id, nil
	}

	// Try reading from /proc/self/mountinfo (alternative method)
	if id, err := s.getContainerIDFromMountinfo(); err == nil {
		return id, nil
	}

	// Try hostname (works in many Docker setups)
	if id, err := s.getContainerIDFromHostname(); err == nil {
		return id, nil
	}

	return "", ErrNotRunningInDocker
}

// getContainerIDFromCgroup reads container ID from /proc/self/cgroup
func (s *SystemUpgradeService) getContainerIDFromCgroup() (string, error) {
	data, err := os.ReadFile("/proc/self/cgroup")
	if err != nil {
		return "", err
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		if strings.Contains(line, "docker") || strings.Contains(line, "containerd") {
			parts := strings.Split(line, "/")
			if len(parts) > 0 {
				id := strings.TrimSpace(parts[len(parts)-1])
				if len(id) >= 12 {
					return id, nil
				}
			}
		}
	}

	return "", errors.New("container ID not found in cgroup")
}

// getContainerIDFromMountinfo reads container ID from /proc/self/mountinfo
func (s *SystemUpgradeService) getContainerIDFromMountinfo() (string, error) {
	data, err := os.ReadFile("/proc/self/mountinfo")
	if err != nil {
		return "", err
	}

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

	return "", errors.New("container ID not found in mountinfo")
}

// getContainerIDFromHostname tries to get container ID from hostname
func (s *SystemUpgradeService) getContainerIDFromHostname() (string, error) {
	hostname, err := os.Hostname()
	if err != nil {
		return "", err
	}

	if len(hostname) == 12 || len(hostname) == 64 {
		return hostname, nil
	}

	return "", errors.New("hostname is not a valid container ID")
}

// findArcaneContainer finds the container using the ID
func (s *SystemUpgradeService) findArcaneContainer(ctx context.Context, containerId string) (containertypes.InspectResponse, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return containertypes.InspectResponse{}, err
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
		return containertypes.InspectResponse{}, err
	}

	for _, c := range containers {
		if strings.HasPrefix(c.ID, containerId) {
			return dockerClient.ContainerInspect(ctx, c.ID)
		}
	}

	// Try without filter - search all containers
	allContainers, err := dockerClient.ContainerList(ctx, containertypes.ListOptions{All: true})
	if err != nil {
		return containertypes.InspectResponse{}, err
	}

	for _, c := range allContainers {
		if strings.HasPrefix(c.ID, containerId) || c.ID == containerId {
			return dockerClient.ContainerInspect(ctx, c.ID)
		}
	}

	return containertypes.InspectResponse{}, ErrContainerNotFound
}

// determineImageName resolves the image reference to pull for self-upgrade.
// It preserves the currently deployed tag instead of defaulting to :latest.
// Priority order when resolving tags:
// 1. Explicit tag from container config (e.g., "arcane:v1.2.3")
// 2. Non-latest arcane tag from image RepoTags (e.g., "ghcr.io/ofkm/arcane:v1.2.3")
// 3. Any arcane tag from image RepoTags (including :latest)
// 4. Any tag from image RepoTags
// 5. Fallback to :latest if no tag found
// This ensures upgrades pull the same tag channel (e.g., v1.x.x) as currently deployed.
func (s *SystemUpgradeService) determineImageName(ctx context.Context, container containertypes.InspectResponse) string {
	// Start with image reference from container config
	imageName := ""
	if container.Config != nil {
		imageName = strings.TrimSpace(container.Config.Image)
	}

	// Strip digest (e.g., repo:tag@sha256:..., or repo@sha256:...)
	if idx := strings.Index(imageName, "@"); idx != -1 {
		imageName = imageName[:idx]
	}

	// Helper: does ref include an explicit tag?
	hasExplicitTag := func(ref string) bool {
		// tag separator is a ':' that occurs after the last '/'
		if ref == "" {
			return false
		}
		slash := strings.LastIndex(ref, "/")
		colon := strings.LastIndex(ref, ":")
		return colon > slash
	}

	// If no explicit tag or empty, try to infer from the actual image's RepoTags
	if !hasExplicitTag(imageName) {
		if s.dockerService != nil {
			if dcli, err := s.dockerService.CreateConnection(ctx); err == nil {
				func() {
					defer dcli.Close()
					// container.Image is usually an image ID (sha256:...)
					// Try to resolve repo tags for this ID
					if ii, ierr := dcli.ImageInspect(ctx, container.Image); ierr == nil {
						// Prefer a non-latest arcane tag if available; otherwise any arcane tag; otherwise any tag
						var anyTag string
						var arcaneAny string
						var arcaneNonLatest string
						for _, t := range ii.RepoTags {
							if t == "" || t == "<none>:<none>" {
								continue
							}
							// ensure we don't pass a digest in tag (RepoTags are repo:tag)
							tt := t
							if idx := strings.Index(tt, "@"); idx != -1 {
								tt = tt[:idx]
							}
							if anyTag == "" {
								anyTag = tt
							}
							if strings.Contains(tt, "arcane") {
								if arcaneAny == "" {
									arcaneAny = tt
								}
								if !strings.HasSuffix(tt, ":latest") && arcaneNonLatest == "" {
									arcaneNonLatest = tt
								}
							}
						}
						// choose best candidate
						if arcaneNonLatest != "" {
							imageName = arcaneNonLatest
						} else if arcaneAny != "" {
							imageName = arcaneAny
						} else if anyTag != "" {
							imageName = anyTag
						}
					}
				}()
			}
		}
	}

	// After inference, if still no tag, default to :latest
	if !hasExplicitTag(imageName) {
		if imageName == "" {
			imageName = "ofkm/arcane:latest"
		} else {
			imageName += ":latest"
		}
	}

	// Ensure it's an arcane image; otherwise fallback to default
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

// recreateContainerWithSwitchover creates and starts a new container, performing a coordinated
// switchover to avoid port conflicts. It stops the old container first, starts the new one,
// then asynchronously cleans up and renames the new container to the original name.
func (s *SystemUpgradeService) recreateContainerWithSwitchover(
	ctx context.Context,
	oldContainer containertypes.InspectResponse,
	newImage string,
	oldContainerID string,
	originalName string,
) (string, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return "", err
	}
	defer dockerClient.Close()

	// Create new container config based on old one (copy to avoid mutation)
	config := *oldContainer.Config
	config.Image = newImage

	hostConfig := oldContainer.HostConfig

	// Build network config from existing networks
	networkConfig := &network.NetworkingConfig{
		EndpointsConfig: make(map[string]*network.EndpointSettings),
	}

	// Copy network settings from old container
	for networkName, networkSettings := range oldContainer.NetworkSettings.Networks {
		networkConfig.EndpointsConfig[networkName] = &network.EndpointSettings{
			Aliases: networkSettings.Aliases,
		}
	}

	// Generate temporary name for new container
	tempName := fmt.Sprintf("%s-new", originalName)

	slog.Info("Stopping old container first to free ports",
		"oldID", oldContainerID,
	)

	// Stop old container FIRST to free ports, before creating new container
	timeout := 5
	if err := dockerClient.ContainerStop(ctx, oldContainerID, containertypes.StopOptions{Timeout: &timeout}); err != nil {
		return "", fmt.Errorf("stop old container: %w", err)
	}

	slog.Info("Creating new container with freed ports",
		"tempName", tempName,
		"image", newImage,
		"volumes", len(hostConfig.Binds),
		"networks", len(networkConfig.EndpointsConfig),
	)

	// Now create the new container with full config including ports
	resp, err := dockerClient.ContainerCreate(
		ctx,
		&config,
		hostConfig,
		networkConfig,
		nil,
		tempName,
	)

	// If name conflict, try with a unique suffix
	if err != nil && strings.Contains(err.Error(), "already in use") {
		tempName = fmt.Sprintf("%s-new-%d", originalName, time.Now().Unix())
		resp, err = dockerClient.ContainerCreate(
			ctx,
			&config,
			hostConfig,
			networkConfig,
			nil,
			tempName,
		)
	}

	if err != nil {
		// If create fails, try to restart old container
		_ = dockerClient.ContainerStart(ctx, oldContainerID, containertypes.StartOptions{})
		return "", fmt.Errorf("create container: %w", err)
	}

	slog.Info("New container created", "id", resp.ID, "tempName", tempName)

	// Start the new container
	if err := dockerClient.ContainerStart(ctx, resp.ID, containertypes.StartOptions{}); err != nil {
		// If start fails, try to restart old container and cleanup new one
		_ = dockerClient.ContainerRemove(ctx, resp.ID, containertypes.RemoveOptions{Force: true})
		_ = dockerClient.ContainerStart(ctx, oldContainerID, containertypes.StartOptions{})
		return "", fmt.Errorf("start new container: %w", err)
	}

	slog.Info("New container started successfully", "id", resp.ID)

	// Schedule async cleanup and rename - use WithoutCancel to ensure it completes
	// even if the HTTP request context is cancelled when the old container terminates
	cleanupCtx := context.WithoutCancel(ctx)
	go func(ctx context.Context, oldID string, newID string, oldName string, origName string) {
		// Small delay to allow HTTP response to complete
		time.Sleep(1 * time.Second)

		dcli, err := s.dockerService.CreateConnection(ctx)
		if err != nil {
			slog.Error("Failed to create Docker client for cleanup", "error", err)
			return
		}
		defer dcli.Close()

		// Remove old container to free the original name
		if err := dcli.ContainerRemove(ctx, oldID, containertypes.RemoveOptions{}); err != nil {
			slog.Warn("Failed to remove old container", "error", err, "oldID", oldID)
		} else {
			slog.Info("Removed old container", "oldID", oldID)
		}

		// Rename new container to original name
		if err := dcli.ContainerRename(ctx, newID, origName); err != nil {
			slog.Warn("Failed to rename new container to original name", "newID", newID, "origName", origName, "error", err)
		} else {
			slog.Info("Successfully renamed container to original name", "id", newID, "name", origName)
		}
	}(cleanupCtx, oldContainerID, resp.ID, tempName, originalName)

	return resp.ID, nil
}
