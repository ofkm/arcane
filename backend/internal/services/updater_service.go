package services

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"strings"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/filters"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/robfig/cron/v3"
)

type UpdaterService struct {
	db                  *database.DB
	settingsService     *SettingsService
	dockerService       *DockerClientService
	projectService      *ProjectService
	imageUpdateService  *ImageUpdateService
	registryService     *ContainerRegistryService
	eventService        *EventService
	imageService        *ImageService
	notificationService *NotificationService

	updatingContainers map[string]bool
	updatingProjects   map[string]bool
}

func NewUpdaterService(
	db *database.DB,
	settings *SettingsService,
	docker *DockerClientService,
	projects *ProjectService,
	imageUpdates *ImageUpdateService,
	registries *ContainerRegistryService,
	events *EventService,
	imageSvc *ImageService,
	notifications *NotificationService,
) *UpdaterService {
	return &UpdaterService{
		db:                  db,
		settingsService:     settings,
		dockerService:       docker,
		projectService:      projects,
		imageUpdateService:  imageUpdates,
		registryService:     registries,
		eventService:        events,
		imageService:        imageSvc,
		notificationService: notifications,
		updatingContainers:  map[string]bool{},
		updatingProjects:    map[string]bool{},
	}
}

//nolint:gocognit
func (s *UpdaterService) ApplyPending(ctx context.Context, dryRun bool, bypassSchedule ...bool) (*dto.UpdaterRunResult, error) {
	start := time.Now()
	out := &dto.UpdaterRunResult{Items: []dto.UpdaterItem{}}

	bypassScheduleCheck := len(bypassSchedule) > 0 && bypassSchedule[0]

	if !bypassScheduleCheck {
		withinSchedule := s.isWithinGlobalCronSchedule(ctx)
		if !withinSchedule {
			slog.InfoContext(ctx, "Not within global update schedule, skipping automatic update")
			out.Duration = time.Since(start).String()
			return out, nil
		}
	}

	var records []models.ImageUpdateRecord
	if err := s.db.WithContext(ctx).Where("has_update = ?", true).Find(&records).Error; err != nil {
		return nil, fmt.Errorf("query pending image updates: %w", err)
	}
	slog.DebugContext(ctx, "ApplyPending: found pending image update records", "records", len(records), "dryRun", dryRun, "bypassSchedule", bypassScheduleCheck)

	if len(records) == 0 {
		out.Duration = time.Since(start).String()
		return out, nil
	}

	// Only update images that are actually used by running resources
	usedImages, err := s.collectUsedImages(ctx)
	if err != nil {
		// Non-fatal: continue without the filter
		usedImages = map[string]struct{}{}
	}

	// Plan updates and capture OLD image digests before pull
	plans, oldIDSet := s.planImageUpdates(ctx, records, usedImages)

	if len(plans) == 0 {
		out.Duration = time.Since(start).String()
		return out, nil
	}

	// Log run start
	s.logUpdateRunStart(ctx, dryRun, len(plans), nil)

	// Build maps for fast matching later
	oldRefToNewRef := map[string]string{}
	oldIDToNewRef := map[string]string{} // sha256 -> newRef
	for _, p := range plans {
		oldRefToNewRef[p.oldRef] = p.newRef
		for _, id := range p.oldIDs {
			oldIDToNewRef[id] = p.newRef
		}
	}

	// Pull images with ImageService (waits for completion)
	imageItems, err := s.pullImagesForPlans(ctx, plans, dryRun)
	if err != nil {
		return nil, err
	}

	// Add image items to result and update counters
	for _, item := range imageItems {
		out.Items = append(out.Items, item)
		out.Checked++
		switch {
		case item.UpdateApplied:
			out.Updated++
		case item.Error != "":
			out.Failed++
		default:
			out.Skipped++
		}
	}

	if !dryRun && len(oldIDToNewRef) > 0 {
		results, err := s.restartContainersUsingOldIDs(ctx, oldIDToNewRef, oldRefToNewRef)
		if err != nil {
			slog.Warn("container restarts had errors", "err", err)
		}
		for _, r := range results {
			item := dto.UpdaterItem{
				ResourceID:    r.ResourceID,
				ResourceType:  "container",
				ResourceName:  r.ResourceName,
				Status:        r.Status,
				Error:         r.Error,
				OldImages:     r.OldImages,
				NewImages:     r.NewImages,
				UpdateApplied: r.UpdateApplied,
			}
			out.Items = append(out.Items, item)
			out.Checked++
			switch {
			case r.UpdateApplied:
				out.Updated++
			case r.Error != "":
				out.Failed++
			default:
				out.Skipped++
			}
			_ = s.recordRun(ctx, item)

			s.logAutoUpdate(ctx, s.severityFromStatus(item.Status), models.JSON{
				"phase":        "container",
				"containerId":  r.ResourceID,
				"container":    r.ResourceName,
				"status":       r.Status,
				"oldImageMain": r.OldImages["main"],
				"newImageMain": r.NewImages["main"],
				"error":        r.Error,
			})
		}
	}

	// Prune old images that are no longer used
	if !dryRun && len(oldIDSet) > 0 {
		ids := make([]string, 0, len(oldIDSet))
		for id := range oldIDSet {
			ids = append(ids, id)
		}
		if err := s.pruneImageIDs(ctx, ids); err != nil {
			slog.Warn("image prune failed", "err", err)
		}
	}

	// After applying updates, clear has_update locally if no containers still use old image IDs.
	if !dryRun {
		s.clearUpdateRecords(ctx, plans, nil)

		if err := s.imageUpdateService.CleanupOrphanedRecords(ctx); err != nil {
			slog.Warn("cleanup orphaned update records failed", "err", err)
		}
	}

	// Log run complete
	duration := time.Since(start).String()
	out.Duration = duration
	s.logUpdateRunComplete(ctx, out, nil)

	return out, nil
}

