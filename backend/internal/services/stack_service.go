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

	if err := s.db.WithContext(ctx).Create(stack).Error; err != nil {
		return nil, fmt.Errorf("failed to create stack: %w", err)
	}

	if err := s.SaveStackFilesToPath(path, composeContent, envContent); err != nil {
		s.db.WithContext(ctx).Delete(stack)
		return nil, fmt.Errorf("failed to save stack files: %w", err)
	}

	return stack, nil
}

func (s *StackService) sanitizeStackName(name string) string {
	name = strings.TrimSpace(name)
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

	targetPath := filepath.Join(stacksDir, baseName)
	if _, err := os.Stat(targetPath); os.IsNotExist(err) {
		var count int64
		if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("dir_name = ?", baseName).Count(&count).Error; err != nil {
			return "", err
		}
		if count == 0 {
			return baseName, nil
		}
	}

	counter := 1
	for {
		candidateName := fmt.Sprintf("%s-%d", baseName, counter)
		candidatePath := filepath.Join(stacksDir, candidateName)
		if _, err := os.Stat(candidatePath); os.IsNotExist(err) {
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
	if err := os.MkdirAll(stackPath, 0755); err != nil {
		return fmt.Errorf("failed to create stack directory: %w", err)
	}

	composePath := filepath.Join(stackPath, "compose.yaml")
	if err := os.WriteFile(composePath, []byte(composeContent), 0644); err != nil {
		return fmt.Errorf("failed to save compose file: %w", err)
	}

	envPath := filepath.Join(stackPath, ".env")
	if envContent != nil && *envContent != "" {
		if err := os.WriteFile(envPath, []byte(*envContent), 0644); err != nil {
			return fmt.Errorf("failed to save env file: %w", err)
		}
	} else {
		if _, err := os.Stat(envPath); err == nil {
			os.Remove(envPath)
		}
	}

	return nil
}

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

	composeFile := s.findComposeFile(stack.Path)
	if composeFile == "" {
		return "", "", fmt.Errorf("no compose file found")
	}

	composeData, err := os.ReadFile(composeFile)
	if err != nil {
		return "", "", fmt.Errorf("failed to read compose file: %w", err)
	}
	composeContent = string(composeData)

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

	if len(stacks) == 0 {
		fmt.Println("No stacks found in database, checking for file-based stacks...")
		if err := s.ImportFileBasedStacks(ctx); err != nil {
			fmt.Printf("Warning: failed to import file-based stacks: %v\n", err)
		} else {
			if err := s.db.WithContext(ctx).Order("created_at DESC").Find(&stacks).Error; err != nil {
				return nil, fmt.Errorf("failed to list stacks after import: %w", err)
			}
		}
	}

	for i, stack := range stacks {
		services, err := s.GetStackServices(ctx, stack.ID)
		if err != nil {
			fmt.Printf("Warning: failed to get services for stack %s: %v\n", stack.ID, err)
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

		var status models.StackStatus = models.StackStatusStopped
		if serviceCount > 0 {
			if runningCount == serviceCount {
				status = models.StackStatusRunning
			} else if runningCount > 0 {
				status = "partially running"
			}
		}

		stacks[i].ServiceCount = serviceCount
		stacks[i].RunningCount = runningCount
		stacks[i].Status = status

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

	var finalComposeContent, finalEnvContent string

	if composeContent != nil {
		finalComposeContent = *composeContent
	} else {
		currentCompose, _, err := s.GetStackContent(ctx, id)
		if err != nil {
			return fmt.Errorf("failed to get current compose content: %w", err)
		}
		finalComposeContent = currentCompose
	}

	if envContent != nil {
		finalEnvContent = *envContent
	} else {
		_, currentEnv, err := s.GetStackContent(ctx, id)
		if err != nil {
			finalEnvContent = ""
		} else {
			finalEnvContent = currentEnv
		}
	}

	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("id = ?", id).Update("updated_at", time.Now()).Error; err != nil {
		return fmt.Errorf("failed to update stack timestamp: %w", err)
	}

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

func (s *StackService) DeleteStack(ctx context.Context, id string) error {
	if err := s.db.WithContext(ctx).Delete(&models.Stack{}, "id = ?", id).Error; err != nil {
		return fmt.Errorf("failed to delete stack: %w", err)
	}
	return nil
}

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

	project, err := s.LoadProject(ctx, stackID)
	if err != nil {
		return fmt.Errorf("failed to load project: %w", err)
	}

	if len(options.Profiles) > 0 {
		project = s.applyProfiles(project, options.Profiles)
	}

	if len(options.EnvOverrides) > 0 {
		project = s.applyEnvOverrides(project, options.EnvOverrides)
	}

	if options.Pull {
		if err := s.pullImages(ctx, dockerClient, project); err != nil {
			return fmt.Errorf("failed to pull images: %w", err)
		}
	}

	if options.Build {
		if err := s.buildImages(ctx, dockerClient, project); err != nil {
			return fmt.Errorf("failed to build images: %w", err)
		}
	}

	if err := s.createNetworks(ctx, dockerClient, project); err != nil {
		return fmt.Errorf("failed to create networks: %w", err)
	}

	if err := s.createVolumes(ctx, dockerClient, project); err != nil {
		return fmt.Errorf("failed to create volumes: %w", err)
	}

	if err := s.createSecrets(ctx, dockerClient, project); err != nil {
		return fmt.Errorf("failed to create secrets: %w", err)
	}

	if err := s.createServices(ctx, dockerClient, project, options); err != nil {
		return fmt.Errorf("failed to create services: %w", err)
	}

	return s.UpdateStackStatus(ctx, stackID, models.StackStatusRunning)
}

func (s *StackService) StopStack(ctx context.Context, id string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&stack).Error; err != nil {
		return fmt.Errorf("stack not found: %w", err)
	}

	projectName := s.getProjectName(&stack)

	alternativeNames := []string{
		projectName,
	}

	if stack.DirName != nil && *stack.DirName != "" && *stack.DirName != projectName {
		alternativeNames = append(alternativeNames, *stack.DirName)
	}

	dirName := ""
	if stack.DirName != nil {
		dirName = *stack.DirName
	}
	if stack.Name != projectName && stack.Name != dirName {
		alternativeNames = append(alternativeNames, stack.Name)
	}

	fmt.Printf("DEBUG: Stopping stack %s with project names: %v\n", id, alternativeNames)

	var allContainers []container.Summary

	for _, name := range alternativeNames {
		containers, err := dockerClient.ContainerList(ctx, container.ListOptions{
			All: true,
			Filters: filters.NewArgs(
				filters.Arg("label", fmt.Sprintf("com.docker.compose.project=%s", name)),
			),
		})
		if err != nil {
			fmt.Printf("DEBUG: Error listing containers for project %s: %v\n", name, err)
			continue
		}

		for _, cont := range containers {
			found := false
			for _, existing := range allContainers {
				if existing.ID == cont.ID {
					found = true
					break
				}
			}
			if !found {
				allContainers = append(allContainers, cont)
			}
		}
	}

	fmt.Printf("DEBUG: Found %d total containers to stop\n", len(allContainers))

	for _, cont := range allContainers {
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

	if err := s.removeContainers(ctx, dockerClient, id); err != nil {
		return fmt.Errorf("failed to remove containers: %w", err)
	}

	if err := s.removeNetworks(ctx, dockerClient, project); err != nil {
		return fmt.Errorf("failed to remove networks: %w", err)
	}

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
		for i := currentReplicas; i < replicas; i++ {
			containerName := fmt.Sprintf("%s_%s_%d", project.Name, serviceName, i+1)
			if err := s.createSingleService(ctx, dockerClient, project, serviceName, service, containerName); err != nil {
				return fmt.Errorf("failed to scale up service: %w", err)
			}
		}
	} else if replicas < currentReplicas {
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

	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", stackID).First(&stack).Error; err != nil {
		return nil, fmt.Errorf("stack not found: %w", err)
	}

	projectName := s.getProjectName(&stack)

	fmt.Printf("DEBUG: Looking for containers STRICTLY with project name: %s (no alternatives)\n", projectName)

	project, err := s.LoadProject(ctx, stackID)
	if err != nil {
		fmt.Printf("Warning: failed to load project for stack %s: %v\n", stackID, err)
		return []StackServiceInfo{}, nil
	}

	var services []StackServiceInfo

	for serviceName, service := range project.Services {
		fmt.Printf("DEBUG: Processing service: %s for stack %s\n", serviceName, stackID)

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

			containerName := strings.TrimPrefix(cont.Names[0], "/")
			fmt.Printf("DEBUG: Found container %s with ID %s, status %s for stack %s\n",
				containerName, cont.ID, cont.State, projectName)

			inspect, err := dockerClient.ContainerInspect(ctx, cont.ID)
			if err == nil {
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

				var networks []string
				for networkName := range inspect.NetworkSettings.Networks {
					networks = append(networks, networkName)
				}
				serviceInfo.Networks = networks

				var volumes []string
				for _, mount := range inspect.Mounts {
					volumes = append(volumes, fmt.Sprintf("%s:%s", mount.Source, mount.Destination))
				}
				serviceInfo.Volumes = volumes

				env := make(map[string]string)
				for _, envVar := range inspect.Config.Env {
					parts := strings.SplitN(envVar, "=", 2)
					if len(parts) == 2 {
						env[parts[0]] = parts[1]
					}
				}
				serviceInfo.Environment = env

				serviceInfo.RestartCount = inspect.RestartCount

				if inspect.State != nil && inspect.State.Health != nil {
					serviceInfo.Health = inspect.State.Health.Status
				}
			} else {
				fmt.Printf("DEBUG: Failed to inspect container %s: %v\n", cont.ID, err)
			}
		} else {
			fmt.Printf("DEBUG: No containers found for service %s in stack %s\n", serviceName, projectName)
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

func (s *StackService) LoadProject(ctx context.Context, stackID string) (*types.Project, error) {
	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", stackID).First(&stack).Error; err != nil {
		return nil, fmt.Errorf("stack not found: %w", err)
	}

	stackDir := stack.Path

	projectName := s.getProjectName(&stack)

	composeFile := s.findComposeFile(stackDir)
	if composeFile == "" {
		return nil, fmt.Errorf("no compose file found in %s", stackDir)
	}

	options, err := cli.NewProjectOptions(
		[]string{composeFile},
		cli.WithOsEnv,
		cli.WithDotEnv,
		cli.WithName(projectName),
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

func (s *StackService) EnsureStackDirectory(stackID string) (string, error) {
	var stack models.Stack
	if err := s.db.Where("id = ?", stackID).First(&stack).Error; err != nil {
		return "", fmt.Errorf("stack not found: %w", err)
	}

	if err := os.MkdirAll(stack.Path, 0755); err != nil {
		return "", fmt.Errorf("failed to create stack directory: %w", err)
	}

	return stack.Path, nil
}

func (s *StackService) SaveStackFiles(stackID, composeContent string, envContent *string) error {
	var stack models.Stack
	if err := s.db.Where("id = ?", stackID).First(&stack).Error; err != nil {
		return fmt.Errorf("stack not found: %w", err)
	}

	return s.SaveStackFilesToPath(stack.Path, composeContent, envContent)
}

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
			filteredServices[name] = service
			continue
		}

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
			continue
		}

		fmt.Printf("Pulling image %s for service %s\n", service.Image, serviceName)

		reader, err := client.ImagePull(ctx, service.Image, image.PullOptions{})
		if err != nil {
			return fmt.Errorf("failed to pull image %s: %w", service.Image, err)
		}
		defer reader.Close()

		io.Copy(io.Discard, reader)
	}

	return nil
}

func (s *StackService) buildImages(ctx context.Context, client *client.Client, project *types.Project) error {
	fmt.Println("Image building not yet implemented")
	return nil
}

func (s *StackService) createSecrets(ctx context.Context, client *client.Client, project *types.Project) error {
	return nil
}

func (s *StackService) createNetworks(ctx context.Context, client *client.Client, project *types.Project) error {
	for networkName, networkConfig := range project.Networks {
		if networkConfig.External {
			continue
		}

		fullName := fmt.Sprintf("%s_%s", project.Name, networkName)

		networks, err := client.NetworkList(ctx, network.ListOptions{
			Filters: filters.NewArgs(filters.Arg("name", fullName)),
		})
		if err != nil {
			return err
		}

		if len(networks) > 0 {
			continue
		}

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
			continue
		}

		fullName := fmt.Sprintf("%s_%s", project.Name, volumeName)

		volumes, err := client.VolumeList(ctx, volume.ListOptions{
			Filters: filters.NewArgs(filters.Arg("name", fullName)),
		})
		if err != nil {
			return err
		}

		if len(volumes.Volumes) > 0 {
			continue
		}

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

func (s *StackService) validateStackDeployment(ctx context.Context, client *client.Client, project *types.Project) error {
	fmt.Printf("DEBUG: Validating stack deployment for project %s\n", project.Name)

	var conflicts []string

	for serviceName, service := range project.Services {
		var containerName string
		if service.ContainerName != "" {
			containerName = service.ContainerName
		} else {
			containerName = fmt.Sprintf("%s_%s_1", project.Name, serviceName)
		}

		existingContainers, err := client.ContainerList(ctx, container.ListOptions{
			All: true,
			Filters: filters.NewArgs(
				filters.Arg("name", containerName),
			),
		})
		if err != nil {
			return fmt.Errorf("failed to check for existing container %s: %w", containerName, err)
		}

		if len(existingContainers) > 0 {
			existingContainer := existingContainers[0]
			existingProjectLabel := existingContainer.Labels["com.docker.compose.project"]

			if existingProjectLabel != project.Name {
				conflicts = append(conflicts, fmt.Sprintf("Service '%s' wants to use container name '%s', but it's already used by project '%s'",
					serviceName, containerName, existingProjectLabel))
			}
		}
	}

	if len(conflicts) > 0 {
		return fmt.Errorf("container name conflicts detected:\n%s", strings.Join(conflicts, "\n"))
	}

	fmt.Printf("DEBUG: No container name conflicts found\n")
	return nil
}

func (s *StackService) createServices(ctx context.Context, client *client.Client, project *types.Project, options DeployOptions) error {
	if err := s.validateStackDeployment(ctx, client, project); err != nil {
		return fmt.Errorf("deployment validation failed: %w", err)
	}

	serviceOrder := s.resolveDependencyOrder(project.Services)

	for _, serviceName := range serviceOrder {
		service := project.Services[serviceName]

		var containerName string
		if service.ContainerName != "" {
			containerName = service.ContainerName
		} else {
			containerName = fmt.Sprintf("%s_%s_1", project.Name, serviceName)
		}

		if err := s.createSingleService(ctx, client, project, serviceName, service, containerName); err != nil {
			return fmt.Errorf("failed to create service %s: %w", serviceName, err)
		}
	}

	return nil
}

func (s *StackService) createSingleService(ctx context.Context, client *client.Client, project *types.Project, serviceName string, service types.ServiceConfig, containerName string) error {
	config := &container.Config{
		Image: service.Image,
		Env:   s.buildEnvironment(service.Environment),
		Labels: map[string]string{
			"com.docker.compose.project":          project.Name,
			"com.docker.compose.service":          serviceName,
			"com.docker.compose.container-number": "1",
		},
	}

	for key, value := range service.Labels {
		config.Labels[key] = value
	}

	if len(service.Command) > 0 {
		config.Cmd = strslice.StrSlice(service.Command)
	}

	if len(service.Entrypoint) > 0 {
		config.Entrypoint = strslice.StrSlice(service.Entrypoint)
	}

	if service.WorkingDir != "" {
		config.WorkingDir = service.WorkingDir
	}

	if service.User != "" {
		config.User = service.User
	}

	if service.Hostname != "" {
		config.Hostname = service.Hostname
	}

	hostConfig := &container.HostConfig{
		RestartPolicy: container.RestartPolicy{
			Name: container.RestartPolicyMode(service.Restart),
		},
		PortBindings: s.buildPortBindings(service.Ports),
		Binds:        s.buildVolumes(service.Volumes, project),
	}

	if service.Privileged {
		hostConfig.Privileged = true
	}

	if service.Deploy != nil {
		if service.Deploy.Resources.Limits != nil {
			if service.Deploy.Resources.Limits.MemoryBytes > 0 {
				hostConfig.Memory = int64(service.Deploy.Resources.Limits.MemoryBytes)
			}
			if service.Deploy.Resources.Limits.NanoCPUs > 0 {
				hostConfig.NanoCPUs = int64(service.Deploy.Resources.Limits.NanoCPUs)
			}
		}
	}

	networkConfig := &network.NetworkingConfig{
		EndpointsConfig: s.buildNetworkConfig(service.Networks, project),
	}

	existingContainers, err := client.ContainerList(ctx, container.ListOptions{
		All: true,
		Filters: filters.NewArgs(
			filters.Arg("name", containerName),
		),
	})
	if err != nil {
		return fmt.Errorf("failed to check for existing container: %w", err)
	}

	if len(existingContainers) > 0 {
		existingContainer := existingContainers[0]
		existingProjectLabel := existingContainer.Labels["com.docker.compose.project"]

		fmt.Printf("DEBUG: Found existing container %s with project label: %s\n", containerName, existingProjectLabel)

		if existingProjectLabel == project.Name {
			fmt.Printf("DEBUG: Container %s belongs to this stack (%s), replacing it\n", containerName, project.Name)

			if existingContainer.State == "running" {
				timeout := 10
				if err := client.ContainerStop(ctx, existingContainer.ID, container.StopOptions{
					Timeout: &timeout,
				}); err != nil {
					fmt.Printf("Warning: failed to stop existing container %s: %v\n", existingContainer.ID, err)
				}
			}

			if err := client.ContainerRemove(ctx, existingContainer.ID, container.RemoveOptions{
				Force: true,
			}); err != nil {
				return fmt.Errorf("failed to remove existing container %s: %w", existingContainer.ID, err)
			}
		} else {
			return fmt.Errorf("container name conflict: container '%s' already exists and belongs to project '%s' (current project: '%s'). Please use a different container_name or stop the conflicting container first",
				containerName, existingProjectLabel, project.Name)
		}
	}

	resp, err := client.ContainerCreate(ctx, config, hostConfig, networkConfig, nil, containerName)
	if err != nil {
		if strings.Contains(err.Error(), "already in use") || strings.Contains(err.Error(), "name") {
			return fmt.Errorf("container name conflict: '%s' is already in use by another container. Please use a different container_name in your compose file", containerName)
		}
		return fmt.Errorf("failed to create container %s: %w", containerName, err)
	}

	fmt.Printf("DEBUG: Created container %s with ID %s\n", containerName, resp.ID[:12])

	if err := client.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return fmt.Errorf("failed to start container %s: %w", containerName, err)
	}

	fmt.Printf("DEBUG: Started container %s\n", containerName)
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
		if cont.State == "running" {
			timeout := 10
			client.ContainerStop(ctx, cont.ID, container.StopOptions{
				Timeout: &timeout,
			})
		}

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
			continue
		}
	}

	return nil
}

