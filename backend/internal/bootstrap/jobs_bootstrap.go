package bootstrap

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/job"
	"github.com/ofkm/arcane-backend/internal/services"
)

func initializeScheduler() (*job.Scheduler, error) {
	scheduler, err := job.NewScheduler()
	if err != nil {
		return nil, fmt.Errorf("failed to create job scheduler: %w", err)
	}
	return scheduler, nil
}

func registerJobs(appCtx context.Context, scheduler *job.Scheduler, appServices *Services, appConfig *config.Config) {
	autoUpdateJob := job.NewAutoUpdateJob(scheduler, appServices.Updater, appServices.Settings)
	if err := autoUpdateJob.Register(appCtx); err != nil {
		slog.ErrorContext(appCtx, "Failed to register auto-update job", slog.Any("error", err))
	}

	// Initialize worker pool for image polling
	workerCount := appServices.Settings.GetIntSetting(appCtx, "pollingWorkerCount", 10)
	if workerCount < 1 {
		workerCount = 10
	}

	// Create image polling job first (without worker pool)
	imagePollingJob := job.NewImagePollingJob(
		appServices.PollingScheduler,
		nil, // Worker pool will be set after creation
		appServices.BatchCoordinator,
		appServices.Settings,
		appServices.Environment,
		appServices.Project,
		appServices.Docker,
	)

	// Create worker pool with task executor from the job
	workerPool := services.NewPollingWorkerPool(workerCount, imagePollingJob.ExecuteTask)
	workerPool.Start(appCtx)
	appServices.WorkerPool = workerPool

	// Now create the final job with the worker pool
	imagePollingJobFinal := job.NewImagePollingJob(
		appServices.PollingScheduler,
		workerPool,
		appServices.BatchCoordinator,
		appServices.Settings,
		appServices.Environment,
		appServices.Project,
		appServices.Docker,
	)

	if err := imagePollingJobFinal.Register(appCtx); err != nil {
		slog.ErrorContext(appCtx, "Failed to register image polling job", slog.Any("error", err))
	}

	analyticsJob := job.NewAnalyticsJob(scheduler, appServices.Settings, nil, appConfig)
	if err := analyticsJob.Register(appCtx); err != nil {
		slog.ErrorContext(appCtx, "Failed to register analytics heartbeat job", slog.Any("error", err))
	}

	if err := job.RegisterEventCleanupJob(appCtx, scheduler, appServices.Event); err != nil {
		slog.ErrorContext(appCtx, "Failed to register event cleanup job", slog.Any("error", err))
	}

	if err := job.RegisterFilesystemWatcherJob(appCtx, scheduler, appServices.Project, appServices.Template, appServices.Settings); err != nil {
		slog.ErrorContext(appCtx, "Failed to register filesystem watcher job", slog.Any("error", err))
	}

	appServices.Settings.OnImagePollingSettingsChanged = func(ctx context.Context) {
		if err := imagePollingJobFinal.Reschedule(ctx); err != nil {
			slog.WarnContext(ctx, "Failed to reschedule image-polling job", slog.Any("error", err))
		}
		if err := autoUpdateJob.Reschedule(ctx); err != nil {
			slog.WarnContext(ctx, "Failed to reschedule auto-update job", slog.Any("error", err))
		}
	}
	appServices.Settings.OnAutoUpdateSettingsChanged = func(ctx context.Context) {
		if err := autoUpdateJob.Reschedule(ctx); err != nil {
			slog.WarnContext(ctx, "Failed to reschedule auto-update job", slog.Any("error", err))
		}
	}
	appServices.Project.OnProjectPollingSettingsChanged = func(ctx context.Context, projectID string) {
		if err := imagePollingJobFinal.HandleProjectSettingsChange(ctx, projectID); err != nil {
			slog.WarnContext(ctx, "Failed to handle project polling settings change",
				slog.String("projectID", projectID),
				slog.Any("error", err))
		}
	}
}
