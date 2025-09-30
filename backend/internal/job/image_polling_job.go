package job

import (
	"context"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type ImagePollingJob struct {
	imageUpdateService *services.ImageUpdateService
	settingsService    *services.SettingsService
	registryService    *services.ContainerRegistryService
	scheduler          *Scheduler
}

func NewImagePollingJob(scheduler *Scheduler, imageUpdateService *services.ImageUpdateService, settingsService *services.SettingsService, registryService *services.ContainerRegistryService) *ImagePollingJob {
	return &ImagePollingJob{
		imageUpdateService: imageUpdateService,
		settingsService:    settingsService,
		registryService:    registryService,
		scheduler:          scheduler,
	}
}

func (j *ImagePollingJob) Register(ctx context.Context) error {
	pollingEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	pollingInterval := j.settingsService.GetIntSetting(ctx, "pollingInterval", 60)

	if !pollingEnabled {
		slog.InfoContext(ctx, "polling disabled; job not registered")
		return nil
	}

	interval := time.Duration(pollingInterval) * time.Minute
	if interval < 5*time.Minute {
		slog.WarnContext(ctx, "polling interval too low; using default",
			slog.Int("requested_minutes", pollingInterval),
			slog.String("effective_interval", "60m"))
		interval = 60 * time.Minute
	}

	slog.InfoContext(ctx, "registering image polling job", slog.String("interval", interval.String()))

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
	registries, err := j.registryService.GetEnabledRegistries(ctx)
	if err != nil {
		return nil, err
	}

	var creds []dto.ContainerRegistryCredential
	for _, reg := range registries {
		if !reg.Enabled || reg.Username == "" || reg.Token == "" {
			continue
		}

		decryptedToken, err := utils.Decrypt(reg.Token)
		if err != nil {
			slog.WarnContext(ctx, "Failed to decrypt registry token during polling",
				slog.String("registryURL", reg.URL),
				slog.String("error", err.Error()))
			continue
		}

		creds = append(creds, dto.ContainerRegistryCredential{
			URL:      reg.URL,
			Username: reg.Username,
			Token:    decryptedToken,
			Enabled:  reg.Enabled,
		})
	}

	slog.DebugContext(ctx, "Loaded registry credentials for polling",
		slog.Int("credentialCount", len(creds)))

	return creds, nil
}

func (j *ImagePollingJob) Reschedule(ctx context.Context) error {
	pollingEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	pollingInterval := j.settingsService.GetIntSetting(ctx, "pollingInterval", 60)

	if !pollingEnabled {
		j.scheduler.RemoveJobByName("image-polling")
		slog.InfoContext(ctx, "polling disabled; removed image-polling job if present")
		return nil
	}

	interval := time.Duration(pollingInterval) * time.Minute
	if interval < 5*time.Minute {
		interval = 60 * time.Minute
	}
	slog.InfoContext(ctx, "polling settings changed; rescheduling", slog.String("interval", interval.String()))

	return j.scheduler.RescheduleDurationJobByName(ctx, "image-polling", interval, j.Execute, false)
}
