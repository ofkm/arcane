package services

import (
	"context"
	"fmt"
	"net/url"
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
	"gorm.io/gorm/clause"
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

//nolint:gocognit
func (s *VolumeService) SyncDockerVolumes(ctx context.Context) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	list, err := dockerClient.VolumeList(ctx, volume.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to list Docker volumes: %w", err)
	}

	usageMap, _ := s.buildVolumeUsageMap(ctx, dockerClient)

	current := make([]string, 0, len(list.Volumes))
	var lastErr error
	for _, v := range list.Volumes {
		if v == nil {
			continue
		}
		current = append(current, v.Name)

		inUse := usageMap[v.Name]

		labelsJSON := models.JSON{}
		if v.Labels != nil {
			for k, val := range v.Labels {
				labelsJSON[k] = val
			}
		}

		optionsJSON := models.JSON{}
		if v.Options != nil {
			for k, val := range v.Options {
				optionsJSON[k] = val
			}
		}

		statusJSON := models.JSON{}
		if v.Status != nil {
			for k, val := range v.Status {
				statusJSON[k] = val
			}
		}

		dbVol := models.Volume{
			Name:          v.Name,
			Driver:        v.Driver,
			Mountpoint:    v.Mountpoint,
			Labels:        labelsJSON,
			Scope:         v.Scope,
			Options:       optionsJSON,
			Status:        statusJSON,
			ClusterVolume: nil,
			UsageData:     nil,
			InUse:         inUse,
			CreatedAt:     v.CreatedAt,
		}

		if s.db != nil {
			if err := s.db.WithContext(ctx).Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "name"}},
				DoUpdates: clause.AssignmentColumns([]string{"driver", "mountpoint", "labels", "scope", "options", "status", "cluster_volume", "usage_data", "in_use", "docker_created_at", "updated_at"}),
			}).Create(&dbVol).Error; err != nil {
				lastErr = err
			}
		}
	}

	if s.db != nil {
		if err := s.cleanupStaleVolumes(ctx, current); err != nil {
			lastErr = err
		}
	}

	return lastErr
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
func (s *VolumeService) ListVolumesPaginated(ctx context.Context, req utils.SortedPaginationRequest, rawQuery url.Values) ([]dto.VolumeDto, utils.PaginationResponse, error) {
	parsedFilters := utils.ParseFiltersFromQuery(rawQuery)

	var vols []models.Volume
	query := s.db.WithContext(ctx).Model(&models.Volume{})

	if driver := rawQuery.Get("driver"); driver != "" {
		query = query.Where("driver = ?", driver)
	}

	if term := strings.TrimSpace(req.Search); term != "" {
		like := "%" + strings.ToLower(term) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(driver) LIKE ? OR LOWER(scope) LIKE ?", like, like, like)
	}

	pagination, err := utils.PaginateAndSort(req, query, &vols, parsedFilters)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to paginate volumes: %w", err)
	}

	dockerClient, derr := s.dockerService.CreateConnection(ctx)
	var usageMap map[string]bool
	if derr == nil {
		defer dockerClient.Close()
		usageMap, _ = s.buildVolumeUsageMap(ctx, dockerClient)
	} else {
		usageMap = map[string]bool{}
	}

	result := make([]dto.VolumeDto, 0, len(vols))
	for _, v := range vols {
		opts := map[string]string{}
		if v.Options != nil {
			for k, val := range v.Options {
				if sstr, ok := val.(string); ok {
					opts[k] = sstr
				}
			}
		}
		labels := map[string]string{}
		if v.Labels != nil {
			for k, val := range v.Labels {
				if sstr, ok := val.(string); ok {
					labels[k] = sstr
				}
			}
		}

		inUse := v.InUse || usageMap[v.Name]

		volDto := dto.VolumeDto{
			ID:         v.Name,
			Name:       v.Name,
			Driver:     v.Driver,
			Mountpoint: v.Mountpoint,
			Scope:      v.Scope,
			Options:    opts,
			Labels:     labels,
			CreatedAt:  v.CreatedAt,
			InUse:      inUse,
		}
		result = append(result, volDto)
	}

	return result, pagination, nil
}

func (s *VolumeService) cleanupStaleVolumes(ctx context.Context, current []string) error {
	if s.db == nil {
		return nil
	}
	if len(current) == 0 {
		return s.db.WithContext(ctx).Where("1=1").Delete(&models.Volume{}).Error
	}
	return s.db.WithContext(ctx).Where("name NOT IN ?", current).Delete(&models.Volume{}).Error
}