func (s *StackService) removeVolumes(ctx context.Context, client *client.Client, project *types.Project) error {
	for volumeName := range project.Volumes {
		fullName := fmt.Sprintf("%s_%s", project.Name, volumeName)

		if err := client.VolumeRemove(ctx, fullName, true); err != nil {
			continue
		}
	}

	return nil
}

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

func (s *StackService) getStacksDirectory(ctx context.Context) (string, error) {
	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get settings: %w", err)
	}

	if settings.StacksDirectory == "" {
		return "data/stacks", nil
	}

	return settings.StacksDirectory, nil
}

func (s *StackService) ImportFileBasedStacks(ctx context.Context) error {
	stacksDir, err := s.getStacksDirectory(ctx)
	if err != nil {
		return fmt.Errorf("failed to get stacks directory: %w", err)
	}

	entries, err := os.ReadDir(stacksDir)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return fmt.Errorf("failed to read stacks directory: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		stackID := entry.Name()

		existing, err := s.GetStackByID(ctx, stackID)
		if err == nil && existing != nil {
			continue
		}

		if err := s.importSingleFileBasedStack(ctx, stackID, stacksDir); err != nil {
			fmt.Printf("Warning: failed to import stack %s: %v\n", stackID, err)
		}
	}

	return nil
}

