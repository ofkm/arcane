package job

import (
	"context"
	"log/slog"
	"time"

	"github.com/ofkm/arcane-backend/internal/services"
	"github.com/ofkm/arcane-backend/internal/utils"
	"github.com/ofkm/arcane-backend/internal/utils/fs"
)

type FilesystemWatcherJob struct {
	stackService     *services.StackService
	templateService  *services.TemplateService
	settingsService  *services.SettingsService
	projectsWatcher  *utils.FilesystemWatcher
	templatesWatcher *utils.FilesystemWatcher
}

func NewFilesystemWatcherJob(
	stackService *services.StackService,
	templateService *services.TemplateService,
	settingsService *services.SettingsService,
) *FilesystemWatcherJob {
	return &FilesystemWatcherJob{
		stackService:    stackService,
		templateService: templateService,
		settingsService: settingsService,
	}
}

func RegisterFilesystemWatcherJob(ctx context.Context, scheduler *Scheduler, stackService *services.StackService, templateService *services.TemplateService, settingsService *services.SettingsService) error {
	job := NewFilesystemWatcherJob(stackService, templateService, settingsService)

	go func() {
		if err := job.Start(ctx); err != nil {
			slog.ErrorContext(ctx, "Filesystem watcher failed", "error", err)
		}
	}()

	slog.InfoContext(ctx, "Filesystem watcher job registered")
	return nil
}

func (j *FilesystemWatcherJob) Start(ctx context.Context) error {

	settings, err := j.settingsService.GetSettings(ctx)
	if err != nil {
		return err
	}
	projectsDirectory, err := fs.GetProjectsDirectory(ctx, settings.StacksDirectory.Value)
	if err != nil {
		return err
	}

	sw, err := utils.NewFilesystemWatcher(projectsDirectory, utils.WatcherOptions{
		Debounce: 3 * time.Second, // Wait 3 seconds after last change before syncing
		OnChange: j.handleFilesystemChange,
	})
	if err != nil {
		return err
	}

	j.projectsWatcher = sw

	templatesDir, err := fs.GetTemplatesDirectory(ctx)
	if err != nil {
		return err
	}

	if j.templateService != nil {
		tw, err := utils.NewFilesystemWatcher(templatesDir, utils.WatcherOptions{
			Debounce: 3 * time.Second,
			OnChange: j.handleTemplatesChange,
		})
		if err != nil {
			return err
		}
		j.templatesWatcher = tw
	}

	if err := j.projectsWatcher.Start(ctx); err != nil {
		return err
	}
	if j.templatesWatcher != nil {
		if err := j.templatesWatcher.Start(ctx); err != nil {
			if stopErr := j.projectsWatcher.Stop(); stopErr != nil {
				slog.ErrorContext(ctx, "Failed to stop projects watcher after templates watcher start error", "error", stopErr)
			}
			return err
		}
	}

	slog.InfoContext(ctx, "Filesystem watcher started for projects directory",
		"path", projectsDirectory)
	if j.templatesWatcher != nil {
		slog.InfoContext(ctx, "Filesystem watcher started for templates directory",
			"path", templatesDir)
	}

	// Initial sync to surface pre-existing resources
	if err := j.stackService.SyncAllStacksFromFilesystem(ctx); err != nil {
		slog.ErrorContext(ctx, "Initial stack sync failed", "error", err)
	}
	if j.templateService != nil {
		if err := j.templateService.SyncLocalTemplatesFromFilesystem(ctx); err != nil {
			slog.ErrorContext(ctx, "Initial template sync failed", "error", err)
		}
	}

	<-ctx.Done()

	return j.Stop()
}

func (j *FilesystemWatcherJob) Stop() error {
	var firstErr error
	if j.projectsWatcher != nil {
		if err := j.projectsWatcher.Stop(); err != nil {
			firstErr = err
		}
	}
	if j.templatesWatcher != nil {
		if err := j.templatesWatcher.Stop(); err != nil && firstErr == nil {
			firstErr = err
		}
	}
	return firstErr
}

func (j *FilesystemWatcherJob) handleFilesystemChange(ctx context.Context) {
	slog.InfoContext(ctx, "Filesystem change detected, syncing stacks")

	if err := j.stackService.SyncAllStacksFromFilesystem(ctx); err != nil {
		slog.ErrorContext(ctx, "Failed to sync stacks after filesystem change",
			"error", err)
	} else {
		slog.InfoContext(ctx, "Stack sync completed after filesystem change")
	}
}

func (j *FilesystemWatcherJob) handleTemplatesChange(ctx context.Context) {
	slog.InfoContext(ctx, "Template directory change detected, syncing templates")
	if j.templateService == nil {
		return
	}
	if err := j.templateService.SyncLocalTemplatesFromFilesystem(ctx); err != nil {
		slog.ErrorContext(ctx, "Failed to sync templates after filesystem change", "error", err)
	} else {
		slog.InfoContext(ctx, "Template sync completed after filesystem change")
	}
}
