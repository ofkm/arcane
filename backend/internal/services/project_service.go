package services

import (
	"bufio"
	"context"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/docker/compose/v2/pkg/api"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/fs"
	"github.com/ofkm/arcane-backend/internal/utils/pagination"
	"github.com/ofkm/arcane-backend/internal/utils/projects"
	"gorm.io/gorm"
)

type ProjectService struct {
	db              *database.DB
	settingsService *SettingsService
	eventService    *EventService
	imageService    *ImageService
}

func NewProjectService(db *database.DB, settingsService *SettingsService, eventService *EventService, imageService *ImageService) *ProjectService {
	return &ProjectService{
		db:              db,
		settingsService: settingsService,
		eventService:    eventService,
		imageService:    imageService,
	}
}

// Helpers

type ProjectServiceInfo struct {
	Name        string   `json:"name"`
	Image       string   `json:"image"`
	Status      string   `json:"status"`
	ContainerID string   `json:"container_id"`
	Ports       []string `json:"ports"`
}

func (s *ProjectService) GetProjectFromDatabaseByID(ctx context.Context, id string) (*models.Project, error) {
	var project models.Project
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&project).Error; err != nil {
		if errors.Is(err, context.Canceled) || errors.Is(err, context.DeadlineExceeded) {
			return nil, fmt.Errorf("request canceled or timed out")
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("project not found")
		}
		return nil, fmt.Errorf("failed to get project: %w", err)
	}
	return &project, nil
}

func (s *ProjectService) getServiceCounts(services []ProjectServiceInfo) (total int, running int) {
	total = len(services)
	for _, service := range services {
		st := strings.ToLower(strings.TrimSpace(service.Status))
		if st == "running" || st == "up" {
			running++
		}
	}
	return total, running
}

func (s *ProjectService) updateProjectStatusandCountsInternal(ctx context.Context, projectID string, status models.ProjectStatus) error {
	services, err := s.GetProjectServices(ctx, projectID)
	if err != nil {
		slog.Error("GetProjectServices failed during status update", "projectID", projectID, "error", err)
		return s.updateProjectStatusInternal(ctx, projectID, status)
	}

	serviceCount, runningCount := s.getServiceCounts(services)

	if err := s.db.WithContext(ctx).Model(&models.Project{}).Where("id = ?", projectID).Updates(map[string]interface{}{
		"status":        status,
		"service_count": serviceCount,
		"running_count": runningCount,
		"updated_at":    time.Now(),
	}).Error; err != nil {
		return fmt.Errorf("failed to update project status and counts: %w", err)
	}

	return nil
}

func (s *ProjectService) updateProjectStatusInternal(ctx context.Context, id string, status models.ProjectStatus) error {
	now := time.Now()
	res := s.db.WithContext(ctx).Model(&models.Project{}).Where("id = ?", id).Updates(map[string]interface{}{
		"status":     status,
		"updated_at": now,
	})

	if res.Error != nil {
		return fmt.Errorf("failed to update project status: %w", res.Error)
	}

	return nil
}

func (s *ProjectService) GetProjectServices(ctx context.Context, projectID string) ([]ProjectServiceInfo, error) {
	projectFromDb, err := s.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		return nil, err
	}

	composeFileFullPath, derr := projects.DetectComposeFile(projectFromDb.Path)
	if derr != nil {
		return []ProjectServiceInfo{}, fmt.Errorf("no compose file found in project directory: %s", projectFromDb.Path)
	}

	project, loadErr := projects.LoadComposeProject(ctx, composeFileFullPath, projectFromDb.Name)
	if loadErr != nil {
		return []ProjectServiceInfo{}, fmt.Errorf("failed to load compose project from %s: %w", projectFromDb.Path, loadErr)
	}

	containers, err := projects.ComposePs(ctx, project, nil, true)
	if err != nil {
		slog.Error("compose ps error", "projectName", project.Name, "error", err)
		return nil, fmt.Errorf("failed to get compose services status: %w", err)
	}

	have := map[string]bool{}
	var services []ProjectServiceInfo

	for _, c := range containers {
		services = append(services, ProjectServiceInfo{
			Name:        c.Service,
			Image:       c.Image,
			Status:      c.State,
			ContainerID: c.ID,
			Ports:       formatPorts(c.Publishers),
		})
		have[c.Service] = true
	}

	for _, svc := range project.Services {
		if !have[svc.Name] {
			services = append(services, ProjectServiceInfo{
				Name:   svc.Name,
				Image:  svc.Image,
				Status: "stopped",
				Ports:  []string{},
			})
		}
	}

	return services, nil
}

