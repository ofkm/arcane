package services

import (
	"bufio"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
	"time"

	"github.com/compose-spec/compose-go/v2/cli"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/docker"
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
	eventService    *EventService
	imageService    *ImageService
}

func NewStackService(db *database.DB, settingsService *SettingsService, eventService *EventService, imageService *ImageService) *StackService {
	return &StackService{
		db:              db,
		settingsService: settingsService,
		eventService:    eventService,
		imageService:    imageService,
	}
}

func (s *StackService) CreateStack(ctx context.Context, name, composeContent string, envContent *string, user models.User) (*models.Stack, error) {
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
		Name:         name,
		DirName:      &folderName,
		Path:         stackPath,
		Status:       models.StackStatusStopped,
		ServiceCount: 0,
		RunningCount: 0,
	}

	if err := s.db.WithContext(ctx).Create(stack).Error; err != nil {
		return nil, fmt.Errorf("failed to create stack: %w", err)
	}

	if err := s.saveStackFiles(stackPath, composeContent, envContent); err != nil {
		s.db.WithContext(ctx).Delete(stack)
		return nil, fmt.Errorf("failed to save stack files: %w", err)
	}

	metadata := models.JSON{
		"action":    "create",
		"stackId":   stack.ID,
		"stackName": name,
		"path":      stackPath,
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackCreate, stack.ID, name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log stack creation action: %s\n", logErr)
	}

	return stack, nil
}

func (s *StackService) DeployStack(ctx context.Context, stackID string, user models.User) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return fmt.Errorf("failed to get stack: %w", err)
	}

	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		return fmt.Errorf("stack directory does not exist: %s", stack.Path)
	}

	composeFileFullPath := docker.LocateComposeFile(stack.Path)
	if composeFileFullPath == "" {
		return fmt.Errorf("no compose file found in stack directory: %s", stack.Path)
	}

	if err := s.UpdateStackStatus(ctx, stackID, models.StackStatusDeploying); err != nil {
		return fmt.Errorf("failed to update stack status to deploying: %w", err)
	}

	cmd := exec.CommandContext(ctx, "docker-compose", "-f", composeFileFullPath, "up", "-d")
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

	// Log stack deployment event
	metadata := models.JSON{
		"action":    "deploy",
		"stackId":   stackID,
		"stackName": stack.Name,
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackDeploy, stackID, stack.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log stack deployment action: %s\n", logErr)
	}

	return s.updateStackStatusAndCounts(ctx, stackID, models.StackStatusRunning)
}

func (s *StackService) DownStack(ctx context.Context, stackID string, user models.User) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	// Verify stack directory exists
	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		return fmt.Errorf("stack directory does not exist: %s", stack.Path)
	}

	composeFileFullPath := docker.LocateComposeFile(stack.Path)
	if composeFileFullPath == "" {
		return fmt.Errorf("no compose file found in stack directory: %s", stack.Path)
	}

	// Update status to stopping first
	if err := s.UpdateStackStatus(ctx, stackID, models.StackStatusStopping); err != nil {
		return fmt.Errorf("failed to update stack status to stopping: %w", err)
	}

	cmd := exec.CommandContext(ctx, "docker-compose", "-f", composeFileFullPath, "down")
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", stack.Name),
	)

	output, err := cmd.CombinedOutput()
	if err != nil {
		if updateErr := s.UpdateStackStatus(ctx, stackID, models.StackStatusDeploying); updateErr != nil {
			return fmt.Errorf("failed to down project: %w, also failed to update status: %w", err, updateErr)
		}
		return fmt.Errorf("failed to bring down stack: %w\nOutput: %s", err, string(output))
	}

	// Log stack down event
	metadata := models.JSON{
		"action":    "down",
		"stackId":   stackID,
		"stackName": stack.Name,
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackStop, stackID, stack.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log stack down action: %s\n", logErr)
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

	composeFile := docker.LocateComposeFile(stack.Path)
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

func (s *StackService) RestartStack(ctx context.Context, stackID string, user models.User) error {
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

	// Log stack restart event
	metadata := models.JSON{
		"action":    "restart",
		"stackId":   stackID,
		"stackName": stack.Name,
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackStart, stackID, stack.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log stack restart action: %s\n", logErr)
	}

	// Update status and counts after restart
	return s.updateStackStatusAndCounts(ctx, stackID, models.StackStatusRunning)
}

func (s *StackService) PullStackImages(ctx context.Context, stackID string, progressWriter io.Writer) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	images, err := s.collectStackImages(ctx, stack)
	if err != nil {
		return err
	}

	// Prefer ImageService when available (structured progress), otherwise fallback to docker-compose pull
	if s.imageService != nil && len(images) > 0 {
		return s.pullImagesViaImageService(ctx, stack, images, progressWriter)
	}

	return s.composePull(ctx, stack, progressWriter)
}

