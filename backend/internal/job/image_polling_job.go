package job

import (
	"context"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
)

type ImagePollingJob struct {
	imageUpdateService *services.ImageUpdateService
	settingsService    *services.SettingsService
	environmentService *services.EnvironmentService
	projectService     *services.ProjectService
	scheduler          *Scheduler
}

func NewImagePollingJob(scheduler *Scheduler, imageUpdateService *services.ImageUpdateService, settingsService *services.SettingsService, environmentService *services.EnvironmentService, projectService *services.ProjectService) *ImagePollingJob {
	return &ImagePollingJob{
		imageUpdateService: imageUpdateService,
		settingsService:    settingsService,
		environmentService: environmentService,
		projectService:     projectService,
		scheduler:          scheduler,
	}
}

func (j *ImagePollingJob) Register(ctx context.Context) error {
	globalEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	globalInterval := j.settingsService.GetIntSetting(ctx, "pollingInterval", 60)

	if !globalEnabled {
		slog.InfoContext(ctx, "polling disabled globally; job not registered")
		return nil
	}

	interval := time.Duration(globalInterval) * time.Minute
	if interval < 5*time.Minute {
		slog.WarnContext(ctx, "polling interval too low; using minimum",
			slog.String("requested_interval", interval.String()),
			slog.String("effective_interval", "5m"))
		interval = 5 * time.Minute
	}

	slog.InfoContext(ctx, "registering image polling job",
		slog.String("interval", interval.String()))

	j.scheduler.RemoveJobByName("image-polling")

	jobDefinition := gocron.DurationJob(interval)
	return j.scheduler.RegisterJob(
		ctx,
		"image-polling",
		jobDefinition,
		j.Execute,
		false,
	)
}

func (j *ImagePollingJob) Execute(ctx context.Context) error {
	slog.InfoContext(ctx, "image scan run started")

	globalEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	if !globalEnabled {
		slog.InfoContext(ctx, "polling disabled globally; skipping")
		return nil
	}

	creds, err := j.loadRegistryCredentials(ctx)
	if err != nil {
		slog.WarnContext(ctx, "failed to load registry credentials for polling",
			slog.String("error", err.Error()))
		creds = nil
	}

	results, err := j.imageUpdateService.CheckAllImages(ctx, 0, creds)
	if err != nil {
		slog.ErrorContext(ctx, "image scan failed", slog.Any("err", err))
		return err
	}

	total := len(results)
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

	slog.InfoContext(ctx, "image scan run completed",
		slog.Int("checked", total),
		slog.Int("updates", updates),
		slog.Int("errors", errors))

	return nil
}

func (j *ImagePollingJob) loadRegistryCredentials(ctx context.Context) ([]dto.ContainerRegistryCredential, error) {
	return j.environmentService.GetEnabledRegistryCredentials(ctx)
}

func (j *ImagePollingJob) Reschedule(ctx context.Context) error {
	globalEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	globalInterval := j.settingsService.GetIntSetting(ctx, "pollingInterval", 60)

	if !globalEnabled {
		j.scheduler.RemoveJobByName("image-polling")
		slog.InfoContext(ctx, "polling disabled; removed image-polling job if present")
		return nil
	}

	interval := time.Duration(globalInterval) * time.Minute
	if interval < 5*time.Minute {
		interval = 5 * time.Minute
	}

	slog.InfoContext(ctx, "polling settings changed; rescheduling",
		slog.String("interval", interval.String()))

	return j.scheduler.RescheduleDurationJobByName(ctx, "image-polling", interval, j.Execute, false)
}
