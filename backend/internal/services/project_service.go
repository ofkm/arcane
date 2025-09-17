package services

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"path/filepath"
	"strings"
	"time"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/fs"
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

func (s *ProjectService) GetProjectFromDatabaseByID(ctx context.Context, id string) (*models.Stack, error) {
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
		slog.Error("GetStackServices failed during status update", "projectID", projectID, "error", err)
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
	if err := projects.ComposeUp(ctx, project, project.Services.GetProfiles()); err != nil {

		slog.Error("compose up failed", "projectName", project.Name, "projectID", projectID, "error", err)
		if containers, psErr := s.GetProjectServices(ctx, projectID); psErr == nil {
			slog.Info("containers after failed deploy", "projectID", projectID, "containers", containers)
		}
		_ = s.updateProjectStatusandCountsInternal(ctx, projectID, models.ProjectStatusStopped)
		return fmt.Errorf("failed to deploy project: %w", err)
	}

	metadata := models.JSON{"action": "deploy", "projectID": projectID, "projectName": project.Name}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackDeploy, projectID, project.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log project deployment action: %s\n", logErr)
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
		return fmt.Errorf("failed to update stack status to stopping: %w", err)
	}

	if err := projects.ComposeDown(ctx, proj, false); err != nil {
		_ = s.updateProjectStatusInternal(ctx, projectID, models.ProjectStatusRunning)
		return fmt.Errorf("failed to bring down project: %w", err)
	}

	metadata := models.JSON{
		"action":    "down",
		"projectID": projectID,
		"stackName": projectFromDb.Name,
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackStop, projectID, projectFromDb.Name, user.ID, user.Username, "0", metadata); logErr != nil {
		fmt.Printf("Could not log project down action: %s\n", logErr)
	}

	return s.updateProjectStatusandCountsInternal(ctx, projectID, models.ProjectStatusStopped)
}

func (s *ProjectService) CreateProject(ctx context.Context, name, composeContent string, envContent *string, user models.User) (*models.Project, error) {
	sanitized := fs.SanitizeProjectName(name)

	projectsDirectory, err := fs.GetProjectsDirectory(ctx, s.settingsService.GetStringSetting(ctx, "stacksDirectory", "data/projects"))
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
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackCreate, proj.ID, name, user.ID, user.Username, "0", metadata); logErr != nil {
		slog.ErrorContext(ctx, "could not log project creation", "error", logErr)
	}

	return proj, nil
}

// End Project Actions

// Table Functions

func (s *ProjectService) ListProjects(ctx context.Context, req utils.SortedPaginationRequest) ([]dto.ProjectDetailsDto, utils.PaginationResponse, error) {
	var projectsArray []models.Project
	query := s.db.WithContext(ctx).Model(&models.Project{})

	if term := strings.TrimSpace(req.Search); term != "" {
		searchPattern := "%" + term + "%"
		query = query.Where(
			"name LIKE ? OR path LIKE ? OR status LIKE ? OR COALESCE(dir_name, '') LIKE ?",
			searchPattern, searchPattern, searchPattern, searchPattern,
		)
	}

	pagination, err := utils.PaginateAndSort(req, query, &projectsArray)
	if err != nil {
		return nil, utils.PaginationResponse{}, fmt.Errorf("failed to paginate projects: %w", err)
	}

	var result []dto.ProjectDetailsDto
	for _, project := range projectsArray {
		displayServiceCount := project.ServiceCount
		if displayServiceCount == 0 {
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
			Status:       string(project.Status),
			ServiceCount: displayServiceCount,
			RunningCount: project.RunningCount,
			CreatedAt:    project.CreatedAt.Format(time.RFC3339),
			UpdatedAt:    project.UpdatedAt.Format(time.RFC3339),
		})
	}
	return result, pagination, nil
}

// End Table Functions
