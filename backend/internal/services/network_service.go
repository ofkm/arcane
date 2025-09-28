package services

import (
	"context"
	"encoding/json"
	"fmt"
	"net/url"
	"strings"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"gorm.io/gorm/clause"
)

type NetworkService struct {
	db            *database.DB
	dockerService *DockerClientService
	eventService  *EventService
}

func NewNetworkService(db *database.DB, dockerService *DockerClientService, eventService *EventService) *NetworkService {
	return &NetworkService{
		db:            db,
		dockerService: dockerService,
		eventService:  eventService,
	}
}

func (s *NetworkService) GetNetworkByID(ctx context.Context, id string) (*network.Inspect, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	networkInspect, err := dockerClient.NetworkInspect(ctx, id, network.InspectOptions{})
	if err != nil {
		return nil, fmt.Errorf("network not found: %w", err)
	}

	return &networkInspect, nil
}

func (s *NetworkService) CreateNetwork(ctx context.Context, name string, options network.CreateOptions, user models.User) (*network.CreateResponse, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	response, err := dockerClient.NetworkCreate(ctx, name, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create network: %w", err)
	}

	if inspect, ierr := dockerClient.NetworkInspect(ctx, response.ID, network.InspectOptions{}); ierr == nil {
		_ = s.syncSingleNetwork(ctx, inspect, nil, nil)
	}

	metadata := models.JSON{
		"action": "create",
		"driver": options.Driver,
		"name":   name,
	}
	if logErr := s.eventService.LogNetworkEvent(ctx, models.EventTypeNetworkCreate, response.ID, name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log network creation action: %s\n", logErr)
	}

	return &response, nil
}

func (s *NetworkService) RemoveNetwork(ctx context.Context, id string, user models.User) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	networkDetails, inspectErr := dockerClient.NetworkInspect(ctx, id, network.InspectOptions{})
	var networkName string
	if inspectErr == nil {
		networkName = networkDetails.Name
	} else {
		networkName = id
	}

	if err := dockerClient.NetworkRemove(ctx, id); err != nil {
		return fmt.Errorf("failed to remove network: %w", err)
	}

	_ = s.db.WithContext(ctx).Where("id = ?", id).Delete(&models.Network{})

	metadata := models.JSON{
		"action":    "delete",
		"networkId": id,
	}
	if logErr := s.eventService.LogNetworkEvent(ctx, models.EventTypeNetworkDelete, id, networkName, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log network deletion action: %s\n", logErr)
	}

	return nil
}

func (s *NetworkService) PruneNetworks(ctx context.Context) (*network.PruneReport, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	filterArgs := filters.NewArgs()

	report, err := dockerClient.NetworksPrune(ctx, filterArgs)
	if err != nil {
		return nil, fmt.Errorf("failed to prune networks: %w", err)
	}

	_ = s.SyncDockerNetworks(ctx)

	metadata := models.JSON{
		"action":          "prune",
		"networksDeleted": len(report.NetworksDeleted),
	}
	if logErr := s.eventService.LogNetworkEvent(ctx, models.EventTypeNetworkDelete, "", "bulk_prune", systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log network prune action: %s\n", logErr)
	}

	return &report, nil
}

//nolint:gocognit
func (s *NetworkService) ListNetworksPaginated(ctx context.Context, req utils.SortedPaginationRequest, rawQuery url.Values) ([]dto.NetworkSummaryDto, utils.PaginationResponse, error) {
	if parsed := utils.ParseFiltersFromQuery(rawQuery); len(parsed) > 0 {
		if req.Filters == nil {
			req.Filters = make(map[string]interface{})
		}
		for k, vals := range parsed {
			if len(vals) == 1 {
				req.Filters[k] = vals[0]
			} else {
				req.Filters[k] = vals
			}
		}
	}

	var networks []models.Network
	query := s.db.WithContext(ctx).Model(&models.Network{})

	if term := strings.TrimSpace(req.Search); term != "" {
		like := "%" + strings.ToLower(term) + "%"
		query = query.Where("LOWER(name) LIKE ? OR LOWER(driver) LIKE ? OR LOWER(scope) LIKE ? OR LOWER(id) LIKE ?", like, like, like, like)
	}

	pagination, err := utils.PaginateAndSort(req, query, &networks)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to paginate networks: %w", err)
	}

	inUseByID := map[string]bool{}
	inUseByName := map[string]bool{}
	{
		dockerClient, derr := s.dockerService.CreateConnection(ctx)
		if derr == nil {
			defer dockerClient.Close()
			containers, lerr := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
			if lerr == nil {
				for _, c := range containers {
					if c.NetworkSettings == nil || c.NetworkSettings.Networks == nil {
						continue
					}
					for netName, es := range c.NetworkSettings.Networks {
						if es.NetworkID != "" {
							inUseByID[es.NetworkID] = true
						}
						inUseByName[netName] = true
					}
				}
			}
		}
	}

	result := make([]dto.NetworkSummaryDto, 0, len(networks))
	for _, n := range networks {
		item := dto.NetworkSummaryDto{
			ID:      n.ID,
			Name:    n.Name,
			Driver:  n.Driver,
			Scope:   n.Scope,
			Created: n.Created,
			Options: map[string]string{},
			Labels:  map[string]string{},
			InUse:   n.InUse,
		}

		if n.Options != nil {
			for k, v := range n.Options {
				if sstr, ok := v.(string); ok {
					item.Options[k] = sstr
				}
			}
		}
		if n.Labels != nil {
			for k, v := range n.Labels {
				if sstr, ok := v.(string); ok {
					item.Labels[k] = sstr
				}
			}
		}
		// ensure runtime container-state also marks in-use (OR with persisted DB flag)
		if inUseByID[n.ID] || inUseByName[n.Name] {
			item.InUse = true
		}
		result = append(result, item)
	}

	return result, pagination, nil
}

