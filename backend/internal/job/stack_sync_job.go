package job

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/services"
)

const StackSyncJobName = "StackSync"

func RegisterStackSyncJob(
	ctx context.Context,
	scheduler *Scheduler,
	stackService *services.StackService,
) error {
	slog.Info("Registering stack sync job", "jobName", StackSyncJobName)

	taskFunc := func(jobCtx context.Context) error {
		slog.Info("Running stack sync job", "jobName", StackSyncJobName)

		externals, err := stackService.DiscoverExternalStacks(jobCtx)
		if err != nil {
			slog.Error("Failed to discover external stacks", "jobName", StackSyncJobName, slog.Any("error", err))
			return err
		}

		imported := 0
		for _, external := range externals {
			if external.DirName != nil {
				if _, err := stackService.ImportExternalStack(jobCtx, *external.DirName, external.Name); err != nil {
					slog.Warn("Failed to import external stack",
						"jobName", StackSyncJobName,
						"dirName", *external.DirName,
						slog.Any("error", err))
				} else {
					imported++
				}
			}
		}

		slog.Info("Stack sync job completed",
			"jobName", StackSyncJobName,
			"discovered", len(externals),
			"imported", imported)
		return nil
	}

	jobDefinition := gocron.DurationJob(5 * time.Minute)

	err := scheduler.RegisterJob(
		ctx,
		StackSyncJobName,
		jobDefinition,
		taskFunc,
		true, // Run immediately on startup
	)

	if err != nil {
		return fmt.Errorf("failed to register stack sync job %q: %w", StackSyncJobName, err)
	}

	slog.Info("Stack sync job registered successfully", "jobName", StackSyncJobName)
	return nil
}
