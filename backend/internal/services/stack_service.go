package services

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/compose-spec/compose-go/v2/cli"
	"github.com/google/uuid"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"gorm.io/gorm"
)

type StackServiceInfo struct {
	Name        string   `json:"name"`
	Image       string   `json:"image"`
	Status      string   `json:"status"`
	ContainerID string   `json:"container_id"`
	Ports       []string `json:"ports"`
}

type StackService struct {
	db              *database.DB
	settingsService *SettingsService
}

func NewStackService(db *database.DB, settingsService *SettingsService) *StackService {
	return &StackService{
		db:              db,
		settingsService: settingsService,
	}
}

type StackInfo struct {
	ID           string             `json:"id"`
	Name         string             `json:"name"`
	Status       string             `json:"status"`
	Services     []StackServiceInfo `json:"services"`
	ServiceCount int                `json:"service_count"`
	RunningCount int                `json:"running_count"`
	ComposeYAML  string             `json:"compose_yaml,omitempty"`
}

func (s *StackService) CreateStack(ctx context.Context, name, composeContent string, envContent *string) (*models.Stack, error) {
	stackID := uuid.New().String()
	folderName := s.sanitizeStackName(name)

	stacksDir, err := s.getStacksDirectory(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get stacks directory: %w", err)
	}

	stackPath := filepath.Join(stacksDir, folderName)

	counter := 1
	originalPath := stackPath
	for {
		if _, err := os.Stat(stackPath); os.IsNotExist(err) {
			break
		}
		stackPath = fmt.Sprintf("%s-%d", originalPath, counter)
		folderName = fmt.Sprintf("%s-%d", s.sanitizeStackName(name), counter)
		counter++
	}

	stack := &models.Stack{
		ID:           stackID,
		Name:         name,
		DirName:      &folderName,
		Path:         stackPath,
		Status:       models.StackStatusStopped,
		ServiceCount: 0,
		RunningCount: 0,
	}

	if err := s.db.DB.WithContext(ctx).Create(stack).Error; err != nil {
		return nil, fmt.Errorf("failed to create stack: %w", err)
	}

	if err := s.saveStackFiles(stackPath, composeContent, envContent); err != nil {
		s.db.DB.WithContext(ctx).Delete(stack)
		return nil, fmt.Errorf("failed to save stack files: %w", err)
	}

	return stack, nil
}

func (s *StackService) DeployStack(ctx context.Context, stackID string) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return fmt.Errorf("failed to get stack: %w", err)
	}

	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		return fmt.Errorf("stack directory does not exist: %s", stack.Path)
	}

	composeFileName := s.findComposeFileName(stack.Path)
	if composeFileName == "" {
		return fmt.Errorf("no compose file found in stack directory: %s", stack.Path)
	}

	if err := s.UpdateStackStatus(ctx, stackID, models.StackStatusDeploying); err != nil {
		return fmt.Errorf("failed to update stack status to deploying: %w", err)
	}

	cmd := exec.CommandContext(ctx, "docker-compose", "-f", composeFileName, "up", "-d")
	cmd.Dir = stack.Path
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", stack.Name),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		if updateErr := s.UpdateStackStatus(ctx, stackID, models.StackStatusStopped); updateErr != nil {
			return fmt.Errorf("failed to deploy stack: %w, also failed to update status: %w", err, updateErr)
		}
		return fmt.Errorf("failed to deploy stack: %w\nCommand output: %s", err, string(output))
	}

	return s.updateStackStatusAndCounts(ctx, stackID, models.StackStatusRunning)
}

func (s *StackService) StopStack(ctx context.Context, stackID string) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	// Verify stack directory exists
	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		return fmt.Errorf("stack directory does not exist: %s", stack.Path)
	}

	// Update status to stopping first
	if err := s.UpdateStackStatus(ctx, stackID, models.StackStatusStopping); err != nil {
		return fmt.Errorf("failed to update stack status to stopping: %w", err)
	}

	cmd := exec.CommandContext(ctx, "docker-compose", "stop")
	cmd.Dir = stack.Path
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", stack.Name),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to stop stack: %w\nOutput: %s", err, string(output))
	}

	// Update status and counts after successful stop
	return s.updateStackStatusAndCounts(ctx, stackID, models.StackStatusStopped)
}

