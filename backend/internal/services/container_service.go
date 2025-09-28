package services

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/url"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/pkg/stdcopy"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"gorm.io/gorm/clause"
)

type ContainerService struct {
	db            *database.DB
	dockerService *DockerClientService
	eventService  *EventService
}

func NewContainerService(db *database.DB, eventService *EventService, dockerService *DockerClientService) *ContainerService {
	return &ContainerService{db: db, eventService: eventService, dockerService: dockerService}
}

// upsertContainerInspect persists a single container inspect result into the DB (best-effort).
func (s *ContainerService) upsertContainerInspect(ctx context.Context, inspect *container.InspectResponse) error {
	if s.db == nil || inspect == nil {
		return nil
	}

	// build DB model similar to SyncDockerContainers
	name := ""
	if len(inspect.Name) > 0 {
		name = inspect.Name
		if len(name) > 0 && name[0] == '/' {
			name = name[1:]
		}
	}
	createdAt := time.Time{}
	if inspect.Created != "" {
		if t, err := time.Parse(time.RFC3339, inspect.Created); err == nil {
			createdAt = t
		}
	}

	var ports models.JSON
	if b, err := json.Marshal(inspect.NetworkSettings.Ports); err == nil {
		_ = json.Unmarshal(b, &ports)
	}

	var mounts models.JSON
	if b, err := json.Marshal(inspect.Mounts); err == nil {
		_ = json.Unmarshal(b, &mounts)
	}

	var labels models.JSON
	if b, err := json.Marshal(inspect.Config.Labels); err == nil {
		_ = json.Unmarshal(b, &labels)
	}

	cmd := models.StringSlice{}
	if inspect.Config != nil {
		if len(inspect.Config.Cmd) > 0 {
			cmd = models.StringSlice(inspect.Config.Cmd)
		} else if inspect.Config.Image != "" && len(inspect.Config.Cmd) == 0 {
			// fallback: keep empty
		}
	}

	dbContainer := models.Container{
		BaseModel: models.BaseModel{ID: inspect.ID},
		Name:      name,
		Image:     inspect.Config.Image,
		ImageID:   inspect.Image,
		Status:    inspect.State.Status,
		State:     inspect.State.Status,
		Ports:     ports,
		Mounts:    mounts,
		Networks:  models.StringSlice{}, // not populated here
		Labels:    labels,
		CreatedAt: createdAt,
		StartedAt: nil,
		Command:   cmd,
	}
	if inspect.State != nil && inspect.State.StartedAt != "" {
		if t, err := time.Parse(time.RFC3339, inspect.State.StartedAt); err == nil {
			dbContainer.StartedAt = &t
		}
	}

	// upsert by id
	return s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "image", "image_id", "command", "status", "state", "ports", "mounts", "labels", "docker_created_at", "started_at", "updated_at"}),
	}).Create(&dbContainer).Error
}

// StartContainer -> start and persist current state
func (s *ContainerService) StartContainer(ctx context.Context, containerID string, user models.User) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	metadata := models.JSON{
		"action":      "start",
		"containerId": containerID,
	}

	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerStart, containerID, "name", user.ID, user.Username, "0", metadata)

	if err := dockerClient.ContainerStart(ctx, containerID, container.StartOptions{}); err != nil {
		return err
	}

	// inspect and persist DB state (best-effort)
	if insp, ierr := dockerClient.ContainerInspect(ctx, containerID); ierr == nil {
		_ = s.upsertContainerInspect(ctx, &insp)
	}

	return nil
}

// StopContainer -> stop and persist current state
func (s *ContainerService) StopContainer(ctx context.Context, containerID string, user models.User) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	metadata := models.JSON{
		"action":      "stop",
		"containerId": containerID,
	}

	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerStop, containerID, "name", user.ID, user.Username, "0", metadata)

	timeout := 30
	if err := dockerClient.ContainerStop(ctx, containerID, container.StopOptions{Timeout: &timeout}); err != nil {
		return err
	}

	// inspect and persist DB state (best-effort)
	if insp, ierr := dockerClient.ContainerInspect(ctx, containerID); ierr == nil {
		_ = s.upsertContainerInspect(ctx, &insp)
	}

	return nil
}

// RestartContainer -> restart and persist current state
func (s *ContainerService) RestartContainer(ctx context.Context, containerID string, user models.User) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	metadata := models.JSON{
		"action":      "restart",
		"containerId": containerID,
	}

	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerRestart, containerID, "name", user.ID, user.Username, "0", metadata)

	if err := dockerClient.ContainerRestart(ctx, containerID, container.StopOptions{}); err != nil {
		return err
	}

	// inspect and persist DB state (best-effort)
	if insp, ierr := dockerClient.ContainerInspect(ctx, containerID); ierr == nil {
		_ = s.upsertContainerInspect(ctx, &insp)
	}

	return nil
}

