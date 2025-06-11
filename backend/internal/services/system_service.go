package services

import (
	"context"
	"fmt"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/build"
	"github.com/docker/docker/api/types/filters"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
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

type PruneAllResult struct {
	ContainersPruned []string `json:"containersPruned,omitempty"`
	ImagesDeleted    []string `json:"imagesDeleted,omitempty"`
	VolumesDeleted   []string `json:"volumesDeleted,omitempty"`
	NetworksDeleted  []string `json:"networksDeleted,omitempty"`
	SpaceReclaimed   int64    `json:"spaceReclaimed"`
	Success          bool     `json:"success"`
	Errors           []string `json:"errors,omitempty"`
}

type ContainerActionResult struct {
	Started []string `json:"started,omitempty"`
	Stopped []string `json:"stopped,omitempty"`
	Failed  []string `json:"failed,omitempty"`
	Success bool     `json:"success"`
	Errors  []string `json:"errors,omitempty"`
}

func (s *SystemService) PruneAll(ctx context.Context, req dto.PruneSystemDto) (*PruneAllResult, error) {
	result := &PruneAllResult{
		Success: true,
	}

	if req.Containers {
		if err := s.pruneContainers(ctx, result); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Container pruning failed: %v", err))
			result.Success = false
		}
	}

	if req.Images {
		danglingOnly, settingsErr := s.getDanglingModeFromSettings(ctx)
		if settingsErr != nil {
			danglingOnly = req.Dangling
			result.Errors = append(result.Errors, fmt.Sprintf("Warning: Could not get prune mode from settings, using request parameter: %v", settingsErr))
		}

		fmt.Printf("Image pruning - Settings dangling mode: %t, Request dangling: %t\n", danglingOnly, req.Dangling)

		if err := s.pruneImages(ctx, danglingOnly, result); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Image pruning failed: %v", err))
			result.Success = false
		}
		fmt.Println("Attempting to prune build cache as part of image pruning...")
		if buildCacheErr := s.pruneBuildCache(ctx, result, !danglingOnly); buildCacheErr != nil {
			fmt.Printf("Note: Build cache pruning encountered an error: %v\n", buildCacheErr)
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

	return result, nil
}

func (s *SystemService) getDanglingModeFromSettings(ctx context.Context) (bool, error) {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return true, fmt.Errorf("failed to get settings: %w", err)
	}

	if settings.PruneMode == nil {
		return true, nil
	}

	switch *settings.PruneMode {
	case "dangling":
		return true, nil
	case "all":
		return false, nil
	default:
		return true, nil
	}
}

