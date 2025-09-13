package bootstrap

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/ofkm/arcane-backend/internal/job"
)

func initializeScheduler() (*job.Scheduler, error) {
	scheduler, err := job.NewScheduler()
	if err != nil {
		return nil, fmt.Errorf("failed to create job scheduler: %w", err)
	}
	return scheduler, nil
}

func registerJobs(appCtx context.Context, scheduler *job.Scheduler, appServices *Services) {
	if err := job.RegisterAutoUpdateJob(appCtx, scheduler, appServices.Updater, appServices.Settings); err != nil {
		slog.ErrorContext(appCtx, "Failed to register auto-update job", slog.Any("error", err))
	}

	if err := job.RegisterEventCleanupJob(appCtx, scheduler, appServices.Event); err != nil {
		slog.ErrorContext(appCtx, "Failed to register event cleanup job", slog.Any("error", err))
	}

	if err := job.RegisterFilesystemWatcherJob(appCtx, scheduler, appServices.Stack, appServices.Template, appServices.Settings); err != nil {
		slog.ErrorContext(appCtx, "Failed to register filesystem watcher job", slog.Any("error", err))
	}

	if err := job.RegisterImagePollingJob(appCtx, scheduler, appServices.ImageUpdate, appServices.Settings); err != nil {
		slog.ErrorContext(appCtx, "Failed to register image polling job", slog.Any("error", err))
	}
}
