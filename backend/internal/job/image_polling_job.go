package job

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ImagePollingJob struct {
	scheduler          *services.PollingScheduler
	workerPool         *services.PollingWorkerPool
	batchCoordinator   *services.RegistryBatchCoordinator
	settingsService    *services.SettingsService
	environmentService *services.EnvironmentService
	projectService     *services.ProjectService
	dockerService      *services.DockerClientService
	mainLoopCtx        context.Context
	mainLoopCancel     context.CancelFunc
}

func NewImagePollingJob(
	scheduler *services.PollingScheduler,
	workerPool *services.PollingWorkerPool,
	batchCoordinator *services.RegistryBatchCoordinator,
	settingsService *services.SettingsService,
	environmentService *services.EnvironmentService,
	projectService *services.ProjectService,
	dockerService *services.DockerClientService,
) *ImagePollingJob {
	return &ImagePollingJob{
		scheduler:          scheduler,
		workerPool:         workerPool,
		batchCoordinator:   batchCoordinator,
		settingsService:    settingsService,
		environmentService: environmentService,
		projectService:     projectService,
		dockerService:      dockerService,
	}
}

// Register initializes the scheduler with global and project-specific schedules
func (j *ImagePollingJob) Register(ctx context.Context) error {
	globalEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	if !globalEnabled {
		// Check if any projects have custom polling enabled
		projects, err := j.projectService.ListAllProjects(ctx)
		if err == nil {
			hasEnabledProject := false
			for _, project := range projects {
				if project.PollingEnabled != nil && *project.PollingEnabled {
					hasEnabledProject = true
					break
				}
			}
			if !hasEnabledProject {
				slog.InfoContext(ctx, "Polling disabled globally and no project overrides; job not registered")
				return nil
			}
		}
	}

	// Ensure global schedule exists if polling is enabled
	if globalEnabled {
		if err := j.ensureGlobalSchedule(ctx); err != nil {
			return fmt.Errorf("failed to ensure global schedule: %w", err)
		}
	}

	// Ensure schedules exist for projects with custom polling
	if err := j.ensureProjectSchedules(ctx); err != nil {
		return fmt.Errorf("failed to ensure project schedules: %w", err)
	}

	// Start the main polling loop
	j.mainLoopCtx, j.mainLoopCancel = context.WithCancel(ctx)
	go j.run(j.mainLoopCtx)

	slog.InfoContext(ctx, "Image polling job registered with heap-based scheduler",
		slog.Int("schedulerSize", j.scheduler.Size()))

	return nil
}

// run is the main loop that continuously fetches and executes tasks
func (j *ImagePollingJob) run(ctx context.Context) {
	slog.InfoContext(ctx, "Image polling job main loop started")

	for {
		// Block until next task is ready
		task, err := j.scheduler.NextTask(ctx)
		if err != nil {
			if ctx.Err() != nil {
				slog.InfoContext(ctx, "Image polling job main loop stopped")
				return
			}
			slog.ErrorContext(ctx, "Failed to get next task from scheduler",
				slog.String("error", err.Error()))
			time.Sleep(time.Minute) // Backoff on error
			continue
		}

		// Submit task to worker pool
		if err := j.workerPool.Submit(task); err != nil {
			slog.ErrorContext(ctx, "Failed to submit task to worker pool",
				slog.Any("projectID", task.ProjectID),
				slog.String("error", err.Error()))

			// Reschedule the task immediately to retry
			task.NextPollTime = time.Now().Add(5 * time.Minute)
			if reschedErr := j.scheduler.Reschedule(task); reschedErr != nil {
				slog.ErrorContext(ctx, "Failed to reschedule task after submit error",
					slog.Any("projectID", task.ProjectID),
					slog.String("error", reschedErr.Error()))
			}
		}
	}
}