// lineEmitter provides line/JSON writing with optional HTTP flushing.
type lineEmitter struct {
	w       io.Writer
	flusher http.Flusher
}

func newLineEmitter(w io.Writer) lineEmitter {
	if w == nil {
		w = io.Discard
	}
	f, _ := w.(http.Flusher)
	return lineEmitter{w: w, flusher: f}
}

func (le lineEmitter) WriteLine(b []byte) error {
	if len(b) > 0 {
		if _, err := le.w.Write(b); err != nil {
			return err
		}
	}
	if _, err := le.w.Write([]byte("\n")); err != nil {
		return err
	}
	if le.flusher != nil {
		le.flusher.Flush()
	}
	return nil
}

func (le lineEmitter) WriteJSON(m map[string]any) {
	data, err := json.Marshal(m)
	if err != nil {
		fmt.Printf("failed to marshal json: %v\n", err)
		return
	}
	_ = le.WriteLine(data)
}

func (s *StackService) collectStackImages(ctx context.Context, stack *models.Stack) ([]string, error) {
	composeFile := docker.LocateComposeFile(stack.Path)
	if composeFile == "" {
		return nil, fmt.Errorf("no compose file found for stack")
	}

	servicesFromFile, err := s.parseServicesFromComposeFile(ctx, composeFile, stack.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to parse services from compose file: %w", err)
	}

	seen := map[string]struct{}{}
	var images []string
	for _, svc := range servicesFromFile {
		img := strings.TrimSpace(svc.Image)
		if img == "" {
			continue
		}
		if _, ok := seen[img]; ok {
			continue
		}
		seen[img] = struct{}{}
		images = append(images, img)
	}
	return images, nil
}

func (s *StackService) pullImagesViaImageService(ctx context.Context, stack *models.Stack, images []string, w io.Writer) error {
	le := newLineEmitter(w)
	le.WriteJSON(map[string]any{
		"status": "Pulling images for stack",
		"id":     stack.Name,
	})

	var firstErr error
	for _, raw := range images {
		img := refForPull(raw) // strip digest and ensure a tag

		le.WriteJSON(map[string]any{"status": "Pulling", "id": img})

		if err := s.imageService.PullImage(ctx, img, w, systemUser); err != nil {
			le.WriteJSON(map[string]any{
				"error":   err.Error(),
				"status":  "error",
				"id":      img,
				"stackId": stack.ID,
			})
			if firstErr == nil {
				firstErr = err
			}
			continue
		}

		le.WriteJSON(map[string]any{
			"status":         "Pull complete",
			"id":             img,
			"progressDetail": map[string]any{"hidecounts": true},
		})
	}

	le.WriteJSON(map[string]any{"status": "Done", "id": stack.Name})
	return firstErr
}

// refForPull strips any digest from the reference and ensures a tag (defaults to ":latest")
func refForPull(ref string) string {
	ref = strings.TrimSpace(ref)
	// remove digest if present
	if i := strings.Index(ref, "@"); i != -1 {
		ref = ref[:i]
	}
	// ensure a tag exists; consider ":" only if it appears after the last "/"
	lastSlash := strings.LastIndex(ref, "/")
	lastColon := strings.LastIndex(ref, ":")
	if lastColon <= lastSlash {
		ref += ":latest"
	}
	return ref
}

