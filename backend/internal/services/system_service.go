package services

import (
	"context"
	"fmt"
	"log/slog"
	"regexp"
	"strings"

	"github.com/docker/docker/api/types/build"
	"github.com/docker/docker/api/types/filters"
	"github.com/goccy/go-yaml"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils/converter"
)

type SystemService struct {
	db               *database.DB
	dockerService    *DockerClientService
	containerService *ContainerService
	imageService     *ImageService
	volumeService    *VolumeService
	networkService   *NetworkService
	settingsService  *SettingsService
}

func NewSystemService(
	db *database.DB,
	dockerService *DockerClientService,
	containerService *ContainerService,
	imageService *ImageService,
	volumeService *VolumeService,
	networkService *NetworkService,
	settingsService *SettingsService,
) *SystemService {
	return &SystemService{
		db:               db,
		dockerService:    dockerService,
		containerService: containerService,
		imageService:     imageService,
		volumeService:    volumeService,
		networkService:   networkService,
		settingsService:  settingsService,
	}
}

var systemUser = models.User{
	Username: "System",
}

func (s *SystemService) PruneAll(ctx context.Context, req dto.PruneSystemDto) (*dto.PruneAllResult, error) {
	slog.InfoContext(ctx, "Starting selective prune operation",
		slog.Bool("containers", req.Containers),
		slog.Bool("images", req.Images),
		slog.Bool("volumes", req.Volumes),
		slog.Bool("networks", req.Networks),
		slog.Bool("build_cache", req.BuildCache),
		slog.Bool("dangling", req.Dangling))

	result := &dto.PruneAllResult{Success: true}

	if req.Containers {
		slog.InfoContext(ctx, "Pruning stopped containers...")
		if err := s.pruneContainers(ctx, result); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Container pruning failed: %v", err))
			result.Success = false
		}
	}

	danglingOnly := req.Dangling
	if settingsDangling, _ := s.getDanglingModeFromSettings(ctx); settingsDangling != danglingOnly {
		slog.DebugContext(ctx, "Prune request overriding stored image prune mode",
			slog.Bool("settings_dangling_only", settingsDangling),
			slog.Bool("request_dangling_only", danglingOnly))
	}
	slog.DebugContext(ctx, "Resolved image prune mode", slog.Bool("dangling_only", danglingOnly))

	if req.Images {
		slog.InfoContext(ctx, "Pruning images...", slog.Bool("dangling_only", danglingOnly))
		if err := s.pruneImages(ctx, danglingOnly, result); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Image pruning failed: %v", err))
			result.Success = false
		}
	}

	if req.BuildCache {
		slog.InfoContext(ctx, "Pruning build cache...")
		if buildCacheErr := s.pruneBuildCache(ctx, result, !danglingOnly); buildCacheErr != nil {
			slog.WarnContext(ctx, "Build cache pruning encountered an error", slog.String("error", buildCacheErr.Error()))
		}
	}

	if req.Volumes {
		slog.InfoContext(ctx, "Pruning unused volumes (not referenced by any container)...")
		if err := s.pruneVolumes(ctx, result); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Volume pruning failed: %v", err))
			result.Success = false
		}
	}

	if req.Networks {
		slog.InfoContext(ctx, "Pruning unused networks (not connected to any container)...")
		if err := s.pruneNetworks(ctx, result); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Network pruning failed: %v", err))
			result.Success = false
		}
	}

	slog.InfoContext(ctx, "Selective prune operation completed",
		slog.Bool("success", result.Success),
		slog.Int("containers_pruned", len(result.ContainersPruned)),
		slog.Int("images_deleted", len(result.ImagesDeleted)),
		slog.Int("volumes_deleted", len(result.VolumesDeleted)),
		slog.Int("networks_deleted", len(result.NetworksDeleted)),
		slog.Uint64("space_reclaimed", result.SpaceReclaimed),
		slog.Int("error_count", len(result.Errors)))

	return result, nil
}