func (s *UpdaterService) ApplyPendingForProject(ctx context.Context, project *models.Project, dryRun bool) (*dto.UpdaterRunResult, error) {
	start := time.Now()
	out := &dto.UpdaterRunResult{Items: []dto.UpdaterItem{}}

	// Get all pending image updates
	var records []models.ImageUpdateRecord
	if err := s.db.WithContext(ctx).Where("has_update = ?", true).Find(&records).Error; err != nil {
		return nil, fmt.Errorf("query pending image updates: %w", err)
	}

	if len(records) == 0 {
		out.Duration = time.Since(start).String()
		return out, nil
	}

	// Get images used by this specific project
	usedImages, err := s.collectUsedImagesForProject(ctx, project)
	if err != nil {
		slog.WarnContext(ctx, "Failed to collect used images for project, skipping",
			"projectID", project.ID, "projectName", project.Name, "error", err)
		out.Duration = time.Since(start).String()
		return out, nil
	}

	if len(usedImages) == 0 {
		slog.DebugContext(ctx, "No used images found for project",
			"projectID", project.ID, "projectName", project.Name)
		out.Duration = time.Since(start).String()
		return out, nil
	}

	// Plan updates for this project's images only
	plans, oldIDSet := s.planImageUpdates(ctx, records, usedImages)

	if len(plans) == 0 {
		slog.DebugContext(ctx, "No updates planned for project",
			"projectID", project.ID, "projectName", project.Name)
		out.Duration = time.Since(start).String()
		return out, nil
	}

	// Log project update start
	s.logUpdateRunStart(ctx, dryRun, len(plans), project)

	// Build maps for fast matching
	oldRefToNewRef := map[string]string{}
	oldIDToNewRef := map[string]string{}
	for _, p := range plans {
		oldRefToNewRef[p.oldRef] = p.newRef
		for _, id := range p.oldIDs {
			oldIDToNewRef[id] = p.newRef
		}
	}

	// Apply updates (similar to ApplyPending but for this project only)
	imageItems, err := s.pullImagesForPlans(ctx, plans, dryRun)
	if err != nil {
		return nil, err
	}

	// Add image items to result and update counters
	for _, item := range imageItems {
		out.Items = append(out.Items, item)
		out.Checked++
		switch {
		case item.UpdateApplied:
			out.Updated++
		case item.Error != "":
			out.Failed++
		default:
			out.Skipped++
		}
	}

	// Update containers using this project's images
	if !dryRun && len(oldIDToNewRef) > 0 {
		updated, skipped, failed := s.updateContainersForProject(ctx, project, oldRefToNewRef, oldIDToNewRef, dryRun)
		out.Updated += updated
		out.Skipped += skipped
		out.Failed += failed
	}

	// Clean up old images if not dry run
	if !dryRun && len(oldIDSet) > 0 {
		oldIDs := make([]string, 0, len(oldIDSet))
		for id := range oldIDSet {
			oldIDs = append(oldIDs, id)
		}
		if err := s.pruneImageIDs(ctx, oldIDs); err != nil {
			slog.WarnContext(ctx, "Failed to prune old images for project",
				"projectID", project.ID, "projectName", project.Name, "error", err)
		}
	}

	// After applying updates, clear has_update locally if no containers still use old image IDs.
	if !dryRun {
		s.clearUpdateRecords(ctx, plans, project)
	}

	out.Duration = time.Since(start).String()

	// Log project update completion
	s.logUpdateRunComplete(ctx, out, project)

	return out, nil
}

// collectUsedImagesForProject collects images used by a specific project
func (s *UpdaterService) collectUsedImagesForProject(ctx context.Context, project *models.Project) (map[string]struct{}, error) {
	out := map[string]struct{}{}

	dcli, err := s.dockerService.CreateConnection(ctx)
	if err == nil && dcli != nil {
		defer dcli.Close()
		slog.DebugContext(ctx, "collectUsedImagesForProject: docker connection created", "projectID", project.ID)
	} else {
		slog.DebugContext(ctx, "collectUsedImagesForProject: docker connection not available", "projectID", project.ID, "err", err)
	}

	// Check if project is opted out
	if dcli != nil && s.isProjectOptedOut(ctx, dcli, project.Name) {
		slog.DebugContext(ctx, "Project opted out of updates", "projectID", project.ID, "projectName", project.Name)
		return out, nil
	}

	// Get project services
	services, err := s.projectService.GetProjectServices(ctx, project.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get project services: %w", err)
	}

	for _, svc := range services {
		img := strings.TrimSpace(svc.Image)
		if img == "" {
			continue
		}
		out[s.normalizeRef(img)] = struct{}{}
	}

	slog.DebugContext(ctx, "collectUsedImagesForProject: collected used images", "projectID", project.ID, "count", len(out))
	return out, nil
}

