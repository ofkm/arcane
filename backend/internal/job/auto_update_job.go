package job

import (
	"context"
	"log"
	"time"

	"github.com/go-co-op/gocron/v2"
	"github.com/ofkm/arcane-backend/internal/services"
)

// AutoUpdateJob handles the scheduled auto-update functionality
type AutoUpdateJob struct {
	autoUpdateService *services.AutoUpdateService
	settingsService   *services.SettingsService
}

// NewAutoUpdateJob creates a new auto-update job
func NewAutoUpdateJob(autoUpdateService *services.AutoUpdateService, settingsService *services.SettingsService) *AutoUpdateJob {
	return &AutoUpdateJob{
		autoUpdateService: autoUpdateService,
		settingsService:   settingsService,
	}
}

// Execute runs the auto-update check
func (j *AutoUpdateJob) Execute(ctx context.Context) error {
	log.Println("=== Starting scheduled auto-update check ===")

	// Verify auto-update is still enabled
	settings, err := j.settingsService.GetSettings(ctx)
	if err != nil {
		log.Printf("Failed to get settings during scheduled update: %v", err)
		return err
	}

	if !settings.AutoUpdate {
		log.Println("Auto-update disabled, skipping scheduled check")
		return nil
	}

	// Run container updates
	containerResults, err := j.autoUpdateService.CheckAndUpdateContainers(ctx)
	if err != nil {
		log.Printf("Error during container auto-update: %v", err)
	} else {
		log.Printf("Container auto-update completed: %d checked, %d updated, %d errors",
			containerResults.Checked, containerResults.Updated, len(containerResults.Errors))
	}

	// Run stack updates
	stackResults, err := j.autoUpdateService.CheckAndUpdateStacks(ctx)
	if err != nil {
		log.Printf("Error during stack auto-update: %v", err)
	} else {
		log.Printf("Stack auto-update completed: %d checked, %d updated, %d errors",
			stackResults.Checked, stackResults.Updated, len(stackResults.Errors))
	}

	log.Println("=== Scheduled auto-update check completed ===")
	return nil
}

// RegisterAutoUpdateJob registers the auto-update job with the scheduler
func RegisterAutoUpdateJob(ctx context.Context, scheduler *Scheduler, autoUpdateService *services.AutoUpdateService, settingsService *services.SettingsService) error {
	// Get current settings to determine if auto-update is enabled and get interval
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
		false, // Don't run immediately on startup
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