func (s *ProjectService) GetProjectContent(ctx context.Context, projectID string) (composeContent, envContent string, err error) {
	proj, err := s.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		return "", "", err
	}
	return fs.ReadProjectFiles(proj.Path)
}

func (s *ProjectService) GetProjectDetails(ctx context.Context, projectID string) (dto.ProjectDetailsDto, error) {
	proj, err := s.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		return dto.ProjectDetailsDto{}, err
	}

	composeContent, envContent, _ := s.GetProjectContent(ctx, projectID)

	services, serr := s.GetProjectServices(ctx, projectID)

	var serviceCount, runningCount int
	var liveStatus models.ProjectStatus

	if serr == nil && services != nil {
		serviceCount = len(services)
		_, runningCount = s.getServiceCounts(services)
		liveStatus = s.calculateProjectStatus(services)
	} else {
		serviceCount = proj.ServiceCount
		runningCount = proj.RunningCount
		liveStatus = proj.Status
	}

	var resp dto.ProjectDetailsDto
	if err := dto.MapStruct(proj, &resp); err != nil {
		return dto.ProjectDetailsDto{}, fmt.Errorf("failed to map project: %w", err)
	}
	resp.Status = string(liveStatus)
	resp.CreatedAt = proj.CreatedAt.Format(time.RFC3339)
	resp.UpdatedAt = proj.UpdatedAt.Format(time.RFC3339)
	resp.ComposeContent = composeContent
	resp.EnvContent = envContent
	resp.ServiceCount = serviceCount
	resp.RunningCount = runningCount
	resp.DirName = utils.DerefString(proj.DirName)
	if serr == nil && services != nil {
		raw := make([]any, len(services))
		for i := range services {
			raw[i] = services[i]
		}
		resp.Services = raw
	}

	return resp, nil
}

func (s *ProjectService) SyncProjectsFromFileSystem(ctx context.Context) error {
	projectsDirSetting := s.settingsService.GetStringSetting(ctx, "projectsDirectory", "data/projects")
	projectsDir, err := fs.GetProjectsDirectory(ctx, strings.TrimSpace(projectsDirSetting))
	if err != nil {
		slog.WarnContext(ctx, "unable to prepare projects directory", "error", err)
		return nil
	}
	projectsDir = filepath.Clean(projectsDir)

	entries, rerr := os.ReadDir(projectsDir)
	if rerr != nil {
		slog.WarnContext(ctx, "failed to read projects directory", "dir", projectsDir, "error", rerr)
		return nil
	}

	seen := map[string]struct{}{}
	for _, e := range entries {
		if !e.IsDir() {
			continue
		}
		dirName := e.Name()
		dirPath := filepath.Join(projectsDir, dirName)

		// Only consider folders that contain a compose file
		if _, derr := projects.DetectComposeFile(dirPath); derr != nil {
			continue
		}

		if uerr := s.upsertProjectForDir(ctx, dirName, dirPath); uerr != nil {
			slog.WarnContext(ctx, "failed to sync project from folder", "dir", dirPath, "error", uerr)
			continue
		}
		seen[dirPath] = struct{}{}
	}

	if cerr := s.cleanupDBProjects(ctx, seen); cerr != nil {
		slog.WarnContext(ctx, "error during DB cleanup of projects", "error", cerr)
	}

	return nil
}