// updateContainersForProject updates containers for a specific project
func (s *UpdaterService) updateContainersForProject(ctx context.Context, project *models.Project, oldRefToNewRef, oldIDToNewRef map[string]string, dryRun bool) (updated, skipped, failed int) {
	dcli, err := s.dockerService.CreateConnection(ctx)
	if err != nil || dcli == nil {
		slog.ErrorContext(ctx, "Failed to create docker connection for project update", "projectID", project.ID, "error", err)
		return 0, 0, 1
	}
	defer dcli.Close()

	// Get containers for this project
	containers, err := s.getProjectContainers(ctx, dcli, project.Name)
	if err != nil {
		slog.ErrorContext(ctx, "Failed to get project containers", "projectID", project.ID, "error", err)
		return 0, 0, 1
	}

	for _, c := range containers {
		// Check if container is opted out
		if s.isUpdateDisabled(ctx, c.Labels) {
			skipped++
			continue
		}

		// Check if this container needs updating
		needsUpdate := false
		newImageRef := ""

		// Check by image reference
		if newRef, ok := oldRefToNewRef[c.Image]; ok {
			needsUpdate = true
			newImageRef = newRef
		} else {
			// Check by image ID
			if newRef, ok := oldIDToNewRef[c.ImageID]; ok {
				needsUpdate = true
				newImageRef = newRef
			}
		}

		if !needsUpdate {
			skipped++
			continue
		}

		if dryRun {
			slog.InfoContext(ctx, "Would update container (dry run)",
				"projectID", project.ID, "containerID", c.ID, "oldImage", c.Image, "newImage", newImageRef)
			updated++
			continue
		}

		// Actually update the container
		inspect, err := dcli.ContainerInspect(ctx, c.ID)
		if err != nil {
			slog.ErrorContext(ctx, "Failed to inspect container",
				"projectID", project.ID, "containerID", c.ID, "error", err)
			failed++
			continue
		}

		if err := s.updateContainer(ctx, c, inspect, newImageRef); err != nil {
			slog.ErrorContext(ctx, "Failed to update container",
				"projectID", project.ID, "containerID", c.ID, "error", err)
			failed++
		} else {
			slog.InfoContext(ctx, "Successfully updated container",
				"projectID", project.ID, "containerID", c.ID, "oldImage", c.Image, "newImage", newImageRef)
			updated++
		}
	}

	return updated, skipped, failed
}

func (s *UpdaterService) pruneImageIDs(ctx context.Context, ids []string) error {
	if len(ids) == 0 {
		return nil
	}

	slog.DebugContext(ctx, "pruneImageIDs: attempting to prune image ids", "count", len(ids))

	dcli, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("docker connect: %w", err)
	}
	defer dcli.Close()

	for _, id := range ids {
		if id == "" {
			continue
		}

		slog.DebugContext(ctx, "pruneImageIDs: checking image id", "imageId", id)

		inUse, err := s.anyImageIDsStillInUse(ctx, []string{id})
		if err != nil {
			slog.Warn("check image usage failed", "imageId", id, "err", err)
			continue
		}
		if inUse {
			slog.DebugContext(ctx, "pruneImageIDs: image still in use, skipping", "imageId", id)
			// still referenced by a container; skip
			continue
		}

		if _, err := dcli.ImageRemove(ctx, id, image.RemoveOptions{PruneChildren: true}); err != nil {
			slog.Warn("image remove failed", "imageId", id, "err", err)
			continue
		}

		s.logAutoUpdate(ctx, models.EventSeverityInfo, models.JSON{
			"phase":   "image_prune",
			"imageId": id,
			"status":  "removed",
		})
		slog.DebugContext(ctx, "pruneImageIDs: image removed", "imageId", id)
	}

	return nil
}

func (s *UpdaterService) GetStatus() map[string]any {
	containerIDs := make([]string, 0, len(s.updatingContainers))
	for id := range s.updatingContainers {
		containerIDs = append(containerIDs, id)
	}
	projectIDs := make([]string, 0, len(s.updatingProjects))
	for id := range s.updatingProjects {
		projectIDs = append(projectIDs, id)
	}

	return map[string]any{
		"updatingContainers": len(s.updatingContainers),
		"updatingProjects":   len(s.updatingProjects),
		"containerIds":       containerIDs,
		"projectIds":         projectIDs,
	}
}

func (s *UpdaterService) GetHistory(ctx context.Context, limit int) ([]models.AutoUpdateRecord, error) {
	var rec []models.AutoUpdateRecord
	q := s.db.WithContext(ctx).Order("start_time DESC")
	if limit > 0 {
		q = q.Limit(limit)
	}
	if err := q.Find(&rec).Error; err != nil {
		return nil, fmt.Errorf("get history: %w", err)
	}
	return rec, nil
}

func (s *UpdaterService) isWithinGlobalCronSchedule(ctx context.Context) bool {
	scheduleEnabled := s.settingsService.GetBoolSetting(ctx, "updateScheduleEnabled", false)
	if !scheduleEnabled {
		return true // Schedule not enabled, allow updates anytime
	}

	cronExpr := s.settingsService.GetStringSetting(ctx, "updateScheduleCron", "")
	if cronExpr == "" {
		return true // No cron expression = immediate updates
	}

	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	schedule, err := parser.Parse(cronExpr)
	if err != nil {
		slog.WarnContext(ctx, "invalid global cron expression", "cron", cronExpr, "err", err)
		return false
	}

	now := time.Now()
	next := schedule.Next(now.Add(-1 * time.Minute))

	return next.Before(now.Add(1 * time.Minute))
}

func (s *UpdaterService) getNextGlobalCronSchedule(ctx context.Context) *time.Time {
	scheduleEnabled := s.settingsService.GetBoolSetting(ctx, "updateScheduleEnabled", false)
	if !scheduleEnabled {
		return nil
	}

	cronExpr := s.settingsService.GetStringSetting(ctx, "updateScheduleCron", "")
	if cronExpr == "" {
		return nil // No schedule = immediate updates
	}

	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	schedule, err := parser.Parse(cronExpr)
	if err != nil {
		slog.WarnContext(ctx, "invalid global cron expression", "cron", cronExpr, "err", err)
		return nil
	}

	next := schedule.Next(time.Now())
	return &next
}

