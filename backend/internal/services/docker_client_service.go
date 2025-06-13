package services

import (
	"context"
	"fmt"

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
