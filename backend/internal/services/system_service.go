package services

import (
	"context"
	"fmt"

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
}

func NewSystemService(
	db *database.DB,
	dockerService *DockerClientService,
	containerService *ContainerService,
	imageService *ImageService,
	volumeService *VolumeService,
	networkService *NetworkService,
) *SystemService {
	return &SystemService{
		db:               db,
		dockerService:    dockerService,
		containerService: containerService,
		imageService:     imageService,
		volumeService:    volumeService,
		networkService:   networkService,
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
		if err := s.pruneImages(ctx, req.Dangling, result); err != nil {
			result.Errors = append(result.Errors, fmt.Sprintf("Image pruning failed: %v", err))
			result.Success = false
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
	// filterArgs.Add("until", "24h") // Remove containers stopped more than 24 hours ago

	report, err := dockerClient.ContainersPrune(ctx, filterArgs)
	if err != nil {
		return fmt.Errorf("failed to prune containers: %w", err)
	}

	result.ContainersPruned = report.ContainersDeleted
	result.SpaceReclaimed += int64(report.SpaceReclaimed)
	return nil
}

func (s *SystemService) pruneImages(ctx context.Context, dangling bool, result *PruneAllResult) error {
	report, err := s.imageService.PruneImages(ctx, dangling)
	if err != nil {
		return err
	}

	for _, img := range report.ImagesDeleted {
		if img.Deleted != "" {
			result.ImagesDeleted = append(result.ImagesDeleted, img.Deleted)
		}
		if img.Untagged != "" {
			result.ImagesDeleted = append(result.ImagesDeleted, img.Untagged)
		}
	}
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
