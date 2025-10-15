package job

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
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
	eventService       *services.EventService
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
	eventService *services.EventService,
) *ImagePollingJob {
	return &ImagePollingJob{
		scheduler:          scheduler,
		workerPool:         workerPool,
		batchCoordinator:   batchCoordinator,
		settingsService:    settingsService,
		environmentService: environmentService,
		projectService:     projectService,
		dockerService:      dockerService,
		eventService:       eventService,
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
	go func() {
		j.run(j.mainLoopCtx)
	}()

	slog.InfoContext(ctx, "Image polling job registered with heap-based scheduler",
		slog.Int("schedulerSize", j.scheduler.Size()))

	return nil
}

// run is the main loop that continuously fetches and executes tasks
func (j *ImagePollingJob) run(ctx context.Context) {
	slog.InfoContext(ctx, "Image polling job main loop started")

	// Batch window: collect tasks scheduled within 30 seconds of each other
	const batchWindow = 30 * time.Second

	for {
		// Get the first task (blocks until ready)
		firstTask, err := j.scheduler.NextTask(ctx)
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

		// Collect additional tasks within the batch window
		batch := []*services.PollTask{firstTask}
		batchDeadline := time.Now().Add(batchWindow)

		// Try to collect more tasks (non-blocking peek with timeout)
		for time.Now().Before(batchDeadline) {
			// Use a short timeout to check for more tasks
			batchCtx, cancel := context.WithTimeout(ctx, time.Until(batchDeadline))
			nextTask, err := j.scheduler.NextTask(batchCtx)
			cancel()

			if err != nil {
				// No more tasks available in time window, break
				break
			}

			batch = append(batch, nextTask)

			// Limit batch size to prevent unbounded growth
			if len(batch) >= 10 {
				break
			}
		}

		// Submit all tasks in batch
		if len(batch) > 1 {
			slog.InfoContext(ctx, "Processing batched polling tasks",
				slog.Int("batchSize", len(batch)))
		}

		for _, task := range batch {
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
}

// ExecuteTask is called by worker pool to execute a polling task
func (j *ImagePollingJob) ExecuteTask(ctx context.Context, task *services.PollTask) error {
	startTime := time.Now()
	var projectIDStr string
	var projectName string
	if task.ProjectID == nil {
		projectIDStr = "global"
		projectName = "Global Polling"
	} else {
		projectIDStr = *task.ProjectID
		// Try to get project name for better event logging
		if project, err := j.projectService.GetProjectFromDatabaseByID(ctx, *task.ProjectID); err == nil {
			projectName = project.Name
		} else {
			projectName = projectIDStr
		}
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

		// Log failure event
		j.logPollingEvent(ctx, task.ProjectID, projectName, false, 0, 0, time.Since(startTime), err.Error())

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

	// Log success event (only if no critical errors)
	if errors < len(results) {
		j.logPollingEvent(ctx, task.ProjectID, projectName, true, len(results), updates, duration, "")
	} else {
		j.logPollingEvent(ctx, task.ProjectID, projectName, false, len(results), 0, duration, "All image checks failed")
	}

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

// HandleProjectSettingsChange handles changes to project polling settings
func (j *ImagePollingJob) HandleProjectSettingsChange(ctx context.Context, projectID string) error {
	slog.InfoContext(ctx, "Handling project polling settings change",
		slog.String("projectID", projectID))

	// Get the project to check current settings
	project, err := j.projectService.GetProjectFromDatabaseByID(ctx, projectID)
	if err != nil {
		// Project not found (deleted) or other error - remove schedule if it exists
		slog.InfoContext(ctx, "Project not found, removing polling schedule if exists",
			slog.String("projectID", projectID),
			slog.String("error", err.Error()))
		return j.scheduler.Remove(&projectID)
	}

	// If polling is disabled or no custom interval, remove the project schedule
	if project.PollingEnabled == nil || !*project.PollingEnabled {
		slog.InfoContext(ctx, "Removing project polling schedule (disabled or cleared)",
			slog.String("projectID", projectID))
		return j.scheduler.Remove(&projectID)
	}

	// Polling is enabled with custom settings, update/create schedule
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
		ProjectID:       &projectID,
		NextPollTime:    nextPollTime,
		PollingInterval: interval,
	}

	slog.InfoContext(ctx, "Updating project polling schedule",
		slog.String("projectID", projectID),
		slog.Int("interval", projectInterval))

	return j.scheduler.Schedule(task)
}

// Shutdown gracefully stops the polling job
func (j *ImagePollingJob) Shutdown(ctx context.Context) error {
	if j.mainLoopCancel != nil {
		j.mainLoopCancel()
	}
	return j.scheduler.Shutdown(ctx)
}

// logPollingEvent logs a polling event to the event log
func (j *ImagePollingJob) logPollingEvent(ctx context.Context, projectID *string, projectName string, success bool, imagesChecked, imagesUpdated int, duration time.Duration, errorMsg string) {
	if j.eventService == nil {
		return
	}

	var eventType models.EventType
	var severity models.EventSeverity
	var title, description string
	metadata := models.JSON{
		"imagesChecked": imagesChecked,
		"imagesUpdated": imagesUpdated,
		"durationMs":    duration.Milliseconds(),
	}

	if projectID == nil {
		// Global polling event
		eventType = models.EventTypeSystemPoll
		if success {
			severity = models.EventSeveritySuccess
			title = "Global polling completed"
			description = fmt.Sprintf("Checked %d images, found %d updates in %dms",
				imagesChecked, imagesUpdated, duration.Milliseconds())
		} else {
			severity = models.EventSeverityError
			title = "Global polling failed"
			description = fmt.Sprintf("Failed after %dms: %s", duration.Milliseconds(), errorMsg)
			metadata["error"] = errorMsg
		}

		_, _ = j.eventService.CreateEvent(ctx, services.CreateEventRequest{
			Type:        eventType,
			Severity:    severity,
			Title:       title,
			Description: description,
			Metadata:    metadata,
		})
	} else {
		// Project-specific polling event
		eventType = models.EventTypeProjectPoll
		if success {
			severity = models.EventSeveritySuccess
			title = fmt.Sprintf("Polling completed: %s", projectName)
			description = fmt.Sprintf("Checked %d images, found %d updates in %dms",
				imagesChecked, imagesUpdated, duration.Milliseconds())
		} else {
			severity = models.EventSeverityError
			title = fmt.Sprintf("Polling failed: %s", projectName)
			description = fmt.Sprintf("Failed after %dms: %s", duration.Milliseconds(), errorMsg)
			metadata["error"] = errorMsg
		}

		resourceType := "project"
		_, _ = j.eventService.CreateEvent(ctx, services.CreateEventRequest{
			Type:         eventType,
			Severity:     severity,
			Title:        title,
			Description:  description,
			ResourceType: &resourceType,
			ResourceID:   projectID,
			ResourceName: &projectName,
			Metadata:     metadata,
		})
	}
}