func (s *UpdaterService) GetUpdateEligibilityStatus(ctx context.Context, projectID string) (*dto.UpdateEligibilityStatus, error) {
	scheduleEnabled := s.settingsService.GetBoolSetting(ctx, "updateScheduleEnabled", false)
	withinSchedule := s.isWithinGlobalCronSchedule(ctx)

	status := &dto.UpdateEligibilityStatus{
		CanUpdateNow:    withinSchedule,
		ScheduleEnabled: scheduleEnabled,
	}

	// Determine reason and next update time
	switch {
	case !withinSchedule && scheduleEnabled:
		nextTime := s.getNextGlobalCronSchedule(ctx)
		if nextTime != nil {
			timestamp := nextTime.Unix()
			status.NextWindowStart = &timestamp
			status.Reason = "Not within scheduled update window"
		} else {
			status.Reason = "No update schedule configured"
		}
	case !scheduleEnabled:
		status.Reason = "Schedule not enabled, updates allowed anytime"
	default:
		status.Reason = "Within scheduled update window"
	}

	return status, nil
}

// --- internals ---

func (s *UpdaterService) updateContainer(ctx context.Context, cnt container.Summary, inspect container.InspectResponse, newRef string) error {
	dcli, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("docker connect: %w", err)
	}
	defer dcli.Close()

	name := s.getContainerName(cnt)
	slog.DebugContext(ctx, "updateContainer: starting update", "containerId", cnt.ID, "containerName", name, "newRef", newRef)

	// stop
	if err := dcli.ContainerStop(ctx, cnt.ID, container.StopOptions{}); err != nil {
		slog.DebugContext(ctx, "updateContainer: stop failed", "containerId", cnt.ID, "err", err)
		return fmt.Errorf("stop: %w", err)
	}
	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerStop, cnt.ID, name, systemUser.ID, systemUser.Username, "0", models.JSON{"action": "updater_stop"})

	// remove
	if err := dcli.ContainerRemove(ctx, cnt.ID, container.RemoveOptions{}); err != nil {
		slog.DebugContext(ctx, "updateContainer: remove failed", "containerId", cnt.ID, "err", err)
		return fmt.Errorf("remove: %w", err)
	}
	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerDelete, cnt.ID, name, systemUser.ID, systemUser.Username, "0", models.JSON{"action": "updater_delete"})

	// recreate with new image ref
	cfg := inspect.Config
	cfg.Image = newRef
	resp, err := dcli.ContainerCreate(ctx, cfg, inspect.HostConfig, &network.NetworkingConfig{EndpointsConfig: inspect.NetworkSettings.Networks}, nil, inspect.Name)
	if err != nil {
		slog.DebugContext(ctx, "updateContainer: create failed", "containerName", inspect.Name, "err", err)
		return fmt.Errorf("create: %w", err)
	}
	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerCreate, resp.ID, name, systemUser.ID, systemUser.Username, "0", models.JSON{"action": "updater_create", "newImageId": resp.ID})

	if err := dcli.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		slog.DebugContext(ctx, "updateContainer: start failed", "newContainerId", resp.ID, "err", err)
		return fmt.Errorf("start: %w", err)
	}
	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerStart, resp.ID, name, systemUser.ID, systemUser.Username, "0", models.JSON{"action": "updater_start"})

	slog.DebugContext(ctx, "updateContainer: update complete", "oldContainerId", cnt.ID, "newContainerId", resp.ID)
	return nil
}

// normalizeRef returns a canonical "registry/repository:tag" without digest.
// Examples:
// - "redis:latest" -> "docker.io/library/redis:latest"
// - "nginx@sha256:..." -> "docker.io/library/nginx:latest" (if no tag was present, defaults to latest)
func (s *UpdaterService) normalizeRef(ref string) string {
	ref = s.stripDigest(ref)

	// Split tag
	tag := "latest"
	if i := strings.LastIndex(ref, ":"); i != -1 && strings.LastIndex(ref, "/") < i {
		tag = ref[i+1:]
		ref = ref[:i]
	}

	parts := strings.Split(ref, "/")
	domain := ""
	switch {
	case len(parts) > 0 && (strings.Contains(parts[0], ".") || strings.Contains(parts[0], ":") || parts[0] == "localhost"):
		domain = strings.ToLower(parts[0])
		parts = parts[1:]
	default:
		domain = "docker.io"
	}
	repo := strings.Join(parts, "/")
	if domain == "docker.io" && !strings.Contains(repo, "/") {
		repo = "library/" + repo
	}

	// Canonical docker.io domain
	switch domain {
	case "index.docker.io", "registry-1.docker.io":
		domain = "docker.io"
	}
	return strings.ToLower(domain + "/" + repo + ":" + tag)
}

func (s *UpdaterService) stripDigest(ref string) string {
	if i := strings.Index(ref, "@"); i != -1 {
		return ref[:i]
	}
	return ref
}

const (
	arcaneUpdaterLabel         = "com.ofkm.arcane.updater"
	arcaneUpdaterScheduleLabel = "com.ofkm.arcane.updater.schedule"
)

// isUpdateDisabled returns true if the special label is present and evaluates to false.
// Accepts false/0/no/off (case-insensitive) as "disabled". Default is enabled.
// If label is explicitly "true", it enables updates even if global updates are disabled (override).
func (s *UpdaterService) isUpdateDisabled(ctx context.Context, labels map[string]string) bool {
	// Check for explicit container label
	for k, v := range labels {
		if strings.EqualFold(k, arcaneUpdaterLabel) {
			switch strings.TrimSpace(strings.ToLower(v)) {
			case "false", "0", "no", "off":
				return true // Explicitly disabled
			case "true", "1", "yes", "on":
				return false // Explicitly enabled, overrides global settings
			}
		}
	}

	// No explicit label, use global auto-update setting as default
	globalAutoUpdate := s.settingsService.GetBoolSetting(ctx, "autoUpdate", false)
	return !globalAutoUpdate
}