func (s *ProjectService) upsertProjectForDir(ctx context.Context, dirName, dirPath string) error {
	var existing models.Project
	err := s.db.WithContext(ctx).
		Where("path = ? OR dir_name = ?", dirPath, dirName).
		First(&existing).Error

	if errors.Is(err, gorm.ErrRecordNotFound) {
		// Create a minimal project entry
		proj := &models.Project{
			Name:         dirName,
			DirName:      &dirName,
			Path:         dirPath,
			Status:       models.ProjectStatusUnknown,
			ServiceCount: 0,
			RunningCount: 0,
		}
		if cerr := s.db.WithContext(ctx).Create(proj).Error; cerr != nil {
			return fmt.Errorf("create project for %q failed: %w", dirPath, cerr)
		}
		return nil
	}
	if err != nil {
		return fmt.Errorf("query existing project for %q failed: %w", dirPath, err)
	}

	updates := map[string]interface{}{}
	if existing.Path != dirPath {
		updates["path"] = dirPath
	}
	if existing.DirName == nil || *existing.DirName != dirName {
		updates["dir_name"] = dirName
	}
	if len(updates) == 0 {
		return nil
	}

	updates["updated_at"] = time.Now()
	if uerr := s.db.WithContext(ctx).
		Model(&models.Project{}).
		Where("id = ?", existing.ID).
		Updates(updates).Error; uerr != nil {
		return fmt.Errorf("update project %s failed: %w", existing.ID, uerr)
	}
	return nil
}

func (s *ProjectService) cleanupDBProjects(ctx context.Context, seen map[string]struct{}) error {
	var all []models.Project
	if err := s.db.WithContext(ctx).Find(&all).Error; err != nil {
		return fmt.Errorf("list projects for cleanup failed: %w", err)
	}

	for _, p := range all {
		// Skip paths seen in this pass
		if _, ok := seen[p.Path]; ok {
			continue
		}

		// Remove if path missing or compose file missing
		if _, err := os.Stat(p.Path); err != nil {
			if os.IsNotExist(err) {
				if derr := s.db.WithContext(ctx).Delete(&models.Project{}, "id = ?", p.ID).Error; derr != nil {
					slog.WarnContext(ctx, "failed to delete missing-path project", "projectID", p.ID, "error", derr)
				}
				continue
			}
			// On unexpected stat error, skip deletion but warn
			slog.WarnContext(ctx, "stat error during cleanup", "path", p.Path, "error", err)
			continue
		}

		if _, err := projects.DetectComposeFile(p.Path); err != nil {
			if derr := s.db.WithContext(ctx).Delete(&models.Project{}, "id = ?", p.ID).Error; derr != nil {
				slog.WarnContext(ctx, "failed to delete project without compose", "projectID", p.ID, "error", derr)
			}
		}
	}
	return nil
}

func (s *ProjectService) ListAllProjects(ctx context.Context) ([]models.Project, error) {
	var items []models.Project
	if err := s.db.WithContext(ctx).Find(&items).Error; err != nil {
		return nil, fmt.Errorf("list projects: %w", err)
	}
	return items, nil
}

func formatPorts(publishers []api.PortPublisher) []string {
	var ports []string
	for _, pub := range publishers {
		if pub.PublishedPort > 0 {
			ports = append(ports, fmt.Sprintf("%d:%d/%s", pub.PublishedPort, pub.TargetPort, pub.Protocol))
		}
	}
	return ports
}

