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
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/client"
	"github.com/ofkm/arcane-backend/internal/models"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
)

type UpdaterService struct {
	db                 *database.DB
	settingsService    *SettingsService
	dockerService      *DockerClientService
	projectService     *ProjectService
	imageUpdateService *ImageUpdateService
	registryService    *ContainerRegistryService
	eventService       *EventService
	imageService       *ImageService

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
) *UpdaterService {
	return &UpdaterService{
		db:                 db,
		settingsService:    settings,
		dockerService:      docker,
		projectService:     projects,
		imageUpdateService: imageUpdates,
		registryService:    registries,
		eventService:       events,
		imageService:       imageSvc,
		updatingContainers: map[string]bool{},
		updatingProjects:   map[string]bool{},
	}
}

//nolint:gocognit
func (s *UpdaterService) ApplyPending(ctx context.Context, dryRun bool) (*dto.UpdaterRunResult, error) {
	start := time.Now()
	out := &dto.UpdaterRunResult{Items: []dto.UpdaterItem{}}

	var records []models.ImageUpdateRecord
	if err := s.db.WithContext(ctx).Where("has_update = ?", true).Find(&records).Error; err != nil {
		return nil, fmt.Errorf("query pending image updates: %w", err)
	}
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
	type updatePlan struct {
		oldRef string
		newRef string
		oldIDs []string // sha256:... image IDs that currently back oldRef
	}
	var plans []updatePlan

	for _, r := range records {
		if r.Repository == "" || r.Tag == "" {
			continue
		}
		oldRef := fmt.Sprintf("%s:%s", r.Repository, r.Tag)
		oldNorm := s.normalizeRef(oldRef)

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
		plans = append(plans, updatePlan{oldRef: oldRef, newRef: newRef, oldIDs: oldIDs})
	}

	if len(plans) == 0 {
		out.Duration = time.Since(start).String()
		return out, nil
	}

	// Log run start
	s.logAutoUpdate(ctx, models.EventSeverityInfo, models.JSON{
		"phase":   "start",
		"dryRun":  dryRun,
		"planned": len(plans),
		"time":    time.Now().UTC().Format(time.RFC3339),
	})

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
	for _, p := range plans {
		item := dto.UpdaterItem{
			ResourceID:   p.oldRef,
			ResourceType: "image",
			ResourceName: p.oldRef,
			Status:       "checked",
			OldImages:    map[string]string{"main": p.oldRef},
			NewImages:    map[string]string{"main": p.newRef},
		}
		out.Checked++

		if dryRun {
			item.Status = "skipped"
			out.Skipped++
			out.Items = append(out.Items, item)
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

		if err := s.imageService.PullImage(ctx, p.newRef, io.Discard, systemUser); err != nil {
			item.Status = "failed"
			item.Error = err.Error()
			out.Failed++
		} else {
			item.Status = "updated"
			item.UpdateApplied = true
			out.Updated++
		}
		out.Items = append(out.Items, item)
		_ = s.recordRun(ctx, item)

		s.logAutoUpdate(ctx, s.severityFromStatus(item.Status), models.JSON{
			"phase":    "image_pull",
			"imageOld": p.oldRef,
			"imageNew": p.newRef,
			"status":   item.Status,
			"error":    item.Error,
		})
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

		// Redeploy impacted projects (only running ones)
		if err := s.redeployProjectsUsingOldIDs(ctx, oldIDToNewRef, out); err != nil {
			slog.Warn("project redeploys had errors", "err", err)
		}
	}

	// After applying updates, clear has_update locally if no containers still use old image IDs.
	if !dryRun {
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
				s.logAutoUpdate(ctx, models.EventSeverityInfo, models.JSON{
					"phase":    "record_clear",
					"imageOld": p.oldRef,
					"status":   "cleared",
				})
			}
		}

		if err := s.imageUpdateService.CleanupOrphanedRecords(ctx); err != nil {
			slog.Warn("cleanup orphaned update records failed", "err", err)
		}
	}

	// Log run complete
	duration := time.Since(start).String()
	out.Duration = duration
	s.logAutoUpdate(ctx, models.EventSeverityInfo, models.JSON{
		"phase":    "complete",
		"checked":  out.Checked,
		"updated":  out.Updated,
		"skipped":  out.Skipped,
		"failed":   out.Failed,
		"duration": duration,
		"time":     time.Now().UTC().Format(time.RFC3339),
	})

	return out, nil
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

