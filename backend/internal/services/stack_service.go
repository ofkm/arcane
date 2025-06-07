package services

import (
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/compose-spec/compose-go/v2/cli"
	"github.com/compose-spec/compose-go/v2/types"
	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/mount"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/strslice"
	"github.com/docker/docker/api/types/volume"
	"github.com/docker/docker/client"
	"github.com/docker/go-connections/nat"
	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type StackServiceInfo struct {
	Name         string            `json:"name"`
	Image        string            `json:"image"`
	Status       string            `json:"status"`
	ContainerID  string            `json:"container_id"`
	Ports        []string          `json:"ports"`
	Networks     []string          `json:"networks"`
	Volumes      []string          `json:"volumes"`
	Environment  map[string]string `json:"environment"`
	Health       string            `json:"health,omitempty"`
	RestartCount int               `json:"restart_count"`
}

type StackService struct {
	db              *database.DB
	dockerService   *DockerClientService
	settingsService *SettingsService
}

func NewStackService(db *database.DB, dockerService *DockerClientService, settingsService *SettingsService) *StackService {
	return &StackService{
		db:              db,
		dockerService:   dockerService,
		settingsService: settingsService,
	}
}

// Types for Docker Compose operations
type DeployOptions struct {
	Profiles      []string
	EnvOverrides  map[string]string
	ForceRecreate bool
	Build         bool
	Pull          bool
}

type StackInfo struct {
	ID           string             `json:"id"`
	Name         string             `json:"name"`
	Status       string             `json:"status"`
	Services     []StackServiceInfo `json:"services"`
	Networks     []string           `json:"networks"`
	Volumes      []string           `json:"volumes"`
	ServiceCount int                `json:"service_count"`
	RunningCount int                `json:"running_count"`
}

// Create operations
func (s *StackService) CreateStack(ctx context.Context, name, composeContent string, envContent *string) (*models.Stack, error) {
	stackID := uuid.New().String()
	folderName := s.sanitizeStackName(name)
	folderName, err := s.ensureUniqueFolderName(ctx, folderName)
	if err != nil {
		return nil, fmt.Errorf("failed to generate unique folder name: %w", err)
	}

	stacksDir, err := s.getStacksDirectory(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get stacks directory: %w", err)
	}

	path := filepath.Join(stacksDir, folderName)

	// Create stack metadata (no content in DB)
	stack := &models.Stack{
		ID:           stackID,
		Name:         name,
		DirName:      &folderName,
		Path:         path,
		Status:       models.StackStatusStopped,
		IsExternal:   false,
		IsLegacy:     false,
		IsRemote:     false,
		ServiceCount: 0,
		RunningCount: 0,
		BaseModel: models.BaseModel{
			CreatedAt: time.Now(),
		},
	}

	// Save to database (metadata only)
	if err := s.db.WithContext(ctx).Create(stack).Error; err != nil {
		return nil, fmt.Errorf("failed to create stack: %w", err)
	}

	// Save files to disk
	if err := s.SaveStackFilesToPath(path, composeContent, envContent); err != nil {
		s.db.WithContext(ctx).Delete(stack) // Rollback
		return nil, fmt.Errorf("failed to save stack files: %w", err)
	}

	return stack, nil
}

// sanitizeStackName replaces invalid filesystem characters with underscores and trims spaces.
func (s *StackService) sanitizeStackName(name string) string {
	name = strings.TrimSpace(name)
	// Replace any character that is not a letter, number, dash, or underscore with underscore
	return strings.Map(func(r rune) rune {
		if (r >= 'a' && r <= 'z') ||
			(r >= 'A' && r <= 'Z') ||
			(r >= '0' && r <= '9') ||
			r == '-' || r == '_' {
			return r
		}
		return '_'
	}, name)
}

func (s *StackService) ensureUniqueFolderName(ctx context.Context, baseName string) (string, error) {
	stacksDir, err := s.getStacksDirectory(ctx)
	if err != nil {
		return "", err
	}

	// Check if base name is available
	targetPath := filepath.Join(stacksDir, baseName)
	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		// Also check database for folder name conflicts
		var count int64
		if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("dir_name = ?", baseName).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return baseName, nil
		}
	}

	// Generate unique name with counter
	counter := 1
	for {
		candidateName := fmt.Sprintf("%s-%d", baseName, counter)
		candidatePath := filepath.Join(stacksDir, candidateName)

		// Check filesystem
		if _, err := os.Stat(candidatePath); os.IsNotExist(err) {
			// Check database
			var count int64
			if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("dir_name = ?", candidateName).Count(&count).Error; err != nil {
				return "", err
			}
			if count == 0 {
				return candidateName, nil
			}
		}

		counter++
		if counter > 1000 {
			return "", fmt.Errorf("unable to generate unique folder name for: %s", baseName)
		}
	}
}

func (s *StackService) SaveStackFilesToPath(stackPath, composeContent string, envContent *string) error {
	// Ensure directory exists
	if err := os.MkdirAll(stackPath, 0755); err != nil {
		return fmt.Errorf("failed to create stack directory: %w", err)
	}

	// Save compose file
	composePath := filepath.Join(stackPath, "compose.yaml")
	if err := os.WriteFile(composePath, []byte(composeContent), 0644); err != nil {
		return fmt.Errorf("failed to save compose file: %w", err)
	}

	// Save or remove env file
	envPath := filepath.Join(stackPath, ".env")
	if envContent != nil && *envContent != "" {
		if err := os.WriteFile(envPath, []byte(*envContent), 0644); err != nil {
			return fmt.Errorf("failed to save env file: %w", err)
		}
	} else {
		// Remove env file if content is empty
		if _, err := os.Stat(envPath); err == nil {
			os.Remove(envPath)
		}
	}

	return nil
}