func (s *SystemService) getDanglingModeFromSettings(ctx context.Context) (bool, error) {
	pruneMode := s.settingsService.GetStringSetting(ctx, "dockerPruneMode", "dangling")

	switch pruneMode {
	case "dangling":
		return true, nil
	case "all":
		return false, nil
	default:
		return true, nil
	}
}

func (s *SystemService) StartAllContainers(ctx context.Context) (*dto.ContainerActionResult, error) {
	result := &dto.ContainerActionResult{
		Success: true,
	}

	containers, _, _, _, err := s.dockerService.GetAllContainers(ctx)
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to list containers: %v", err))
		return result, err
	}

	for _, container := range containers {
		if container.State != "running" {
			if err := s.containerService.StartContainer(ctx, container.ID, systemUser); err != nil {
				result.Failed = append(result.Failed, container.ID)
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to start container %s: %v", container.ID, err))
				result.Success = false
			} else {
				result.Started = append(result.Started, container.ID)
			}
		}
	}

	return result, nil
}

func (s *SystemService) StartAllStoppedContainers(ctx context.Context) (*dto.ContainerActionResult, error) {
	result := &dto.ContainerActionResult{
		Success: true,
	}

	containers, _, _, _, err := s.dockerService.GetAllContainers(ctx)
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to list containers: %v", err))
		return result, err
	}

	for _, container := range containers {
		if container.State == "exited" {
			if err := s.containerService.StartContainer(ctx, container.ID, systemUser); err != nil {
				result.Failed = append(result.Failed, container.ID)
				result.Errors = append(result.Errors, fmt.Sprintf("Failed to start container %s: %v", container.ID, err))
				result.Success = false
			} else {
				result.Started = append(result.Started, container.ID)
			}
		}
	}

	return result, nil
}

func (s *SystemService) StopAllContainers(ctx context.Context) (*dto.ContainerActionResult, error) {
	result := &dto.ContainerActionResult{
		Success: true,
	}

	containers, _, _, _, err := s.dockerService.GetAllContainers(ctx)
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to list containers: %v", err))
		return result, err
	}

	for _, cont := range containers {
		// Skip Arcane server container
		if cont.Labels != nil && cont.Labels["com.ofkm.arcane.server"] == "true" {
			continue
		}
		if err := s.containerService.StopContainer(ctx, cont.ID, systemUser); err != nil {
			result.Failed = append(result.Failed, cont.ID)
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to stop container %s: %v", cont.ID, err))
			result.Success = false
		} else {
			result.Stopped = append(result.Stopped, cont.ID)
		}
	}

	return result, nil
}

func (s *SystemService) pruneContainers(ctx context.Context, result *dto.PruneAllResult) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	filterArgs := filters.NewArgs()

	report, err := dockerClient.ContainersPrune(ctx, filterArgs)
	if err != nil {
		return fmt.Errorf("failed to prune containers: %w", err)
	}

	result.ContainersPruned = report.ContainersDeleted
	result.SpaceReclaimed += report.SpaceReclaimed
	return nil
}

