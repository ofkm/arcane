package utils

import (
	"context"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"github.com/fsnotify/fsnotify"
)

type FilesystemWatcher struct {
	watcher     *fsnotify.Watcher
	watchedPath string
	onChange    func(ctx context.Context)
	debounce    time.Duration
	stopCh      chan struct{}
	stoppedCh   chan struct{}
}

type WatcherOptions struct {
	Debounce time.Duration
	OnChange func(ctx context.Context)
}

func NewFilesystemWatcher(watchPath string, opts WatcherOptions) (*FilesystemWatcher, error) {
	watcher, err := fsnotify.NewWatcher()
	if err != nil {
		return nil, err
	}

	if opts.Debounce == 0 {
		opts.Debounce = 2 * time.Second
	}

	return &FilesystemWatcher{
		watcher:     watcher,
		watchedPath: watchPath,
		onChange:    opts.OnChange,
		debounce:    opts.Debounce,
		stopCh:      make(chan struct{}),
		stoppedCh:   make(chan struct{}),
	}, nil
}

func (fw *FilesystemWatcher) Start(ctx context.Context) error {
	if err := fw.watcher.Add(fw.watchedPath); err != nil {
		return err
	}

	if err := fw.addExistingDirectories(fw.watchedPath); err != nil {
		slog.WarnContext(ctx, "Failed to add some existing directories to watcher",
			"path", fw.watchedPath,
			"error", err)
	}

	go fw.watchLoop(ctx)

	slog.InfoContext(ctx, "Filesystem watcher started", "path", fw.watchedPath)
	return nil
}

func (fw *FilesystemWatcher) Stop() error {
	close(fw.stopCh)
	<-fw.stoppedCh // Wait for watchLoop to finish
	return fw.watcher.Close()
}

func (fw *FilesystemWatcher) watchLoop(ctx context.Context) {
	defer close(fw.stoppedCh)

	debounceTimer := time.NewTimer(0)
	if !debounceTimer.Stop() {
		<-debounceTimer.C
	}

	for {
		select {
		case <-ctx.Done():
			return
		case <-fw.stopCh:
			return
		case event, ok := <-fw.watcher.Events:
			if !ok {
				return
			}
			if fw.shouldHandleEvent(event) {
				fw.handleEvent(ctx, event, debounceTimer)
			}
		case err, ok := <-fw.watcher.Errors:
			if !ok {
				return
			}
			slog.ErrorContext(ctx, "Filesystem watcher error", "error", err)
		}
	}
}

func (fw *FilesystemWatcher) handleEvent(ctx context.Context, event fsnotify.Event, debounceTimer *time.Timer) {
	if event.Has(fsnotify.Create) {
		if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
			if err := fw.watcher.Add(event.Name); err != nil {
				slog.WarnContext(ctx, "Failed to add new directory to watcher",
					"path", event.Name,
					"error", err)
			}
		}
	}

	slog.DebugContext(ctx, "Filesystem change detected",
		"path", event.Name,
		"operation", event.Op.String())

	// Reset debounce timer
	if !debounceTimer.Stop() {
		select {
		case <-debounceTimer.C:
		default:
		}
	}
	debounceTimer.Reset(fw.debounce)

	// Start debounce handler if not already running
	select {
	case <-debounceTimer.C:
		// Timer expired, trigger sync
		if fw.onChange != nil {
			go fw.onChange(ctx)
		}
	default:
		// Timer still running, will trigger later
		go fw.handleDebounce(ctx, debounceTimer)
	}
}

func (fw *FilesystemWatcher) handleDebounce(ctx context.Context, timer *time.Timer) {
	select {
	case <-ctx.Done():
		return
	case <-fw.stopCh:
		return
	case <-timer.C:
		if fw.onChange != nil {
			fw.onChange(ctx)
		}
	}
}

func (fw *FilesystemWatcher) shouldHandleEvent(event fsnotify.Event) bool {
	name := filepath.Base(event.Name)

	// Skip temporary & hidden files
	if len(name) > 0 && (name[0] == '.' || name[0] == '~') {
		// Allow .env explicitly
		if name != ".env" {
			return false
		}
	}

	ext := filepath.Ext(name)
	if ext == ".bak" || ext == ".tmp" {
		return false
	}

	// Only care about:
	// - Writes to compose files or .env
	// - Creates/Renames/Removes of directories
	// - Creates/Renames/Removes of compose files or .env
	if event.Has(fsnotify.Write) {
		return isComposeFile(name) || name == ".env"
	}

	if event.Has(fsnotify.Create) || event.Has(fsnotify.Rename) || event.Has(fsnotify.Remove) {
		// Try to determine if it's a directory (stat may fail on remove)
		if info, err := os.Stat(event.Name); err == nil && info.IsDir() {
			return true
		}
		return isComposeFile(name) || name == ".env"
	}

	return false
}

func (fw *FilesystemWatcher) addExistingDirectories(root string) error {
	return filepath.Walk(root, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			slog.Warn("Error walking directory",
				"path", path,
				"error", err)
			return err
		}

		if info.IsDir() && path != root {
			// Only add directories that contain compose files or might contain them
			if err := fw.watcher.Add(path); err != nil {
				slog.Warn("Failed to add directory to watcher",
					"path", path,
					"error", err)
			}
		}
		return nil
	})
}

func isComposeFile(filename string) bool {
	composeFiles := []string{
		"compose.yaml", "compose.yml",
		"docker-compose.yaml", "docker-compose.yml",
	}

	for _, cf := range composeFiles {
		if filename == cf {
			return true
		}
	}
	return false
}