func (s *ProjectService) GetProjectStatusCounts(ctx context.Context) (folderCount, runningProjects, stoppedProjects, totalProjects int, err error) {
	projectsDirSetting := s.settingsService.GetStringSetting(ctx, "projectsDirectory", "data/projects")
	projectsDir, derr := fs.GetProjectsDirectory(ctx, strings.TrimSpace(projectsDirSetting))
	if derr != nil {
		return 0, 0, 0, 0, fmt.Errorf("could not determine projects directory: %w", derr)
	}
	projectsDir = filepath.Clean(projectsDir)

	if info, statErr := os.Stat(projectsDir); statErr == nil && info.IsDir() {
		entries, readErr := os.ReadDir(projectsDir)
		if readErr != nil {
			return 0, 0, 0, 0, fmt.Errorf("failed to read projects directory %s: %w", projectsDir, readErr)
		}
		for _, e := range entries {
			if !e.IsDir() {
				continue
			}
			dirPath := filepath.Join(projectsDir, e.Name())
			if _, err := projects.DetectComposeFile(dirPath); err == nil {
				folderCount++
			}
		}
	} else if os.IsNotExist(statErr) {
		// Directory missing
	} else if statErr != nil {
		return 0, 0, 0, 0, fmt.Errorf("unable to access projects directory %s: %w", projectsDir, statErr)
	}

	// Get all projects and calculate live status
	var projects []models.Project
	if err := s.db.WithContext(ctx).Find(&projects).Error; err != nil {
		return folderCount, 0, 0, 0, fmt.Errorf("failed to list projects: %w", err)
	}

	totalProjects = len(projects)
	runningProjects = 0
	stoppedProjects = 0

	for _, proj := range projects {
		services, serr := s.GetProjectServices(ctx, proj.ID)
		if serr != nil {
			continue
		}

		status := s.calculateProjectStatus(services)
		switch status {
		case models.ProjectStatusRunning, models.ProjectStatusPartiallyRunning, models.ProjectStatusDeploying, models.ProjectStatusRestarting:
			runningProjects++
		case models.ProjectStatusStopped, models.ProjectStatusStopping:
			stoppedProjects++
		case models.ProjectStatusUnknown:
		}
	}

	return folderCount, runningProjects, stoppedProjects, totalProjects, nil
}

// End Helpers

// Project Actions

func (s *ProjectService) DeployProject(ctx context.Context, projectID string, user models.User) error {
	projectFromDb, err := s.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		return fmt.Errorf("failed to get project: %w", err)
	}

	composeFileFullPath, derr := projects.DetectComposeFile(projectFromDb.Path)
	if derr != nil {
		return fmt.Errorf("no compose file found in project directory: %s", projectFromDb.Path)
	}

	project, loadErr := projects.LoadComposeProject(ctx, composeFileFullPath, projectFromDb.Name)
	if loadErr != nil {
		return fmt.Errorf("failed to load compose project from %s: %w", projectFromDb.Path, loadErr)
	}

	if err := s.updateProjectStatusInternal(ctx, projectID, models.ProjectStatusDeploying); err != nil {
		return fmt.Errorf("failed to update project status to deploying: %w", err)
	}

	if perr := s.PullProjectImages(ctx, projectID, io.Discard); perr != nil {
		slog.Warn("pre-pull images failed (continuing to compose up)", "projectID", projectID, "error", perr)
	}

	if err := projects.ComposeUp(ctx, project, project.Services.GetProfiles()); err != nil {
		slog.Error("compose up failed", "projectName", project.Name, "projectID", projectID, "error", err)
		if containers, psErr := s.GetProjectServices(ctx, projectID); psErr == nil {
			slog.Info("containers after failed deploy", "projectID", projectID, "containers", containers)
		}
		_ = s.updateProjectStatusandCountsInternal(ctx, projectID, models.ProjectStatusStopped)
		return fmt.Errorf("failed to deploy project: %w", err)
	}

	metadata := models.JSON{"action": "deploy", "projectID": projectID, "projectName": project.Name}
	if logErr := s.eventService.LogProjectEvent(ctx, models.EventTypeProjectDeploy, projectID, project.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		slog.ErrorContext(ctx, "could not log project deployment action", "error", logErr)
	}

	err = s.updateProjectStatusandCountsInternal(ctx, projectID, models.ProjectStatusRunning)
	if err != nil {
		slog.Error("failed to update project status and counts after deploy", "projectID", projectID, "error", err)
	}
	return err
}

func (s *ProjectService) DownProject(ctx context.Context, projectID string, user models.User) error {
	projectFromDb, err := s.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		return err
	}

	proj, _, lerr := projects.LoadComposeProjectFromDir(ctx, projectFromDb.Path, projectFromDb.Name)
	if lerr != nil {
		_ = s.updateProjectStatusInternal(ctx, projectID, models.ProjectStatusRunning)
		return fmt.Errorf("failed to load compose project: %w", lerr)
	}

	if err := s.updateProjectStatusInternal(ctx, projectID, models.ProjectStatusStopped); err != nil {
		return fmt.Errorf("failed to update project status to stopping: %w", err)
	}

	if err := projects.ComposeDown(ctx, proj, false); err != nil {
		_ = s.updateProjectStatusInternal(ctx, projectID, models.ProjectStatusRunning)
		return fmt.Errorf("failed to bring down project: %w", err)
	}

	metadata := models.JSON{
		"action":      "down",
		"projectID":   projectID,
		"projectName": projectFromDb.Name,
	}
	if logErr := s.eventService.LogProjectEvent(ctx, models.EventTypeProjectStop, projectID, projectFromDb.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		slog.ErrorContext(ctx, "could not log project down action", "error", logErr)
	}

	return s.updateProjectStatusandCountsInternal(ctx, projectID, models.ProjectStatusStopped)
}