func (s *SystemService) pruneImages(ctx context.Context, danglingOnly bool, result *dto.PruneAllResult) error {
	slog.DebugContext(ctx, "Starting image pruning", slog.Bool("dangling_only", danglingOnly))

	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	var filterArgs filters.Args

	if danglingOnly {
		slog.DebugContext(ctx, "Configured to prune only dangling images")
		filterArgs = filters.NewArgs(filters.Arg("dangling", "true"))
	} else {
		slog.DebugContext(ctx, "Configured to prune all unused images (including non-dangling)")
		filterArgs = filters.NewArgs(filters.Arg("dangling", "false"))
	}

	report, err := dockerClient.ImagesPrune(ctx, filterArgs)
	if err != nil {
		return fmt.Errorf("failed to prune images: %w", err)
	}

	slog.InfoContext(ctx, "Image pruning completed",
		slog.Int("images_deleted", len(report.ImagesDeleted)),
		slog.Uint64("bytes_reclaimed", report.SpaceReclaimed))

	// Clean up update records for pruned images
	for _, imgReport := range report.ImagesDeleted {
		var prunedDockerID string
		if imgReport.Deleted != "" {
			prunedDockerID = imgReport.Deleted
		} else if imgReport.Untagged != "" {
			prunedDockerID = imgReport.Untagged
		}

		if prunedDockerID != "" && s.db != nil {
			// Only delete the update record
			if err := s.db.WithContext(ctx).Delete(&models.ImageUpdateRecord{}, "id = ?", prunedDockerID).Error; err != nil {
				slog.WarnContext(ctx, "Failed to delete image update record",
					slog.String("imageId", prunedDockerID),
					slog.String("error", err.Error()))
			}
		}
	}

	result.ImagesDeleted = make([]string, 0, len(report.ImagesDeleted))
	for _, img := range report.ImagesDeleted {
		if img.Deleted != "" {
			result.ImagesDeleted = append(result.ImagesDeleted, img.Deleted)
		} else if img.Untagged != "" {
			result.ImagesDeleted = append(result.ImagesDeleted, img.Untagged)
		}
	}
	result.SpaceReclaimed += report.SpaceReclaimed
	return nil
}

func (s *SystemService) pruneBuildCache(ctx context.Context, result *dto.PruneAllResult, pruneAllCache bool) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Errorf("build cache pruning failed (connection): %w", err).Error())
		slog.ErrorContext(ctx, "Error connecting to Docker for build cache prune", slog.String("error", err.Error()))
		return fmt.Errorf("failed to connect to Docker for build cache prune: %w", err)
	}
	defer dockerClient.Close()

	options := build.CachePruneOptions{
		All: pruneAllCache,
	}

	slog.DebugContext(ctx, "starting build cache pruning", slog.Bool("prune_all", pruneAllCache))
	report, err := dockerClient.BuildCachePrune(ctx, options)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Errorf("build cache pruning failed: %w", err).Error())
		slog.ErrorContext(ctx, "Error pruning build cache", slog.String("error", err.Error()))
		return fmt.Errorf("failed to prune build cache: %w", err)
	}

	slog.InfoContext(ctx, "build cache pruning completed",
		slog.Int("cache_entries_deleted", len(report.CachesDeleted)),
		slog.Uint64("bytes_reclaimed", report.SpaceReclaimed),
	)

	result.SpaceReclaimed += report.SpaceReclaimed
	return nil
}

func (s *SystemService) pruneVolumes(ctx context.Context, result *dto.PruneAllResult) error {
	// Prune ALL unused volumes (both named and anonymous)
	// Note: Docker API only prunes volumes that are NOT in use by any containers (running or stopped)
	// With all=true, it will remove both named and anonymous unused volumes
	// With all=false, it only removes anonymous (unnamed) unused volumes
	allVolumes := true
	report, err := s.volumeService.PruneVolumesWithOptions(ctx, allVolumes)
	if err != nil {
		return err
	}

	slog.InfoContext(ctx, "Volume prune completed",
		slog.Int("volumes_deleted", len(report.VolumesDeleted)),
		slog.Uint64("space_reclaimed", report.SpaceReclaimed))

	result.VolumesDeleted = report.VolumesDeleted
	result.SpaceReclaimed += report.SpaceReclaimed
	return nil
}

func (s *SystemService) pruneNetworks(ctx context.Context, result *dto.PruneAllResult) error {
	// Note: Docker API only prunes networks that are NOT in use by any containers
	report, err := s.networkService.PruneNetworks(ctx)
	if err != nil {
		return err
	}

	slog.InfoContext(ctx, "Network prune completed",
		slog.Int("networks_deleted", len(report.NetworksDeleted)))

	result.NetworksDeleted = report.NetworksDeleted
	return nil
}