// Read operations
func (s *StackService) GetStackByID(ctx context.Context, id string) (*models.Stack, error) {
	var stack models.Stack
	if err := s.db.WithContext(ctx).Preload("Agent").Where("id = ?", id).First(&stack).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("stack not found")
		}
		return nil, fmt.Errorf("failed to get stack: %w", err)
	}
	return &stack, nil
}

func (s *StackService) GetStackByName(ctx context.Context, name string) (*models.Stack, error) {
	var stack models.Stack
	if err := s.db.WithContext(ctx).Preload("Agent").Where("name = ?", name).First(&stack).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("stack not found")
		}
		return nil, fmt.Errorf("failed to get stack: %w", err)
	}
	return &stack, nil
}

func (s *StackService) GetStackContent(ctx context.Context, stackID string) (composeContent, envContent string, err error) {
	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", stackID).First(&stack).Error; err != nil {
		return "", "", fmt.Errorf("stack not found: %w", err)
	}

	// Read compose file
	composeFile := s.findComposeFile(stack.Path)
	if composeFile == "" {
		return "", "", fmt.Errorf("no compose file found")
	}

	composeData, err := os.ReadFile(composeFile)
	if err != nil {
		return "", "", fmt.Errorf("failed to read compose file: %w", err)
	}
	composeContent = string(composeData)

	// Read env file if it exists
	envFile := filepath.Join(stack.Path, ".env")
	if envData, err := os.ReadFile(envFile); err == nil {
		envContent = string(envData)
	}

	return composeContent, envContent, nil
}

func (s *StackService) ListStacks(ctx context.Context) ([]*models.Stack, error) {
	var stacks []*models.Stack
	if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&stacks).Error; err != nil {
		return nil, fmt.Errorf("failed to list stacks: %w", err)
	}

	// If no stacks in database, try to import from files
	if len(stacks) == 0 {
		fmt.Println("No stacks found in database, checking for file-based stacks...")
		if err := s.ImportFileBasedStacks(ctx); err != nil {
			fmt.Printf("Warning: failed to import file-based stacks: %v\n", err)
		} else {
			// Try to fetch again after import
			if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&stacks).Error; err != nil {
				return nil, fmt.Errorf("failed to list stacks after import: %w", err)
			}
		}
	}

	// Update runtime info for each stack
	for i, stack := range stacks {
		services, err := s.GetStackServices(ctx, stack.ID)
		if err != nil {
			fmt.Printf("Warning: failed to get services for stack %s: %v\n", stack.ID, err)
			// Don't skip the stack, just set default values
			stacks[i].ServiceCount = 0
			stacks[i].RunningCount = 0
			stacks[i].Status = models.StackStatusStopped
			continue
		}

		serviceCount := len(services)
		runningCount := 0
		for _, service := range services {
			if service.Status == "running" {
				runningCount++
			}
		}

		// Determine status
		var status models.StackStatus = models.StackStatusStopped
		if serviceCount > 0 {
			if runningCount == serviceCount {
				status = models.StackStatusRunning
			} else if runningCount > 0 {
				status = "partially running"
			}
		}

		// Update the stack in the slice AND persist to database
		stacks[i].ServiceCount = serviceCount
		stacks[i].RunningCount = runningCount
		stacks[i].Status = status

		// Persist the updated counts to database for consistency
		if err := s.UpdateStackRuntimeInfo(ctx, stack.ID, serviceCount, runningCount, status); err != nil {
			fmt.Printf("Warning: failed to update runtime info for stack %s: %v\n", stack.ID, err)
		}
	}

	return stacks, nil
}

func (s *StackService) GetStacksByAgent(ctx context.Context, agentID string) ([]*models.Stack, error) {
	var stacks []*models.Stack
	if err := s.db.WithContext(ctx).Where("agent_id = ?", agentID).Find(&stacks).Error; err != nil {
		return nil, fmt.Errorf("failed to get stacks by agent: %w", err)
	}
	return stacks, nil
}

func (s *StackService) GetStackInfo(ctx context.Context, stackID string) (*StackInfo, error) {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return nil, err
	}

	services, err := s.GetStackServices(ctx, stackID)
	if err != nil {
		return nil, err
	}

	project, err := s.LoadProject(ctx, stackID)
	if err != nil {
		return nil, err
	}

	var networks []string
	for networkName := range project.Networks {
		networks = append(networks, networkName)
	}

	var volumes []string
	for volumeName := range project.Volumes {
		volumes = append(volumes, volumeName)
	}

	runningCount := 0
	for _, service := range services {
		if service.Status == "running" {
			runningCount++
		}
	}

	return &StackInfo{
		ID:           stack.ID,
		Name:         stack.Name,
		Status:       string(stack.Status),
		Services:     services,
		Networks:     networks,
		Volumes:      volumes,
		ServiceCount: len(services),
		RunningCount: runningCount,
	}, nil
}

// Update operations
func (s *StackService) UpdateStack(ctx context.Context, stack *models.Stack) (*models.Stack, error) {
	now := time.Now()
	stack.UpdatedAt = &now

	if err := s.db.WithContext(ctx).Save(stack).Error; err != nil {
		return nil, fmt.Errorf("failed to update stack: %w", err)
	}
	return stack, nil
}

func (s *StackService) UpdateStackStatus(ctx context.Context, id string, status models.StackStatus) error {
	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}).Error; err != nil {
		return fmt.Errorf("failed to update stack status: %w", err)
	}
	return nil
}

