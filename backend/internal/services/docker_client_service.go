package services

import (
	"context"
	"fmt"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/client"
	"github.com/ofkm/arcane-backend/internal/database"
)

type DockerClientService struct {
	db *database.DB
}

func NewDockerClientService(db *database.DB) *DockerClientService {
	return &DockerClientService{db: db}
}

func (s *DockerClientService) CreateConnection(ctx context.Context) (*client.Client, error) {
	cli, err := client.NewClientWithOpts(
		client.WithHost("unix:///var/run/docker.sock"),
		client.WithAPIVersionNegotiation(),
	)

	if err != nil {
		return nil, fmt.Errorf("failed to create Docker client: %w", err)
	}

	return cli, nil
}

func (s *DockerClientService) GetAllContainers(ctx context.Context) ([]container.Summary, error) {
	dockerClient, err := s.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list Docker containers: %w", err)
	}

	return containers, nil
}

func (s *DockerClientService) GetRunningContainers(ctx context.Context) ([]container.Summary, error) {
	dockerClient, err := s.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	f := filters.NewArgs()
	f.Add("status", "running")

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{
		All:     true,
		Filters: f,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list running Docker containers: %w", err)
	}
	return containers, nil
}