func (s *StackService) DownStack(ctx context.Context, stackID string) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	// Verify stack directory exists
	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		return fmt.Errorf("stack directory does not exist: %s", stack.Path)
	}

	// Update status to stopping first
	if err := s.UpdateStackStatus(ctx, stackID, models.StackStatusStopping); err != nil {
		return fmt.Errorf("failed to update stack status to stopping: %w", err)
	}

	cmd := exec.CommandContext(ctx, "docker-compose", "down")
	cmd.Dir = stack.Path
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", stack.Name),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to bring down stack: %w\nOutput: %s", err, string(output))
	}

	return s.updateStackStatusAndCounts(ctx, stackID, models.StackStatusStopped)
}

func (s *StackService) GetStackServices(ctx context.Context, stackID string) ([]StackServiceInfo, error) {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return nil, err
	}

	cmd := exec.CommandContext(ctx, "docker-compose", "ps", "--format", "json")
	cmd.Dir = stack.Path
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", stack.Name),
	)

	var services []StackServiceInfo

	output, err := cmd.Output()
	if err == nil {
		services, err = s.parseComposePS(string(output))
		if err != nil {
			return nil, fmt.Errorf("failed to parse compose ps output: %w", err)
		}
	}

	if len(services) > 0 {
		return services, nil
	}

	composeFile := s.findComposeFile(stack.Path)
	if composeFile == "" {
		return nil, fmt.Errorf("no compose file found for stack")
	}

	servicesFromFile, err := s.parseServicesFromComposeFile(ctx, composeFile, stack.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to parse services from compose file: %w", err)
	}

	return servicesFromFile, nil
}

func (s *StackService) parseServicesFromComposeFile(ctx context.Context, composeFile, stackName string) ([]StackServiceInfo, error) {
	options, err := cli.NewProjectOptions(
		[]string{composeFile},
		cli.WithOsEnv,
		cli.WithDotEnv,
		cli.WithName(stackName),
		cli.WithWorkingDirectory(filepath.Dir(composeFile)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create project options: %w", err)
	}

	project, err := options.LoadProject(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to load project: %w", err)
	}

	var services []StackServiceInfo

	for _, service := range project.Services {
		serviceInfo := StackServiceInfo{
			Name:        service.Name,
			Image:       service.Image,
			Status:      "not created",
			ContainerID: "",
			Ports:       []string{},
		}

		for _, port := range service.Ports {
			if port.Published != "" && port.Target != 0 {
				portStr := fmt.Sprintf("%s:%d", port.Published, port.Target)
				if port.Protocol != "" {
					portStr += "/" + port.Protocol
				}
				serviceInfo.Ports = append(serviceInfo.Ports, portStr)
			}
		}

		services = append(services, serviceInfo)
	}

	return services, nil
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

	composeYAML, err := s.getProcessedComposeYAML(ctx, stackID)
	if err != nil {
		composeYAML = ""
	}

	serviceCount, runningCount := s.getServiceCounts(services)

	status := "stopped"
	if serviceCount > 0 {
		if runningCount == serviceCount {
			status = "running"
		} else if runningCount > 0 {
			status = "partially running"
		}
	}

	return &StackInfo{
		ID:           stack.ID,
		Name:         stack.Name,
		Status:       status,
		Services:     services,
		ServiceCount: serviceCount,
		RunningCount: runningCount,
		ComposeYAML:  composeYAML,
	}, nil
}

func (s *StackService) getProcessedComposeYAML(ctx context.Context, stackID string) (string, error) {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return "", err
	}

	composeFile := s.findComposeFile(stack.Path)
	if composeFile == "" {
		return "", fmt.Errorf("no compose file found")
	}

	options, err := cli.NewProjectOptions(
		[]string{composeFile},
		cli.WithOsEnv,
		cli.WithDotEnv,
		cli.WithName(stack.Name),
		cli.WithWorkingDirectory(stack.Path),
	)
	if err != nil {
		return "", fmt.Errorf("failed to create project options: %w", err)
	}

	project, err := options.LoadProject(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to load project: %w", err)
	}

	projectYAML, err := project.MarshalYAML()
	if err != nil {
		return "", fmt.Errorf("failed to marshal YAML: %w", err)
	}

	return string(projectYAML), nil
}