func (s *StackService) UpdateStackContent(ctx context.Context, id string, composeContent *string, envContent *string) error {
	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&stack).Error; err != nil {
		return fmt.Errorf("stack not found: %w", err)
	}

	// Get current content if not provided
	var finalComposeContent, finalEnvContent string

	if composeContent != nil {
		finalComposeContent = *composeContent
	} else {
		// Get current compose content
		currentCompose, _, err := s.GetStackContent(ctx, id)
		if err != nil {
			return fmt.Errorf("failed to get current compose content: %w", err)
		}
		finalComposeContent = currentCompose
	}

	if envContent != nil {
		finalEnvContent = *envContent
	} else {
		// Get current env content
		_, currentEnv, err := s.GetStackContent(ctx, id)
		if err != nil {
			// Env is optional, so empty is fine
			finalEnvContent = ""
		} else {
			finalEnvContent = currentEnv
		}
	}

	// Update timestamp in database
	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("id = ?", id).Update("updated_at", time.Now()).Error; err != nil {
		return fmt.Errorf("failed to update stack timestamp: %w", err)
	}

	// Save files to disk
	return s.SaveStackFilesToPath(stack.Path, finalComposeContent, &finalEnvContent)
}

func (s *StackService) UpdateStackRuntimeInfo(ctx context.Context, id string, serviceCount, runningCount int, status models.StackStatus) error {
	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("id = ?", id).Updates(map[string]interface{}{
		"service_count": serviceCount,
		"running_count": runningCount,
		"status":        status,
		"last_polled":   time.Now().Unix(),
		"updated_at":    time.Now(),
	}).Error; err != nil {
		return fmt.Errorf("failed to update stack runtime info: %w", err)
	}
	return nil
}

// Delete operations
func (s *StackService) DeleteStack(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Delete(&models.Stack{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete stack: %w", err)
	}
	return nil
}

// Docker Compose Stack operations
func (s *StackService) DeployStack(ctx context.Context, id string, profiles []string, envOverrides map[string]string) error {
	options := DeployOptions{
		Profiles:     profiles,
		EnvOverrides: envOverrides,
		Build:        false,
		Pull:         false,
	}

	return s.deployStackWithOptions(ctx, id, options)
}

func (s *StackService) DeployStackWithBuild(ctx context.Context, id string, options DeployOptions) error {
	return s.deployStackWithOptions(ctx, id, options)
}

func (s *StackService) deployStackWithOptions(ctx context.Context, stackID string, options DeployOptions) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	// Load the compose project
	project, err := s.LoadProject(ctx, stackID)
	if err != nil {
		return fmt.Errorf("failed to load project: %w", err)
	}

	// Apply profiles if specified
	if len(options.Profiles) > 0 {
		project = s.applyProfiles(project, options.Profiles)
	}

	// Apply environment overrides
	if len(options.EnvOverrides) > 0 {
		project = s.applyEnvOverrides(project, options.EnvOverrides)
	}

	// Pull images if requested
	if options.Pull {
		if err := s.pullImages(ctx, dockerClient, project); err != nil {
			return fmt.Errorf("failed to pull images: %w", err)
		}
	}

	// Build images if requested
	if options.Build {
		if err := s.buildImages(ctx, dockerClient, project); err != nil {
			return fmt.Errorf("failed to build images: %w", err)
		}
	}

	// Create networks first
	if err := s.createNetworks(ctx, dockerClient, project); err != nil {
		return fmt.Errorf("failed to create networks: %w", err)
	}

	// Create volumes
	if err := s.createVolumes(ctx, dockerClient, project); err != nil {
		return fmt.Errorf("failed to create volumes: %w", err)
	}

	// Create secrets and configs
	if err := s.createSecrets(ctx, dockerClient, project); err != nil {
		return fmt.Errorf("failed to create secrets: %w", err)
	}

	// Create and start services
	if err := s.createServices(ctx, dockerClient, project, options); err != nil {
		return fmt.Errorf("failed to create services: %w", err)
	}

	// Update stack status in database
	return s.UpdateStackStatus(ctx, stackID, models.StackStatusRunning)
}

func (s *StackService) StopStack(ctx context.Context, id string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	// Get stack to find project name
	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&stack).Error; err != nil {
		return fmt.Errorf("stack not found: %w", err)
	}

	// Use consistent project name
	projectName := s.getProjectName(&stack)

	fmt.Printf("DEBUG: Stopping stack %s with project name: %s\n", id, projectName)

	// Get all containers for this specific stack project only
	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{
		All: true,
		Filters: filters.NewArgs(
			filters.Arg("label", fmt.Sprintf("com.docker.compose.project=%s", projectName)),
		),
	})
	if err != nil {
		return fmt.Errorf("failed to list containers: %w", err)
	}

	fmt.Printf("DEBUG: Found %d containers to stop for project %s\n", len(containers), projectName)

	// Stop containers in reverse dependency order
	project, err := s.LoadProject(ctx, id)
	if err == nil {
		serviceOrder := s.resolveDependencyOrder(project.Services)
		// Reverse the order for stopping
		for i := len(serviceOrder) - 1; i >= 0; i-- {
			serviceName := serviceOrder[i]
			for _, cont := range containers {
				// Check if this container belongs to this service
				if cont.Labels["com.docker.compose.service"] == serviceName {
					if cont.State == "running" {
						fmt.Printf("DEBUG: Stopping container %s for service %s\n", cont.ID[:12], serviceName)
						timeout := 10
						if err := dockerClient.ContainerStop(ctx, cont.ID, container.StopOptions{
							Timeout: &timeout,
						}); err != nil {
							fmt.Printf("Warning: failed to stop container %s: %v\n", cont.ID, err)
						}
					}
				}
			}
		}
	} else {
		// Fallback: stop all containers for this project
		for _, cont := range containers {
			if cont.State == "running" {
				fmt.Printf("DEBUG: Stopping container %s\n", cont.ID[:12])
				timeout := 10
				if err := dockerClient.ContainerStop(ctx, cont.ID, container.StopOptions{
					Timeout: &timeout,
				}); err != nil {
					fmt.Printf("Warning: failed to stop container %s: %v\n", cont.ID, err)
				}
			}
		}
	}

	return s.UpdateStackStatus(ctx, id, models.StackStatusStopped)
}

