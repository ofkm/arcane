package services

import (
	"context"
	"fmt"
	"net/url"
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

//nolint:gocognit
func (s *NetworkService) ListNetworksPaginated(ctx context.Context, req utils.SortedPaginationRequest, rawQuery url.Values) ([]dto.NetworkSummaryDto, utils.PaginationResponse, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	// Merge raw query into req.Filters and normalize
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

	// Detect inUse filter (server-side concept)
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

	// Build Docker filters (driver, label, name, type, scope, id)
	// Note: do NOT map inUse -> dangling for networks; enforce server-side.
	allowed := []string{"driver", "label", "name", "type", "scope", "id"}
	filterArgs := utils.BuildDockerFiltersFromMap(req.Filters, req.Search, allowed)

	rawNets, err := dockerClient.NetworkList(ctx, network.ListOptions{Filters: filterArgs})
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to list Docker networks: %w", err)
	}

	items := make([]dto.NetworkSummaryDto, 0, len(rawNets))
	for _, n := range rawNets {
		d := dto.NewNetworkSummaryDto(n)
		items = append(items, d)
	}

	// Compute usage if needed for filtering or sorting by inUse
	needsUsage := wantInUse != nil || strings.EqualFold(strings.TrimSpace(req.Sort.Column), "inUse")
	if needsUsage && len(items) > 0 {
		inUseByID := map[string]bool{}
		inUseByName := map[string]bool{}
		if containers, lerr := dockerClient.ContainerList(ctx, container.ListOptions{All: true}); lerr == nil {
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
		for i := range items {
			items[i].InUse = inUseByID[items[i].ID] || inUseByName[items[i].Name]
		}
		if wantInUse != nil {
			filtered := make([]dto.NetworkSummaryDto, 0, len(items))
			for _, n := range items {
				if n.InUse == *wantInUse {
					filtered = append(filtered, n)
				}
			}
			items = filtered
		}
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

	// Sort (supports inUse)
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
		lessBool := func(a, b bool) bool {
			if desc {
				return a && !b
			}
			return !a && b
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
			case "inuse":
				return lessBool(a.InUse, b.InUse)
			default:
				return false
			}
		})
	}

	// Paginate
	pageItems, pagination := utils.PaginateSlice(items, req.Pagination.Page, req.Pagination.Limit)

	// If not filtering/sorting by inUse, compute InUse only for the page
	if wantInUse == nil && !strings.EqualFold(strings.TrimSpace(req.Sort.Column), "inUse") && len(pageItems) > 0 {
		inUseByID := map[string]bool{}
		inUseByName := map[string]bool{}
		if containers, lerr := dockerClient.ContainerList(ctx, container.ListOptions{All: true}); lerr == nil {
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
		for i := range pageItems {
			if inUseByID[pageItems[i].ID] || inUseByName[pageItems[i].Name] {
				pageItems[i].InUse = true
			}
		}
	}

	return pageItems, pagination, nil
}
