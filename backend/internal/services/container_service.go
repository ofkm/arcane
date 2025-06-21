package services

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/pkg/stdcopy"
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

func (s *ContainerService) PullContainerImage(ctx context.Context, containerID string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	container, err := s.GetContainerByID(ctx, containerID)
	if err != nil {
		return fmt.Errorf("failed to get container: %w", err)
	}

	imageName := container.Image
	if imageName == "" {
		return fmt.Errorf("container has no image to pull")
	}

	reader, err := dockerClient.ImagePull(ctx, imageName, image.PullOptions{})
	if err != nil {
		return fmt.Errorf("failed to pull image %s: %w", imageName, err)
	}
	defer reader.Close()

	_, err = io.Copy(io.Discard, reader)
	return err
}

func (s *ContainerService) ListContainers(ctx context.Context, includeAll bool) ([]container.Summary, error) {
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

func (s *ContainerService) GetContainerByID(ctx context.Context, id string) (*container.InspectResponse, error) {
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

func (s *ContainerService) CreateContainer(ctx context.Context, config *container.Config, hostConfig *container.HostConfig, networkingConfig *network.NetworkingConfig, containerName string) (*container.InspectResponse, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	_, err = dockerClient.ImageInspect(ctx, config.Image)
	if err != nil {
		reader, pullErr := dockerClient.ImagePull(ctx, config.Image, image.PullOptions{})
		if pullErr != nil {
			return nil, fmt.Errorf("failed to pull image %s: %w", config.Image, pullErr)
		}
		defer reader.Close()

		_, copyErr := io.Copy(io.Discard, reader)
		if copyErr != nil {
			return nil, fmt.Errorf("failed to complete image pull: %w", copyErr)
		}
	}

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

func (s *ContainerService) GetStats(ctx context.Context, containerID string, stream bool) (interface{}, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	stats, err := dockerClient.ContainerStats(ctx, containerID, stream)
	if err != nil {
		return nil, fmt.Errorf("failed to get container stats: %w", err)
	}
	defer stats.Body.Close()

	var statsData interface{}
	decoder := json.NewDecoder(stats.Body)
	if err := decoder.Decode(&statsData); err != nil {
		return nil, fmt.Errorf("failed to decode stats: %w", err)
	}

	return statsData, nil
}

func (s *ContainerService) StreamStats(ctx context.Context, containerID string, statsChan chan<- interface{}) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	stats, err := dockerClient.ContainerStats(ctx, containerID, true)
	if err != nil {
		return fmt.Errorf("failed to start stats stream: %w", err)
	}
	defer stats.Body.Close()

	decoder := json.NewDecoder(stats.Body)

	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			var statsData interface{}
			if err := decoder.Decode(&statsData); err != nil {
				if err == io.EOF {
					return nil
				}
				return fmt.Errorf("failed to decode stats: %w", err)
			}

			select {
			case statsChan <- statsData:
			case <-ctx.Done():
				return ctx.Err()
			}
		}
	}
}

func (s *ContainerService) StreamLogs(ctx context.Context, containerID string, logsChan chan<- string, follow bool, tail, since string, timestamps bool) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	// Configure log options
	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
		Tail:       tail,
		Since:      since,
		Timestamps: timestamps,
	}

	// Get log stream
	logs, err := dockerClient.ContainerLogs(ctx, containerID, options)
	if err != nil {
		return fmt.Errorf("failed to get container logs: %w", err)
	}
	defer logs.Close()

	// If following logs, we need to handle the multiplexed stream
	if follow {
		return s.streamMultiplexedLogs(ctx, logs, logsChan)
	}

	// For non-following logs, read all at once and send line by line
	return s.readAllLogs(logs, logsChan)
}

// streamMultiplexedLogs handles the multiplexed Docker log stream for following logs
func (s *ContainerService) streamMultiplexedLogs(ctx context.Context, logs io.ReadCloser, logsChan chan<- string) error {
	// Use stdcopy to demultiplex Docker's stream format
	// Docker multiplexes stdout and stderr in a special format
	stdoutReader, stdoutWriter := io.Pipe()
	stderrReader, stderrWriter := io.Pipe()

	// Start demultiplexing in a goroutine
	go func() {
		defer stdoutWriter.Close()
		defer stderrWriter.Close()
		_, err := stdcopy.StdCopy(stdoutWriter, stderrWriter, logs)
		if err != nil && err != io.EOF {
			// Log error but don't stop the stream
			fmt.Printf("Error demultiplexing logs: %v\n", err)
		}
	}()

	// Read from both stdout and stderr concurrently
	done := make(chan error, 2)

	// Read stdout
	go func() {
		done <- s.readLogsFromReader(ctx, stdoutReader, logsChan, "stdout")
	}()

	// Read stderr
	go func() {
		done <- s.readLogsFromReader(ctx, stderrReader, logsChan, "stderr")
	}()

	// Wait for context cancellation or error
	select {
	case <-ctx.Done():
		return ctx.Err()
	case err := <-done:
		if err != nil && err != io.EOF {
			return err
		}
		// Wait for the other goroutine or context cancellation
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-done:
			return nil
		}
	}
}

// readLogsFromReader reads logs line by line from a reader
func (s *ContainerService) readLogsFromReader(ctx context.Context, reader io.Reader, logsChan chan<- string, source string) error {
	scanner := bufio.NewScanner(reader)

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			line := scanner.Text()
			if line != "" {
				// Add source prefix for stderr logs
				if source == "stderr" {
					line = "[STDERR] " + line
				}

				select {
				case logsChan <- line:
				case <-ctx.Done():
					return ctx.Err()
				}
			}
		}
	}

	return scanner.Err()
}

// readAllLogs reads all logs at once for non-following requests
func (s *ContainerService) readAllLogs(logs io.ReadCloser, logsChan chan<- string) error {
	// For non-following logs, read all and demultiplex
	stdoutBuf := &strings.Builder{}
	stderrBuf := &strings.Builder{}

	_, err := stdcopy.StdCopy(stdoutBuf, stderrBuf, logs)
	if err != nil && err != io.EOF {
		return fmt.Errorf("failed to demultiplex logs: %w", err)
	}

	// Send stdout lines
	if stdoutBuf.Len() > 0 {
		lines := strings.Split(strings.TrimRight(stdoutBuf.String(), "\n"), "\n")
		for _, line := range lines {
			if line != "" {
				logsChan <- line
			}
		}
	}

	// Send stderr lines with prefix
	if stderrBuf.Len() > 0 {
		lines := strings.Split(strings.TrimRight(stderrBuf.String(), "\n"), "\n")
		for _, line := range lines {
			if line != "" {
				logsChan <- "[STDERR] " + line
			}
		}
	}

	return nil
}
