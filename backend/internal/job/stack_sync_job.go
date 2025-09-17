package job

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/services"
)

const ProjectSyncJobName = "ProjectSync"

func RegisterProjectSyncJob(
	ctx context.Context,
	scheduler *Scheduler,
	projectService *services.ProjectService,
) error {
	slog.InfoContext(ctx, "Registering project sync job", "jobName", ProjectSyncJobName)

	taskFunc := func(jobCtx context.Context) error {
		slog.InfoContext(jobCtx, "Running project sync job", "jobName", ProjectSyncJobName)

		if err := projectService.SyncProjectsFromFileSystem(jobCtx); err != nil {
			slog.ErrorContext(jobCtx, "Failed to sync projects with filesystem",
				"jobName", ProjectSyncJobName,
				slog.Any("error", err))
			return err
		}

		slog.InfoContext(jobCtx, "Project sync job completed", "jobName", ProjectSyncJobName)
		return nil
	}

	jobDefinition := gocron.DurationJob(2 * time.Minute)

	err := scheduler.RegisterJob(
		ctx,
		ProjectSyncJobName,
		jobDefinition,
		taskFunc,
		true, // Run immediately on startup
	)

	if err != nil {
		return fmt.Errorf("failed to register project sync job %q: %w", ProjectSyncJobName, err)
	}

	slog.InfoContext(ctx, "Project sync job registered successfully", "jobName", ProjectSyncJobName)
	return nil
}