func (s *StackService) RestartStack(ctx context.Context, id string) error {
	if err := s.StopStack(ctx, id); err != nil {
		return err
	}
	return s.DeployStack(ctx, id, nil, nil)
}

func (s *StackService) PauseStack(ctx context.Context, id string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{
		All: true,
		Filters: filters.NewArgs(
			filters.Arg("label", fmt.Sprintf("com.docker.compose.project=%s", id)),
		),
	})
	if err != nil {
		return fmt.Errorf("failed to list containers: %w", err)
	}

	for _, cont := range containers {
		if cont.State == "running" {
			if err := dockerClient.ContainerPause(ctx, cont.ID); err != nil {
				return fmt.Errorf("failed to pause container %s: %w", cont.ID, err)
			}
		}
	}

	return s.UpdateStackStatus(ctx, id, models.StackStatusStopped)
}

func (s *StackService) UnpauseStack(ctx context.Context, id string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{
		All: true,
		Filters: filters.NewArgs(
			filters.Arg("label", fmt.Sprintf("com.docker.compose.project=%s", id)),
		),
	})
	if err != nil {
		return fmt.Errorf("failed to list containers: %w", err)
	}

	for _, cont := range containers {
		if cont.State == "paused" {
			if err := dockerClient.ContainerUnpause(ctx, cont.ID); err != nil {
				return fmt.Errorf("failed to unpause container %s: %w", cont.ID, err)
			}
		}
	}

	return s.UpdateStackStatus(ctx, id, models.StackStatusRunning)
}

func (s *StackService) RemoveStack(ctx context.Context, id string, removeVolumes bool) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	project, err := s.LoadProject(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to load project: %w", err)
	}

	// Stop and remove containers
	if err := s.removeContainers(ctx, dockerClient, id); err != nil {
		return fmt.Errorf("failed to remove containers: %w", err)
	}

	// Remove networks
	if err := s.removeNetworks(ctx, dockerClient, project); err != nil {
		return fmt.Errorf("failed to remove networks: %w", err)
	}

	// Remove volumes if requested
	if removeVolumes {
		if err := s.removeVolumes(ctx, dockerClient, project); err != nil {
			return fmt.Errorf("failed to remove volumes: %w", err)
		}
	}

	return nil
}

func (s *StackService) ScaleService(ctx context.Context, stackID, serviceName string, replicas int) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	project, err := s.LoadProject(ctx, stackID)
	if err != nil {
		return fmt.Errorf("failed to load project: %w", err)
	}

	service, exists := project.Services[serviceName]
	if !exists {
		return fmt.Errorf("service %s not found in stack", serviceName)
	}

	// Get current containers for this service
	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{
		All: true,
		Filters: filters.NewArgs(
			filters.Arg("label", fmt.Sprintf("com.docker.compose.project=%s", stackID)),
			filters.Arg("label", fmt.Sprintf("com.docker.compose.service=%s", serviceName)),
		),
	})
	if err != nil {
		return fmt.Errorf("failed to list containers: %w", err)
	}

	currentReplicas := len(containers)

	if replicas > currentReplicas {
		// Scale up
		for i := currentReplicas; i < replicas; i++ {
			containerName := fmt.Sprintf("%s_%s_%d", project.Name, serviceName, i+1)
			if err := s.createSingleService(ctx, dockerClient, project, serviceName, service, containerName); err != nil {
				return fmt.Errorf("failed to scale up service: %w", err)
			}
		}
	} else if replicas < currentReplicas {
		// Scale down
		for i := currentReplicas - 1; i >= replicas; i-- {
			if i < len(containers) {
				cont := containers[i]
				if cont.State == "running" {
					timeout := 10
					dockerClient.ContainerStop(ctx, cont.ID, container.StopOptions{
						Timeout: &timeout,
					})
				}
				if err := dockerClient.ContainerRemove(ctx, cont.ID, container.RemoveOptions{
					Force: true,
				}); err != nil {
					return fmt.Errorf("failed to remove container: %w", err)
				}
			}
		}
	}

	return nil
}

func (s *StackService) PullStackImages(ctx context.Context, id string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	project, err := s.LoadProject(ctx, id)
	if err != nil {
		return fmt.Errorf("failed to load project: %w", err)
	}

	return s.pullImages(ctx, dockerClient, project)
}