func (s *SystemService) ParseDockerRunCommand(command string) (*models.DockerRunCommand, error) {
	if command == "" {
		return nil, fmt.Errorf("docker run command must be a non-empty string")
	}

	cmd := strings.TrimSpace(command)
	cmd = regexp.MustCompile(`^docker\s+run\s+`).ReplaceAllString(cmd, "")

	if cmd == "" {
		return nil, fmt.Errorf("no arguments found after 'docker run'")
	}

	result := &models.DockerRunCommand{}
	tokens, err := converter.ParseCommandTokens(cmd)
	if err != nil {
		return nil, fmt.Errorf("failed to parse command tokens: %w", err)
	}

	if len(tokens) == 0 {
		return nil, fmt.Errorf("no valid tokens found in docker run command")
	}

	if err := converter.ParseTokens(tokens, result); err != nil {
		return nil, err
	}

	if result.Image == "" {
		return nil, fmt.Errorf("no Docker image specified in command")
	}

	return result, nil
}

func (s *SystemService) ConvertToDockerCompose(parsed *models.DockerRunCommand) (string, string, string, error) {
	if parsed.Image == "" {
		return "", "", "", fmt.Errorf("cannot convert to Docker Compose: no image specified")
	}

	serviceName := parsed.Name
	if serviceName == "" {
		serviceName = "app"
	}

	service := models.DockerComposeService{
		Image: parsed.Image,
	}

	if parsed.Name != "" {
		service.ContainerName = parsed.Name
	}

	if len(parsed.Ports) > 0 {
		service.Ports = parsed.Ports
	}

	if len(parsed.Volumes) > 0 {
		service.Volumes = parsed.Volumes
	}

	if len(parsed.Environment) > 0 {
		service.Environment = parsed.Environment
	}

	if len(parsed.Networks) > 0 {
		service.Networks = parsed.Networks
	}

	if parsed.Restart != "" {
		service.Restart = parsed.Restart
	}

	if parsed.Workdir != "" {
		service.WorkingDir = parsed.Workdir
	}

	if parsed.User != "" {
		service.User = parsed.User
	}

	if parsed.Entrypoint != "" {
		service.Entrypoint = parsed.Entrypoint
	}

	if parsed.Command != "" {
		service.Command = parsed.Command
	}

	if parsed.Interactive && parsed.TTY {
		service.StdinOpen = true
		service.TTY = true
	}

	if parsed.Privileged {
		service.Privileged = true
	}

	if len(parsed.Labels) > 0 {
		service.Labels = parsed.Labels
	}

	if parsed.HealthCheck != "" {
		service.Healthcheck = &models.DockerComposeHealthcheck{
			Test: parsed.HealthCheck,
		}
	}

	if parsed.MemoryLimit != "" || parsed.CPULimit != "" {
		service.Deploy = &models.DockerComposeDeploy{
			Resources: &models.DockerComposeResources{
				Limits: &models.DockerComposeResourceLimits{},
			},
		}
		if parsed.MemoryLimit != "" {
			service.Deploy.Resources.Limits.Memory = parsed.MemoryLimit
		}
		if parsed.CPULimit != "" {
			service.Deploy.Resources.Limits.CPUs = parsed.CPULimit
		}
	}

	compose := models.DockerComposeConfig{
		Services: map[string]models.DockerComposeService{
			serviceName: service,
		},
	}

	// Convert to YAML
	yamlData, err := yaml.Marshal(&compose)
	if err != nil {
		return "", "", "", fmt.Errorf("failed to convert to YAML: %w", err)
	}

	// Generate environment variables file content
	envVars := strings.Join(parsed.Environment, "\n")

	return string(yamlData), envVars, serviceName, nil
}

func (s *SystemService) GetDiskUsagePath(ctx context.Context) string {
	path := s.settingsService.GetStringSetting(ctx, "diskUsagePath", "/")
	if path == "" {
		path = "/"
	}
	return path
}