func (s *ProjectService) CreateProject(ctx context.Context, name, composeContent string, envContent *string, user models.User) (*models.Project, error) {
	sanitized := fs.SanitizeProjectName(name)

	projectsDirectory, err := fs.GetProjectsDirectory(ctx, s.settingsService.GetStringSetting(ctx, "projectsDirectory", "data/projects"))
	if err != nil {
		return nil, fmt.Errorf("failed to get projects directory: %w", err)
	}

	basePath := filepath.Join(projectsDirectory, sanitized)
	projectPath, folderName, err := fs.CreateUniqueDir(basePath, name, 0755)
	if err != nil {
		return nil, fmt.Errorf("failed to create project directory: %w", err)
	}

	proj := &models.Project{
		Name:         name,
		DirName:      &folderName,
		Path:         projectPath,
		Status:       models.ProjectStatusStopped,
		ServiceCount: 0,
		RunningCount: 0,
	}

	if err := s.db.WithContext(ctx).Create(proj).Error; err != nil {
		return nil, fmt.Errorf("failed to create project: %w", err)
	}

	if err := fs.SaveOrUpdateProjectFiles(projectPath, composeContent, envContent); err != nil {
		s.db.WithContext(ctx).Delete(proj)
		return nil, fmt.Errorf("failed to save project files: %w", err)
	}

	metadata := models.JSON{"action": "create", "projectID": proj.ID, "projectName": name, "path": projectPath}
	if logErr := s.eventService.LogProjectEvent(ctx, models.EventTypeProjectCreate, proj.ID, name, user.ID, user.Username, "0", metadata); logErr != nil {
		slog.ErrorContext(ctx, "could not log project creation", "error", logErr)
	}

	return proj, nil
}

func (s *ProjectService) DestroyProject(ctx context.Context, projectID string, removeFiles, removeVolumes bool, user models.User) error {
	proj, err := s.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		return err
	}

	if err := s.DownProject(ctx, projectID, systemUser); err != nil {
		slog.WarnContext(ctx, "failed to bring down project", "error", err)
	}

	if removeVolumes {
		if compProj, _, lerr := projects.LoadComposeProjectFromDir(ctx, proj.Path, proj.Name); lerr == nil {
			if derr := projects.ComposeDown(ctx, compProj, true); derr != nil {
				slog.WarnContext(ctx, "failed to remove volumes", "error", derr)
			}
		} else {
			slog.WarnContext(ctx, "failed to load compose project for volume removal", "error", lerr)
		}
	}

	if removeFiles {
		if err := os.RemoveAll(proj.Path); err != nil {
			return fmt.Errorf("failed to remove project files: %w", err)
		}
	}

	if err := s.db.WithContext(ctx).Delete(proj).Error; err != nil {
		return fmt.Errorf("failed to delete project from database: %w", err)
	}

	metadata := models.JSON{"action": "destroy", "projectID": projectID, "projectName": proj.Name, "removeFiles": removeFiles, "removeVolumes": removeVolumes}
	if logErr := s.eventService.LogProjectEvent(ctx, models.EventTypeProjectDelete, projectID, proj.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		slog.ErrorContext(ctx, "could not log project destroy action", "error", logErr)
	}

	return nil
}

