package job

import (
	"context"
	"log"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/services"
)

type AutoUpdateJob struct {
	autoUpdateService *services.AutoUpdateService
	settingsService   *services.SettingsService
}

func NewAutoUpdateJob(autoUpdateService *services.AutoUpdateService, settingsService *services.SettingsService) *AutoUpdateJob {
	return &AutoUpdateJob{
		autoUpdateService: autoUpdateService,
		settingsService:   settingsService,
	}
}

func RegisterAutoUpdateJob(ctx context.Context, scheduler *Scheduler, autoUpdateService *services.AutoUpdateService, settingsService *services.SettingsService) error {
	autoUpdateEnabled := settingsService.GetBoolSetting(ctx, "autoUpdateEnabled", false)
	autoUpdateInterval := settingsService.GetIntSetting(ctx, "autoUpdateInterval", 300)

	if !autoUpdateEnabled {
		log.Println("Auto-update is disabled, not registering auto-update job")
		return nil
	}

	interval := time.Duration(autoUpdateInterval) * time.Second
	if interval < 5*time.Minute {
		interval = 60 * time.Minute
		log.Printf("Auto-update interval too low, using default 60 minutes")
	}

	log.Printf("Registering auto-update job with %v interval", interval)

	job := NewAutoUpdateJob(autoUpdateService, settingsService)

	jobDefinition := gocron.DurationJob(interval)

	return scheduler.RegisterJob(
		ctx,
		"auto-update",
		jobDefinition,
		job.Execute,
		true,
	)
}

func (j *AutoUpdateJob) Execute(ctx context.Context) error {
	log.Println("=== Starting scheduled auto-update check ===")

	// Get individual settings
	autoUpdateEnabled := j.settingsService.GetBoolSetting(ctx, "autoUpdateEnabled", false)

	if !autoUpdateEnabled {
		log.Println("Auto-update disabled, skipping scheduled check")
		return nil
	}

	req := dto.AutoUpdateCheckDto{
		Type:        "all",
		ForceUpdate: false,
		DryRun:      false,
	}

	result, err := j.autoUpdateService.CheckForUpdates(ctx, req)
	if err != nil {
		log.Printf("Error during auto-update: %v", err)
		return err
	}

	log.Printf("Auto-update completed: %d checked, %d updated, %d skipped, %d failed",
		result.Checked, result.Updated, result.Skipped, result.Failed)

	return nil
}

func UpdateAutoUpdateJobSchedule(ctx context.Context, scheduler *Scheduler, autoUpdateService *services.AutoUpdateService, settingsService *services.SettingsService) error {
	autoUpdateEnabled := settingsService.GetBoolSetting(ctx, "autoUpdateEnabled", false)
	autoUpdateInterval := settingsService.GetIntSetting(ctx, "autoUpdateInterval", 300)

	if !autoUpdateEnabled {
		log.Println("Auto-update disabled, job will be skipped")
		return nil
	}

	interval := time.Duration(autoUpdateInterval) * time.Second
	log.Printf("Auto-update settings changed - new interval: %v", interval)

	return nil
}