// isWithinCronSchedule checks if current time matches the cron expression from container labels
// Falls back to global cron schedule if no container-specific schedule is set
func (s *UpdaterService) isWithinCronSchedule(ctx context.Context, labels map[string]string) bool {
	var cronExpr string

	// Check for container-specific cron label
	for k, v := range labels {
		if strings.EqualFold(k, arcaneUpdaterScheduleLabel) {
			cronExpr = strings.TrimSpace(v)
			break
		}
	}

	// If no container-specific schedule, use global schedule
	if cronExpr == "" {
		scheduleEnabled := s.settingsService.GetBoolSetting(ctx, "updateScheduleEnabled", false)
		if scheduleEnabled {
			cronExpr = s.settingsService.GetStringSetting(ctx, "updateScheduleCron", "")
		}
	}

	// No schedule at all = always allowed
	if cronExpr == "" {
		return true
	}

	// Parse cron expression
	parser := cron.NewParser(cron.Minute | cron.Hour | cron.Dom | cron.Month | cron.Dow)
	schedule, err := parser.Parse(cronExpr)
	if err != nil {
		slog.Warn("invalid cron expression", "cron", cronExpr, "err", err)
		return false
	}

	// Check if current time matches schedule
	// We check if the next scheduled time from 1 minute ago is within the current minute
	now := time.Now()
	next := schedule.Next(now.Add(-1 * time.Minute))

	// If next run is within the current minute window, we're in the schedule
	return next.Before(now.Add(1 * time.Minute))
}

// collectUsedImagesFromContainers adds normalized image tags from non-opted-out running containers.
func (s *UpdaterService) collectUsedImagesFromContainers(ctx context.Context, dcli *client.Client, out map[string]struct{}) error {
	if dcli == nil {
		return nil
	}
	list, err := dcli.ContainerList(ctx, container.ListOptions{All: false})
	if err != nil {
		return err
	}
	slog.DebugContext(ctx, "collectUsedImagesFromContainers: container list fetched", "count", len(list))
	for _, c := range list {
		if s.isUpdateDisabled(ctx, c.Labels) {
			slog.DebugContext(ctx, "collectUsedImagesFromContainers: container opted out by labels", "containerId", c.ID)
			continue
		}
		// Check cron schedule from labels
		if !s.isWithinCronSchedule(ctx, c.Labels) {
			slog.DebugContext(ctx, "collectUsedImagesFromContainers: container not within cron schedule", "containerId", c.ID)
			continue
		}
		inspect, err := dcli.ContainerInspect(ctx, c.ID)
		if err != nil {
			slog.DebugContext(ctx, "collectUsedImagesFromContainers: container inspect failed", "containerId", c.ID, "err", err)
			continue
		}
		if inspect.Config != nil && s.isUpdateDisabled(ctx, inspect.Config.Labels) {
			slog.DebugContext(ctx, "collectUsedImagesFromContainers: container inspect labels opted out", "containerId", c.ID)
			continue
		}
		if inspect.Config != nil && !s.isWithinCronSchedule(ctx, inspect.Config.Labels) {
			slog.DebugContext(ctx, "collectUsedImagesFromContainers: container inspect labels not within cron schedule", "containerId", c.ID)
			continue
		}
		for _, t := range s.getNormalizedTagsForContainer(ctx, dcli, inspect) {
			out[t] = struct{}{}
		}
	}
	return nil
}

func (s *UpdaterService) isProjectOptedOut(ctx context.Context, dcli *client.Client, projectName string) bool {
	if dcli == nil {
		return false
	}
	containers, err := s.getProjectContainers(ctx, dcli, projectName)
	if err != nil {
		return false
	}
	for _, c := range containers {
		if s.isUpdateDisabled(ctx, c.Labels) {
			return true
		}
	}
	return false
}

// Aggregate images in use across containers and compose projects
func (s *UpdaterService) collectUsedImages(ctx context.Context) (map[string]struct{}, error) {
	out := map[string]struct{}{}

	dcli, err := s.dockerService.CreateConnection(ctx)
	if err == nil && dcli != nil {
		defer dcli.Close()
		slog.DebugContext(ctx, "collectUsedImages: docker connection created")
	} else {
		slog.DebugContext(ctx, "collectUsedImages: docker connection not available, continuing without container list", "err", err)
	}

	_ = s.collectUsedImagesFromContainers(ctx, dcli, out)
	_ = s.collectUsedImagesFromProjects(ctx, dcli, out)

	slog.DebugContext(ctx, "collectUsedImages: collected used images", "count", len(out))
	return out, nil
}

func (s *UpdaterService) collectUsedImagesFromProjects(ctx context.Context, dcli *client.Client, out map[string]struct{}) error {
	if s.projectService == nil {
		return nil
	}

	projs, err := s.projectService.ListAllProjects(ctx)
	if err != nil {
		return err
	}

	for _, p := range projs {
		// consider running and partially running projects
		if p.Status != models.ProjectStatusRunning && p.Status != models.ProjectStatusPartiallyRunning {
			continue
		}
		// optional opt-out via labels on compose project
		if dcli != nil && s.isProjectOptedOut(ctx, dcli, p.Name) {
			continue
		}

		services, serr := s.projectService.GetProjectServices(ctx, p.ID)
		if serr != nil {
			continue
		}
		for _, svc := range services {
			img := strings.TrimSpace(svc.Image)
			if img == "" {
				continue
			}
			out[s.normalizeRef(img)] = struct{}{}
		}
	}
	return nil
}

