package services

import (
	"context"
	"fmt"
	"net/url"
	"sort"
	"strconv"
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
func (s *VolumeService) ListVolumesPaginated(ctx context.Context, req utils.SortedPaginationRequest, driver string, rawQuery url.Values) ([]dto.VolumeDto, utils.PaginationResponse, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	// Merge raw query into req.Filters and normalize keys
	if rawQuery != nil {
		if norm := utils.NormalizeQueryToFilters(rawQuery); norm != nil {
			if req.Filters == nil {
				req.Filters = norm
			} else {
				for k, v := range norm {
					req.Filters[k] = v
				}
			}
		}
	}
	req.Filters = utils.NormalizeFilterKeys(req.Filters)

	// Detect inUse filter and convert to Docker's dangling filter
	var wantInUse *bool
	if req.Filters != nil {
		for _, k := range []string{"inUse", "inuse", "in_use"} {
			if raw, ok := req.Filters[k]; ok {
				if b, ok := utils.ParseBoolAny(raw); ok {
					wantInUse = &b
					break
				}
			}
		}
	}

	allowed := []string{"driver", "label", "name", "dangling"}
	if driver != "" {
		if req.Filters == nil {
			req.Filters = map[string]interface{}{}
		}
		req.Filters["driver"] = driver
	}
	if wantInUse != nil {
		// inUse=true  -> dangling=false; inUse=false -> dangling=true
		req.Filters["dangling"] = strconv.FormatBool(!*wantInUse)
	}

	filterArgs := utils.BuildDockerFiltersFromMap(req.Filters, req.Search, allowed)
	volListBody, err := dockerClient.VolumeList(ctx, volume.ListOptions{Filters: filterArgs})
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to list Docker volumes: %w", err)
	}

	// Convert returned volumes
	volumes := make([]volume.Volume, 0, len(volListBody.Volumes))
	for _, v := range volListBody.Volumes {
		if v != nil {
			volumes = append(volumes, *v)
		}
	}

	// Build DTOs
	result := make([]dto.VolumeDto, 0, len(volumes))
	if wantInUse != nil {
		// Docker already filtered by dangling; set InUse to requested value
		for _, v := range volumes {
			result = append(result, dto.NewVolumeDto(v, *wantInUse))
		}
	} else {
		for _, v := range volumes {
			result = append(result, dto.NewVolumeDto(v, false))
		}
	}

	// Optional partial-search fallback
	if req.Search != "" {
		filtered := result[:0]
		needle := strings.ToLower(req.Search)
		for _, vol := range result {
			if strings.Contains(strings.ToLower(vol.Name), needle) ||
				strings.Contains(strings.ToLower(vol.Driver), needle) {
				filtered = append(filtered, vol)
			}
		}
		result = filtered
	}

	// Sort in-memory
	if req.Sort.Column != "" {
		sortVolumes(result, req.Sort.Column, req.Sort.Direction)
	}

	// Paginate using utils
	pageItems, pagination := utils.PaginateSlice(result, req.Pagination.Page, req.Pagination.Limit)
	if wantInUse == nil {
		for i := range pageItems {
			inUse, _, _ := s.containersUsingVolume(ctx, dockerClient, pageItems[i].Name)
			pageItems[i].InUse = inUse
		}
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
