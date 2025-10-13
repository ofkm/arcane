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
	minInterval, anyEnabled := j.getMinPollingInterval(ctx)

	if !anyEnabled {
		slog.InfoContext(ctx, "polling disabled globally and for all projects; job not registered")
		return nil
	}

	if minInterval < 5*time.Minute {
		slog.WarnContext(ctx, "polling interval too low; using minimum",
			slog.String("requested_interval", minInterval.String()),
			slog.String("effective_interval", "5m"))
		minInterval = 5 * time.Minute
	}

	slog.InfoContext(ctx, "registering image polling job",
		slog.String("interval", minInterval.String()),
		slog.String("note", "using shortest interval among all projects"))

	j.scheduler.RemoveJobByName("image-polling")

	jobDefinition := gocron.DurationJob(minInterval)
	return j.scheduler.RegisterJob(
		ctx,
		"image-polling",
		jobDefinition,
		j.Execute,
		false,
	)
}

func (j *ImagePollingJob) getMinPollingInterval(ctx context.Context) (time.Duration, bool) {
	globalEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	globalInterval := j.settingsService.GetIntSetting(ctx, "pollingInterval", 60)

	minInterval := time.Duration(globalInterval) * time.Minute
	anyEnabled := globalEnabled

	projects, err := j.projectService.ListAllProjects(ctx)
	if err != nil {
		slog.WarnContext(ctx, "failed to get projects for polling interval calculation", slog.Any("err", err))
		return minInterval, anyEnabled
	}

	for _, project := range projects {
		resolved, err := j.settingsService.ResolveProjectSettings(ctx, &project)
		if err != nil {
			continue
		}

		if resolved.PollingEnabled {
			anyEnabled = true
			projectInterval := time.Duration(resolved.PollingInterval) * time.Minute
			if projectInterval < minInterval {
				minInterval = projectInterval
			}
		}
	}

	return minInterval, anyEnabled
}

func (j *ImagePollingJob) Execute(ctx context.Context) error {
	slog.InfoContext(ctx, "image scan run started")

	globalEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	if !globalEnabled {
		projects, err := j.projectService.ListAllProjects(ctx)
		if err == nil {
			hasEnabledProject := false
			for _, project := range projects {
				if project.PollingEnabled != nil && *project.PollingEnabled {
					hasEnabledProject = true
					break
				}
			}
			if !hasEnabledProject {
				slog.InfoContext(ctx, "polling disabled globally and no project overrides; skipping")
				return nil
			}
		}
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
	minInterval, anyEnabled := j.getMinPollingInterval(ctx)

	if !anyEnabled {
		j.scheduler.RemoveJobByName("image-polling")
		slog.InfoContext(ctx, "polling disabled; removed image-polling job if present")
		return nil
	}

	if minInterval < 5*time.Minute {
		minInterval = 5 * time.Minute
	}

	slog.InfoContext(ctx, "polling settings changed; rescheduling",
		slog.String("interval", minInterval.String()),
		slog.String("note", "using shortest interval among all projects"))

	return j.scheduler.RescheduleDurationJobByName(ctx, "image-polling", minInterval, j.Execute, false)
}
