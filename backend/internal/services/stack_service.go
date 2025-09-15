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

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/projects"
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

	composeFileFullPath, derr := projects.DetectComposeFile(stack.Path)
	if derr != nil {
		return fmt.Errorf("no compose file found in stack directory: %s", stack.Path)
	}

	if err := s.UpdateStackStatus(ctx, stackID, models.StackStatusDeploying); err != nil {
		return fmt.Errorf("failed to update stack status to deploying: %w", err)
	}

	output, err := projects.RunComposeAction(ctx, composeFileFullPath, stack.Name, "deploy")

	if err != nil {
		if updateErr := s.UpdateStackStatus(ctx, stackID, models.StackStatusStopped); updateErr != nil {
			return fmt.Errorf("failed to deploy stack: %w, also failed to update status: %w", err, updateErr)
		}
		return fmt.Errorf("failed to deploy stack: %w\nCommand output: %s", err, string(output))
	}

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

	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		return fmt.Errorf("stack directory does not exist: %s", stack.Path)
	}

	composeFileFullPath, derr := projects.DetectComposeFile(stack.Path)
	if derr != nil {
		return fmt.Errorf("no compose file found in stack directory: %s", stack.Path)
	}

	if err := s.UpdateStackStatus(ctx, stackID, models.StackStatusStopping); err != nil {
		return fmt.Errorf("failed to update stack status to stopping: %w", err)
	}

	out, err := projects.RunComposeAction(ctx, composeFileFullPath, stack.Name, "down")
	if err != nil {
		if updateErr := s.UpdateStackStatus(ctx, stackID, models.StackStatusRunning); updateErr != nil {
			return fmt.Errorf("failed to down project: %w, also failed to update status: %w", err, updateErr)
		}
		return fmt.Errorf("failed to bring down stack: %w\nOutput: %s", err, out)
	}

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

	composeFile, derr := projects.DetectComposeFile(stack.Path)
	if derr != nil {
		return nil, fmt.Errorf("no compose file found for stack")
	}

	project, err := projects.LoadComposeProject(ctx, composeFile, stack.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to load compose project: %w", err)
	}

	statuses, err := projects.ComposeServicesStatus(ctx, project, composeFile, stack.Name)
	if err != nil {
		return nil, fmt.Errorf("failed to get compose services status: %w", err)
	}

	var services []StackServiceInfo
	for _, ssvc := range statuses {
		services = append(services, StackServiceInfo{
			Name:        ssvc.Name,
			Image:       ssvc.Image,
			Status:      ssvc.Status,
			ContainerID: ssvc.ContainerID,
			Ports:       ssvc.Ports,
		})
	}

	return services, nil
}