// ExecuteTask is called by worker pool to execute a polling task
func (j *ImagePollingJob) ExecuteTask(ctx context.Context, task *services.PollTask) error {
	startTime := time.Now()
	var projectIDStr string
	if task.ProjectID == nil {
		projectIDStr = "global"
	} else {
		projectIDStr = *task.ProjectID
	}

	slog.InfoContext(ctx, "Executing polling task",
		slog.String("projectID", projectIDStr),
		slog.Time("scheduledFor", task.NextPollTime))

	// Get images to poll
	images, err := j.getImagesToPool(ctx, task.ProjectID)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to get images for polling",
			slog.String("projectID", projectIDStr),
			slog.String("error", err.Error()))

		// Update task result with failure
		duration := time.Since(startTime)
		if updateErr := j.scheduler.UpdateTaskResult(ctx, task.ProjectID, duration, false); updateErr != nil {
			slog.WarnContext(ctx, "Failed to update task result",
				slog.String("error", updateErr.Error()))
		}

		// Reschedule with exponential backoff
		nextPollTime, calcErr := j.scheduler.CalculateNextPollTime(ctx, task.ProjectID, task.PollingInterval)
		if calcErr != nil {
			nextPollTime = time.Now().Add(task.PollingInterval * 2)
		}
		task.NextPollTime = nextPollTime
		return j.scheduler.Reschedule(task)
	}

	if len(images) == 0 {
		slog.InfoContext(ctx, "No images to poll",
			slog.String("projectID", projectIDStr))

		// Still update task result as success
		duration := time.Since(startTime)
		if updateErr := j.scheduler.UpdateTaskResult(ctx, task.ProjectID, duration, true); updateErr != nil {
			slog.WarnContext(ctx, "Failed to update task result",
				slog.String("error", updateErr.Error()))
		}

		// Reschedule for next interval
		task.NextPollTime = time.Now().Add(task.PollingInterval)
		return j.scheduler.Reschedule(task)
	}

	// Load credentials
	creds, err := j.loadRegistryCredentials(ctx)
	if err != nil {
		slog.WarnContext(ctx, "Failed to load registry credentials for polling",
			slog.String("error", err.Error()))
		creds = nil
	}

	// Execute the check via batch coordinator
	results, err := j.batchCoordinator.CheckImagesWithBatching(ctx, images, creds)
	if err != nil {
		slog.ErrorContext(ctx, "Polling task failed",
			slog.String("projectID", projectIDStr),
			slog.String("error", err.Error()))

		// Update task result with failure
		duration := time.Since(startTime)
		if updateErr := j.scheduler.UpdateTaskResult(ctx, task.ProjectID, duration, false); updateErr != nil {
			slog.WarnContext(ctx, "Failed to update task result",
				slog.String("error", updateErr.Error()))
		}

		// Reschedule with exponential backoff
		nextPollTime, calcErr := j.scheduler.CalculateNextPollTime(ctx, task.ProjectID, task.PollingInterval)
		if calcErr != nil {
			nextPollTime = time.Now().Add(task.PollingInterval * 2)
		}
		task.NextPollTime = nextPollTime
		return j.scheduler.Reschedule(task)
	}

	// Log results
	duration := time.Since(startTime)
	updates := 0
	errors := 0
	for _, r := range results {
		if r == nil {
			continue
		}
		if r.Error != "" {
			errors++
			continue
		}
		if r.HasUpdate {
			updates++
		}
	}

	slog.InfoContext(ctx, "Polling task completed",
		slog.String("projectID", projectIDStr),
		slog.Int("checked", len(results)),
		slog.Int("updates", updates),
		slog.Int("errors", errors),
		slog.Duration("duration", duration))

	// Update task result with success
	if updateErr := j.scheduler.UpdateTaskResult(ctx, task.ProjectID, duration, true); updateErr != nil {
		slog.WarnContext(ctx, "Failed to update task result",
			slog.String("error", updateErr.Error()))
	}

	// Reschedule for next interval
	task.NextPollTime = time.Now().Add(task.PollingInterval)
	return j.scheduler.Reschedule(task)
}

// getImagesToPool returns the images to poll based on whether this is global or project-specific
func (j *ImagePollingJob) getImagesToPool(ctx context.Context, projectID *string) ([]string, error) {
	if projectID == nil {
		// Global polling: get all running container images, excluding those from projects with custom polling
		return j.getGlobalImages(ctx)
	}

	// Project-specific polling: get images from this project only
	return j.projectService.GetProjectRunningImages(ctx, *projectID)
}

