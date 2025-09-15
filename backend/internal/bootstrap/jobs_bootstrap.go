package bootstrap

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/ofkm/arcane-backend/internal/config"
	"github.com/ofkm/arcane-backend/internal/job"
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

	imagePollingJob := job.NewImagePollingJob(scheduler, appServices.ImageUpdate, appServices.Settings)
	if err := imagePollingJob.Register(appCtx); err != nil {
		slog.ErrorContext(appCtx, "Failed to register image polling job", slog.Any("error", err))
	}

	// Register analytics heartbeat job
	analyticsJob := job.NewAnalyticsJob(scheduler, appServices.Settings, nil, appConfig)
	if err := analyticsJob.Register(appCtx); err != nil {
		slog.ErrorContext(appCtx, "Failed to register analytics heartbeat job", slog.Any("error", err))
	}

	if err := job.RegisterEventCleanupJob(appCtx, scheduler, appServices.Event); err != nil {
		slog.ErrorContext(appCtx, "Failed to register event cleanup job", slog.Any("error", err))
	}

	if err := job.RegisterFilesystemWatcherJob(appCtx, scheduler, appServices.Stack, appServices.Template, appServices.Settings); err != nil {
		slog.ErrorContext(appCtx, "Failed to register filesystem watcher job", slog.Any("error", err))
	}

	appServices.Settings.OnImagePollingSettingsChanged = func(ctx context.Context) {
		if err := imagePollingJob.Reschedule(ctx); err != nil {
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
}
