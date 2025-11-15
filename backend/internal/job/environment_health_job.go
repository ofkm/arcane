package job

import (
	"context"
	"log/slog"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/services"
)

type EnvironmentHealthJob struct {
	environmentService *services.EnvironmentService
	settingsService    *services.SettingsService
	scheduler          *Scheduler
}

func NewEnvironmentHealthJob(scheduler *Scheduler, environmentService *services.EnvironmentService, settingsService *services.SettingsService) *EnvironmentHealthJob {
	return &EnvironmentHealthJob{
		environmentService: environmentService,
		settingsService:    settingsService,
		scheduler:          scheduler,
	}
}

func (j *EnvironmentHealthJob) Register(ctx context.Context) error {
	healthCheckInterval := j.settingsService.GetIntSetting(ctx, "environmentHealthInterval", 2)
	interval := time.Duration(healthCheckInterval) * time.Minute

	// Ensure minimum interval of 1 minute
	if interval < 1*time.Minute {
		slog.WarnContext(ctx, "environment health check interval too low; using minimum",
			slog.Int("requested_minutes", healthCheckInterval),
			slog.String("effective_interval", "1m"))
		interval = 1 * time.Minute
	}

	slog.InfoContext(ctx, "registering environment health check job", slog.String("interval", interval.String()))

	j.scheduler.RemoveJobByName("environment-health")

	jobDefinition := gocron.DurationJob(interval)
	return j.scheduler.RegisterJob(
		ctx,
		"environment-health",
		jobDefinition,
		j.Execute,
		true, // Run immediately on startup
	)
}

func (j *EnvironmentHealthJob) Reschedule(ctx context.Context) error {
	healthCheckInterval := j.settingsService.GetIntSetting(ctx, "environmentHealthInterval", 2)
	interval := time.Duration(healthCheckInterval) * time.Minute

	if interval < 1*time.Minute {
		interval = 1 * time.Minute
	}

	slog.InfoContext(ctx, "environment health check settings changed; rescheduling", slog.String("interval", interval.String()))

	return j.scheduler.RescheduleDurationJobByName(ctx, "environment-health", interval, j.Execute, false)
}

func (j *EnvironmentHealthJob) Execute(ctx context.Context) error {
	slog.InfoContext(ctx, "environment health check started")

	// Get all environments using the DB directly
	db := j.environmentService.GetDB()
	var environments []struct {
		ID      string
		Name    string
		Enabled bool
	}

	if err := db.WithContext(ctx).
		Model(&struct {
			ID      string `gorm:"column:id"`
			Name    string `gorm:"column:name"`
			Enabled bool   `gorm:"column:enabled"`
		}{}).
		Table("environments").
		Where("enabled = ?", true).
		Find(&environments).Error; err != nil {
		slog.ErrorContext(ctx, "failed to list environments for health check", slog.Any("error", err))
		return err
	}

	checkedCount := 0
	onlineCount := 0
	offlineCount := 0

	for _, env := range environments {
		checkedCount++

		// Test connection without custom URL (will update DB status)
		status, err := j.environmentService.TestConnection(ctx, env.ID, nil)
		if err != nil {
			slog.WarnContext(ctx, "environment health check failed",
				slog.String("environment_id", env.ID),
				slog.String("environment_name", env.Name),
				slog.String("status", status),
				slog.Any("error", err))
			offlineCount++
		} else if status == "online" {
			onlineCount++
		} else {
			offlineCount++
		}
	}

	slog.InfoContext(ctx, "environment health check completed",
		slog.Int("checked", checkedCount),
		slog.Int("online", onlineCount),
		slog.Int("offline", offlineCount))

	return nil
}