// getGlobalImages returns images for global polling (excluding project-overridden images)
func (j *ImagePollingJob) getGlobalImages(ctx context.Context) ([]string, error) {
	// Get all running container images
	dockerClient, err := j.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: false})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	allImages := make(map[string]struct{})
	for _, container := range containers {
		if container.Image != "" {
			allImages[container.Image] = struct{}{}
		}
	}

	// Get projects with custom polling enabled
	projects, err := j.projectService.ListAllProjects(ctx)
	if err != nil {
		slog.WarnContext(ctx, "Failed to get projects for global polling",
			slog.String("error", err.Error()))
		// Continue with all images if we can't get projects
		images := make([]string, 0, len(allImages))
		for img := range allImages {
			images = append(images, img)
		}
		return images, nil
	}

	// Collect images from projects with custom polling
	excludedImages := make(map[string]struct{})
	for _, project := range projects {
		if project.PollingEnabled != nil && *project.PollingEnabled {
			projectImages, err := j.projectService.GetProjectRunningImages(ctx, project.ID)
			if err != nil {
				slog.WarnContext(ctx, "Failed to get images for project",
					slog.String("projectID", project.ID),
					slog.String("error", err.Error()))
				continue
			}
			for _, img := range projectImages {
				excludedImages[img] = struct{}{}
			}
		}
	}

	// Return images not in excluded set
	images := make([]string, 0, len(allImages))
	for img := range allImages {
		if _, excluded := excludedImages[img]; !excluded {
			images = append(images, img)
		}
	}

	return images, nil
}

// ensureGlobalSchedule creates or updates the global polling schedule
func (j *ImagePollingJob) ensureGlobalSchedule(ctx context.Context) error {
	globalInterval := j.settingsService.GetIntSetting(ctx, "pollingInterval", 60)
	if globalInterval < 5 {
		globalInterval = 5 // Minimum 5 minutes
	}

	interval := time.Duration(globalInterval) * time.Minute
	nextPollTime := time.Now().Add(interval)

	task := &services.PollTask{
		ProjectID:       nil, // Global
		NextPollTime:    nextPollTime,
		PollingInterval: interval,
	}

	return j.scheduler.Schedule(task)
}

// ensureProjectSchedules creates or updates schedules for projects with custom polling
func (j *ImagePollingJob) ensureProjectSchedules(ctx context.Context) error {
	projects, err := j.projectService.ListAllProjects(ctx)
	if err != nil {
		return fmt.Errorf("failed to list projects: %w", err)
	}

	for _, project := range projects {
		if project.PollingEnabled != nil && *project.PollingEnabled {
			projectInterval := 60 // default
			if project.PollingInterval != nil {
				projectInterval = *project.PollingInterval
			}
			if projectInterval < 5 {
				projectInterval = 5
			}

			interval := time.Duration(projectInterval) * time.Minute
			nextPollTime := time.Now().Add(interval)

			task := &services.PollTask{
				ProjectID:       &project.ID,
				NextPollTime:    nextPollTime,
				PollingInterval: interval,
			}

			if err := j.scheduler.Schedule(task); err != nil {
				slog.WarnContext(ctx, "Failed to schedule project polling task",
					slog.String("projectID", project.ID),
					slog.String("error", err.Error()))
			}
		}
	}

	return nil
}

// loadRegistryCredentials loads credentials from the environment service
func (j *ImagePollingJob) loadRegistryCredentials(ctx context.Context) ([]dto.ContainerRegistryCredential, error) {
	return j.environmentService.GetEnabledRegistryCredentials(ctx)
}

// Reschedule handles dynamic changes to polling settings
func (j *ImagePollingJob) Reschedule(ctx context.Context) error {
	globalEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)

	if globalEnabled {
		// Update global schedule
		if err := j.ensureGlobalSchedule(ctx); err != nil {
			slog.WarnContext(ctx, "Failed to update global schedule",
				slog.String("error", err.Error()))
		}
	} else {
		// Remove global schedule if disabled
		if err := j.scheduler.Remove(nil); err != nil {
			slog.WarnContext(ctx, "Failed to remove global schedule",
				slog.String("error", err.Error()))
		}
	}

	// Update project schedules
	if err := j.ensureProjectSchedules(ctx); err != nil {
		slog.WarnContext(ctx, "Failed to update project schedules",
			slog.String("error", err.Error()))
	}

	slog.InfoContext(ctx, "Polling schedules updated",
		slog.Int("schedulerSize", j.scheduler.Size()))

	return nil
}

// Shutdown gracefully stops the polling job
func (j *ImagePollingJob) Shutdown(ctx context.Context) error {
	if j.mainLoopCancel != nil {
		j.mainLoopCancel()
	}
	return j.scheduler.Shutdown(ctx)
}