func (s *UpdaterService) getNormalizedTagsForContainer(ctx context.Context, dcli *client.Client, inspect container.InspectResponse) []string {
	seen := map[string]struct{}{}

	// Prefer tags from the image object (handles sha256 IDs)
	if dcli != nil {
		if ii, err := dcli.ImageInspect(ctx, inspect.Image); err == nil {
			slog.DebugContext(ctx, "getNormalizedTagsForContainer: image inspect success", "imageId", inspect.Image, "repoTags", len(ii.RepoTags))
			for _, tag := range ii.RepoTags {
				if tag == "<none>:<none>" || tag == "" {
					continue
				}
				seen[s.normalizeRef(tag)] = struct{}{}
			}
		} else {
			slog.DebugContext(ctx, "getNormalizedTagsForContainer: image inspect failed", "imageId", inspect.Image, "err", err)
		}
	}

	if inspect.Config != nil && inspect.Config.Image != "" {
		seen[s.normalizeRef(inspect.Config.Image)] = struct{}{}
	}

	out := make([]string, 0, len(seen))
	for k := range seen {
		out = append(out, k)
	}
	slog.DebugContext(ctx, "getNormalizedTagsForContainer: normalized tags", "count", len(out))
	return out
}

func (s *UpdaterService) getContainerName(cnt container.Summary) string {
	if len(cnt.Names) > 0 {
		n := cnt.Names[0]
		if strings.HasPrefix(n, "/") {
			return n[1:]
		}
		return n
	}
	return cnt.ID[:12]
}

func (s *UpdaterService) recordRun(ctx context.Context, item dto.UpdaterItem) error {
	rec := &models.AutoUpdateRecord{
		ResourceID:      item.ResourceID,
		ResourceType:    item.ResourceType,
		ResourceName:    item.ResourceName,
		Status:          models.AutoUpdateStatus(item.Status),
		StartTime:       time.Now(),
		UpdateAvailable: item.Status == "updated" || item.Status == "update_available",
		UpdateApplied:   item.UpdateApplied,
	}

	if item.Error != "" {
		rec.Error = &item.Error
	}

	if len(item.OldImages) > 0 {
		old := make(models.JSON)
		for k, v := range item.OldImages {
			old[k] = v
		}
		rec.OldImageVersions = old
	}
	if len(item.NewImages) > 0 {
		newv := make(models.JSON)
		for k, v := range item.NewImages {
			newv[k] = v
		}
		rec.NewImageVersions = newv
	}

	end := time.Now()
	rec.EndTime = &end

	return s.db.WithContext(ctx).Create(rec).Error
}

// Resolve the local image ID(s) currently referenced by ref (repo:tag) before we pull.
// Returns IDs like "sha256:...".
func (s *UpdaterService) resolveLocalImageIDsForRef(ctx context.Context, ref string) ([]string, error) {
	slog.DebugContext(ctx, "resolveLocalImageIDsForRef: resolving local image ids for ref", "ref", ref)

	dcli, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, err
	}
	defer dcli.Close()

	ids := []string{}
	if ii, err := dcli.ImageInspect(ctx, ref); err == nil && ii.ID != "" {
		ids = append(ids, ii.ID)
	}
	slog.DebugContext(ctx, "resolveLocalImageIDsForRef: resolved ids", "ref", ref, "ids", ids)
	return ids, nil
}

//nolint:gocognit
func (s *UpdaterService) restartContainersUsingOldIDs(ctx context.Context, oldIDToNewRef map[string]string, oldRefToNewRef map[string]string) ([]dto.AutoUpdateResourceResult, error) {
	dcli, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("docker connect: %w", err)
	}
	defer dcli.Close()

	list, err := dcli.ContainerList(ctx, container.ListOptions{All: false})
	if err != nil {
		return nil, fmt.Errorf("list containers: %w", err)
	}
	slog.DebugContext(ctx, "restartContainersUsingOldIDs: scanning containers for matching images", "containers", len(list), "oldIDMatches", len(oldIDToNewRef), "oldRefMatches", len(oldRefToNewRef))

	var results []dto.AutoUpdateResourceResult
	for _, c := range list {
		// Skip containers with opt-out label
		if s.isUpdateDisabled(ctx, c.Labels) {
			continue
		}

		// Check cron schedule from labels
		if !s.isWithinCronSchedule(ctx, c.Labels) {
			continue
		}

		inspect, err := dcli.ContainerInspect(ctx, c.ID)
		if err != nil {
			continue
		}
		// Also honor labels from full inspect
		if inspect.Config != nil && s.isUpdateDisabled(ctx, inspect.Config.Labels) {
			continue
		}
		if inspect.Config != nil && !s.isWithinCronSchedule(ctx, inspect.Config.Labels) {
			continue
		}

		var (
			newRef string
			match  string
		)

		// Primary: match by digest (image ID)
		if nr, ok := oldIDToNewRef[inspect.Image]; ok {
			newRef = nr
			match = inspect.Image
		} else {
			// Fallback: resolve tags and match by tag
			updatedNorm := map[string]string{}
			for oldRef, nr := range oldRefToNewRef {
				updatedNorm[s.normalizeRef(oldRef)] = nr
			}
			for _, t := range s.getNormalizedTagsForContainer(ctx, dcli, inspect) {
				if nr, ok := updatedNorm[t]; ok {
					newRef = nr
					match = t
					break
				}
			}
			if newRef == "" {
				continue
			}
		}

		slog.DebugContext(ctx, "restartContainersUsingOldIDs: matched container for update", "containerId", c.ID, "match", match, "newRef", newRef)

		name := s.getContainerName(c)
		res := dto.AutoUpdateResourceResult{
			ResourceID:   c.ID,
			ResourceName: name,
			ResourceType: "container",
			Status:       "checked",
			OldImages:    map[string]string{"main": match},
			NewImages:    map[string]string{"main": s.normalizeRef(newRef)},
		}

		if err := s.updateContainer(ctx, c, inspect, newRef); err != nil {
			res.Status = "failed"
			res.Error = err.Error()
			slog.DebugContext(ctx, "restartContainersUsingOldIDs: update failed", "containerId", c.ID, "err", err)
		} else {
			res.Status = "updated"
			res.UpdateAvailable = true
			res.UpdateApplied = true
			slog.DebugContext(ctx, "restartContainersUsingOldIDs: update succeeded", "containerId", c.ID)

			// Send notification after successful container update
			if s.notificationService != nil {
				if notifErr := s.notificationService.SendContainerUpdateNotification(ctx, name, newRef, match, s.normalizeRef(newRef)); notifErr != nil {
					slog.WarnContext(ctx, "Failed to send container update notification",
						slog.String("containerId", c.ID),
						slog.String("containerName", name),
						slog.String("imageRef", newRef),
						slog.String("error", notifErr.Error()))
				}
			}
		}
		results = append(results, res)
	}
	slog.DebugContext(ctx, "restartContainersUsingOldIDs: completed scanning", "results", len(results))
	return results, nil
}