func (s *ProjectService) RedeployProject(ctx context.Context, projectID string, user models.User) error {
	proj, err := s.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		return err
	}

	if err := s.PullProjectImages(ctx, projectID, io.Discard); err != nil {
		slog.WarnContext(ctx, "failed to pull project images", "error", err)
	}

	if err := s.DownProject(ctx, projectID, systemUser); err != nil {
		return fmt.Errorf("failed to down project for redeploy: %w", err)
	}

	metadata := models.JSON{"action": "redeploy", "projectID": projectID, "projectName": proj.Name}
	if logErr := s.eventService.LogProjectEvent(ctx, models.EventTypeProjectDeploy, projectID, proj.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		slog.ErrorContext(ctx, "could not log project redeploy action", "error", logErr)
	}

	return s.DeployProject(ctx, projectID, systemUser)
}

func (s *ProjectService) PullProjectImages(ctx context.Context, projectID string, progressWriter io.Writer) error {
	proj, err := s.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		return err
	}

	compProj, _, lerr := projects.LoadComposeProjectFromDir(ctx, proj.Path, proj.Name)
	if lerr != nil {
		return fmt.Errorf("failed to load compose project: %w", lerr)
	}

	images := map[string]struct{}{}
	for _, svc := range compProj.Services {
		img := strings.TrimSpace(svc.Image)
		if img == "" {
			continue
		}
		images[img] = struct{}{}
	}

	for img := range images {
		if err := s.imageService.PullImage(ctx, img, progressWriter, systemUser); err != nil {
			return fmt.Errorf("failed to pull image %s: %w", img, err)
		}
	}
	return nil
}

func (s *ProjectService) RestartProject(ctx context.Context, projectID string, user models.User) error {
	proj, err := s.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		return err
	}

	if err := s.updateProjectStatusInternal(ctx, projectID, models.ProjectStatusRestarting); err != nil {
		return fmt.Errorf("failed to update project status to restarting: %w", err)
	}

	compProj, _, lerr := projects.LoadComposeProjectFromDir(ctx, proj.Path, proj.Name)
	if lerr != nil {
		_ = s.updateProjectStatusInternal(ctx, projectID, models.ProjectStatusRunning)
		return fmt.Errorf("failed to load compose project: %w", lerr)
	}

	if err := projects.ComposeRestart(ctx, compProj, nil); err != nil {
		_ = s.updateProjectStatusInternal(ctx, projectID, models.ProjectStatusRunning)
		return fmt.Errorf("failed to restart project: %w", err)
	}

	metadata := models.JSON{
		"action":      "restart",
		"projectID":   projectID,
		"projectName": proj.Name,
	}
	if logErr := s.eventService.LogProjectEvent(ctx, models.EventTypeProjectStart, projectID, proj.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		slog.ErrorContext(ctx, "could not log project restart action", "error", logErr)
	}

	return s.updateProjectStatusandCountsInternal(ctx, projectID, models.ProjectStatusRunning)
}

func (s *ProjectService) UpdateProject(ctx context.Context, projectID string, name *string, composeContent, envContent *string) (*models.Project, error) {
	var proj models.Project
	if err := s.db.WithContext(ctx).First(&proj, "id = ?", projectID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, fmt.Errorf("project not found")
		}
		return nil, fmt.Errorf("failed to get project: %w", err)
	}

	if name != nil {
		if newName := strings.TrimSpace(*name); newName != "" && proj.Name != newName {
			proj.Name = newName
		}
	}

	switch {
	case composeContent != nil:
		if err := fs.SaveOrUpdateProjectFiles(proj.Path, *composeContent, envContent); err != nil {
			return nil, fmt.Errorf("failed to save project files: %w", err)
		}
	case envContent != nil:
		envPath := filepath.Join(proj.Path, ".env")
		if *envContent == "" {
			if err := os.Remove(envPath); err != nil && !os.IsNotExist(err) {
				return nil, fmt.Errorf("failed to remove env file: %w", err)
			}
		} else {
			if err := os.WriteFile(envPath, []byte(*envContent), 0600); err != nil {
				return nil, fmt.Errorf("failed to update env file: %w", err)
			}
		}
	}

	if err := s.db.WithContext(ctx).Save(&proj).Error; err != nil {
		return nil, fmt.Errorf("failed to update project: %w", err)
	}

	slog.InfoContext(ctx, "project updated", "projectID", proj.ID, "name", proj.Name)
	return &proj, nil
}

