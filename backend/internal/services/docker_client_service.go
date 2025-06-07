package services

import (
	"context"
	"errors"
	"fmt"

	"github.com/docker/docker/client"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type DockerClientService struct {
	db *database.DB
}

func NewDockerClientService(db *database.DB) *DockerClientService {
	return &DockerClientService{db: db}
}

func (s *DockerClientService) CreateConnection(ctx context.Context) (*client.Client, error) {
	dockerHost, err := s.getDockerHostFromSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get docker host from settings: %w", err)
	}

	var cli *client.Client

	if dockerHost != "" || dockerHost == "unix:///var/run/docker.sock" {
		cli, err = client.NewClientWithOpts(
			client.WithHost(dockerHost),
			client.WithAPIVersionNegotiation(),
		)
	} else {
		cli, err = client.NewClientWithOpts(
			client.FromEnv,
			client.WithAPIVersionNegotiation(),
		)
	}

	return cli, err
}

func (s *DockerClientService) getDockerHostFromSettings(ctx context.Context) (string, error) {
	var settings models.Settings

	err := s.db.WithContext(ctx).First(&settings).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", nil
		}
		return "", fmt.Errorf("failed to query settings: %w", err)
	}

	return settings.DockerHost, nil
}
