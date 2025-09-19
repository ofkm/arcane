package services

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type VolumeService struct {
	db            *database.DB
	dockerService *DockerClientService
	eventService  *EventService
}

func NewVolumeService(db *database.DB, dockerService *DockerClientService, eventService *EventService) *VolumeService {
	return &VolumeService{
		db:            db,
		dockerService: dockerService,
		eventService:  eventService,
	}
}

func (s *VolumeService) buildVolumeUsageMap(ctx context.Context, dockerClient *client.Client) (map[string]bool, error) {
	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	usage := make(map[string]bool)
	for _, c := range containers {
		info, err := dockerClient.ContainerInspect(ctx, c.ID)
		if err != nil {
			continue
		}
		for _, m := range info.Mounts {
			if m.Type == "volume" && m.Name != "" {
				usage[m.Name] = true
			}
		}
	}
	return usage, nil
}

func (s *VolumeService) containersUsingVolume(ctx context.Context, dockerClient *client.Client, name string) (bool, []string, error) {
	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return false, nil, fmt.Errorf("failed to list containers: %w", err)
	}

	inUse := false
	var using []string
	for _, c := range containers {
		info, err := dockerClient.ContainerInspect(ctx, c.ID)
		if err != nil {
			continue
		}
		for _, m := range info.Mounts {
			if m.Type == "volume" && m.Name == name {
				inUse = true
				using = append(using, c.ID)
				break
			}
		}
	}
	return inUse, using, nil
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

func (s *VolumeService) GetVolumeByName(ctx context.Context, name string) (*dto.VolumeDto, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	vol, err := dockerClient.VolumeInspect(ctx, name)
	if err != nil {
		return nil, fmt.Errorf("volume not found: %w", err)
	}

	inUse, _, _ := s.containersUsingVolume(ctx, dockerClient, vol.Name)

	v := dto.NewVolumeDto(vol, inUse)
	return &v, nil
}