func (s *ProjectService) StreamProjectLogs(ctx context.Context, projectID string, logsChan chan<- string, follow bool, tail, since string, timestamps bool) error {
	proj, err := s.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		return err
	}

	pr, pw := io.Pipe()
	defer func() { _ = pw.Close() }()

	done := make(chan error, 2)

	// Reader goroutine: forward lines to channel
	go func() {
		sc := bufio.NewScanner(pr)
		sc.Buffer(make([]byte, 0, 64*1024), 1024*1024)
		for sc.Scan() {
			select {
			case <-ctx.Done():
				done <- ctx.Err()
				return
			case logsChan <- sc.Text():
			}
		}
		done <- sc.Err()
	}()

	// Writer goroutine: compose logs -> pipe
	go func() {
		// since/timestamps not currently supported by ComposeLogs helper; follow/tail are used.
		err := projects.ComposeLogs(ctx, proj.Name, pw, follow, tail)
		_ = pw.Close()
		done <- err
	}()

	// Wait for both goroutines to finish to avoid sending on a closed channel
	err1 := <-done
	err2 := <-done

	for _, e := range []error{err1, err2} {
		if e != nil && !errors.Is(e, io.EOF) && !errors.Is(e, context.Canceled) {
			return e
		}
	}
	return nil
}

// End Project Actions

// Table Functions

func (s *ProjectService) ListProjects(ctx context.Context, params pagination.QueryParams) ([]dto.ProjectDetailsDto, pagination.Response, error) {
	var projectsArray []models.Project
	query := s.db.WithContext(ctx).Model(&models.Project{})

	if term := strings.TrimSpace(params.Search); term != "" {
		searchPattern := "%" + term + "%"
		query = query.Where(
			"name LIKE ? OR path LIKE ? OR status LIKE ? OR COALESCE(dir_name, '') LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	paginationResp, err := pagination.PaginateAndSortDB(params, query, &projectsArray)
	if err != nil {
		return nil, pagination.Response{}, fmt.Errorf("failed to paginate projects: %w", err)
	}

	var result []dto.ProjectDetailsDto
	for _, project := range projectsArray {
		displayServiceCount := project.ServiceCount
		displayRunningCount := project.RunningCount
		displayStatus := string(project.Status)

		// Get live status from Docker
		if services, serr := s.GetProjectServices(ctx, project.ID); serr == nil {
			displayServiceCount = len(services)
			_, displayRunningCount = s.getServiceCounts(services)
			displayStatus = string(s.calculateProjectStatus(services))
		} else if displayServiceCount == 0 {
			// Fallback: try to detect service count from compose file
			if _, derr := projects.DetectComposeFile(project.Path); derr == nil {
				if proj, _, perr := projects.LoadComposeProjectFromDir(ctx, project.Path, project.Name); perr == nil {
					displayServiceCount = len(proj.Services)
				}
			}
		}

		result = append(result, dto.ProjectDetailsDto{
			ID:           project.ID,
			Name:         project.Name,
			DirName:      utils.DerefString(project.DirName),
			Path:         project.Path,
			Status:       displayStatus,
			ServiceCount: displayServiceCount,
			RunningCount: displayRunningCount,
			CreatedAt:    project.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    project.UpdatedAt.Format(time.RFC3339),
		})
	}
	return result, paginationResp, nil
}

// End Table Functions

func (s *ProjectService) calculateProjectStatus(services []ProjectServiceInfo) models.ProjectStatus {
	if len(services) == 0 {
		return models.ProjectStatusUnknown
	}

	runningCount := 0
	stoppedCount := 0

	for _, svc := range services {
		state := strings.ToLower(strings.TrimSpace(svc.Status))
		switch state {
		case "running", "up":
			runningCount++
		case "exited", "stopped", "dead":
			stoppedCount++
		}
	}

	if runningCount == len(services) {
		return models.ProjectStatusRunning
	}
	if runningCount > 0 {
		return models.ProjectStatusPartiallyRunning
	}
	if stoppedCount > 0 {
		return models.ProjectStatusStopped
	}
	return models.ProjectStatusUnknown
}
