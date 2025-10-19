package job

import (
	"context"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

type AutoUpdateJob struct {
	updaterService  *services.UpdaterService
	settingsService *services.SettingsService
	projectService  *services.ProjectService
	scheduler       *Scheduler
}

func NewAutoUpdateJob(scheduler *Scheduler, updaterService *services.UpdaterService, settingsService *services.SettingsService, projectService *services.ProjectService) *AutoUpdateJob {
	return &AutoUpdateJob{
		updaterService:  updaterService,
		settingsService: settingsService,
		projectService:  projectService,
		scheduler:       scheduler,
	}
}

func (j *AutoUpdateJob) Register(ctx context.Context) error {
	autoUpdateEnabled := j.settingsService.GetBoolSetting(ctx, "autoUpdate", false)
	pollingEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	autoUpdateInterval := j.settingsService.GetIntSetting(ctx, "autoUpdateInterval", 1440)

	if !autoUpdateEnabled || !pollingEnabled {
		slog.InfoContext(ctx, "auto-update disabled or polling disabled; job not registered",
			"autoUpdate", autoUpdateEnabled, "pollingEnabled", pollingEnabled)
		return nil
	}

	interval := time.Duration(autoUpdateInterval) * time.Minute
	if interval < 5*time.Minute {
		slog.WarnContext(ctx, "auto-update interval too low; using default",
			"requested_minutes", autoUpdateInterval,
			"effective_interval", "60m")
		interval = 60 * time.Minute
	}

	slog.InfoContext(ctx, "registering auto-update job", "interval", interval.String())

	// ensure single instance
	j.scheduler.RemoveJobByName("auto-update")

	jobDefinition := gocron.DurationJob(interval)
	return j.scheduler.RegisterJob(
		ctx,
		"auto-update",
		jobDefinition,
		j.Execute,
		false,
	)
}

func (j *AutoUpdateJob) Execute(ctx context.Context) error {
	slog.InfoContext(ctx, "auto-update run started")

	enabled := j.settingsService.GetBoolSetting(ctx, "autoUpdate", false)
	pollingEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	if !enabled || !pollingEnabled {
		slog.InfoContext(ctx, "auto-update disabled or polling disabled; skipping run",
			"autoUpdate", enabled, "pollingEnabled", pollingEnabled)
		return nil
	}

	return j.executeProjectSpecificUpdates(ctx)
}

func (j *AutoUpdateJob) executeProjectSpecificUpdates(ctx context.Context) error {
	slog.InfoContext(ctx, "executing project-specific updates")

	projects, err := j.projectService.ListAllProjects(ctx)
	if err != nil {
		slog.ErrorContext(ctx, "failed to list projects for update check", slog.Any("err", err))
		return err
	}

	totalUpdated := 0
	totalSkipped := 0
	totalFailed := 0
	projectsProcessed := 0

	for _, project := range projects {
		// Skip stopped projects
		if project.Status != "running" && project.Status != "partially running" {
			continue
		}

		projectsProcessed++

		// Check if this project should be updated based on its settings
		shouldUpdate, err := j.shouldUpdateProject(ctx, &project)
		if err != nil {
			slog.ErrorContext(ctx, "failed to check project update settings",
				slog.String("projectID", project.ID),
				slog.String("projectName", project.Name),
				slog.Any("err", err))
			totalFailed++
			continue
		}

		if !shouldUpdate {
			slog.DebugContext(ctx, "project not eligible for update",
				slog.String("projectID", project.ID),
				slog.String("projectName", project.Name))
			totalSkipped++
			continue
		}

		// Apply updates for this specific project
		result, err := j.updaterService.ApplyPendingForProject(ctx, &project, false)
		if err != nil {
			slog.ErrorContext(ctx, "failed to apply updates for project",
				slog.String("projectID", project.ID),
				slog.String("projectName", project.Name),
				slog.Any("err", err))
			totalFailed++
			continue
		}

		if result.Updated > 0 {
			totalUpdated++
			slog.InfoContext(ctx, "project updated successfully",
				slog.String("projectID", project.ID),
				slog.String("projectName", project.Name),
				slog.Int("updated", result.Updated),
				slog.Int("skipped", result.Skipped))
		} else {
			totalSkipped++
		}
	}

	slog.InfoContext(ctx, "project-specific auto-update run completed",
		slog.Int("projects_checked", projectsProcessed),
		slog.Int("projects_updated", totalUpdated),
		slog.Int("projects_skipped", totalSkipped),
		slog.Int("projects_errors", totalFailed))

	return nil
}

func (j *AutoUpdateJob) shouldUpdateProject(ctx context.Context, project *models.Project) (bool, error) {
	resolved, err := j.settingsService.ResolveProjectSettings(ctx, project)
	if err != nil {
		return false, err
	}

	// If auto-update is disabled for this project, skip
	if !resolved.AutoUpdate {
		return false, nil
	}

	// If schedule is enabled, check if we're within the update window
	if resolved.UpdateScheduleEnabled {
		withinWindow, err := j.updaterService.IsWithinUpdateWindow(ctx, project)
		if err != nil {
			return false, err
		}
		return withinWindow, nil
	}

	// If schedule is disabled, always allow updates
	return true, nil
}

func (j *AutoUpdateJob) Reschedule(ctx context.Context) error {
	autoUpdateEnabled := j.settingsService.GetBoolSetting(ctx, "autoUpdate", false)
	pollingEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	autoUpdateInterval := j.settingsService.GetIntSetting(ctx, "autoUpdateInterval", 1440)

	if !autoUpdateEnabled || !pollingEnabled {
		j.scheduler.RemoveJobByName("auto-update")
		slog.InfoContext(ctx, "auto-update disabled or polling disabled; removed job if present",
			"autoUpdate", autoUpdateEnabled, "pollingEnabled", pollingEnabled)
		return nil
	}

	interval := time.Duration(autoUpdateInterval) * time.Minute
	if interval < 5*time.Minute {
		interval = 60 * time.Minute
	}
	slog.InfoContext(ctx, "auto-update settings changed; rescheduling", "interval", interval.String())

	return j.scheduler.RescheduleDurationJobByName(ctx, "auto-update", interval, j.Execute, false)
}