func (s *StackService) RestartStack(ctx context.Context, stackID string) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	// Verify stack directory exists
	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		return fmt.Errorf("stack directory does not exist: %s", stack.Path)
	}

	// Update status to restarting first
	if err := s.UpdateStackStatus(ctx, stackID, models.StackStatusRestarting); err != nil {
		return fmt.Errorf("failed to update stack status to restarting: %w", err)
	}

	cmd := exec.CommandContext(ctx, "docker-compose", "restart")
	cmd.Dir = stack.Path
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", stack.Name),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to restart stack: %w\nOutput: %s", err, string(output))
	}

	// Update status and counts after restart
	return s.updateStackStatusAndCounts(ctx, stackID, models.StackStatusRunning)
}

func (s *StackService) PullStackImages(ctx context.Context, stackID string) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	cmd := exec.CommandContext(ctx, "docker-compose", "pull")
	cmd.Dir = stack.Path
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", stack.Name),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("failed to pull images: %w\nOutput: %s", err, string(output))
	}

	return nil
}

func (s *StackService) ListStacks(ctx context.Context) ([]models.Stack, error) {
	var stacks []models.Stack
	if err := s.db.DB.WithContext(ctx).Find(&stacks).Error; err != nil {
		return nil, fmt.Errorf("failed to get stacks: %w", err)
	}
	return stacks, nil
}

func (s *StackService) UpdateStack(ctx context.Context, stack *models.Stack) (*models.Stack, error) {
	if err := s.db.DB.WithContext(ctx).Save(stack).Error; err != nil {
		return nil, fmt.Errorf("failed to update stack: %w", err)
	}
	return stack, nil
}

func (s *StackService) UpdateStackContent(ctx context.Context, stackID string, composeContent, envContent *string) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	if composeContent != nil {
		existingComposeFile := s.findComposeFile(stack.Path)
		var composePath string

		if existingComposeFile != "" {
			composePath = existingComposeFile
		} else {
			composePath = filepath.Join(stack.Path, "compose.yaml")
		}

		if err := os.WriteFile(composePath, []byte(*composeContent), 0600); err != nil {
			return fmt.Errorf("failed to update compose file: %w", err)
		}
	}

	if envContent != nil {
		envPath := filepath.Join(stack.Path, ".env")
		if *envContent == "" {
			os.Remove(envPath)
		} else {
			if err := os.WriteFile(envPath, []byte(*envContent), 0600); err != nil {
				return fmt.Errorf("failed to update env file: %w", err)
			}
		}
	}

	return nil
}

func (s *StackService) GetStackContent(ctx context.Context, stackID string) (composeContent, envContent string, err error) {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return "", "", err
	}

	composeFile := s.findComposeFile(stack.Path)
	if composeFile != "" {
		if content, err := os.ReadFile(composeFile); err == nil {
			composeContent = string(content)
		}
	}

	envPath := filepath.Join(stack.Path, ".env")
	if content, err := os.ReadFile(envPath); err == nil {
		envContent = string(content)
	}

	return composeContent, envContent, nil
}

func (s *StackService) DeleteStack(ctx context.Context, stackID string) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	if stack.Status == models.StackStatusRunning {
		if err := s.DownStack(ctx, stackID); err != nil {
			fmt.Printf("Warning: failed to stop stack before deletion: %v\n", err)
		}
	}

	if err := s.db.DB.WithContext(ctx).Delete(stack).Error; err != nil {
		return fmt.Errorf("failed to delete stack from database: %w", err)
	}

	if err := os.RemoveAll(stack.Path); err != nil {
		fmt.Printf("Warning: failed to remove stack directory %s: %v\n", stack.Path, err)
	}

	return nil
}