func (s *StackService) RestartStack(ctx context.Context, stackID string, user models.User) error {
	stack, err := s.GetStackByID(ctx, stackID)
	if err != nil {
		return err
	}

	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		return fmt.Errorf("stack directory does not exist: %s", stack.Path)
	}

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

	metadata := models.JSON{
		"action":    "restart",
		"stackId":   stackID,
		"stackName": stack.Name,
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackStart, stackID, stack.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log stack restart action: %s\n", logErr)
	}

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

	if s.imageService != nil && len(images) > 0 {
		return s.pullImagesViaImageService(ctx, stack, images, progressWriter)
	}

	return s.composePull(ctx, stack, progressWriter)
}

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
	services, err := s.GetStackServices(ctx, stack.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stack services: %w", err)
	}

	seen := map[string]struct{}{}
	var images []string
	for _, svc := range services {
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
		img := refForPull(raw)

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

func refForPull(ref string) string {
	ref = strings.TrimSpace(ref)
	if i := strings.Index(ref, "@"); i != -1 {
		ref = ref[:i]
	}
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

	if term := strings.TrimSpace(req.Search); term != "" {
		like := "%" + strings.ToLower(term) + "%"
		query = query.Where(`
			LOWER(name) LIKE ? OR
			LOWER(path) LIKE ? OR
			LOWER(status) LIKE ? OR
			LOWER(COALESCE(dir_name, '')) LIKE ?
		`, like, like, like, like)
	}

	switch strings.ToLower(strings.TrimSpace(req.Sort.Column)) {
	case "created", "createdat":
		req.Sort.Column = "created_at"
	case "updated", "updatedat":
		req.Sort.Column = "updated_at"
	case "servicecount":
		req.Sort.Column = "service_count"
	case "runningcount":
		req.Sort.Column = "running_count"
	case "dirname", "dir_name":
		req.Sort.Column = "dir_name"
	case "name", "status", "path":
	default:
	}

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

func (s *StackService) SyncAllStacksFromFilesystem(ctx context.Context) error {
	stacksDir, dirErr := s.getStacksDirectory(ctx)
	if dirErr != nil {
		fmt.Printf("Warning: failed to get stacks directory from settings, falling back to default: %v\n", dirErr)
	}
	if strings.TrimSpace(stacksDir) == "" {
		stacksDir = "data/projects"
	}
	stacksDir = filepath.Clean(stacksDir)

	if _, statErr := os.Stat(stacksDir); os.IsNotExist(statErr) {
		if mkErr := os.MkdirAll(stacksDir, 0755); mkErr != nil {
			fmt.Printf("Warning: failed to create stacks directory %q: %v\n", stacksDir, mkErr)
			return nil
		}
		return nil
	} else if statErr != nil {
		fmt.Printf("Warning: unable to access stacks directory %q: %v\n", stacksDir, statErr)
		return nil
	}

	seenDirs := utils.NewEmptyStructMap[string]()

	if err := s.processStacksDirectoryEntries(ctx, stacksDir, seenDirs); err != nil {
		fmt.Printf("Warning: error while processing stacks directory %q: %v\n", stacksDir, err)
	}

	if err := s.cleanupDBStacks(ctx); err != nil {
		fmt.Printf("Warning: error during DB cleanup of stacks: %v\n", err)
	}

	return nil
}

func (s *StackService) processStacksDirectoryEntries(ctx context.Context, stacksDir string, seenDirs map[string]struct{}) error {
	entries, err := os.ReadDir(stacksDir)
	if err != nil {
		fmt.Printf("Warning: failed to read stacks directory %q: %v\n", stacksDir, err)
		return err
	}

	for _, entry := range entries {
		if !entry.IsDir() {
			continue
		}

		dirName := entry.Name()
		dirPath := filepath.Join(stacksDir, dirName)
		seenDirs[dirPath] = struct{}{}

		if _, err := projects.DetectComposeFile(dirPath); err != nil {
			continue
		}

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
	return nil
}

func (s *StackService) cleanupDBStacks(ctx context.Context) error {
	var allStacks []models.Stack
	if err := s.db.WithContext(ctx).Find(&allStacks).Error; err != nil {
		return fmt.Errorf("failed to list stacks for cleanup: %w", err)
	}

	for _, stack := range allStacks {
		if err := s.cleanupSingleStackIfNeeded(ctx, &stack); err != nil {
			// keep processing remaining stacks even on per-stack errors
			fmt.Printf("Warning: cleanup issue for stack %s: %v\n", stack.ID, err)
		}
	}

	return nil
}

func (s *StackService) cleanupSingleStackIfNeeded(ctx context.Context, stack *models.Stack) error {
	// If directory missing -> delete stack and its cache
	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		return s.deleteStackAndCache(ctx, stack, "missing_directory")
	} else if err != nil {
		// unexpected stat error - surface as warning to caller
		return fmt.Errorf("unable to stat stack path %q: %w", stack.Path, err)
	}

	// If compose file missing -> delete stack and its cache
	if _, err := projects.DetectComposeFile(stack.Path); err != nil {
		return s.deleteStackAndCache(ctx, stack, "missing_compose_file")
	}

	return nil
}

func (s *StackService) deleteStackAndCache(ctx context.Context, stack *models.Stack, reason string) error {
	if err := s.db.WithContext(ctx).Where("stack_id = ?", stack.ID).Delete(&models.ProjectCache{}).Error; err != nil {
		fmt.Printf("Warning: failed to delete cache for removed stack %s: %v\n", stack.ID, err)
	}

	if err := s.db.WithContext(ctx).Delete(&models.Stack{}, "id = ?", stack.ID).Error; err != nil {
		fmt.Printf("Warning: failed to delete removed stack %s: %v\n", stack.ID, err)
		return err
	}

	metadata := models.JSON{
		"action":    "auto-delete",
		"stackId":   stack.ID,
		"stackName": stack.Name,
		"path":      stack.Path,
		"reason":    reason,
	}
	if s.eventService != nil {
		if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackDelete, stack.ID, stack.Name, systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
			fmt.Printf("Could not log auto-delete action: %s\n", logErr)
		}
	}

	return nil
}

func (s *StackService) syncStackWithFilesystem(ctx context.Context, stack *models.Stack) {
	if _, err := os.Stat(stack.Path); os.IsNotExist(err) {
		stack.Status = "unknown"
		stack.ServiceCount = 0
		stack.RunningCount = 0
		s.updateStackInDB(ctx, stack)
		return
	}

	if _, err := projects.DetectComposeFile(stack.Path); err != nil {
		stack.Status = "unknown"
		stack.ServiceCount = 0
		stack.RunningCount = 0
		s.updateStackInDB(ctx, stack)
		return
	}

	if status, total, running, err := s.getLiveStackStatus(ctx, stack.Path, stack.Name); err == nil {
		if stack.Status != status || stack.ServiceCount != total || stack.RunningCount != running {
			stack.Status = status
			stack.ServiceCount = total
			stack.RunningCount = running
			s.updateStackInDB(ctx, stack)
		}
	}
}

func (s *StackService) updateStackInDB(ctx context.Context, stack *models.Stack) {
	go func() {
		if err := s.db.WithContext(ctx).Model(stack).Updates(map[string]interface{}{
			"status":        stack.Status,
			"service_count": stack.ServiceCount,
			"running_count": stack.RunningCount,
			"updated_at":    time.Now(),
		}).Error; err != nil {
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
		var composePath string
		if existingComposeFile, derr := projects.DetectComposeFile(stack.Path); derr == nil && existingComposeFile != "" {
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

	if composeFile, derr := projects.DetectComposeFile(stack.Path); derr == nil {
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

	if err := s.PullStackImages(ctx, stackID, io.Discard); err != nil {
		fmt.Printf("Warning: failed to pull images: %v\n", err)
	}

	if err := s.DownStack(ctx, stackID, systemUser); err != nil {
		return fmt.Errorf("failed to down stack for redeploy: %w", err)
	}

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

func (s *StackService) getLiveStackStatus(ctx context.Context, stackDir, projectName string) (models.StackStatus, int, int, error) {
	live, err := projects.ComposePS(ctx, stackDir, projectName)
	if err != nil {
		return models.StackStatusUnknown, 0, 0, err
	}

	expectedTotal := 0
	if composeFile, derr := projects.DetectComposeFile(stackDir); derr == nil {
		if proj, lerr := projects.LoadComposeProject(ctx, composeFile, projectName); lerr == nil && proj != nil {
			expectedTotal = len(proj.Services)
		}
	}

	total := len(live)
	running := 0
	for _, it := range live {
		st := strings.ToLower(strings.TrimSpace(it.Status))
		if st == "running" || st == "up" {
			running++
		}
	}

	switch {
	case total == 0 && expectedTotal > 0:
		return models.StackStatusStopped, expectedTotal, 0, nil
	case running == total && total > 0:
		return models.StackStatusRunning, total, running, nil
	case running > 0:
		return models.StackStatusPartiallyRunning, total, running, nil
	case total == 0 && expectedTotal == 0:
		return models.StackStatusStopped, 0, 0, nil
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

	done := make(chan error, 2)

	go func() {
		done <- s.readStackLogsFromReader(ctx, stdout, logsChan, "stdout")
	}()

	go func() {
		done <- s.readStackLogsFromReader(ctx, stderr, logsChan, "stderr")
	}()

	go func() {
		done <- cmd.Wait()
	}()

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
	scanner.Buffer(make([]byte, 0, 64*1024), 1024*1024)

	for scanner.Scan() {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
			line := scanner.Text()
			if line != "" {
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
	services, err := s.GetStackServices(ctx, stackID)
	if err != nil {
		return s.UpdateStackStatus(ctx, stackID, status)
	}

	serviceCount, runningCount := s.getServiceCounts(services)

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

	var composePath string
	if existingComposeFile, derr := projects.DetectComposeFile(stackPath); derr == nil && existingComposeFile != "" {
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

func (s *StackService) getServiceCounts(services []StackServiceInfo) (total int, running int) {
	total = len(services)
	for _, service := range services {
		st := strings.ToLower(strings.TrimSpace(service.Status))
		if st == "running" || st == "up" {
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
	if _, derr := projects.DetectComposeFile(path); derr != nil {
		return nil, fmt.Errorf("no compose file found in %q", path)
	}

	status, svcCount, runCount, err := s.getLiveStackStatus(ctx, path, stackName)
	if err != nil {
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
			if _, err := projects.DetectComposeFile(dirPath); err == nil {
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
