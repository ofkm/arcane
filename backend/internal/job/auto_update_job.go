package job

import (
	"context"
	"log/slog"
	"strings"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/services"
)

type AutoUpdateJob struct {
	updaterService  *services.UpdaterService
	settingsService *services.SettingsService
	scheduler       *Scheduler
}

func NewAutoUpdateJob(scheduler *Scheduler, updaterService *services.UpdaterService, settingsService *services.SettingsService) *AutoUpdateJob {
	return &AutoUpdateJob{
		updaterService:  updaterService,
		settingsService: settingsService,
		scheduler:       scheduler,
	}
}

// isAutoUpdateEnabledInternal checks if auto-update is enabled based on settings
func (j *AutoUpdateJob) isAutoUpdateEnabledInternal(ctx context.Context) bool {
	autoUpdateEnabled := j.settingsService.GetBoolSetting(ctx, "autoUpdate", false)
	pollingEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)

	if !autoUpdateEnabled || !pollingEnabled {
		slog.InfoContext(ctx, "auto-update disabled or polling disabled",
			"autoUpdate", autoUpdateEnabled, "pollingEnabled", pollingEnabled)
		return false
	}
	return true
}

// createJobDefinitionInternal creates a job definition based on the cron schedule setting
func (j *AutoUpdateJob) createJobDefinitionInternal(ctx context.Context) (gocron.JobDefinition, string) {
	autoUpdateCron := strings.TrimSpace(j.settingsService.GetStringSetting(ctx, "autoUpdateCron", ""))

	if autoUpdateCron == "" {
		// Immediate mode: check for updates frequently (every 5 minutes)
		return gocron.DurationJob(5 * time.Minute), "immediate (every 5 minutes)"
	}

	// Cron-based scheduling
	// Note: gocron.CronJob may panic on invalid cron, but we'll let the scheduler handle it
	return gocron.CronJob(autoUpdateCron, false), autoUpdateCron
}

func (j *AutoUpdateJob) Register(ctx context.Context) error {
	if !j.isAutoUpdateEnabledInternal(ctx) {
		return nil
	}

	// ensure single instance
	j.scheduler.RemoveJobByName("auto-update")

	jobDefinition, scheduleDesc := j.createJobDefinitionInternal(ctx)
	slog.InfoContext(ctx, "registering auto-update job", "schedule", scheduleDesc)

	return j.scheduler.RegisterJob(
		ctx,
		"auto-update",
		jobDefinition,
		j.Execute,
		false,
	)
}

func (j *AutoUpdateJob) Execute(ctx context.Context) error {
	slog.InfoContext(ctx, "auto-update run started")

	enabled := j.settingsService.GetBoolSetting(ctx, "autoUpdate", false)
	pollingEnabled := j.settingsService.GetBoolSetting(ctx, "pollingEnabled", true)
	if !enabled || !pollingEnabled {
		slog.InfoContext(ctx, "auto-update disabled or polling disabled; skipping run",
			"autoUpdate", enabled, "pollingEnabled", pollingEnabled)
		return nil
	}

	result, err := j.updaterService.ApplyPending(ctx, false)
	if err != nil {
		slog.ErrorContext(ctx, "auto-update run failed", "err", err)
		return err
	}

	slog.InfoContext(ctx, "auto-update run completed",
		"checked", result.Checked,
		"updated", result.Updated,
		"skipped", result.Skipped,
		"failed", result.Failed,
	)

	return nil
}

func (j *AutoUpdateJob) Reschedule(ctx context.Context) error {
	if !j.isAutoUpdateEnabledInternal(ctx) {
		j.scheduler.RemoveJobByName("auto-update")
		slog.InfoContext(ctx, "auto-update disabled; removed job if present")
		return nil
	}

	// Remove existing job
	j.scheduler.RemoveJobByName("auto-update")

	jobDefinition, scheduleDesc := j.createJobDefinitionInternal(ctx)
	slog.InfoContext(ctx, "auto-update settings changed; rescheduling", "schedule", scheduleDesc)

	return j.scheduler.RegisterJob(
		ctx,
		"auto-update",
		jobDefinition,
		j.Execute,
		false,
	)
}