func (s *StackService) GetStackServices(ctx context.Context, stackID string) ([]StackServiceInfo, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	// Get stack to find project name
	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", stackID).First(&stack).Error; err != nil {
		return nil, fmt.Errorf("stack not found: %w", err)
	}

	// Use consistent project name - always stack ID
	projectName := s.getProjectName(&stack)

	fmt.Printf("DEBUG: Looking for containers with project name: %s\n", projectName)

	// Try to load the project to get service definitions
	project, err := s.LoadProject(ctx, stackID)
	if err != nil {
		fmt.Printf("Warning: failed to load project for stack %s: %v\n", stackID, err)
		return []StackServiceInfo{}, nil
	}

	var services []StackServiceInfo

	for serviceName, service := range project.Services {
		fmt.Printf("DEBUG: Processing service: %s\n", serviceName)

		// Use only the consistent project name
		containers, err := dockerClient.ContainerList(ctx, container.ListOptions{
			All: true,
			Filters: filters.NewArgs(
				filters.Arg("label", fmt.Sprintf("com.docker.compose.project=%s", projectName)),
				filters.Arg("label", fmt.Sprintf("com.docker.compose.service=%s", serviceName)),
			),
		})

		if err != nil {
			fmt.Printf("DEBUG: Error listing containers for project %s: %v\n", projectName, err)
			containers = []container.Summary{}
		}

		fmt.Printf("DEBUG: Found %d containers for project %s, service %s\n", len(containers), projectName, serviceName)

		// Initialize service info
		serviceInfo := StackServiceInfo{
			Name:         serviceName,
			Image:        service.Image,
			Status:       "not created",
			ContainerID:  "",
			Environment:  make(map[string]string),
			RestartCount: 0,
			Ports:        []string{},
			Networks:     []string{},
			Volumes:      []string{},
		}

		if len(containers) > 0 {
			cont := containers[0]
			serviceInfo.ContainerID = cont.ID
			serviceInfo.Status = cont.State

			fmt.Printf("DEBUG: Found container %s with ID %s, status %s\n", cont.Names[0], cont.ID, cont.State)

			// Get container details for additional info
			inspect, err := dockerClient.ContainerInspect(ctx, cont.ID)
			if err == nil {
				// Extract port mappings
				var ports []string
				for containerPort, hostBindings := range inspect.NetworkSettings.Ports {
					if len(hostBindings) > 0 {
						for _, binding := range hostBindings {
							ports = append(ports, fmt.Sprintf("%s:%s->%s", binding.HostIP, binding.HostPort, containerPort))
						}
					} else if containerPort != "" {
						ports = append(ports, string(containerPort))
					}
				}
				serviceInfo.Ports = ports

				// Extract networks
				var networks []string
				for networkName := range inspect.NetworkSettings.Networks {
					networks = append(networks, networkName)
				}
				serviceInfo.Networks = networks

				// Extract volumes
				var volumes []string
				for _, mount := range inspect.Mounts {
					volumes = append(volumes, fmt.Sprintf("%s:%s", mount.Source, mount.Destination))
				}
				serviceInfo.Volumes = volumes

				// Extract environment variables
				env := make(map[string]string)
				for _, envVar := range inspect.Config.Env {
					parts := strings.SplitN(envVar, "=", 2)
					if len(parts) == 2 {
						env[parts[0]] = parts[1]
					}
				}
				serviceInfo.Environment = env

				serviceInfo.RestartCount = inspect.RestartCount

				// Health check
				if inspect.State != nil && inspect.State.Health != nil {
					serviceInfo.Health = inspect.State.Health.Status
				}
			} else {
				fmt.Printf("DEBUG: Failed to inspect container %s: %v\n", cont.ID, err)
			}
		} else {
			fmt.Printf("DEBUG: No containers found for service %s\n", serviceName)
		}

		services = append(services, serviceInfo)
	}

	return services, nil
}

func (s *StackService) GetServiceLogs(ctx context.Context, stackID, serviceName string, follow bool, tail string) (io.ReadCloser, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{
		All: true,
		Filters: filters.NewArgs(
			filters.Arg("label", fmt.Sprintf("com.docker.compose.project=%s", stackID)),
			filters.Arg("label", fmt.Sprintf("com.docker.compose.service=%s", serviceName)),
		),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	if len(containers) == 0 {
		return nil, fmt.Errorf("no containers found for service %s", serviceName)
	}

	// Get logs from the first container
	cont := containers[0]
	options := container.LogsOptions{
		ShowStdout: true,
		ShowStderr: true,
		Follow:     follow,
		Tail:       tail,
		Timestamps: true,
	}

	return dockerClient.ContainerLogs(ctx, cont.ID, options)
}

// LoadProject loads and parses a Docker Compose project using v2 API
func (s *StackService) LoadProject(ctx context.Context, stackID string) (*types.Project, error) {
	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", stackID).First(&stack).Error; err != nil {
		return nil, fmt.Errorf("stack not found: %w", err)
	}

	stackDir := stack.Path

	// Use consistent project name - always use stack ID
	projectName := s.getProjectName(&stack)

	composeFile := s.findComposeFile(stackDir)
	if composeFile == "" {
		return nil, fmt.Errorf("no compose file found in %s", stackDir)
	}

	options, err := cli.NewProjectOptions(
		[]string{composeFile},
		cli.WithOsEnv,
		cli.WithDotEnv,
		cli.WithName(projectName), // Use consistent project name
		cli.WithWorkingDirectory(stackDir),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create project options: %w", err)
	}

	project, err := options.LoadProject(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load compose project: %w", err)
	}

	return project, nil
}

func (s *StackService) UpdateStackAutoUpdate(ctx context.Context, id string, autoUpdate bool) error {
	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("id = ?", id).Update("auto_update", autoUpdate).Error; err != nil {
		return fmt.Errorf("failed to update stack auto-update: %w", err)
	}
	return nil
}

func (s *StackService) GetAutoUpdateStacks(ctx context.Context) ([]*models.Stack, error) {
	var stacks []*models.Stack
	if err := s.db.WithContext(ctx).Where("auto_update = ?", true).Find(&stacks).Error; err != nil {
		return nil, fmt.Errorf("failed to get auto-update stacks: %w", err)
	}
	return stacks, nil
}