func (s *StackService) composePull(ctx context.Context, stack *models.Stack, w io.Writer) error {
	le := newLineEmitter(w)

	cmd := exec.CommandContext(ctx, "docker-compose", "pull")
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
		return fmt.Errorf("failed to start docker-compose pull: %w", err)
	}

	errCh := make(chan error, 3)

	go func() { errCh <- s.streamPipeToWriter(ctx, stdout, le, "stdout") }()
	go func() { errCh <- s.streamPipeToWriter(ctx, stderr, le, "stderr") }()
	go func() { errCh <- cmd.Wait() }()

	var firstErr error
	for i := 0; i < 3; i++ {
		if e := <-errCh; e != nil && firstErr == nil && !errors.Is(e, io.EOF) && !errors.Is(e, context.Canceled) {
			firstErr = e
		}
	}

	if ctx.Err() != nil && cmd.Process != nil {
		_ = cmd.Process.Kill()
	}

	return firstErr
}

func (s *StackService) streamPipeToWriter(ctx context.Context, r io.Reader, le lineEmitter, label string) error {
	sc := bufio.NewScanner(r)
	sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
	for sc.Scan() {
		if ctx.Err() != nil {
			return ctx.Err()
		}
		if err := le.WriteLine([]byte(sc.Text())); err != nil {
			return fmt.Errorf("error writing %s: %w", label, err)
		}
	}
	return sc.Err()
}

func (s *StackService) ListStacks(ctx context.Context) ([]models.Stack, error) {
	var stacks []models.Stack
	if err := s.db.WithContext(ctx).Find(&stacks).Error; err != nil {
		return nil, fmt.Errorf("failed to get stacks: %w", err)
	}
	return stacks, nil
}

func (s *StackService) ListStacksPaginated(ctx context.Context, req utils.SortedPaginationRequest) ([]map[string]interface{}, utils.PaginationResponse, error) {
	var stacks []models.Stack
	query := s.db.WithContext(ctx).Model(&models.Stack{})

	pagination, err := utils.PaginateAndSort(req, query, &stacks)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to paginate stacks: %w", err)
	}

	var result []map[string]interface{}
	for _, stack := range stacks {
		result = append(result, map[string]interface{}{
			"id":           stack.ID,
			"name":         stack.Name,
			"path":         stack.Path,
			"status":       stack.Status,
			"serviceCount": stack.ServiceCount,
			"runningCount": stack.RunningCount,
			"createdAt":    stack.CreatedAt,
			"updatedAt":    stack.UpdatedAt,
			"autoUpdate":   stack.AutoUpdate,
		})
	}
	return result, pagination, nil
}

