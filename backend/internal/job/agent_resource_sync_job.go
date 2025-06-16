package job

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/services"
)

const AgentResourceSyncJobName = "AgentResourceSync"

func RegisterAgentResourceSyncJob(
	ctx context.Context,
	scheduler *Scheduler,
	settingsService *services.SettingsService,
	agentResourceService *services.AgentResourceService,
) error {
	appSettings, err := settingsService.GetSettings(ctx)
	if err != nil {
		return fmt.Errorf("failed to get settings for agent resource sync job: %w", err)
	}

	if !appSettings.AgentResourceSyncEnabled {
		slog.Info("Agent resource sync is disabled in settings. Job not scheduled.", "jobName", AgentResourceSyncJobName)
		return nil
	}

	syncIntervalMinutes := appSettings.AgentResourceSyncInterval
	if syncIntervalMinutes <= 0 {
		slog.Warn(
			"AgentResourceSyncInterval is not set to a positive value, defaulting to 5 minutes",
			"jobName", AgentResourceSyncJobName,
			"configuredInterval", syncIntervalMinutes,
			"defaultInterval", 5,
		)
		syncIntervalMinutes = 5
	}

	slog.Info(
		"Preparing to register agent resource sync job",
		"jobName", AgentResourceSyncJobName,
		"intervalMinutes", syncIntervalMinutes,
	)

	taskFunc := func(jobCtx context.Context) error {
		slog.Info("Running agent resource sync job", "jobName", AgentResourceSyncJobName)

		err := agentResourceService.SyncAllOnlineAgents(jobCtx)
		if err != nil {
			slog.Error("Agent resource sync job failed", "jobName", AgentResourceSyncJobName, slog.Any("error", err))
			return err
		}
		slog.Info("Agent resource sync job completed successfully", "jobName", AgentResourceSyncJobName)
		return nil
	}

	jobDefinition := gocron.DurationJob(time.Duration(syncIntervalMinutes) * time.Minute)

	runImmediately := true

	err = scheduler.RegisterJob(
		ctx,
		AgentResourceSyncJobName,
		jobDefinition,
		taskFunc,
		runImmediately,
	)

	if err != nil {
		return fmt.Errorf("failed to register agent resource sync job %q: %w", AgentResourceSyncJobName, err)
	}

	slog.Info(
		"Agent resource sync job registered successfully",
		"jobName", AgentResourceSyncJobName,
		"intervalMinutes", syncIntervalMinutes,
		"runImmediately", runImmediately,
	)
	return nil
}