// GetContainerLogs(ctx context.Context, containerID string, tail string) (string, error)
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

// GetContainerByID(ctx context.Context, id string) (*container.InspectResponse, error)
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

// DeleteContainer(ctx context.Context, containerID string, force bool, removeVolumes bool, user models.User) error
func (s *ContainerService) DeleteContainer(ctx context.Context, containerID string, force bool, removeVolumes bool, user models.User) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	if err := dockerClient.ContainerRemove(ctx, containerID, container.RemoveOptions{
		Force:         force,
		RemoveVolumes: removeVolumes,
		RemoveLinks:   false,
	}); err != nil {
		return fmt.Errorf("failed to delete container: %w", err)
	}

	metadata := models.JSON{
		"action":      "delete",
		"containerId": containerID,
	}
	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerDelete, containerID, "name", user.ID, user.Username, "0", metadata)

	// remove DB row (best-effort)
	if s.db != nil {
		_ = s.db.WithContext(ctx).Delete(&models.Container{}, "id = ?", containerID).Error
	}

	return nil
}

// CreateContainer -> create/start and persist DB row
func (s *ContainerService) CreateContainer(ctx context.Context, config *container.Config, hostConfig *container.HostConfig, networkingConfig *network.NetworkingConfig, containerName string, user models.User) (*container.InspectResponse, error) {
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

	metadata := models.JSON{
		"action":      "create",
		"containerId": resp.ID,
	}

	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerCreate, resp.ID, "name", user.ID, user.Username, "0", metadata)

	if err := dockerClient.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		_ = dockerClient.ContainerRemove(ctx, resp.ID, container.RemoveOptions{Force: true})
		return nil, fmt.Errorf("failed to start container: %w", err)
	}

	containerJSON, err := dockerClient.ContainerInspect(ctx, resp.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect created container: %w", err)
	}

	// persist upsert DB row (best-effort)
	_ = s.upsertContainerInspect(ctx, &containerJSON)

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

	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
		Tail:       tail,
		Since:      since,
		Timestamps: timestamps,
	}

	logs, err := dockerClient.ContainerLogs(ctx, containerID, options)
	if err != nil {
		return fmt.Errorf("failed to get container logs: %w", err)
	}
	defer logs.Close()

	if follow {
		return s.streamMultiplexedLogs(ctx, logs, logsChan)
	}

	return s.readAllLogs(logs, logsChan)
}

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
		if err != nil && !errors.Is(err, io.EOF) {
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
		if err != nil && !errors.Is(err, io.EOF) {
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

func (s *ContainerService) readAllLogs(logs io.ReadCloser, logsChan chan<- string) error {
	stdoutBuf := &strings.Builder{}
	stderrBuf := &strings.Builder{}

	_, err := stdcopy.StdCopy(stdoutBuf, stderrBuf, logs)
	if err != nil && !errors.Is(err, io.EOF) {
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

//nolint:gocognit
func (s *ContainerService) ListContainersPaginated(ctx context.Context, req utils.SortedPaginationRequest, includeAll bool, rawQuery url.Values) ([]dto.ContainerSummaryDto, utils.PaginationResponse, error) {
	parsedFilters := utils.ParseFiltersFromQuery(rawQuery)

	if v, ok := parsedFilters["created"]; ok {
		parsedFilters["createdAt"] = v
		delete(parsedFilters, "created")
	}
	if v, ok := parsedFilters["created_at"]; ok {
		parsedFilters["createdAt"] = v
		delete(parsedFilters, "created_at")
	}

	switch strings.ToLower(req.Sort.Column) {
	case "names":
		req.Sort.Column = "name"
	case "created":
		req.Sort.Column = "createdAt"
	}

	var containers []models.Container
	query := s.db.WithContext(ctx).Model(&models.Container{})

	if term := strings.TrimSpace(req.Search); term != "" {
		like := "%" + strings.ToLower(term) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(image) LIKE ? OR LOWER(state) LIKE ?", like, like, like)
	}

	pagination, err := utils.PaginateAndSort(req, query, &containers, parsedFilters)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to paginate containers: %w", err)
	}

	result := make([]dto.ContainerSummaryDto, 0, len(containers))
	for _, m := range containers {
		// map labels
		labels := map[string]string{}
		if m.Labels != nil {
			for k, v := range m.Labels {
				if sstr, ok := v.(string); ok {
					labels[k] = sstr
				}
			}
		}

		ports := []dto.PortDto{}
		if m.Ports != nil {
			if raw, err := json.Marshal(m.Ports); err == nil {
				var parsed []container.Port
				_ = json.Unmarshal(raw, &parsed)
				for _, p := range parsed {
					ports = append(ports, dto.PortDto{
						IP:          p.IP,
						PrivatePort: int(p.PrivatePort),
						PublicPort:  int(p.PublicPort),
						Type:        p.Type,
					})
				}
			}
		}

		names := []string{m.Name}
		created := int64(0)
		if !m.CreatedAt.IsZero() {
			created = m.CreatedAt.Unix()
		}

		cmd := ""
		if len(m.Command) > 0 {
			// Command in DB is stored as []string; present as single string in DTO
			cmd = strings.Join(m.Command, " ")
		}

		result = append(result, dto.ContainerSummaryDto{
			ID:              m.ID,
			Names:           names,
			Image:           m.Image,
			ImageID:         m.ImageID,
			Command:         cmd,
			Created:         created,
			Ports:           ports,
			Labels:          labels,
			State:           m.State,
			Status:          m.Status,
			HostConfig:      dto.HostConfigDto{NetworkMode: ""},
			NetworkSettings: dto.NetworkSettingsDto{Networks: map[string]dto.NetworkDto{}},
			Mounts:          []dto.MountDto{},
		})
	}

	return result, pagination, nil
}

func (s *ContainerService) SyncDockerContainers(ctx context.Context) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return fmt.Errorf("failed to list Docker containers: %w", err)
	}

	var lastErr error
	currentIDs := make([]string, 0, len(containers))
	for _, c := range containers {
		inspect, ierr := dockerClient.ContainerInspect(ctx, c.ID)
		var createdAt time.Time
		var startedAt *time.Time
		if ierr == nil {
			// container.Created is RFC3339 string in inspect
			if t, perr := time.Parse(time.RFC3339, inspect.Created); perr == nil {
				createdAt = t
			}
			if inspect.State != nil && inspect.State.StartedAt != "" {
				if t, perr := time.Parse(time.RFC3339, inspect.State.StartedAt); perr == nil {
					startedAt = &t
				}
			}
		} else {
			if c.Created > 0 {
				createdAt = time.Unix(c.Created, 0)
			}
			startedAt = nil
		}

		name := c.Names
		var firstName string
		if len(name) > 0 {
			firstName = name[0]
			if len(firstName) > 0 && firstName[0] == '/' {
				firstName = firstName[1:]
			}
		}

		currentIDs = append(currentIDs, c.ID)

		var ports models.JSON
		if b, merr := json.Marshal(c.Ports); merr == nil {
			_ = json.Unmarshal(b, &ports)
		}

		var mounts models.JSON
		if b, merr := json.Marshal(c.Mounts); merr == nil {
			_ = json.Unmarshal(b, &mounts)
		}

		var labels models.JSON
		if b, merr := json.Marshal(c.Labels); merr == nil {
			_ = json.Unmarshal(b, &labels)
		}

		dbContainer := models.Container{
			BaseModel: models.BaseModel{ID: c.ID},
			Name:      firstName,
			Image:     c.Image,
			ImageID:   c.ImageID,
			Status:    c.Status,
			State:     c.State,
			Ports:     ports,
			Mounts:    mounts,
			Networks:  models.StringSlice{},
			Labels:    labels,
			CreatedAt: createdAt,
			StartedAt: startedAt,
			Command:   models.StringSlice{c.Command},
		}

		if s.db != nil {
			if err := s.db.WithContext(ctx).Clauses(clause.OnConflict{
				Columns: []clause.Column{{Name: "id"}},
				DoUpdates: clause.AssignmentColumns([]string{
					"name", "image", "image_id", "command", "status", "state",
					"ports", "mounts", "labels", "docker_created_at", "started_at", "updated_at",
				}),
			}).Create(&dbContainer).Error; err != nil {
				lastErr = fmt.Errorf("failed to upsert container %s: %w", firstName, err)
			}
		}
	}

	// cleanup DB rows that no longer exist in Docker
	if s.db != nil {
		if err := s.cleanupStaleContainers(ctx, currentIDs); err != nil {
			lastErr = err
		}
	}

	return lastErr
}

func (s *ContainerService) cleanupStaleContainers(ctx context.Context, current []string) error {
	if s.db == nil {
		return nil
	}
	if len(current) == 0 {
		return s.db.WithContext(ctx).Where("1=1").Delete(&models.Container{}).Error
	}
	return s.db.WithContext(ctx).Where("id NOT IN ?", current).Delete(&models.Container{}).Error
}