func (s *SystemService) StartAllContainers(ctx context.Context) (*ContainerActionResult, error) {
	result := &ContainerActionResult{
		Success: true,
	}

	containers, err := s.containerService.ListContainers(ctx, true)
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to list containers: %v", err))
		return result, err
	}

	for _, container := range containers {
		if container.State != "running" {
			if err := s.containerService.StartContainer(ctx, container.ID); err != nil {
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

func (s *SystemService) StartAllStoppedContainers(ctx context.Context) (*ContainerActionResult, error) {
	result := &ContainerActionResult{
		Success: true,
	}

	containers, err := s.containerService.ListContainers(ctx, true)
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to list containers: %v", err))
		return result, err
	}

	for _, container := range containers {
		if container.State == "exited" {
			if err := s.containerService.StartContainer(ctx, container.ID); err != nil {
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

func (s *SystemService) StopAllContainers(ctx context.Context) (*ContainerActionResult, error) {
	result := &ContainerActionResult{
		Success: true,
	}

	containers, err := s.containerService.ListContainers(ctx, false)
	if err != nil {
		result.Success = false
		result.Errors = append(result.Errors, fmt.Sprintf("Failed to list containers: %v", err))
		return result, err
	}

	for _, cont := range containers {
		if err := s.containerService.StopContainer(ctx, cont.ID); err != nil {
			result.Failed = append(result.Failed, cont.ID)
			result.Errors = append(result.Errors, fmt.Sprintf("Failed to stop container %s: %v", cont.ID, err))
			result.Success = false
		} else {
			result.Stopped = append(result.Stopped, cont.ID)
		}
	}

	return result, nil
}

func (s *SystemService) pruneContainers(ctx context.Context, result *PruneAllResult) error {
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
	result.SpaceReclaimed += int64(report.SpaceReclaimed)
	return nil
}

func (s *SystemService) pruneImages(ctx context.Context, danglingOnly bool, result *PruneAllResult) error {
	fmt.Printf("pruneImages called with danglingOnly: %t\n", danglingOnly)

	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	var filterArgs filters.Args

	if danglingOnly {
		fmt.Println("Pruning only dangling images")
		filterArgs = filters.NewArgs(filters.Arg("dangling", "true"))
	} else {
		fmt.Println("Pruning ALL unused images (including non-dangling) by explicitly setting dangling=false")
		filterArgs = filters.NewArgs(filters.Arg("dangling", "false"))
	}

	fmt.Printf("Filter args: %+v\n", filterArgs)

	report, err := dockerClient.ImagesPrune(ctx, filterArgs)
	if err != nil {
		return fmt.Errorf("failed to prune images: %w", err)
	}

	fmt.Printf("Image prune report: %d images deleted, %d bytes reclaimed\n", len(report.ImagesDeleted), report.SpaceReclaimed)

	for _, imgReport := range report.ImagesDeleted {
		var prunedDockerID string
		if imgReport.Deleted != "" {
			prunedDockerID = imgReport.Deleted
			result.ImagesDeleted = append(result.ImagesDeleted, prunedDockerID)
		} else if imgReport.Untagged != "" {
			// For untagged, the ID might be in a different format or represent a manifest list.
			// Typically, 'Deleted' is the one to use for actual image layer removal.
			// If Untagged also implies removal from your DB, handle accordingly.
			// For now, we'll prioritize 'Deleted'. If 'Deleted' is empty,
			// we might not have a clean ID to remove from the DB.
			// Let's assume 'Deleted' is the primary ID for DB removal.
			// result.ImagesDeleted = append(result.ImagesDeleted, imgReport.Untagged)
		}

		if prunedDockerID != "" {
			fmt.Printf("Attempting to delete Docker image ID %s from database.\n", prunedDockerID)
			if dbErr := s.imageService.DeleteImageByDockerID(ctx, prunedDockerID); dbErr != nil {
				errMsg := fmt.Sprintf("Failed to delete image %s from database: %v", prunedDockerID, dbErr)
				result.Errors = append(result.Errors, errMsg)
				fmt.Println(errMsg)
			}
		}
	}
	result.SpaceReclaimed += int64(report.SpaceReclaimed)
	return nil
}

func (s *SystemService) pruneBuildCache(ctx context.Context, result *PruneAllResult, pruneAllCache bool) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Build cache pruning failed (connection): %v", err))
		fmt.Printf("Error connecting to Docker for build cache prune: %v\n", err)
		return fmt.Errorf("failed to connect to Docker for build cache prune: %w", err)
	}
	defer dockerClient.Close()

	options := build.CachePruneOptions{
		All: pruneAllCache,
	}

	fmt.Printf("Pruning build cache with options: All=%t\n", pruneAllCache)
	report, err := dockerClient.BuildCachePrune(ctx, options)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Build cache pruning failed: %v", err))
		fmt.Printf("Error pruning build cache: %v\n", err)
		return fmt.Errorf("failed to prune build cache: %w", err)
	}

	fmt.Printf("Build cache prune report: %d cache entries deleted, %d bytes reclaimed\n", len(report.CachesDeleted), report.SpaceReclaimed)
	result.SpaceReclaimed += int64(report.SpaceReclaimed)
	return nil
}

func (s *SystemService) pruneVolumes(ctx context.Context, result *PruneAllResult) error {
	report, err := s.volumeService.PruneVolumes(ctx)
	if err != nil {
		return err
	}

	result.VolumesDeleted = report.VolumesDeleted
	result.SpaceReclaimed += int64(report.SpaceReclaimed)
	return nil
}

func (s *SystemService) pruneNetworks(ctx context.Context, result *PruneAllResult) error {
	report, err := s.networkService.PruneNetworks(ctx)
	if err != nil {
		return err
	}

	result.NetworksDeleted = report.NetworksDeleted
	return nil
}

func (s *SystemService) PruneSystem(ctx context.Context, all bool) (*PruneAllResult, error) {
	result := &PruneAllResult{
		Success: true,
	}

	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return result, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	danglingOnly := true
	if all {
		settings, err := s.settingsService.GetSettings(ctx)
		fmt.Println("Prune mode:", settings.PruneMode)
		if err == nil && settings.PruneMode != nil {
			danglingOnly = *settings.PruneMode == "dangling"
		} else {
			danglingOnly = false
		}
	}

	containerFilters := filters.NewArgs()
	containerReport, err := dockerClient.ContainersPrune(ctx, containerFilters)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Container pruning failed: %v", err))
		result.Success = false
	} else {
		result.ContainersPruned = containerReport.ContainersDeleted
		result.SpaceReclaimed += int64(containerReport.SpaceReclaimed)
	}

	imageFilters := filters.NewArgs()
	if danglingOnly {
		imageFilters.Add("dangling", "true")
	}

	imageReport, err := dockerClient.ImagesPrune(ctx, imageFilters)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Image pruning failed: %v", err))
		result.Success = false
	} else {
		for _, img := range imageReport.ImagesDeleted {
			if img.Deleted != "" {
				result.ImagesDeleted = append(result.ImagesDeleted, img.Deleted)
			}
			if img.Untagged != "" {
				result.ImagesDeleted = append(result.ImagesDeleted, img.Untagged)
			}
		}
		result.SpaceReclaimed += int64(imageReport.SpaceReclaimed)
	}

	volumeFilters := filters.NewArgs()
	volumeReport, err := dockerClient.VolumesPrune(ctx, volumeFilters)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Volume pruning failed: %v", err))
		result.Success = false
	} else {
		result.VolumesDeleted = volumeReport.VolumesDeleted
		result.SpaceReclaimed += int64(volumeReport.SpaceReclaimed)
	}

	networkFilters := filters.NewArgs()
	networkReport, err := dockerClient.NetworksPrune(ctx, networkFilters)
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Network pruning failed: %v", err))
		result.Success = false
	} else {
		result.NetworksDeleted = networkReport.NetworksDeleted
	}

	buildCacheReport, err := dockerClient.BuildCachePrune(ctx, types.BuildCachePruneOptions{
		All: all,
	})
	if err != nil {
		result.Errors = append(result.Errors, fmt.Sprintf("Build cache pruning failed: %v", err))
		result.Success = false
	} else {
		result.SpaceReclaimed += int64(buildCacheReport.SpaceReclaimed)
	}

	return result, nil
}
