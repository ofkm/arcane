package services

import (
	"context"
	"fmt"
	"strings"

	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/network"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type NetworkService struct {
	db            *database.DB
	dockerService *DockerClientService
}

func NewNetworkService(db *database.DB, dockerService *DockerClientService) *NetworkService {
	return &NetworkService{db: db, dockerService: dockerService}
}

// ListNetworks returns live Docker networks
func (s *NetworkService) ListNetworks(ctx context.Context) ([]network.Summary, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	networks, err := dockerClient.NetworkList(ctx, network.ListOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to list Docker networks: %w", err)
	}

	// Convert types.NetworkResource to network.Summary
	var summaries []network.Summary
	for _, net := range networks {
		summaries = append(summaries, network.Summary{
			ID:     net.ID,
			Name:   net.Name,
			Driver: net.Driver,
			Scope:  net.Scope,
		})
	}

	return summaries, nil
}

// GetNetworkByID gets live network info from Docker
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

// CreateNetwork creates a Docker network
func (s *NetworkService) CreateNetwork(ctx context.Context, name string, options network.CreateOptions) (*network.CreateResponse, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	response, err := dockerClient.NetworkCreate(ctx, name, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create network: %w", err)
	}

	return &response, nil
}

// RemoveNetwork removes a Docker network
func (s *NetworkService) RemoveNetwork(ctx context.Context, id string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	if err := dockerClient.NetworkRemove(ctx, id); err != nil {
		return fmt.Errorf("failed to remove network: %w", err)
	}

	return nil
}

// ConnectContainer connects a container to a network
func (s *NetworkService) ConnectContainer(ctx context.Context, networkID, containerID string, config *network.EndpointSettings) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	if err := dockerClient.NetworkConnect(ctx, networkID, containerID, config); err != nil {
		return fmt.Errorf("failed to connect container to network: %w", err)
	}

	return nil
}

// DisconnectContainer disconnects a container from a network
func (s *NetworkService) DisconnectContainer(ctx context.Context, networkID, containerID string, force bool) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	if err := dockerClient.NetworkDisconnect(ctx, networkID, containerID, force); err != nil {
		return fmt.Errorf("failed to disconnect container from network: %w", err)
	}

	return nil
}

// PruneNetworks removes unused Docker networks
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

	return &report, nil
}

// GetNetworksByDriver filters networks by driver type
func (s *NetworkService) GetNetworksByDriver(ctx context.Context, driver string) ([]network.Summary, error) {
	networks, err := s.ListNetworks(ctx)
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

// GetDefaultNetworks returns Docker's default networks (bridge, host, none)
func (s *NetworkService) GetDefaultNetworks(ctx context.Context) ([]network.Summary, error) {
	networks, err := s.ListNetworks(ctx)
	if err != nil {
		return nil, err
	}

	defaultNames := map[string]bool{
		"bridge":  true,
		"host":    true,
		"none":    true,
		"ingress": true,
	}

	var defaults []network.Summary
	for _, net := range networks {
		if defaultNames[net.Name] {
			defaults = append(defaults, net)
		}
	}

	return defaults, nil
}

// GetNetworksByScope filters networks by scope (local, global, swarm)
func (s *NetworkService) GetNetworksByScope(ctx context.Context, scope string) ([]network.Summary, error) {
	networks, err := s.ListNetworks(ctx)
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

// GetUserDefinedNetworks returns non-default networks
func (s *NetworkService) GetUserDefinedNetworks(ctx context.Context) ([]network.Summary, error) {
	networks, err := s.ListNetworks(ctx)
	if err != nil {
		return nil, err
	}

	defaultNames := map[string]bool{
		"bridge":  true,
		"host":    true,
		"none":    true,
		"ingress": true,
	}

	var userDefined []network.Summary
	for _, net := range networks {
		if !defaultNames[net.Name] {
			userDefined = append(userDefined, net)
		}
	}

	return userDefined, nil
}

// ListNetworksPaginated returns paginated Docker networks
func (s *NetworkService) ListNetworksPaginated(ctx context.Context, req utils.SortedPaginationRequest) ([]map[string]interface{}, utils.PaginationResponse, error) {
	networks, err := s.ListNetworks(ctx)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to list Docker networks: %w", err)
	}

	var result []map[string]interface{}
	for _, network := range networks {
		networkData := map[string]interface{}{
			"ID":         network.ID,
			"Name":       network.Name,
			"Driver":     network.Driver,
			"Scope":      network.Scope,
			"Created":    network.Created,
			"Internal":   network.Internal,
			"Attachable": network.Attachable,
			"Ingress":    network.Ingress,
			"ConfigFrom": network.ConfigFrom,
			"ConfigOnly": network.ConfigOnly,
			"Containers": network.Containers,
			"Options":    network.Options,
			"Labels":     network.Labels,
		}

		result = append(result, networkData)
	}

	if req.Search != "" {
		filtered := make([]map[string]interface{}, 0)
		searchLower := strings.ToLower(req.Search)
		for _, network := range result {
			if name, ok := network["Name"].(string); ok {
				if strings.Contains(strings.ToLower(name), searchLower) {
					filtered = append(filtered, network)
					continue
				}
			}
			if driver, ok := network["Driver"].(string); ok {
				if strings.Contains(strings.ToLower(driver), searchLower) {
					filtered = append(filtered, network)
					continue
				}
			}
			if scope, ok := network["Scope"].(string); ok {
				if strings.Contains(strings.ToLower(scope), searchLower) {
					filtered = append(filtered, network)
					continue
				}
			}
		}
		result = filtered
	}

	totalItems := len(result)

	if req.Sort.Column != "" {
		utils.SortSliceByField(result, req.Sort.Column, req.Sort.Direction)
	}

	startIdx := (req.Pagination.Page - 1) * req.Pagination.Limit
	endIdx := startIdx + req.Pagination.Limit

	if startIdx > len(result) {
		startIdx = len(result)
	}
	if endIdx > len(result) {
		endIdx = len(result)
	}

	if startIdx < endIdx {
		result = result[startIdx:endIdx]
	} else {
		result = []map[string]interface{}{}
	}

	totalPages := (totalItems + req.Pagination.Limit - 1) / req.Pagination.Limit
	pagination := utils.PaginationResponse{
		TotalPages:   int64(totalPages),
		TotalItems:   int64(totalItems),
		CurrentPage:  req.Pagination.Page,
		ItemsPerPage: req.Pagination.Limit,
	}

	return result, pagination, nil
}