// --- internals ---

func (s *UpdaterService) updateContainer(ctx context.Context, cnt container.Summary, inspect container.InspectResponse, newRef string) error {
	dcli, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("docker connect: %w", err)
	}
	defer dcli.Close()

	name := s.getContainerName(cnt)

	// stop
	if err := dcli.ContainerStop(ctx, cnt.ID, container.StopOptions{}); err != nil {
		return fmt.Errorf("stop: %w", err)
	}
	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerStop, cnt.ID, name, systemUser.ID, systemUser.Username, "0", models.JSON{"action": "updater_stop"})

	// remove
	if err := dcli.ContainerRemove(ctx, cnt.ID, container.RemoveOptions{}); err != nil {
		return fmt.Errorf("remove: %w", err)
	}
	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerDelete, cnt.ID, name, systemUser.ID, systemUser.Username, "0", models.JSON{"action": "updater_delete"})

	// recreate with new image ref
	cfg := inspect.Config
	cfg.Image = newRef
	resp, err := dcli.ContainerCreate(ctx, cfg, inspect.HostConfig, &network.NetworkingConfig{EndpointsConfig: inspect.NetworkSettings.Networks}, nil, inspect.Name)
	if err != nil {
		return fmt.Errorf("create: %w", err)
	}
	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerCreate, resp.ID, name, systemUser.ID, systemUser.Username, "0", models.JSON{"action": "updater_create", "newImageId": resp.ID})

	if err := dcli.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return fmt.Errorf("start: %w", err)
	}
	_ = s.eventService.LogContainerEvent(ctx, models.EventTypeContainerStart, resp.ID, name, systemUser.ID, systemUser.Username, "0", models.JSON{"action": "updater_start"})

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

const arcaneUpdaterLabel = "com.ofkm.arcane.updater"

// isUpdateDisabled returns true if the special label is present and evaluates to false.
// Accepts false/0/no/off (case-insensitive) as "disabled". Default is enabled.
func (s *UpdaterService) isUpdateDisabled(labels map[string]string) bool {
	if labels == nil {
		return false
	}
	for k, v := range labels {
		if strings.EqualFold(k, arcaneUpdaterLabel) {
			switch strings.TrimSpace(strings.ToLower(v)) {
			case "false", "0", "no", "off":
				return true
			default:
				return false
			}
		}
	}
	return false
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
	for _, c := range list {
		if s.isUpdateDisabled(c.Labels) {
			continue
		}
		inspect, err := dcli.ContainerInspect(ctx, c.ID)
		if err != nil {
			continue
		}
		if inspect.Config != nil && s.isUpdateDisabled(inspect.Config.Labels) {
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
		if s.isUpdateDisabled(c.Labels) {
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
	}

	_ = s.collectUsedImagesFromContainers(ctx, dcli, out)
	_ = s.collectUsedImagesFromProjects(ctx, dcli, out)

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
			for _, tag := range ii.RepoTags {
				if tag == "<none>:<none>" || tag == "" {
					continue
				}
				seen[s.normalizeRef(tag)] = struct{}{}
			}
		}
	}

	if inspect.Config != nil && inspect.Config.Image != "" {
		seen[s.normalizeRef(inspect.Config.Image)] = struct{}{}
	}

	out := make([]string, 0, len(seen))
	for k := range seen {
		out = append(out, k)
	}
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

func (s *UpdaterService) isProjectManaged(labels map[string]string) bool {
	if labels == nil {
		return false
	}
	// Compose project label
	if _, ok := labels["com.docker.compose.project"]; ok {
		return true
	}
	return false
}

// Resolve the local image ID(s) currently referenced by ref (repo:tag) before we pull.
// Returns IDs like "sha256:...".
func (s *UpdaterService) resolveLocalImageIDsForRef(ctx context.Context, ref string) ([]string, error) {
	dcli, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, err
	}
	defer dcli.Close()

	ids := []string{}
	if ii, err := dcli.ImageInspect(ctx, ref); err == nil && ii.ID != "" {
		ids = append(ids, ii.ID)
	}
	return ids, nil
}

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

	var results []dto.AutoUpdateResourceResult
	for _, c := range list {
		// Skip project-managed containers; projects handled separately
		if s.isProjectManaged(c.Labels) {
			continue
		}
		// Skip containers with opt-out label
		if s.isUpdateDisabled(c.Labels) {
			continue
		}

		inspect, err := dcli.ContainerInspect(ctx, c.ID)
		if err != nil {
			continue
		}
		// Also honor labels from full inspect
		if inspect.Config != nil && s.isUpdateDisabled(inspect.Config.Labels) {
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
		} else {
			res.Status = "updated"
			res.UpdateAvailable = true
			res.UpdateApplied = true
		}
		results = append(results, res)
	}
	return results, nil
}