// File operations
func (s *StackService) EnsureStackDirectory(stackID string) (string, error) {
	// Get stack from database to find its path
	var stack models.Stack
	if err := s.db.Where("id = ?", stackID).First(&stack).Error; err != nil {
		return "", fmt.Errorf("stack not found: %w", err)
	}

	// Ensure the directory exists
	if err := os.MkdirAll(stack.Path, 0755); err != nil {
		return "", fmt.Errorf("failed to create stack directory: %w", err)
	}

	return stack.Path, nil
}

func (s *StackService) SaveStackFiles(stackID, composeContent string, envContent *string) error {
	// Get stack path from database
	var stack models.Stack
	if err := s.db.Where("id = ?", stackID).First(&stack).Error; err != nil {
		return fmt.Errorf("stack not found: %w", err)
	}

	return s.SaveStackFilesToPath(stack.Path, composeContent, envContent)
}

// Helper methods for Docker Compose operations
func (s *StackService) findComposeFile(stackDir string) string {
	possibleFiles := []string{
		"compose.yaml",
		"compose.yml",
		"docker-compose.yaml",
		"docker-compose.yml",
	}

	for _, filename := range possibleFiles {
		fullPath := filepath.Join(stackDir, filename)
		if _, err := os.Stat(fullPath); err == nil {
			return fullPath
		}
	}

	return ""
}

func (s *StackService) applyProfiles(project *types.Project, profiles []string) *types.Project {
	if len(profiles) == 0 {
		return project
	}

	profileSet := make(map[string]bool)
	for _, profile := range profiles {
		profileSet[profile] = true
	}

	filteredServices := make(types.Services)
	for name, service := range project.Services {
		if len(service.Profiles) == 0 {
			// No profiles means it's always included
			filteredServices[name] = service
			continue
		}

		// Check if any of the service's profiles match
		for _, serviceProfile := range service.Profiles {
			if profileSet[serviceProfile] {
				filteredServices[name] = service
				break
			}
		}
	}

	project.Services = filteredServices
	return project
}

func (s *StackService) applyEnvOverrides(project *types.Project, envOverrides map[string]string) *types.Project {
	for serviceName, service := range project.Services {
		if service.Environment == nil {
			service.Environment = make(types.MappingWithEquals)
		}

		for key, value := range envOverrides {
			service.Environment[key] = &value
		}

		project.Services[serviceName] = service
	}

	return project
}

func (s *StackService) pullImages(ctx context.Context, client *client.Client, project *types.Project) error {
	for serviceName, service := range project.Services {
		if service.Image == "" {
			continue // Skip services without image (build-only)
		}

		fmt.Printf("Pulling image %s for service %s\n", service.Image, serviceName)

		reader, err := client.ImagePull(ctx, service.Image, image.PullOptions{})
		if err != nil {
			return fmt.Errorf("failed to pull image %s: %w", service.Image, err)
		}
		defer reader.Close()

		// Consume the pull output
		io.Copy(io.Discard, reader)
	}

	return nil
}

func (s *StackService) buildImages(ctx context.Context, client *client.Client, project *types.Project) error {
	// TODO: Implement image building for services with build context
	// This would require implementing the Docker Build API
	fmt.Println("Image building not yet implemented")
	return nil
}

func (s *StackService) createSecrets(ctx context.Context, client *client.Client, project *types.Project) error {
	// TODO: Implement secrets creation for Docker Swarm mode
	// For now, just return nil as secrets are mainly for swarm mode
	return nil
}

func (s *StackService) createNetworks(ctx context.Context, client *client.Client, project *types.Project) error {
	for networkName, networkConfig := range project.Networks {
		if networkConfig.External {
			continue // Skip external networks
		}

		fullName := fmt.Sprintf("%s_%s", project.Name, networkName)

		// Check if network already exists
		networks, err := client.NetworkList(ctx, network.ListOptions{
			Filters: filters.NewArgs(filters.Arg("name", fullName)),
		})
		if err != nil {
			return err
		}

		if len(networks) > 0 {
			continue // Network already exists
		}

		// Create network
		createOptions := network.CreateOptions{
			Driver: networkConfig.Driver,
			Labels: map[string]string{
				"com.docker.compose.project": project.Name,
				"com.docker.compose.network": networkName,
			},
		}

		if networkConfig.DriverOpts != nil {
			createOptions.Options = networkConfig.DriverOpts
		}

		_, err = client.NetworkCreate(ctx, fullName, createOptions)
		if err != nil {
			return fmt.Errorf("failed to create network %s: %w", fullName, err)
		}
	}

	return nil
}

func (s *StackService) createVolumes(ctx context.Context, client *client.Client, project *types.Project) error {
	for volumeName, volumeConfig := range project.Volumes {
		if volumeConfig.External {
			continue // Skip external volumes
		}

		fullName := fmt.Sprintf("%s_%s", project.Name, volumeName)

		// Check if volume already exists
		volumes, err := client.VolumeList(ctx, volume.ListOptions{
			Filters: filters.NewArgs(filters.Arg("name", fullName)),
		})
		if err != nil {
			return err
		}

		if len(volumes.Volumes) > 0 {
			continue // Volume already exists
		}

		// Create volume
		createOptions := volume.CreateOptions{
			Name:   fullName,
			Driver: volumeConfig.Driver,
			Labels: map[string]string{
				"com.docker.compose.project": project.Name,
				"com.docker.compose.volume":  volumeName,
			},
		}

		if volumeConfig.DriverOpts != nil {
			createOptions.DriverOpts = volumeConfig.DriverOpts
		}

		_, err = client.VolumeCreate(ctx, createOptions)
		if err != nil {
			return fmt.Errorf("failed to create volume %s: %w", fullName, err)
		}
	}

	return nil
}

