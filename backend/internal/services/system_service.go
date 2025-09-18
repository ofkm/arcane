package services

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/docker/docker/api/types/build"
	"github.com/docker/docker/api/types/filters"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
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
		if err := s.pruneContainers(ctx, result); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Container pruning failed: %v", err))
			result.Success = false
		}
	}

	danglingOnly, err := s.getDanglingModeFromSettings(ctx)
	if err != nil {
		danglingOnly = req.Dangling
	}
	slog.DebugContext(ctx, "Resolved image prune mode", slog.Bool("dangling_only", danglingOnly))

	if req.Images {
		if err := s.pruneImages(ctx, danglingOnly, result); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Image pruning failed: %v", err))
			result.Success = false
		}
	}

	if req.BuildCache {
		if buildCacheErr := s.pruneBuildCache(ctx, result, !danglingOnly); buildCacheErr != nil {
			slog.WarnContext(ctx, "Build cache pruning encountered an error", slog.String("error", buildCacheErr.Error()))
		}
	}

	if req.Volumes {
		if err := s.pruneVolumes(ctx, result); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Volume pruning failed: %v", err))
			result.Success = false
		}
	}

	if req.Networks {
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

	for _, imgReport := range report.ImagesDeleted {
		var prunedDockerID string
		if imgReport.Deleted != "" {
			prunedDockerID = imgReport.Deleted
			result.ImagesDeleted = append(result.ImagesDeleted, prunedDockerID)
		}

		if prunedDockerID != "" {
			slog.DebugContext(ctx, "Attempting to delete image from database", slog.String("docker_id", prunedDockerID))
			if dbErr := s.imageService.DeleteImageByDockerID(ctx, prunedDockerID); dbErr != nil {
				errMsg := fmt.Sprintf("Failed to delete image %s from database: %v", prunedDockerID, dbErr)
				result.Errors = append(result.Errors, errMsg)
				slog.ErrorContext(ctx, "Failed to delete image from database",
					slog.String("docker_id", prunedDockerID),
					slog.String("error", dbErr.Error()))
			}
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
	// Always prune only unused volumes here (safe default)
	allVolumes := false
	report, err := s.volumeService.PruneVolumesWithOptions(ctx, allVolumes)
	if err != nil {
		return err
	}

	result.VolumesDeleted = report.VolumesDeleted
	result.SpaceReclaimed += report.SpaceReclaimed
	return nil
}

func (s *SystemService) pruneNetworks(ctx context.Context, result *dto.PruneAllResult) error {
	report, err := s.networkService.PruneNetworks(ctx)
	if err != nil {
		return err
	}

	result.NetworksDeleted = report.NetworksDeleted
	return nil
}

func (s *SystemService) PruneSystem(ctx context.Context, all bool) (*dto.PruneAllResult, error) {
	slog.InfoContext(ctx, "Starting system-wide prune operation", slog.Bool("all", all))

	result := &dto.PruneAllResult{
		Success: true,
	}

	danglingOnly := true
	if all {
		pruneMode := s.settingsService.GetStringSetting(ctx, "dockerPruneMode", "dangling")
		danglingOnly = pruneMode == "dangling"
		slog.DebugContext(ctx, "Retrieved prune mode from settings",
			slog.String("prune_mode", pruneMode),
			slog.Bool("dangling_only", danglingOnly))
	}

	slog.DebugContext(ctx, "Starting container pruning")
	if err := s.pruneContainers(ctx, result); err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Container pruning failed: %v", err))
		result.Success = false
		slog.ErrorContext(ctx, "Container pruning failed", slog.String("error", err.Error()))
	}

	slog.DebugContext(ctx, "Starting image pruning", slog.Bool("dangling_only", danglingOnly))
	if err := s.pruneImages(ctx, danglingOnly, result); err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Image pruning failed: %v", err))
		result.Success = false
		slog.ErrorContext(ctx, "Image pruning failed", slog.String("error", err.Error()))
	}

	slog.DebugContext(ctx, "Starting build cache pruning", slog.Bool("prune_all_cache", !danglingOnly))
	if buildCacheErr := s.pruneBuildCache(ctx, result, !danglingOnly); buildCacheErr != nil {
		slog.WarnContext(ctx, "Build cache pruning encountered an error", slog.String("error", buildCacheErr.Error()))
	}

	slog.DebugContext(ctx, "Starting volume pruning")
	if err := s.pruneVolumes(ctx, result); err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Volume pruning failed: %v", err))
		result.Success = false
		slog.ErrorContext(ctx, "Volume pruning failed", slog.String("error", err.Error()))
	}

	slog.DebugContext(ctx, "Starting network pruning")
	if err := s.pruneNetworks(ctx, result); err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Network pruning failed: %v", err))
		result.Success = false
		slog.ErrorContext(ctx, "Network pruning failed", slog.String("error", err.Error()))
	}

	slog.InfoContext(ctx, "System-wide prune operation completed",
		slog.Bool("success", result.Success),
		slog.Int("containers_pruned", len(result.ContainersPruned)),
		slog.Int("images_deleted", len(result.ImagesDeleted)),
		slog.Int("volumes_deleted", len(result.VolumesDeleted)),
		slog.Int("networks_deleted", len(result.NetworksDeleted)),
		slog.Uint64("space_reclaimed", result.SpaceReclaimed),
		slog.Int("error_count", len(result.Errors)))

	return result, nil
}