func (s *UpdaterService) redeployProjectsUsingOldIDs(ctx context.Context, oldIDToNewRef map[string]string, out *dto.UpdaterRunResult) error {
	if s.projectService == nil {
		return nil
	}

	projects, err := s.projectService.ListAllProjects(ctx)
	if err != nil {
		return fmt.Errorf("list projects: %w", err)
	}

	dcli, derr := s.dockerService.CreateConnection(ctx)
	if derr != nil {
		return fmt.Errorf("docker connect: %w", derr)
	}
	defer dcli.Close()

	for _, p := range projects {
		// Only redeploy projects that are currently running (or partially)
		if p.Status != models.ProjectStatusRunning && p.Status != models.ProjectStatusPartiallyRunning {
			out.Items = append(out.Items, dto.UpdaterItem{
				ResourceID:   p.ID,
				ResourceType: "project",
				ResourceName: p.Name,
				Status:       "skipped",
			})
			out.Skipped++
			out.Checked++
			continue
		}

		containers, lerr := s.getProjectContainers(ctx, dcli, p.Name)
		if lerr != nil {
			slog.Warn("list project containers failed", "project", p.Name, "err", lerr)
			continue
		}

		// Skip entire project if any container declares the opt-out label
		skip := false
		for _, c := range containers {
			if s.isUpdateDisabled(c.Labels) {
				skip = true
				break
			}
		}
		if skip {
			out.Items = append(out.Items, dto.UpdaterItem{
				ResourceID:   p.ID,
				ResourceType: "project",
				ResourceName: p.Name,
				Status:       "skipped",
			})
			out.Skipped++
			out.Checked++
			s.logAutoUpdate(ctx, models.EventSeverityInfo, models.JSON{
				"phase":       "project",
				"projectId":   p.ID,
				"projectName": p.Name,
				"status":      "skipped",
				"reason":      "com.ofkm.arcane.updater=false",
			})
			continue
		}

		impacted := false
		for _, c := range containers {
			inspect, ierr := dcli.ContainerInspect(ctx, c.ID)
			if ierr != nil {
				continue
			}
			if _, ok := oldIDToNewRef[inspect.Image]; ok {
				impacted = true
				break
			}
		}

		if !impacted {
			out.Items = append(out.Items, dto.UpdaterItem{
				ResourceID:   p.ID,
				ResourceType: "project",
				ResourceName: p.Name,
				Status:       "skipped",
			})
			out.Skipped++
			out.Checked++
			continue
		}

		item := dto.UpdaterItem{
			ResourceID:   p.ID,
			ResourceType: "project",
			ResourceName: p.Name,
			Status:       "checked",
		}
		out.Checked++

		// Redeploy with ProjectService (handles pull/down/up internally)
		if err := s.projectService.RedeployProject(ctx, p.ID, systemUser); err != nil {
			item.Status = "failed"
			item.Error = err.Error()
			out.Failed++
		} else {
			item.Status = "updated"
			item.UpdateApplied = true
			out.Updated++
		}
		out.Items = append(out.Items, item)
		_ = s.recordRun(ctx, item)

		// Emit auto-update project event
		s.logAutoUpdate(ctx, s.severityFromStatus(item.Status), models.JSON{
			"phase":       "project",
			"projectId":   p.ID,
			"projectName": p.Name,
			"status":      item.Status,
			"error":       item.Error,
		})
	}
	return nil
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
			return true, nil
		}
	}
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