func (s *StackService) createServices(ctx context.Context, client *client.Client, project *types.Project, options DeployOptions) error {
	// Sort services by dependencies
	serviceOrder := s.resolveDependencyOrder(project.Services)

	for _, serviceName := range serviceOrder {
		service := project.Services[serviceName]
		containerName := fmt.Sprintf("%s_%s_1", project.Name, serviceName)

		if err := s.createSingleService(ctx, client, project, serviceName, service, containerName); err != nil {
			return fmt.Errorf("failed to create service %s: %w", serviceName, err)
		}
	}

	return nil
}

func (s *StackService) createSingleService(ctx context.Context, client *client.Client, project *types.Project, serviceName string, service types.ServiceConfig, containerName string) error {
	// Build container configuration
	config := &container.Config{
		Image: service.Image,
		Env:   s.buildEnvironment(service.Environment),
		Labels: map[string]string{
			"com.docker.compose.project": project.Name, // This will be the stack ID
			"com.docker.compose.service": serviceName,
		},
	}

	// Add custom labels
	for key, value := range service.Labels {
		config.Labels[key] = value
	}

	if len(service.Command) > 0 {
		config.Cmd = strslice.StrSlice(service.Command)
	}

	if len(service.Entrypoint) > 0 {
		config.Entrypoint = strslice.StrSlice(service.Entrypoint)
	}

	// Build host configuration
	hostConfig := &container.HostConfig{
		RestartPolicy: container.RestartPolicy{
			Name: container.RestartPolicyMode(service.Restart),
		},
		PortBindings: s.buildPortBindings(service.Ports),
		Binds:        s.buildVolumes(service.Volumes, project),
	}

	// Network configuration
	networkConfig := &network.NetworkingConfig{
		EndpointsConfig: s.buildNetworkConfig(service.Networks, project),
	}

	// Create container
	resp, err := client.ContainerCreate(ctx, config, hostConfig, networkConfig, nil, containerName)
	if err != nil {
		return fmt.Errorf("failed to create container: %w", err)
	}

	// Start container
	if err := client.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return fmt.Errorf("failed to start container: %w", err)
	}

	return nil
}

func (s *StackService) buildEnvironment(env types.MappingWithEquals) []string {
	var result []string
	for key, value := range env {
		if value != nil {
			result = append(result, fmt.Sprintf("%s=%s", key, *value))
		} else {
			result = append(result, key)
		}
	}
	return result
}

func (s *StackService) buildPortBindings(ports []types.ServicePortConfig) nat.PortMap {
	portMap := make(nat.PortMap)

	for _, port := range ports {
		containerPort := nat.Port(fmt.Sprintf("%d/%s", port.Target, port.Protocol))

		var hostBinding []nat.PortBinding
		if port.Published != "" {
			hostBinding = append(hostBinding, nat.PortBinding{
				HostIP:   port.HostIP,
				HostPort: port.Published,
			})
		}

		portMap[containerPort] = hostBinding
	}

	return portMap
}

func (s *StackService) buildVolumes(volumes []types.ServiceVolumeConfig, project *types.Project) []string {
	var binds []string

	for _, vol := range volumes {
		switch vol.Type {
		case types.VolumeTypeBind:
			bind := fmt.Sprintf("%s:%s", vol.Source, vol.Target)
			if vol.ReadOnly {
				bind += ":ro"
			}
			binds = append(binds, bind)
		case types.VolumeTypeVolume:
			volumeName := vol.Source
			if _, exists := project.Volumes[volumeName]; exists {
				// Named volume - prefix with project name
				volumeName = fmt.Sprintf("%s_%s", project.Name, volumeName)
			}
			bind := fmt.Sprintf("%s:%s", volumeName, vol.Target)
			if vol.ReadOnly {
				bind += ":ro"
			}
			binds = append(binds, bind)
		}
	}

	return binds
}

func (s *StackService) buildNetworkConfig(networks map[string]*types.ServiceNetworkConfig, project *types.Project) map[string]*network.EndpointSettings {
	endpoints := make(map[string]*network.EndpointSettings)

	for networkName, netConfig := range networks {
		fullNetworkName := fmt.Sprintf("%s_%s", project.Name, networkName)

		endpoint := &network.EndpointSettings{
			NetworkID: fullNetworkName,
		}

		if netConfig != nil {
			if len(netConfig.Aliases) > 0 {
				endpoint.Aliases = netConfig.Aliases
			}
		}

		endpoints[fullNetworkName] = endpoint
	}

	// If no networks specified, connect to default network
	if len(endpoints) == 0 {
		defaultNetwork := fmt.Sprintf("%s_default", project.Name)
		endpoints[defaultNetwork] = &network.EndpointSettings{
			NetworkID: defaultNetwork,
		}
	}

	return endpoints
}

func (s *StackService) extractPorts(ports nat.PortMap) []string {
	var result []string
	for port, bindings := range ports {
		for _, binding := range bindings {
			if binding.HostPort != "" {
				result = append(result, fmt.Sprintf("%s:%s", binding.HostPort, port.Port()))
			}
		}
	}
	return result
}

func (s *StackService) extractNetworks(networks map[string]*network.EndpointSettings) []string {
	var result []string
	for networkName := range networks {
		result = append(result, networkName)
	}
	return result
}