//nolint:gocognit
func (s *StackService) SyncAllStacksFromFilesystem(ctx context.Context) error {
	stacksDir, dirErr := s.getStacksDirectory(ctx)
	if dirErr != nil {
		fmt.Printf("Warning: failed to get stacks directory from settings, falling back to default: %v\n", dirErr)
	}
	if strings.TrimSpace(stacksDir) == "" {
		stacksDir = "data/projects"
	}
	stacksDir = filepath.Clean(stacksDir)

	// If the stacks directory doesn't exist, create it and treat as empty.
	if _, statErr := os.Stat(stacksDir); os.IsNotExist(statErr) {
		if mkErr := os.MkdirAll(stacksDir, 0755); mkErr != nil {
			fmt.Printf("Warning: failed to create stacks directory %q: %v\n", stacksDir, mkErr)
			return nil // treat as empty
		}
		return nil // created; nothing to sync
	} else if statErr != nil {
		fmt.Printf("Warning: unable to access stacks directory %q: %v\n", stacksDir, statErr)
		return nil // treat as empty
	}

	entries, err := os.ReadDir(stacksDir)
	if err != nil {
		fmt.Printf("Warning: failed to read stacks directory %q: %v\n", stacksDir, err)
		return nil // treat as empty
	}

	// Track which directories we've seen
	seenDirs := utils.NewEmptyStructMap[string]()

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		dirName := entry.Name()
		dirPath := filepath.Join(stacksDir, dirName)
		seenDirs[dirPath] = struct{}{}

		// Skip if no compose file
		if docker.LocateComposeFile(dirPath) == "" {
			continue
		}

		// Check if already tracked
		var existingStack models.Stack
		err := s.db.WithContext(ctx).Where("path = ? OR dir_name = ?", dirPath, dirName).First(&existingStack).Error

		if errors.Is(err, gorm.ErrRecordNotFound) {
			if _, importErr := s.importExternalStack(ctx, dirName, dirName, systemUser); importErr != nil {
				fmt.Printf("Warning: failed to auto-import stack %s: %v\n", dirName, importErr)
			}
		} else if err == nil {
			s.syncStackWithFilesystem(ctx, &existingStack)
		}
	}

	// Remove stacks whose directories or compose files no longer exist
	var allStacks []models.Stack
	s.db.WithContext(ctx).Find(&allStacks)

	for _, stack := range allStacks {
		// Directory missing
		if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
			if err := s.db.WithContext(ctx).Where("stack_id = ?", stack.ID).Delete(&models.ProjectCache{}).Error; err != nil {
				fmt.Printf("Warning: failed to delete cache for removed stack %s: %v\n", stack.ID, err)
			}
			if err := s.db.WithContext(ctx).Delete(&models.Stack{}, "id = ?", stack.ID).Error; err != nil {
				fmt.Printf("Warning: failed to delete removed stack %s: %v\n", stack.ID, err)
			} else {
				metadata := models.JSON{
					"action":    "auto-delete",
					"stackId":   stack.ID,
					"stackName": stack.Name,
					"path":      stack.Path,
					"reason":    "missing_directory",
				}
				if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackDelete, stack.ID, stack.Name, systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
					fmt.Printf("Could not log auto-delete action: %s\n", logErr)
				}
			}
			continue
		}

		if docker.LocateComposeFile(stack.Path) == "" {
			if err := s.db.WithContext(ctx).Where("stack_id = ?", stack.ID).Delete(&models.ProjectCache{}).Error; err != nil {
				fmt.Printf("Warning: failed to delete cache for removed stack %s: %v\n", stack.ID, err)
			}
			if err := s.db.WithContext(ctx).Delete(&models.Stack{}, "id = ?", stack.ID).Error; err != nil {
				fmt.Printf("Warning: failed to delete removed stack %s: %v\n", stack.ID, err)
			} else {
				metadata := models.JSON{
					"action":    "auto-delete",
					"stackId":   stack.ID,
					"stackName": stack.Name,
					"path":      stack.Path,
					"reason":    "missing_compose_file",
				}
				if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackDelete, stack.ID, stack.Name, systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
					fmt.Printf("Could not log auto-delete action: %s\n", logErr)
				}
			}
			continue
		}
	}

	return nil
}

// syncStackWithFilesystem updates the stack with current filesystem/docker status
func (s *StackService) syncStackWithFilesystem(ctx context.Context, stack *models.Stack) {
	// Check if directory still exists
	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		stack.Status = "unknown"
		stack.ServiceCount = 0
		stack.RunningCount = 0
		s.updateStackInDB(ctx, stack)
		return
	}

	// Check if compose file still exists
	if docker.LocateComposeFile(stack.Path) == "" {
		stack.Status = "unknown"
		stack.ServiceCount = 0
		stack.RunningCount = 0
		s.updateStackInDB(ctx, stack)
		return
	}

	// Get live status from docker-compose
	if status, total, running, err := s.getLiveStackStatus(ctx, stack.Path, stack.Name); err == nil {
		// Only update if there's a change to avoid unnecessary DB writes
		if stack.Status != status || stack.ServiceCount != total || stack.RunningCount != running {
			stack.Status = status
			stack.ServiceCount = total
			stack.RunningCount = running
			s.updateStackInDB(ctx, stack)
		}
	}
}

// updateStackInDB updates the stack record in database (async to avoid blocking)
func (s *StackService) updateStackInDB(ctx context.Context, stack *models.Stack) {
	go func() {
		if err := s.db.WithContext(ctx).Model(stack).Updates(map[string]interface{}{
			"status":        stack.Status,
			"service_count": stack.ServiceCount,
			"running_count": stack.RunningCount,
			"updated_at":    time.Now(),
		}).Error; err != nil {
			// Log error but don't fail the main operation
			fmt.Printf("Warning: failed to update stack %s in database: %v\n", stack.ID, err)
		}
	}()
}