func (s *StackService) importSingleFileBasedStack(ctx context.Context, stackID, stacksDir string) error {
	stackDir := filepath.Join(stacksDir, stackID)

	composeFile := s.findComposeFile(stackDir)
	if composeFile == "" {
		return fmt.Errorf("no compose file found in %s", stackDir)
	}

	if _, err := os.ReadFile(composeFile); err != nil {
		return fmt.Errorf("failed to read compose file: %w", err)
	}

	info, err := os.Stat(stackDir)
	var createdAt time.Time
	if err == nil {
		createdAt = info.ModTime()
	} else {
		createdAt = time.Now()
	}

	stack := &models.Stack{
		ID:           uuid.New().String(),
		Name:         stackID,
		DirName:      &stackID,
		Path:         stackDir,
		Status:       models.StackStatusStopped,
		IsExternal:   false,
		IsLegacy:     true,
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

func (s *StackService) getProjectName(stack *models.Stack) string {
	return stack.ID
}

func (s *StackService) RedeployStack(ctx context.Context, id string, profiles []string, envOverrides map[string]string) error {
	if err := s.DownStack(ctx, id); err != nil {
		return fmt.Errorf("failed to bring down stack during redeploy: %w", err)
	}

	if err := s.DeployStack(ctx, id, profiles, envOverrides); err != nil {
		return fmt.Errorf("failed to deploy stack during redeploy: %w", err)
	}

	return nil
}

func (s *StackService) DownStack(ctx context.Context, id string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&stack).Error; err != nil {
		return fmt.Errorf("stack not found: %w", err)
	}

	projectName := s.getProjectName(&stack)

	alternativeNames := []string{
		projectName,
	}

	if stack.DirName != nil && *stack.DirName != "" && *stack.DirName != projectName {
		alternativeNames = append(alternativeNames, *stack.DirName)
	}

	dirName := ""
	if stack.DirName != nil {
		dirName = *stack.DirName
	}
	if stack.Name != projectName && stack.Name != dirName {
		alternativeNames = append(alternativeNames, stack.Name)
	}

	fmt.Printf("DEBUG: Bringing down stack %s with project names: %v\n", id, alternativeNames)

	var allContainers []container.Summary

	for _, name := range alternativeNames {
		containers, err := dockerClient.ContainerList(ctx, container.ListOptions{
			All: true,
			Filters: filters.NewArgs(
				filters.Arg("label", fmt.Sprintf("com.docker.compose.project=%s", name)),
			),
		})
		if err != nil {
			fmt.Printf("DEBUG: Error listing containers for project %s: %v\n", name, err)
			continue
		}

		for _, cont := range containers {
			found := false
			for _, existing := range allContainers {
				if existing.ID == cont.ID {
					found = true
					break
				}
			}
			if !found {
				allContainers = append(allContainers, cont)
			}
		}
	}

	fmt.Printf("DEBUG: Found %d total containers to stop and remove\n", len(allContainers))

	for _, cont := range allContainers {
		fmt.Printf("DEBUG: Stopping and removing container %s\n", cont.ID[:12])

		if cont.State == "running" {
			timeout := 10
			if err := dockerClient.ContainerStop(ctx, cont.ID, container.StopOptions{
				Timeout: &timeout,
			}); err != nil {
				fmt.Printf("Warning: failed to stop container %s: %v\n", cont.ID, err)
			}
		}

		if err := dockerClient.ContainerRemove(ctx, cont.ID, container.RemoveOptions{
			Force: true,
		}); err != nil {
			fmt.Printf("Warning: failed to remove container %s: %v\n", cont.ID, err)
		}
	}

	return s.UpdateStackStatus(ctx, id, models.StackStatusStopped)
}

func (s *StackService) DestroyStack(ctx context.Context, id string, removeFiles bool, removeVolumes bool) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to create Docker connection: %w", err)
	}
	defer dockerClient.Close()

	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&stack).Error; err != nil {
		return fmt.Errorf("stack not found: %w", err)
	}

	project, err := s.LoadProject(ctx, id)
	if err != nil {
		fmt.Printf("Warning: failed to load project for stack %s: %v\n", id, err)
	}

	if err := s.DownStack(ctx, id); err != nil {
		fmt.Printf("Warning: failed to bring down stack during destroy: %v\n", err)
	}

	if project != nil {
		if err := s.removeNetworks(ctx, dockerClient, project); err != nil {
			fmt.Printf("Warning: failed to remove networks: %v\n", err)
		}
	}

	if removeVolumes && project != nil {
		if err := s.removeVolumes(ctx, dockerClient, project); err != nil {
			fmt.Printf("Warning: failed to remove volumes: %v\n", err)
		}
	}

	if removeFiles {
		if err := os.RemoveAll(stack.Path); err != nil {
			fmt.Printf("Warning: failed to remove stack files at %s: %v\n", stack.Path, err)
		} else {
			fmt.Printf("DEBUG: Removed stack files at %s\n", stack.Path)
		}
	}

	if err := s.DeleteStack(ctx, id); err != nil {
		return fmt.Errorf("failed to remove stack from database: %w", err)
	}

	fmt.Printf("DEBUG: Successfully destroyed stack %s\n", id)
	return nil
}
