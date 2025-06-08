package services

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/network"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
)

type ContainerService struct {
	db            *database.DB
	dockerService *DockerClientService
}

func NewContainerService(db *database.DB, dockerService *DockerClientService) *ContainerService {
	return &ContainerService{db: db, dockerService: dockerService}
}

func (s *ContainerService) ListContainers(ctx context.Context, includeAll bool) ([]types.Container, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: includeAll})
	if err != nil {
		return nil, fmt.Errorf("failed to list Docker containers: %w", err)
	}

	return containers, nil
}

func (s *ContainerService) StartContainer(ctx context.Context, containerID string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	return dockerClient.ContainerStart(ctx, containerID, container.StartOptions{})
}

func (s *ContainerService) StopContainer(ctx context.Context, containerID string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	timeout := 30
	return dockerClient.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout})
}

func (s *ContainerService) RestartContainer(ctx context.Context, containerID string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	return dockerClient.ContainerRestart(ctx, containerID, container.StopOptions{})
}

func (s *ContainerService) GetContainerLogs(ctx context.Context, containerID string, tail string) (string, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Tail:       tail,
	}

	logs, err := dockerClient.ContainerLogs(ctx, containerID, options)
	if err != nil {
		return "", fmt.Errorf("failed to get container logs: %w", err)
	}
	defer logs.Close()

	logBytes, err := io.ReadAll(logs)
	if err != nil {
		return "", fmt.Errorf("failed to read container logs: %w", err)
	}

	return string(logBytes), nil
}

func (s *ContainerService) GetContainerByID(ctx context.Context, id string) (*types.ContainerJSON, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	container, err := dockerClient.ContainerInspect(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("container not found: %w", err)
	}

	return &container, nil
}

func (s *ContainerService) UpdateContainer(ctx context.Context, container *models.Container) (*models.Container, error) {
	now := time.Now()
	container.UpdatedAt = &now

	if err := s.db.WithContext(ctx).Save(container).Error; err != nil {
		return nil, fmt.Errorf("failed to update container: %w", err)
	}
	return container, nil
}

func (s *ContainerService) GetContainersByStack(ctx context.Context, stackID string) ([]*models.Container, error) {
	var containers []*models.Container
	if err := s.db.WithContext(ctx).Where("stack_id = ?", stackID).Find(&containers).Error; err != nil {
		return nil, fmt.Errorf("failed to get containers by stack: %w", err)
	}
	return containers, nil
}

func (s *ContainerService) UpdateContainerStatus(ctx context.Context, id, status, state string) error {
	updates := map[string]interface{}{
		"status":     status,
		"state":      state,
		"updated_at": time.Now(),
	}

	if err := s.db.WithContext(ctx).Model(&models.Container{}).Where("container_id = ? OR id = ?", id, id).Updates(updates).Error; err != nil {
		return fmt.Errorf("failed to update container status: %w", err)
	}
	return nil
}

func (s *ContainerService) DeleteContainer(ctx context.Context, containerID string, force bool, removeVolumes bool) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	err = dockerClient.ContainerRemove(ctx, containerID, container.RemoveOptions{
		Force:         force,
		RemoveVolumes: removeVolumes,
		RemoveLinks:   false,
	})
	if err != nil {
		return fmt.Errorf("failed to delete container: %w", err)
	}

	return nil
}

func (s *ContainerService) CreateContainer(ctx context.Context, config *container.Config, hostConfig *container.HostConfig, networkingConfig *network.NetworkingConfig, containerName string) (*types.ContainerJSON, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	resp, err := dockerClient.ContainerCreate(ctx, config, hostConfig, networkingConfig, nil, containerName)
	if err != nil {
		return nil, fmt.Errorf("failed to create container: %w", err)
	}

	if err := dockerClient.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		dockerClient.ContainerRemove(ctx, resp.ID, container.RemoveOptions{Force: true})
		return nil, fmt.Errorf("failed to start container: %w", err)
	}

	containerJSON, err := dockerClient.ContainerInspect(ctx, resp.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect created container: %w", err)
	}

	return &containerJSON, nil
}