func (s *StackService) UpdateStack(ctx context.Context, stack *models.Stack) (*models.Stack, error) {
	if err := s.db.WithContext(ctx).Save(stack).Error; err != nil {
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
		existingComposeFile := docker.LocateComposeFile(stack.Path)
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

	composeFile := docker.LocateComposeFile(stack.Path)
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

func (s *StackService) DestroyStack(ctx context.Context, stackID string, removeFiles, removeVolumes bool, user models.User) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	if err := s.DownStack(ctx, stackID, systemUser); err != nil {
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

	if removeFiles {
		if err := os.RemoveAll(stack.Path); err != nil {
			return fmt.Errorf("failed to remove stack files: %w", err)
		}
	}

	if err := s.db.WithContext(ctx).Delete(stack).Error; err != nil {
		return fmt.Errorf("failed to delete stack from database: %w", err)
	}

	// Log stack destroy event
	metadata := models.JSON{
		"action":        "destroy",
		"stackId":       stackID,
		"stackName":     stack.Name,
		"removeFiles":   removeFiles,
		"removeVolumes": removeVolumes,
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackDelete, stackID, stack.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log stack destroy action: %s\n", logErr)
	}

	return nil
}

func (s *StackService) RedeployStack(ctx context.Context, stackID string, profiles []string, envOverrides map[string]string, user models.User) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	// Pull first (wait for completion and auth via ImageService)
	if err := s.PullStackImages(ctx, stackID, io.Discard); err != nil {
		fmt.Printf("Warning: failed to pull images: %v\n", err)
	}

	// Use down (not stop) to avoid port/name conflicts and ensure a clean restart
	if err := s.DownStack(ctx, stackID, systemUser); err != nil {
		return fmt.Errorf("failed to down stack for redeploy: %w", err)
	}

	// Log stack redeploy event
	metadata := models.JSON{
		"action":    "redeploy",
		"stackId":   stackID,
		"stackName": stack.Name,
		"profiles":  profiles,
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackDeploy, stackID, stack.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log stack redeploy action: %s\n", logErr)
	}

	return s.DeployStack(ctx, stackID, systemUser)
}

// getLiveStackStatus runs `docker-compose ps --format json` in the stackDir
// and returns a status plus total / running service counts.
func (s *StackService) getLiveStackStatus(ctx context.Context, stackDir, projectName string) (models.StackStatus, int, int, error) {
	cmd := exec.CommandContext(ctx, "docker-compose", "ps", "--format", "json")
	cmd.Dir = stackDir
	cmd.Env = append(os.Environ(),
		fmt.Sprintf("COMPOSE_PROJECT_NAME=%s", projectName),
	)
	out, err := cmd.Output()
	if err != nil {
		// Only return unknown if the command itself failed (e.g., compose file invalid)
		return models.StackStatusUnknown, 0, 0, err
	}

	svcs, err := s.parseComposePS(string(out))
	if err != nil {
		// If we can't parse the output, that's unknown
		return models.StackStatusUnknown, 0, 0, err
	}

	// Get service count from compose file to know the expected total
	composeFile := docker.LocateComposeFile(stackDir)
	if composeFile != "" {
		if expectedServices, err := s.parseServicesFromComposeFile(ctx, composeFile, projectName); err == nil {
			expectedTotal := len(expectedServices)
			total, running := s.getServiceCounts(svcs)

			switch {
			case total == 0 && expectedTotal > 0:
				// No containers running but compose file has services = stopped
				return models.StackStatusStopped, expectedTotal, 0, nil
			case running == total && total > 0:
				return models.StackStatusRunning, total, running, nil
			case running > 0:
				return models.StackStatusPartiallyRunning, total, running, nil
			case total == 0 && expectedTotal == 0:
				// Edge case: empty compose file
				return models.StackStatusStopped, 0, 0, nil
			default:
				return models.StackStatusStopped, total, running, nil
			}
		}
	}

	// Fallback to original logic if we can't read compose file
	total, running := s.getServiceCounts(svcs)
	switch {
	case total == 0:
		return models.StackStatusStopped, total, running, nil
	case running == total:
		return models.StackStatusRunning, total, running, nil
	case running > 0:
		return models.StackStatusPartiallyRunning, total, running, nil
	default:
		return models.StackStatusStopped, total, running, nil
	}
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

func (s *StackService) GetStackByID(ctx context.Context, id string) (*models.Stack, error) {
	var stack models.Stack
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&stack).Error; err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, fmt.Errorf("request canceled or timed out")
		}
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
		return "data/projects", fmt.Errorf("failed to get settings: %w", err)
	}

	stacksDirectory := settings.StacksDirectory.Value

	return stacksDirectory, nil
}

