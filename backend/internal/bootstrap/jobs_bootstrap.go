package bootstrap

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/ofkm/arcane-backend/internal/api"
	"github.com/ofkm/arcane-backend/internal/job"
)

func initializeScheduler() (*job.Scheduler, error) {
	scheduler, err := job.NewScheduler()
	if err != nil {
		return nil, fmt.Errorf("failed to create job scheduler: %w", err)
	}
	return scheduler, nil
}

func registerJobs(appCtx context.Context, scheduler *job.Scheduler, appServices *api.Services) {
	if err := job.RegisterImageMaturityJob(appCtx, scheduler, appServices.Settings, appServices.ImageMaturity, appServices.Image); err != nil {
		slog.Error("Failed to register image maturity job", slog.Any("error", err))
	}

	if err := job.RegisterAutoUpdateJob(appCtx, scheduler, appServices.AutoUpdate, appServices.Settings); err != nil {
		slog.Error("Failed to register auto-update job", slog.Any("error", err))
	}
}