func (s *VolumeService) CreateVolume(ctx context.Context, options volume.CreateOptions, user models.User) (*dto.VolumeDto, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	created, err := dockerClient.VolumeCreate(ctx, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create volume: %w", err)
	}

	vol, err := dockerClient.VolumeInspect(ctx, created.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to inspect created volume: %w", err)
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

	metadata := models.JSON{
		"action": "create",
		"driver": vol.Driver,
		"name":   vol.Name,
	}
	if logErr := s.eventService.LogVolumeEvent(ctx, models.EventTypeVolumeCreate, vol.Name, vol.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log volume creation action: %s\n", logErr)
	}

	dtoVol := dto.NewVolumeDto(vol, false)
	return &dtoVol, nil
}

func (s *VolumeService) DeleteVolume(ctx context.Context, name string, force bool, user models.User) error {
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

	metadata := models.JSON{
		"action": "delete",
		"name":   name,
		"force":  force,
	}
	if logErr := s.eventService.LogVolumeEvent(ctx, models.EventTypeVolumeDelete, name, name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log volume deletion action: %s\n", logErr)
	}

	return nil
}

func (s *VolumeService) PruneVolumes(ctx context.Context) (*dto.VolumePruneReportDto, error) {
	return s.PruneVolumesWithOptions(ctx, false)
}

func (s *VolumeService) PruneVolumesWithOptions(ctx context.Context, all bool) (*dto.VolumePruneReportDto, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	filterArgs := filters.NewArgs()
	if all {
		filterArgs.Add("all", "true")
	}

	report, err := dockerClient.VolumesPrune(ctx, filterArgs)
	if err != nil {
		return nil, fmt.Errorf("failed to prune volumes: %w", err)
	}

	metadata := models.JSON{
		"action":         "prune",
		"all":            all,
		"volumesDeleted": len(report.VolumesDeleted),
		"spaceReclaimed": report.SpaceReclaimed,
	}
	if logErr := s.eventService.LogVolumeEvent(ctx, models.EventTypeVolumeDelete, "", "bulk_prune", systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log volume prune action: %s\n", logErr)
	}

	return &dto.VolumePruneReportDto{
		VolumesDeleted: report.VolumesDeleted,
		SpaceReclaimed: report.SpaceReclaimed,
	}, nil
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

	inUse, usingContainers, err := s.containersUsingVolume(ctx, dockerClient, name)
	if err != nil {
		return false, nil, err
	}
	return inUse, usingContainers, nil
}

//nolint:gocognit
func (s *VolumeService) ListVolumesPaginated(ctx context.Context, req utils.SortedPaginationRequest, driver string) ([]dto.VolumeDto, utils.PaginationResponse, error) {
	volumes, err := s.ListVolumes(ctx)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to list Docker volumes: %w", err)
	}

	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	volumeUsageMap, err := s.buildVolumeUsageMap(ctx, dockerClient)
	if err != nil {
		return nil, utils.PaginationResponse{}, err
	}

	result := make([]dto.VolumeDto, 0, len(volumes))
	for _, v := range volumes {
		if driver != "" && v.Driver != driver {
			continue
		}
		result = append(result, dto.NewVolumeDto(v, volumeUsageMap[v.Name]))
	}

	if req.Search != "" {
		filtered := make([]dto.VolumeDto, 0, len(result))
		searchLower := strings.ToLower(req.Search)
		for _, vol := range result {
			if strings.Contains(strings.ToLower(vol.Name), searchLower) ||
				strings.Contains(strings.ToLower(vol.Driver), searchLower) {
				filtered = append(filtered, vol)
			}
		}
		result = filtered
	}

	totalItems := len(result)

	if req.Sort.Column != "" {
		sortVolumes(result, req.Sort.Column, req.Sort.Direction)
	}

	startIdx := (req.Pagination.Page - 1) * req.Pagination.Limit
	endIdx := startIdx + req.Pagination.Limit

	if startIdx > len(result) {
		startIdx = len(result)
	}
	if endIdx > len(result) {
		endIdx = len(result)
	}

	pageItems := []dto.VolumeDto{}
	if startIdx < endIdx {
		pageItems = result[startIdx:endIdx]
	}

	totalPages := (totalItems + req.Pagination.Limit - 1) / req.Pagination.Limit
	pagination := utils.PaginationResponse{
		TotalPages:   int64(totalPages),
		TotalItems:   int64(totalItems),
		CurrentPage:  req.Pagination.Page,
		ItemsPerPage: req.Pagination.Limit,
	}

	return pageItems, pagination, nil
}

func sortVolumes(items []dto.VolumeDto, field, direction string) {
	dir := utils.NormalizeSortDirection(direction)
	f := strings.ToLower(strings.TrimSpace(field))
	desc := dir == "desc"

	lessStr := func(a, b string) bool {
		if desc {
			return a > b
		}
		return a < b
	}
	lessBool := func(a, b bool) bool {
		if desc {
			return a && !b
		}
		return !a && b
	}
	parseTime := func(s string) (time.Time, bool) {
		if s == "" {
			return time.Time{}, false
		}
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			return t, true
		}
		return time.Time{}, false
	}
	lessTime := func(aS, bS string) bool {
		aT, aOk := parseTime(aS)
		bT, bOk := parseTime(bS)
		if aOk && bOk {
			if desc {
				return aT.After(bT)
			}
			return aT.Before(bT)
		}

		return lessStr(aS, bS)
	}

	sort.Slice(items, func(i, j int) bool {
		a, b := items[i], items[j]
		switch f {
		case "name":
			return lessStr(a.Name, b.Name)
		case "driver":
			return lessStr(a.Driver, b.Driver)
		case "mountpoint":
			return lessStr(a.Mountpoint, b.Mountpoint)
		case "scope":
			return lessStr(a.Scope, b.Scope)
		case "created", "createdat":
			return lessTime(a.CreatedAt, b.CreatedAt)
		case "inuse":
			return lessBool(a.InUse, b.InUse)
		default:
			// no-op keeps original order
			return false
		}
	})
}