func (s *StackService) DestroyStack(ctx context.Context, stackID string, removeFiles, removeVolumes bool) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	if err := s.DownStack(ctx, stackID); err != nil {
		fmt.Printf("Warning: failed to bring down stack: %v\n", err)
	}

	if removeVolumes {
		cmd := exec.CommandContext(ctx, "docker-compose", "down", "-v")
		cmd.Dir = stack.Path
		cmd.Env = append(os.Environ(),
			fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", stack.Name),
		)

		if output, err := cmd.CombinedOutput(); err != nil {
			fmt.Printf("Warning: failed to remove volumes: %v\nOutput: %s\n", err, string(output))
		}
	}

	if err := s.db.DB.WithContext(ctx).Delete(stack).Error; err != nil {
		return fmt.Errorf("failed to delete stack from database: %w", err)
	}

	if removeFiles {
		if err := os.RemoveAll(stack.Path); err != nil {
			return fmt.Errorf("failed to remove stack files: %w", err)
		}
	}

	return nil
}

func (s *StackService) RedeployStack(ctx context.Context, stackID string, profiles []string, envOverrides map[string]string) error {
	if err := s.PullStackImages(ctx, stackID); err != nil {
		fmt.Printf("Warning: failed to pull images: %v\n", err)
	}

	if err := s.StopStack(ctx, stackID); err != nil {
		return fmt.Errorf("failed to stop stack for redeploy: %w", err)
	}

	return s.DeployStack(ctx, stackID)
}

// DiscoverExternalStacks scans the configured stacks directory and returns any
// folders with a compose file not already tracked in the database.
func (s *StackService) DiscoverExternalStacks(ctx context.Context) ([]models.Stack, error) {
	dir, err := s.getStacksDirectory(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get stacks directory: %w", err)
	}
	entries, err := os.ReadDir(dir)
	if err != nil {
		return nil, fmt.Errorf("failed to read stacks directory: %w", err)
	}
	var externals []models.Stack
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		name := e.Name()
		path := filepath.Join(dir, name)
		if s.findComposeFile(path) == "" {
			continue
		}
		var count int64
		s.db.DB.WithContext(ctx).
			Model(&models.Stack{}).
			Where("path = ?", path).
			Or("dir_name = ?", name).
			Count(&count)
		if count > 0 {
			continue
		}
		externals = append(externals, models.Stack{
			ID:      "", // not yet persisted
			Name:    name,
			DirName: &name,
			Path:    path,
			Status:  models.StackStatusUnknown,
		})
	}
	return externals, nil
}

// ImportExternalStack takes a directory name under the stacks dir and a desired
// stack name, then registers it in the database.
func (s *StackService) ImportExternalStack(ctx context.Context, dirName, stackName string) (*models.Stack, error) {
	baseDir, err := s.getStacksDirectory(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get stacks directory: %w", err)
	}
	path := filepath.Join(baseDir, dirName)
	if _, err := os.Stat(path); os.IsNotExist(err) {
		return nil, fmt.Errorf("stack directory does not exist: %s", path)
	}
	if s.findComposeFile(path) == "" {
		return nil, fmt.Errorf("no compose file found in %s", path)
	}
	stack := &models.Stack{
		ID:           uuid.New().String(),
		Name:         stackName,
		DirName:      &dirName,
		Path:         path,
		Status:       models.StackStatusUnknown,
		ServiceCount: 0,
		RunningCount: 0,
	}
	if err := s.db.DB.WithContext(ctx).Create(stack).Error; err != nil {
		return nil, fmt.Errorf("failed to import stack: %w", err)
	}
	return stack, nil
}

func (s *StackService) ValidateStackCompose(ctx context.Context, composeContent string) error {
	tempDir, err := os.MkdirTemp("", "stack-validation")
	if err != nil {
		return fmt.Errorf("failed to create temp directory: %w", err)
	}
	defer os.RemoveAll(tempDir)

	composePath := filepath.Join(tempDir, "compose.yaml")
	if err := os.WriteFile(composePath, []byte(composeContent), 0600); err != nil {
		return fmt.Errorf("failed to write compose file: %w", err)
	}

	options, err := cli.NewProjectOptions(
		[]string{composePath},
		cli.WithOsEnv,
		cli.WithWorkingDirectory(tempDir),
	)
	if err != nil {
		return fmt.Errorf("failed to create project options: %w", err)
	}

	_, err = options.LoadProject(ctx)
	if err != nil {
		return fmt.Errorf("invalid compose file: %w", err)
	}

	return nil
}

