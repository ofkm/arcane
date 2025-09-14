package services

import (
	"context"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/docker"
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

	metadata := models.JSON{
		"action":          "prune",
		"networksDeleted": len(report.NetworksDeleted),
	}
	if logErr := s.eventService.LogNetworkEvent(ctx, models.EventTypeNetworkDelete, "", "bulk_prune", systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log network prune action: %s\n", logErr)
	}

	return &report, nil
}

func (s *NetworkService) GetNetworksByDriver(ctx context.Context, driver string) ([]network.Summary, error) {
	networks, _, _, _, err := s.dockerService.GetAllNetworks(ctx)
	if err != nil {
		return nil, err
	}

	var filtered []network.Summary
	for _, net := range networks {
		if net.Driver == driver {
			filtered = append(filtered, net)
		}
	}

	return filtered, nil
}

func (s *NetworkService) GetDefaultNetworks(ctx context.Context) ([]network.Summary, error) {
	networks, _, _, _, err := s.dockerService.GetAllNetworks(ctx)
	if err != nil {
		return nil, err
	}

	var defaults []network.Summary
	for _, net := range networks {
		if docker.IsDefaultNetwork(net.Name) {
			defaults = append(defaults, net)
		}
	}
	return defaults, nil
}

func (s *NetworkService) GetNetworksByScope(ctx context.Context, scope string) ([]network.Summary, error) {
	networks, _, _, _, err := s.dockerService.GetAllNetworks(ctx)
	if err != nil {
		return nil, err
	}

	var filtered []network.Summary
	for _, net := range networks {
		if net.Scope == scope {
			filtered = append(filtered, net)
		}
	}

	return filtered, nil
}

func (s *NetworkService) GetUserDefinedNetworks(ctx context.Context) ([]network.Summary, error) {
	networks, _, _, _, err := s.dockerService.GetAllNetworks(ctx)
	if err != nil {
		return nil, err
	}

	var userDefined []network.Summary
	for _, net := range networks {
		if !docker.IsDefaultNetwork(net.Name) {
			userDefined = append(userDefined, net)
		}
	}
	return userDefined, nil
}

//nolint:gocognit
func (s *NetworkService) ListNetworksPaginated(ctx context.Context, req utils.SortedPaginationRequest) ([]dto.NetworkSummaryDto, utils.PaginationResponse, error) {
	nets, _, _, _, err := s.dockerService.GetAllNetworks(ctx)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to list Docker networks: %w", err)
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

	// Map to DTOs
	items := make([]dto.NetworkSummaryDto, 0, len(nets))
	for _, n := range nets {
		d := dto.NewNetworkSummaryDto(n)
		if inUseByID[n.ID] || inUseByName[n.Name] {
			d.InUse = true
		}
		items = append(items, d)
	}

	// Search filter
	if req.Search != "" {
		search := strings.ToLower(req.Search)
		filtered := make([]dto.NetworkSummaryDto, 0, len(items))
		for _, n := range items {
			if strings.Contains(strings.ToLower(n.Name), search) ||
				strings.Contains(strings.ToLower(n.Driver), search) ||
				strings.Contains(strings.ToLower(n.Scope), search) {
				filtered = append(filtered, n)
			}
		}
		items = filtered
	}

	totalItems := len(items)

	// Sort
	if col := strings.TrimSpace(strings.ToLower(req.Sort.Column)); col != "" {
		dir := utils.NormalizeSortDirection(req.Sort.Direction)
		desc := dir == "desc"
		lessStr := func(a, b string) bool {
			if desc {
				return a > b
			}
			return a < b
		}
		lessTime := func(a, b time.Time) bool {
			if desc {
				return a.After(b)
			}
			return a.Before(b)
		}

		sort.Slice(items, func(i, j int) bool {
			a, b := items[i], items[j]
			switch col {
			case "name":
				return lessStr(a.Name, b.Name)
			case "driver":
				return lessStr(a.Driver, b.Driver)
			case "scope":
				return lessStr(a.Scope, b.Scope)
			case "created":
				return lessTime(a.Created, b.Created)
			default:
				return false
			}
		})
	}

	startIdx := (req.Pagination.Page - 1) * req.Pagination.Limit
	endIdx := startIdx + req.Pagination.Limit
	if startIdx > len(items) {
		startIdx = len(items)
	}
	if endIdx > len(items) {
		endIdx = len(items)
	}
	pageItems := []dto.NetworkSummaryDto{}
	if startIdx < endIdx {
		pageItems = items[startIdx:endIdx]
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