func (s *UpdaterService) getProjectContainers(ctx context.Context, dcli *client.Client, projectName string) ([]container.Summary, error) {
	byID := map[string]container.Summary{}

	// Compose label
	f1 := filters.NewArgs()
	f1.Add("label", "com.docker.compose.project="+projectName)
	cs1, err := dcli.ContainerList(ctx, container.ListOptions{All: true, Filters: f1})
	if err == nil {
		for _, c := range cs1 {
			byID[c.ID] = c
		}
	}

	if err != nil {
		return nil, err
	}

	out := make([]container.Summary, 0, len(byID))
	for _, c := range byID {
		out = append(out, c)
	}
	return out, nil
}

func (s *UpdaterService) logAutoUpdate(ctx context.Context, sev models.EventSeverity, metadata models.JSON) {
	phase, _ := metadata["phase"].(string)

	title := "Auto-update"
	switch phase {
	case "start":
		title = "Auto-update run started"
	case "image_pull":
		img := fmt.Sprint(metadata["imageNew"])
		if img == "" {
			img = fmt.Sprint(metadata["imageOld"])
		}
		if img != "" {
			title = fmt.Sprintf("Auto-update: image pull %s", img)
		} else {
			title = "Auto-update: image pull"
		}
	case "image_prune":
		imageID := fmt.Sprint(metadata["imageId"])
		if imageID != "" {
			title = fmt.Sprintf("Auto-update: image prune %s", imageID)
		} else {
			title = "Auto-update: image prune"
		}
	case "container":
		name := fmt.Sprint(metadata["container"])
		if name == "" {
			name = fmt.Sprint(metadata["containerId"])
		}
		if name != "" {
			title = fmt.Sprintf("Auto-update: container %s", name)
		} else {
			title = "Auto-update: container"
		}
	case "project":
		name := fmt.Sprint(metadata["projectName"])
		if name == "" {
			name = fmt.Sprint(metadata["projectId"])
		}
		if name != "" {
			title = fmt.Sprintf("Auto-update: project %s", name)
		} else {
			title = "Auto-update: project"
		}
	case "complete":
		title = "Auto-update run completed"
	}

	resourceType := "system"
	resourceName := "auto_updater"
	environmentID := "0"

	_, _ = s.eventService.CreateEvent(ctx, CreateEventRequest{
		Type:          models.EventTypeSystemAutoUpdate,
		Severity:      sev,
		Title:         title,
		ResourceType:  &resourceType,
		ResourceName:  &resourceName,
		EnvironmentID: &environmentID,
		Metadata:      metadata,
	})
}

func (s *UpdaterService) severityFromStatus(status string) models.EventSeverity {
	switch status {
	case "failed":
		return models.EventSeverityError
	case "updated":
		return models.EventSeveritySuccess
	default:
		return models.EventSeverityInfo
	}
}

func (s *UpdaterService) anyImageIDsStillInUse(ctx context.Context, ids []string) (bool, error) {
	if len(ids) == 0 {
		return false, nil
	}
	set := make(map[string]struct{}, len(ids))
	for _, id := range ids {
		if id != "" {
			set[id] = struct{}{}
		}
	}

	slog.DebugContext(ctx, "anyImageIDsStillInUse: checking ids", "ids", ids)

	dcli, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return false, fmt.Errorf("docker connect: %w", err)
	}
	defer dcli.Close()

	list, err := dcli.ContainerList(ctx, container.ListOptions{All: false})
	if err != nil {
		return false, fmt.Errorf("list containers: %w", err)
	}
	for _, c := range list {
		inspect, ierr := dcli.ContainerInspect(ctx, c.ID)
		if ierr != nil {
			continue
		}
		if _, ok := set[inspect.Image]; ok {
			slog.DebugContext(ctx, "anyImageIDsStillInUse: image still used by container", "imageId", inspect.Image, "containerId", c.ID)
			return true, nil
		}
	}
	slog.DebugContext(ctx, "anyImageIDsStillInUse: no matching usage found")
	return false, nil
}

func (s *UpdaterService) clearImageUpdateRecord(ctx context.Context, repository, tag string) error {
	return s.db.WithContext(ctx).
		Model(&models.ImageUpdateRecord{}).
		Where("repository = ? AND tag = ?", repository, tag).
		Update("has_update", false).Error
}