func (s *StackService) GetStackLogs(ctx context.Context, stackID string, tail int, follow bool) (string, error) {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return "", err
	}

	args := []string{"logs"}
	if tail > 0 {
		args = append(args, "--tail", fmt.Sprintf("%d", tail))
	}
	if follow {
		args = append(args, "--follow")
	}

	cmd := exec.CommandContext(ctx, "docker-compose", args...)
	cmd.Dir = stack.Path
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", stack.Name),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		return "", fmt.Errorf("failed to get stack logs: %w", err)
	}

	return string(output), nil
}

func (s *StackService) StreamStackLogs(ctx context.Context, stackID string, logsChan chan<- string, follow bool, tail, since string, timestamps bool) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	args := []string{"logs"}
	if tail != "" {
		args = append(args, "--tail", tail)
	}
	if since != "" {
		args = append(args, "--since", since)
	}
	if timestamps {
		args = append(args, "--timestamps")
	}
	if follow {
		args = append(args, "--follow")
	}

	cmd := exec.CommandContext(ctx, "docker-compose", args...)
	cmd.Dir = stack.Path
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", stack.Name),
	)

	stdout, err := cmd.StdoutPipe()
	if err != nil {
		return fmt.Errorf("failed to create stdout pipe: %w", err)
	}

	stderr, err := cmd.StderrPipe()
	if err != nil {
		return fmt.Errorf("failed to create stderr pipe: %w", err)
	}

	if err := cmd.Start(); err != nil {
		return fmt.Errorf("failed to start docker-compose logs: %w", err)
	}

	// Handle stdout and stderr concurrently
	done := make(chan error, 2)

	// Read stdout
	go func() {
		done <- s.readStackLogsFromReader(ctx, stdout, logsChan, "stdout")
	}()

	// Read stderr
	go func() {
		done <- s.readStackLogsFromReader(ctx, stderr, logsChan, "stderr")
	}()

	// Wait for command completion or context cancellation
	go func() {
		done <- cmd.Wait()
	}()

	// Wait for context cancellation or error
	select {
	case <-ctx.Done():
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		return ctx.Err()
	case err := <-done:
		if cmd.Process != nil {
			_ = cmd.Process.Kill()
		}
		if err != nil && !errors.Is(err, io.EOF) {
			return err
		}
		return nil
	}
}

func (s *StackService) readStackLogsFromReader(ctx context.Context, reader io.Reader, logsChan chan<- string, source string) error {
	scanner := bufio.NewScanner(reader)
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024) // Increase buffer size for large log lines

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

func (s *StackService) ConvertDockerRun(ctx context.Context, dockerRunCommand string) (string, error) {
	// This would use your converter service to convert docker run to compose
	// For now, return error indicating not implemented
	return "", fmt.Errorf("docker run conversion not implemented yet")
}

func (s *StackService) GetStackByID(ctx context.Context, id string) (*models.Stack, error) {
	var stack models.Stack
	if err := s.db.DB.WithContext(ctx).Where("id = ?", id).First(&stack).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("stack not found")
		}
		return nil, fmt.Errorf("failed to get stack: %w", err)
	}
	return &stack, nil
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