func (s *NetworkService) SyncDockerNetworks(ctx context.Context) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	inUseByID := map[string]bool{}
	inUseByName := map[string]bool{}
	containers, cerr := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if cerr == nil {
		for _, c := range containers {
			if c.NetworkSettings == nil || c.NetworkSettings.Networks == nil {
				continue
			}
			for netName, es := range c.NetworkSettings.Networks {
				if es.NetworkID != "" {
					inUseByID[es.NetworkID] = true
				}
				inUseByName[netName] = true
			}
		}
	}

	networks, err := dockerClient.NetworkList(ctx, network.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to list Docker networks: %w", err)
	}

	currentDockerIDs := make([]string, 0, len(networks))
	var lastErr error
	for _, nr := range networks {
		currentDockerIDs = append(currentDockerIDs, nr.ID)
		inspect, ierr := dockerClient.NetworkInspect(ctx, nr.ID, network.InspectOptions{})
		if ierr != nil {
			// fallback: minimal upsert using list item data, include InUse
			optionsMap := make(map[string]interface{})
			for k, v := range nr.Options {
				optionsMap[k] = v
			}
			labelsMap := make(map[string]interface{})
			for k, v := range nr.Labels {
				labelsMap[k] = v
			}
			inUse := inUseByID[nr.ID] || inUseByName[nr.Name]

			netModel := models.Network{
				ID:         nr.ID,
				Name:       nr.Name,
				Driver:     nr.Driver,
				Scope:      nr.Scope,
				Internal:   nr.Internal,
				Attachable: nr.Attachable,
				Ingress:    nr.Ingress,
				Options:    models.JSON(optionsMap),
				Labels:     models.JSON(labelsMap),
				Created:    nr.Created,
				InUse:      inUse,
			}

			if err2 := s.db.WithContext(ctx).Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "id"}},
				DoUpdates: clause.AssignmentColumns([]string{"name", "driver", "scope", "internal", "attachable", "ingress", "options", "labels", "created", "in_use", "updated_at"}),
			}).Create(&netModel).Error; err2 != nil {
				lastErr = err2
			}
			continue
		}
		if err2 := s.syncSingleNetwork(ctx, inspect, inUseByID, inUseByName); err2 != nil {
			lastErr = err2
		}
	}

	if err := s.cleanupStaleNetworks(ctx, currentDockerIDs); err != nil {
		lastErr = err
	}

	return lastErr
}

// updated signature to accept optional usage maps (nil allowed)
func (s *NetworkService) syncSingleNetwork(ctx context.Context, inspect network.Inspect, inUseByID, inUseByName map[string]bool) error {
	var optionsMap map[string]interface{}
	var labelsMap map[string]interface{}
	var containersMap map[string]interface{}
	var ipamMap map[string]interface{}

	optionsMap = make(map[string]interface{})
	for k, v := range inspect.Options {
		optionsMap[k] = v
	}
	labelsMap = make(map[string]interface{})
	for k, v := range inspect.Labels {
		labelsMap[k] = v
	}

	if b, err := json.Marshal(inspect.Containers); err == nil {
		_ = json.Unmarshal(b, &containersMap)
	}
	if b, err := json.Marshal(inspect.IPAM); err == nil {
		_ = json.Unmarshal(b, &ipamMap)
	}

	inUse := false
	if inUseByID != nil && inUseByName != nil {
		inUse = inUseByID[inspect.ID] || inUseByName[inspect.Name]
	}

	netModel := models.Network{
		ID:         inspect.ID,
		Name:       inspect.Name,
		Driver:     inspect.Driver,
		Scope:      inspect.Scope,
		Internal:   inspect.Internal,
		Attachable: inspect.Attachable,
		Ingress:    inspect.Ingress,
		Options:    models.JSON(optionsMap),
		Labels:     models.JSON(labelsMap),
		Containers: models.JSON(containersMap),
		IPAM:       models.JSON(ipamMap),
		Created:    inspect.Created,
		InUse:      inUse,
	}

	return s.db.WithContext(ctx).Clauses(clause.OnConflict{
		Columns:   []clause.Column{{Name: "id"}},
		DoUpdates: clause.AssignmentColumns([]string{"name", "driver", "scope", "internal", "attachable", "ingress", "options", "labels", "containers", "ip_am", "in_use", "created", "updated_at"}),
	}).Create(&netModel).Error
}

func (s *NetworkService) cleanupStaleNetworks(ctx context.Context, currentDockerIDs []string) error {
	if len(currentDockerIDs) > 0 {
		return s.deleteStaleNetworks(ctx, currentDockerIDs)
	}
	return s.deleteAllNetworks(ctx)
}

func (s *NetworkService) deleteStaleNetworks(ctx context.Context, currentDockerIDs []string) error {
	res := s.db.WithContext(ctx).Where("id NOT IN ?", currentDockerIDs).Delete(&models.Network{})
	return res.Error
}

func (s *NetworkService) deleteAllNetworks(ctx context.Context) error {
	res := s.db.WithContext(ctx).Delete(&models.Network{}, "1 = 1")
	return res.Error
}