// parseRepoAndTag extracts repository and tag from a reference like "registry/repo:tag".
// Uses the last ":" occurring after the last "/" as the tag separator. Defaults tag to "latest".
func (s *UpdaterService) parseRepoAndTag(ref string) (string, string) {
	// strip digest if present
	ref = s.stripDigest(ref)

	tag := "latest"
	slash := strings.LastIndex(ref, "/")
	colon := strings.LastIndex(ref, ":")
	if colon > slash && colon != -1 {
		tag = ref[colon+1:]
		ref = ref[:colon]
	}
	// Keep registry in repository as stored in records (they store Repository without tag)
	return ref, tag
}

// updatePlan represents a planned image update
type updatePlan struct {
	oldRef string
	newRef string
	oldIDs []string
}

// planImageUpdates creates update plans from image update records, filtering by used images
func (s *UpdaterService) planImageUpdates(ctx context.Context, records []models.ImageUpdateRecord, usedImages map[string]struct{}) ([]updatePlan, map[string]struct{}) {
	var plans []updatePlan
	oldIDSet := map[string]struct{}{}

	for _, r := range records {
		if r.Repository == "" || r.Tag == "" {
			continue
		}
		oldRef := fmt.Sprintf("%s:%s", r.Repository, r.Tag)
		oldNorm := s.normalizeRef(oldRef)

		// Filter by used images if provided
		if len(usedImages) > 0 {
			if _, ok := usedImages[oldNorm]; !ok {
				continue
			}
		}

		newRef := oldRef
		if r.IsTagUpdate() && r.LatestVersion != nil && *r.LatestVersion != "" {
			newRef = fmt.Sprintf("%s:%s", r.Repository, *r.LatestVersion)
		}

		oldIDs, _ := s.resolveLocalImageIDsForRef(ctx, oldRef)
		for _, id := range oldIDs {
			if id != "" {
				oldIDSet[id] = struct{}{}
			}
		}
		plans = append(plans, updatePlan{oldRef: oldRef, newRef: newRef, oldIDs: oldIDs})
	}

	return plans, oldIDSet
}

// pullImagesForPlans pulls images for the given update plans and returns updater items
func (s *UpdaterService) pullImagesForPlans(ctx context.Context, plans []updatePlan, dryRun bool) ([]dto.UpdaterItem, error) {
	var items []dto.UpdaterItem

	for _, p := range plans {
		item := dto.UpdaterItem{
			ResourceID:   p.oldRef,
			ResourceType: "image",
			ResourceName: p.oldRef,
			Status:       "checked",
			OldImages:    map[string]string{"main": p.oldRef},
			NewImages:    map[string]string{"main": p.newRef},
		}

		if dryRun {
			item.Status = "skipped"
			items = append(items, item)
			_ = s.recordRun(ctx, item)

			s.logAutoUpdate(ctx, s.severityFromStatus(item.Status), models.JSON{
				"phase":    "image_pull",
				"imageOld": p.oldRef,
				"imageNew": p.newRef,
				"status":   item.Status,
				"dryRun":   true,
			})
			continue
		}

		if err := s.imageService.PullImage(ctx, p.newRef, io.Discard, systemUser, nil); err != nil {
			item.Status = "failed"
			item.Error = err.Error()
		} else {
			item.Status = "updated"
			item.UpdateApplied = true
		}
		items = append(items, item)
		_ = s.recordRun(ctx, item)

		s.logAutoUpdate(ctx, s.severityFromStatus(item.Status), models.JSON{
			"phase":    "image_pull",
			"imageOld": p.oldRef,
			"imageNew": p.newRef,
			"status":   item.Status,
			"error":    item.Error,
		})
	}

	return items, nil
}

// clearUpdateRecords clears has_update flags for plans where old image IDs are no longer in use
func (s *UpdaterService) clearUpdateRecords(ctx context.Context, plans []updatePlan, project *models.Project) {
	for _, p := range plans {
		if len(p.oldIDs) == 0 {
			continue
		}
		stillUsed, _ := s.anyImageIDsStillInUse(ctx, p.oldIDs)
		if stillUsed {
			continue
		}
		repo, tag := s.parseRepoAndTag(p.oldRef)
		if repo == "" || tag == "" {
			continue
		}
		if err := s.clearImageUpdateRecord(ctx, repo, tag); err == nil {
			metadata := models.JSON{
				"phase":    "record_clear",
				"imageOld": p.oldRef,
				"status":   "cleared",
			}
			if project != nil {
				metadata["projectID"] = project.ID
				metadata["projectName"] = project.Name
				metadata["repository"] = repo
				metadata["tag"] = tag
			}
			s.logAutoUpdate(ctx, models.EventSeverityInfo, metadata)
		}
	}
}

// logUpdateRunStart logs the start of an update run
func (s *UpdaterService) logUpdateRunStart(ctx context.Context, dryRun bool, planned int, project *models.Project) {
	metadata := models.JSON{
		"phase":   "start",
		"dryRun":  dryRun,
		"planned": planned,
		"time":    time.Now().UTC().Format(time.RFC3339),
	}
	if project != nil {
		metadata["projectID"] = project.ID
		metadata["projectName"] = project.Name
	}
	s.logAutoUpdate(ctx, models.EventSeverityInfo, metadata)
}

// logUpdateRunComplete logs the completion of an update run
func (s *UpdaterService) logUpdateRunComplete(ctx context.Context, result *dto.UpdaterRunResult, project *models.Project) {
	metadata := models.JSON{
		"phase":    "complete",
		"checked":  result.Checked,
		"updated":  result.Updated,
		"skipped":  result.Skipped,
		"failed":   result.Failed,
		"duration": result.Duration,
		"time":     time.Now().UTC().Format(time.RFC3339),
	}
	if project != nil {
		metadata["projectID"] = project.ID
		metadata["projectName"] = project.Name
		metadata["dryRun"] = false
	}
	s.logAutoUpdate(ctx, models.EventSeverityInfo, metadata)
}