func (s *StackService) saveStackFiles(stackPath, composeContent string, envContent *string) error {
	if err := os.MkdirAll(stackPath, 0755); err != nil {
		return fmt.Errorf("failed to create stack directory: %w", err)
	}

	existingComposeFile := docker.LocateComposeFile(stackPath)
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

func (s *StackService) importExternalStack(ctx context.Context, dirName, stackName string, user models.User) (*models.Stack, error) {
	stacksDir, err := s.getStacksDirectory(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get stacks directory: %w", err)
	}

	path := filepath.Join(stacksDir, dirName)
	if docker.LocateComposeFile(path) == "" {
		return nil, fmt.Errorf("no compose file found in %q", path)
	}

	// probe live status & counts
	status, svcCount, runCount, err := s.getLiveStackStatus(ctx, path, stackName)
	if err != nil {
		// we'll still import it, but mark unknown
		status = models.StackStatusUnknown
	}

	stack := &models.Stack{
		Name:         stackName,
		DirName:      &dirName,
		Path:         path,
		Status:       status,
		ServiceCount: svcCount,
		RunningCount: runCount,
		IsExternal:   true,
	}

	if err := s.db.WithContext(ctx).Create(stack).Error; err != nil {
		return nil, fmt.Errorf("failed to import external stack: %w", err)
	}

	// Log stack import event
	metadata := models.JSON{
		"action":     "import",
		"stackId":    stack.ID,
		"stackName":  stackName,
		"dirName":    dirName,
		"path":       path,
		"isExternal": true,
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackCreate, stack.ID, stackName, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log stack import action: %s\n", logErr)
	}

	return stack, nil
}

func (s *StackService) GetProjectStatusCounts(ctx context.Context) (folderCount, runningStacks, stoppedStacks, totalStacks int, err error) {
	stacksDir, derr := s.getStacksDirectory(ctx)
	if derr != nil {
		return 0, 0, 0, 0, fmt.Errorf("could not determine stacks directory: %w", derr)
	}

	// Count only directories that contain a compose file
	if info, statErr := os.Stat(stacksDir); statErr == nil && info.IsDir() {
		entries, readErr := os.ReadDir(stacksDir)
		if readErr != nil {
			return 0, 0, 0, 0, fmt.Errorf("failed to read stacks directory %s: %w", stacksDir, readErr)
		}
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			dirPath := filepath.Join(stacksDir, e.Name())
			if docker.LocateComposeFile(dirPath) != "" {
				folderCount++
			}
		}
	} else if os.IsNotExist(statErr) {
		// Directory missing: folderCount stays 0
	} else if statErr != nil {
		return 0, 0, 0, 0, fmt.Errorf("unable to access stacks directory %s: %w", stacksDir, statErr)
	}

	// DB counts
	var (
		running int64
		stopped int64
		total   int64
	)
	if err := s.db.WithContext(ctx).Model(&models.Stack{}).Count(&total).Error; err != nil {
		return folderCount, 0, 0, 0, fmt.Errorf("failed to count total stacks: %w", err)
	}
	// running = running + partially_running
	if err := s.db.WithContext(ctx).
		Model(&models.Stack{}).
		Where("status IN ?", []models.StackStatus{models.StackStatusRunning, models.StackStatusPartiallyRunning}).
		Count(&running).Error; err != nil {
		return folderCount, 0, 0, int(total), fmt.Errorf("failed to count running stacks: %w", err)
	}
	if err := s.db.WithContext(ctx).
		Model(&models.Stack{}).
		Where("status = ?", models.StackStatusStopped).
		Count(&stopped).Error; err != nil {
		return folderCount, int(running), 0, int(total), fmt.Errorf("failed to count stopped stacks: %w", err)
	}

	return folderCount, int(running), int(stopped), int(total), nil
}