func (s *StackService) extractVolumes(mounts []mount.Mount) []string {
	var result []string
	for _, m := range mounts {
		mountStr := fmt.Sprintf("%s:%s", m.Source, m.Target)
		if m.ReadOnly {
			mountStr += ":ro"
		}
		result = append(result, mountStr)
	}
	return result
}

func (s *StackService) extractEnvironment(env []string) map[string]string {
	result := make(map[string]string)
	for _, e := range env {
		parts := strings.SplitN(e, "=", 2)
		if len(parts) == 2 {
			result[parts[0]] = parts[1]
		}
	}
	return result
}

func (s *StackService) removeContainers(ctx context.Context, client *client.Client, stackID string) error {
	containers, err := client.ContainerList(ctx, container.ListOptions{
		All: true,
		Filters: filters.NewArgs(
			filters.Arg("label", fmt.Sprintf("com.docker.compose.project=%s", stackID)),
		),
	})
	if err != nil {
		return err
	}

	for _, cont := range containers {
		// Stop container first if running
		if cont.State == "running" {
			timeout := 10
			client.ContainerStop(ctx, cont.ID, container.StopOptions{
				Timeout: &timeout,
			})
		}

		// Remove container
		if err := client.ContainerRemove(ctx, cont.ID, container.RemoveOptions{
			Force: true,
		}); err != nil {
			return fmt.Errorf("failed to remove container %s: %w", cont.ID, err)
		}
	}

	return nil
}

func (s *StackService) removeNetworks(ctx context.Context, client *client.Client, project *types.Project) error {
	for networkName := range project.Networks {
		fullName := fmt.Sprintf("%s_%s", project.Name, networkName)

		if err := client.NetworkRemove(ctx, fullName); err != nil {
			// Ignore errors for networks that don't exist or are in use
			continue
		}
	}

	return nil
}

func (s *StackService) removeVolumes(ctx context.Context, client *client.Client, project *types.Project) error {
	for volumeName := range project.Volumes {
		fullName := fmt.Sprintf("%s_%s", project.Name, volumeName)

		if err := client.VolumeRemove(ctx, fullName, true); err != nil {
			// Ignore errors for volumes that don't exist or are in use
			continue
		}
	}

	return nil
}

// resolveDependencyOrder returns a slice of service names in dependency order (topological sort).
func (s *StackService) resolveDependencyOrder(services map[string]types.ServiceConfig) []string {
	visited := make(map[string]bool)
	var order []string

	var visit func(name string)
	visit = func(name string) {
		if visited[name] {
			return
		}
		visited[name] = true
		for depName := range services[name].DependsOn {
			if _, ok := services[depName]; ok {
				visit(depName)
			}
		}
		order = append(order, name)
	}

	for name := range services {
		visit(name)
	}

	return order
}

// Helper method to get stacks directory from settings
func (s *StackService) getStacksDirectory(ctx context.Context) (string, error) {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get settings: %w", err)
	}

	if settings.StacksDirectory == "" {
		return "data/stacks", nil // Default fallback
	}

	return settings.StacksDirectory, nil
}

// Add this method to import existing file-based stacks
func (s *StackService) ImportFileBasedStacks(ctx context.Context) error {
	stacksDir, err := s.getStacksDirectory(ctx)
	if err != nil {
		return fmt.Errorf("failed to get stacks directory: %w", err)
	}

	// Read directory entries
	entries, err := os.ReadDir(stacksDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil // No stacks directory, nothing to import
		}
		return fmt.Errorf("failed to read stacks directory: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		stackID := entry.Name()

		// Check if stack already exists in database
		existing, err := s.GetStackByID(ctx, stackID)
		if err == nil && existing != nil {
			continue // Stack already exists
		}

		// Try to import this stack
		if err := s.importSingleFileBasedStack(ctx, stackID, stacksDir); err != nil {
			fmt.Printf("Warning: failed to import stack %s: %v\n", stackID, err)
		}
	}

	return nil
}

func (s *StackService) importSingleFileBasedStack(ctx context.Context, stackID, stacksDir string) error {
	stackDir := filepath.Join(stacksDir, stackID)

	// Find compose file
	composeFile := s.findComposeFile(stackDir)
	if composeFile == "" {
		return fmt.Errorf("no compose file found in %s", stackDir)
	}

	// Verify we can read the compose file (but don't store content in DB)
	if _, err := os.ReadFile(composeFile); err != nil {
		return fmt.Errorf("failed to read compose file: %w", err)
	}

	// Get directory stats for created time
	info, err := os.Stat(stackDir)
	var createdAt time.Time
	if err == nil {
		createdAt = info.ModTime()
	} else {
		createdAt = time.Now()
	}

	// Create stack in database (metadata only, no content)
	stack := &models.Stack{
		ID:           uuid.New().String(), // Generate new UUID
		Name:         stackID,             // Use directory name as stack name
		DirName:      &stackID,            // Directory name (legacy)
		Path:         stackDir,
		Status:       models.StackStatusStopped,
		IsExternal:   false,
		IsLegacy:     true, // Mark as legacy since it was file-based
		IsRemote:     false,
		ServiceCount: 0,
		RunningCount: 0,
		BaseModel: models.BaseModel{
			CreatedAt: createdAt,
		},
	}

	if err := s.db.WithContext(ctx).Create(stack).Error; err != nil {
		return fmt.Errorf("failed to create stack in database: %w", err)
	}

	fmt.Printf("Successfully imported stack: %s\n", stackID)
	return nil
}

// Add a consistent method to get project name
func (s *StackService) getProjectName(stack *models.Stack) string {
	// Always use the stack ID as the project name for consistency
	// This ensures each stack has a unique project name
	return stack.ID
}