func (s *StackService) updateStackStatusAndCounts(ctx context.Context, stackID string, status models.StackStatus) error {
	// Get current service counts
	services, err := s.GetStackServices(ctx, stackID)
	if err != nil {
		// If we can't get services, just update status
		return s.UpdateStackStatus(ctx, stackID, status)
	}

	serviceCount, runningCount := s.getServiceCounts(services)

	// Update all fields at once
	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Where("id = ?", stackID).Updates(map[string]interface{}{
		"status":        status,
		"service_count": serviceCount,
		"running_count": runningCount,
		"updated_at":    time.Now(),
	}).Error; err != nil {
		return fmt.Errorf("failed to update stack status and counts: %w", err)
	}

	return nil
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

func (s *StackService) saveStackFiles(stackPath, composeContent string, envContent *string) error {
	if err := os.MkdirAll(stackPath, 0755); err != nil {
		return fmt.Errorf("failed to create stack directory: %w", err)
	}

	existingComposeFile := s.findComposeFile(stackPath)
	var composePath string

	if existingComposeFile != "" {
		composePath = existingComposeFile
	} else {
		composePath = filepath.Join(stackPath, "compose.yaml")
	}

	if err := os.WriteFile(composePath, []byte(composeContent), 0600); err != nil {
		return fmt.Errorf("failed to save compose file: %w", err)
	}

	if envContent != nil && *envContent != "" {
		envPath := filepath.Join(stackPath, ".env")
		if err := os.WriteFile(envPath, []byte(*envContent), 0600); err != nil {
			return fmt.Errorf("failed to save env file: %w", err)
		}
	}

	return nil
}

func (s *StackService) findComposeFile(stackDir string) string {
	composeFiles := []string{
		"compose.yaml",
		"compose.yml",
		"docker-compose.yaml",
		"docker-compose.yml",
	}

	for _, filename := range composeFiles {
		fullPath := filepath.Join(stackDir, filename)
		if _, err := os.Stat(fullPath); err == nil {
			return fullPath
		}
	}

	return ""
}

func (s *StackService) findComposeFileName(stackDir string) string {
	composeFiles := []string{
		"compose.yaml",
		"compose.yml",
		"docker-compose.yaml",
		"docker-compose.yml",
	}

	for _, filename := range composeFiles {
		fullPath := filepath.Join(stackDir, filename)
		if _, err := os.Stat(fullPath); err == nil {
			return filename // Return just the filename, not the full path
		}
	}

	return ""
}

func (s *StackService) parseComposePS(output string) ([]StackServiceInfo, error) {
	if strings.TrimSpace(output) == "" {
		return []StackServiceInfo{}, nil
	}

	// The output from docker-compose ps --format json can be either:
	// 1. A JSON array of objects
	// 2. Multiple JSON objects separated by newlines (JSONL format)

	var services []StackServiceInfo

	if strings.HasPrefix(strings.TrimSpace(output), "[") {
		var psOutput []map[string]interface{}
		if err := json.Unmarshal([]byte(output), &psOutput); err == nil {
			for _, item := range psOutput {
				service := s.parseComposeService(item)
				if service != nil {
					services = append(services, *service)
				}
			}
			return services, nil
		}
	}

	lines := strings.Split(strings.TrimSpace(output), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" {
			continue
		}

		var item map[string]interface{}
		if err := json.Unmarshal([]byte(line), &item); err != nil {
			// Skip invalid JSON lines
			continue
		}

		service := s.parseComposeService(item)
		if service != nil {
			services = append(services, *service)
		}
	}

	return services, nil
}

func (s *StackService) parseComposeService(item map[string]interface{}) *StackServiceInfo {
	service := &StackServiceInfo{}

	if name, ok := item["Name"].(string); ok {
		service.Name = name
	} else if service_name, ok := item["Service"].(string); ok {
		service.Name = service_name
	}

	if image, ok := item["Image"].(string); ok {
		service.Image = image
	}

	if state, ok := item["State"].(string); ok {
		service.Status = state
	} else if status, ok := item["Status"].(string); ok {
		service.Status = status
	}

	if id, ok := item["ID"].(string); ok {
		service.ContainerID = id
	} else if container_id, ok := item["ContainerID"].(string); ok {
		service.ContainerID = container_id
	}

	if portsInterface, ok := item["Ports"]; ok {
		switch ports := portsInterface.(type) {
		case string:
			if ports != "" {
				service.Ports = []string{ports}
			}
		case []interface{}:
			for _, port := range ports {
				if portStr, ok := port.(string); ok && portStr != "" {
					service.Ports = append(service.Ports, portStr)
				}
			}
		case []string:
			service.Ports = ports
		}
	}

	if service.Name == "" {
		return nil
	}

	return service
}

func (s *StackService) getServiceCounts(services []StackServiceInfo) (total int, running int) {
	total = len(services)
	for _, service := range services {
		if service.Status == "running" || service.Status == "Up" {
			running++
		}
	}
	return total, running
}
