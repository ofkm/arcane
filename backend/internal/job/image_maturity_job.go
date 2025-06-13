package job

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/services"
)

const ImageMaturityJobName = "ImageMaturityCheck"

func RegisterImageMaturityJob(
	ctx context.Context,
	scheduler *Scheduler,
	settingsService *services.SettingsService,
	imageMaturityService *services.ImageMaturityService,
	imageService *services.ImageService,
) error {
	appSettings, err := settingsService.GetSettings(ctx)
	if err != nil {
		return fmt.Errorf("failed to get settings for image maturity job: %w", err)
	}

	if !appSettings.PollingEnabled {
		slog.Info("Image maturity polling is disabled in settings. Job not scheduled.", "jobName", ImageMaturityJobName)
		return nil
	}

	pollingIntervalMinutes := appSettings.PollingInterval
	if pollingIntervalMinutes <= 0 {
		slog.Warn(
			"PollingInterval is not set to a positive value, defaulting image maturity job to 30 minutes",
			"jobName", ImageMaturityJobName,
			"configuredInterval", pollingIntervalMinutes,
			"defaultInterval", 30,
		)
		pollingIntervalMinutes = 30
	}

	slog.Info(
		"Preparing to register image maturity job",
		"jobName", ImageMaturityJobName,
		"intervalMinutes", pollingIntervalMinutes,
	)

	taskFunc := func(jobCtx context.Context) error {
		slog.Info("Running image maturity check job", "jobName", ImageMaturityJobName)

		err := imageMaturityService.ProcessImagesForMaturityCheck(jobCtx, imageService)
		if err != nil {
			slog.Error("Image maturity check job failed", "jobName", ImageMaturityJobName, slog.Any("error", err))
			return err
		}
		slog.Info("Image maturity check job completed successfully", "jobName", ImageMaturityJobName)
		return nil
	}

	jobDefinition := gocron.DurationJob(time.Duration(pollingIntervalMinutes) * time.Minute)

	runImmediately := true

	err = scheduler.RegisterJob(
		ctx,
		ImageMaturityJobName,
		jobDefinition,
		taskFunc,
		runImmediately,
	)

	if err != nil {
		return fmt.Errorf("failed to register image maturity job %q: %w", ImageMaturityJobName, err)
	}

	slog.Info(
		"Image maturity job registered successfully",
		"jobName", ImageMaturityJobName,
		"intervalMinutes", pollingIntervalMinutes,
		"runImmediately", runImmediately,
	)
	return nil
}
