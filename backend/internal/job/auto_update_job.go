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

func (j *AutoUpdateJob) Execute(ctx context.Context) error {
	log.Println("=== Starting scheduled auto-update check ===")

	settings, err := j.settingsService.GetSettings(ctx)
	if err != nil {
		log.Printf("Failed to get settings during scheduled update: %v", err)
		return err
	}

	if !settings.AutoUpdate {
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

	if result.Failed > 0 {
		log.Printf("Auto-update had %d failures", result.Failed)
		for _, res := range result.Results {
			if res.Error != "" {
				log.Printf("Failed to update %s (%s): %s", res.ResourceName, res.ResourceType, res.Error)
			}
		}
	}

	if result.Updated > 0 {
		log.Printf("Successfully updated %d resources", result.Updated)
		for _, res := range result.Results {
			if res.UpdateApplied {
				log.Printf("Updated %s (%s)", res.ResourceName, res.ResourceType)
			}
		}
	}

	log.Println("=== Scheduled auto-update check completed ===")
	return nil
}

func RegisterAutoUpdateJob(ctx context.Context, scheduler *Scheduler, autoUpdateService *services.AutoUpdateService, settingsService *services.SettingsService) error {
	settings, err := settingsService.GetSettings(ctx)
	if err != nil {
		return err
	}

	if !settings.AutoUpdate {
		log.Println("Auto-update is disabled, not registering auto-update job")
		return nil
	}

	interval := time.Duration(settings.AutoUpdateInterval) * time.Minute
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
		false,
	)
}

func UpdateAutoUpdateJobSchedule(ctx context.Context, scheduler *Scheduler, autoUpdateService *services.AutoUpdateService, settingsService *services.SettingsService) error {

	settings, err := settingsService.GetSettings(ctx)
	if err != nil {
		return err
	}

	if !settings.AutoUpdate {
		log.Println("Auto-update disabled, job will be skipped")
		return nil
	}
	interval := time.Duration(settings.AutoUpdateInterval) * time.Minute
	log.Printf("Auto-update settings changed - new interval: %v", interval)

	return nil
}
