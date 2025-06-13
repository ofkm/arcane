package services

import (
	"context"
	"fmt"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/volume"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
)

type VolumeService struct {
	db            *database.DB
	dockerService *DockerClientService
}

func NewVolumeService(db *database.DB, dockerService *DockerClientService) *VolumeService {
	return &VolumeService{db: db, dockerService: dockerService}
}

func (s *VolumeService) ListVolumes(ctx context.Context) ([]volume.Volume, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	volumes, err := dockerClient.VolumeList(ctx, volume.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list Docker volumes: %w", err)
	}

	vols := make([]volume.Volume, len(volumes.Volumes))
	for i, v := range volumes.Volumes {
		if v != nil {
			vols[i] = *v
		}
	}
	return vols, nil
}

func (s *VolumeService) GetVolumeByName(ctx context.Context, name string) (*volume.Volume, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	vol, err := dockerClient.VolumeInspect(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("volume not found: %w", err)
	}

	return &vol, nil
}

func (s *VolumeService) CreateVolume(ctx context.Context, options volume.CreateOptions) (*volume.Volume, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	vol, err := dockerClient.VolumeCreate(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create volume: %w", err)
	}

	if s.db != nil {
		dbVolume := &models.Volume{
			BaseModel:  models.BaseModel{CreatedAt: time.Now()},
			Name:       vol.Name,
			Driver:     vol.Driver,
			Mountpoint: vol.Mountpoint,
			Scope:      "local",
		}
		s.db.WithContext(ctx).Create(dbVolume)
	}

	return &vol, nil
}

func (s *VolumeService) DeleteVolume(ctx context.Context, name string, force bool) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	if err := dockerClient.VolumeRemove(ctx, name, force); err != nil {
		return fmt.Errorf("failed to remove volume: %w", err)
	}

	if s.db != nil {
		s.db.WithContext(ctx).Delete(&models.Volume{}, "name = ?", name)
	}

	return nil
}

func (s *VolumeService) PruneVolumes(ctx context.Context) (*volume.PruneReport, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	filterArgs := filters.NewArgs()

	report, err := dockerClient.VolumesPrune(ctx, filterArgs)
	if err != nil {
		return nil, fmt.Errorf("failed to prune volumes: %w", err)
	}

	return &report, nil
}

func (s *VolumeService) GetVolumesByDriver(ctx context.Context, driver string) ([]volume.Volume, error) {
	volumes, err := s.ListVolumes(ctx)
	if err != nil {
		return nil, err
	}

	var filtered []volume.Volume
	for _, vol := range volumes {
		if vol.Driver == driver {
			filtered = append(filtered, vol)
		}
	}

	return filtered, nil
}

func (s *VolumeService) GetVolumeUsage(ctx context.Context, name string) (bool, []string, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return false, nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	if _, err := dockerClient.VolumeInspect(ctx, name); err != nil {
		return false, nil, fmt.Errorf("volume not found: %w", err)
	}

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return false, nil, fmt.Errorf("failed to list containers: %w", err)
	}

	inUse := false
	var usingContainers []string

	for _, container := range containers {
		containerInfo, err := dockerClient.ContainerInspect(ctx, container.ID)
		if err != nil {
			continue
		}

		for _, mount := range containerInfo.Mounts {
			if mount.Type == "volume" && mount.Name == name {
				inUse = true
				usingContainers = append(usingContainers, container.ID)
				break
			}
		}
	}

	return inUse, usingContainers, nil
}
