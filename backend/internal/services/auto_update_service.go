package services

import (
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/registry"
	"github.com/google/uuid"
	"gopkg.in/yaml.v3"

	"github.com/ofkm/arcane-backend/internal/database"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/utils"
)

type AutoUpdateService struct {
	db                 *database.DB
	dockerService      *DockerClientService
	settingsService    *SettingsService
	containerService   *ContainerService
	stackService       *StackService
	imageService       *ImageService
	imageUpdateService *ImageUpdateService
	registryService    *ContainerRegistryService
	eventService       *EventService
	updatingContainers map[string]bool
	updatingStacks     map[string]bool
	mutex              sync.RWMutex
}

func NewAutoUpdateService(
	db *database.DB,
	dockerService *DockerClientService,
	settingsService *SettingsService,
	containerService *ContainerService,
	stackService *StackService,
	imageService *ImageService,
	imageUpdateService *ImageUpdateService,
	registryService *ContainerRegistryService,
	eventService *EventService,
) *AutoUpdateService {
	return &AutoUpdateService{
		db:                 db,
		dockerService:      dockerService,
		settingsService:    settingsService,
		containerService:   containerService,
		stackService:       stackService,
		imageService:       imageService,
		imageUpdateService: imageUpdateService,
		registryService:    registryService,
		eventService:       eventService, // Add this line
		updatingContainers: make(map[string]bool),
		updatingStacks:     make(map[string]bool),
	}
}

func (s *AutoUpdateService) CheckForUpdates(ctx context.Context, req dto.AutoUpdateCheckDto) (*dto.AutoUpdateResultDto, error) {
	startTime := time.Now()
	result := &dto.AutoUpdateResultDto{
		Success:   true,
		StartTime: startTime.Format(time.RFC3339),
		Results:   []dto.AutoUpdateResourceResult{},
	}

	// Log auto-update check start event
	metadata := models.JSON{
		"action":        "check_start",
		"type":          req.Type,
		"dryRun":        req.DryRun,
		"forceUpdate":   req.ForceUpdate,
		"resourceCount": len(req.ResourceIds),
	}
	if _, logErr := s.eventService.CreateEvent(ctx, CreateEventRequest{
		Type:          models.EventTypeSystemAutoUpdate,
		Severity:      models.EventSeverityInfo,
		Title:         "Auto-update check started",
		Description:   fmt.Sprintf("Auto-update check initiated for type: %s", req.Type),
		UserID:        &systemUser.ID,
		Username:      &systemUser.Username,
		EnvironmentID: utils.Ptr("0"),
		Metadata:      metadata,
	}); logErr != nil {
		log.Printf("Failed to log auto-update start event: %v", logErr)
	}

	// Get individual setting instead of full settings struct
	autoUpdateEnabled := s.settingsService.GetBoolSetting(ctx, "autoUpdateEnabled", false)

	if !autoUpdateEnabled && !req.ForceUpdate {
		result.Skipped = 1
		result.EndTime = time.Now().Format(time.RFC3339)
		result.Duration = time.Since(startTime).String()

		// Log skipped event
		skipMetadata := models.JSON{
			"action": "check_skipped",
			"reason": "auto_update_disabled",
		}
		if _, logErr := s.eventService.CreateEvent(ctx, CreateEventRequest{
			Type:          models.EventTypeSystemAutoUpdate,
			Severity:      models.EventSeverityInfo,
			Title:         "Auto-update check skipped",
			Description:   "Auto-update is disabled and force update was not requested",
			UserID:        &systemUser.ID,
			Username:      &systemUser.Username,
			EnvironmentID: utils.Ptr("0"),
			Metadata:      skipMetadata,
		}); logErr != nil {
			log.Printf("Failed to log auto-update skip event: %v", logErr)
		}

		return result, nil
	}

	// Use image-based update approach
	if req.Type == "" || req.Type == "all" || req.Type == "images" {
		if err := s.processImageUpdates(ctx, req, result); err != nil {
			log.Printf("Image update process failed, falling back to container-based approach: %v", err)
			return s.processContainerBasedUpdates(ctx, req, result, startTime)
		}
	} else {
		return s.processContainerBasedUpdates(ctx, req, result, startTime)
	}

	result.EndTime = time.Now().Format(time.RFC3339)
	result.Duration = time.Since(startTime).String()

	// Log auto-update check completion event
	completionMetadata := models.JSON{
		"action":   "check_completed",
		"duration": result.Duration,
		"checked":  result.Checked,
		"updated":  result.Updated,
		"failed":   result.Failed,
		"skipped":  result.Skipped,
		"success":  result.Success,
	}
	severity := models.EventSeveritySuccess
	if result.Failed > 0 {
		severity = models.EventSeverityWarning
	}

	if _, logErr := s.eventService.CreateEvent(ctx, CreateEventRequest{
		Type:          models.EventTypeSystemAutoUpdate,
		Severity:      severity,
		Title:         "Auto-update check completed",
		Description:   fmt.Sprintf("Auto-update completed: %d checked, %d updated, %d failed", result.Checked, result.Updated, result.Failed),
		UserID:        &systemUser.ID,
		Username:      &systemUser.Username,
		EnvironmentID: utils.Ptr("0"),
		Metadata:      completionMetadata,
	}); logErr != nil {
		log.Printf("Failed to log auto-update completion event: %v", logErr)
	}

	return result, nil
}

//nolint:gocognit
func (s *AutoUpdateService) processImageUpdates(ctx context.Context, req dto.AutoUpdateCheckDto, result *dto.AutoUpdateResultDto) error {
	imageUpdates, err := s.imageUpdateService.CheckAllImages(ctx, 0)
	if err != nil {
		return fmt.Errorf("failed to check image updates: %w", err)
	}

	imagesToUpdate := make(map[string]string)
	for imageRef, updateResult := range imageUpdates {
		if updateResult.HasUpdate && updateResult.Error == "" {
			newImageRef := imageRef
			if updateResult.UpdateType == "tag" && updateResult.LatestVersion != "" {
				newImageRef = s.constructImageRefWithTag(imageRef, updateResult.LatestVersion)
			}
			imagesToUpdate[imageRef] = newImageRef
		}
	}

	if len(imagesToUpdate) == 0 {
		return nil
	}

	pulledImages := make(map[string]string)
	for oldImageRef, newImageRef := range imagesToUpdate {
		imageResult := dto.AutoUpdateResourceResult{
			ResourceID:      oldImageRef,
			ResourceName:    oldImageRef,
			ResourceType:    "image",
			Status:          "checked",
			UpdateAvailable: true,
			UpdateApplied:   false,
			OldImages:       map[string]string{"main": oldImageRef},
			NewImages:       map[string]string{"main": newImageRef},
		}

		if !req.DryRun {
			if err := s.pullImageWithAuth(ctx, newImageRef); err != nil {
				log.Printf("Failed to pull image %s: %v", newImageRef, err)
				imageResult.Status = "failed"
				imageResult.Error = fmt.Sprintf("Failed to pull image: %v", err)
				result.Failed++
			} else {
				pulledImages[oldImageRef] = newImageRef
				imageResult.Status = "updated"
				imageResult.UpdateApplied = true
				result.Updated++
			}
		} else {
			imageResult.Status = "skipped"
			result.Skipped++
		}

		result.Results = append(result.Results, imageResult)
		result.Checked++

		// Record the image update result (success or failure)
		if err := s.recordAutoUpdate(ctx, imageResult); err != nil {
			log.Printf("Failed to record auto-update result for image %s: %v", oldImageRef, err)
		}
	}

	// Only restart containers if we successfully pulled some images
	if !req.DryRun && len(pulledImages) > 0 {
		containerResults, err := s.restartContainersUsingImages(ctx, pulledImages)
		if err != nil {
			log.Printf("Error restarting containers: %v", err)
		}

		for _, containerResult := range containerResults {
			result.Results = append(result.Results, containerResult)
			result.Checked++
			if containerResult.UpdateApplied {
				result.Updated++
			} else if containerResult.Error != "" {
				result.Failed++
			}

			if err := s.recordAutoUpdate(ctx, containerResult); err != nil {
				log.Printf("Failed to record auto-update result for container %s: %v", containerResult.ResourceName, err)
			}
		}
	}

	return nil
}

func (s *AutoUpdateService) processContainerBasedUpdates(ctx context.Context, req dto.AutoUpdateCheckDto, result *dto.AutoUpdateResultDto, startTime time.Time) (*dto.AutoUpdateResultDto, error) {
	var wg sync.WaitGroup
	resultsChan := make(chan dto.AutoUpdateResourceResult, 1000)
	errorsChan := make(chan error, 100)

	checkType := strings.ToLower(req.Type)
	if checkType == "" || checkType == "all" {
		checkType = "all"
	}

	if checkType == "all" || checkType == "containers" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s.checkContainers(ctx, req, resultsChan, errorsChan)
		}()
	}

	if checkType == "all" || checkType == "stacks" {
		wg.Add(1)
		go func() {
			defer wg.Done()
			s.checkStacks(ctx, req, resultsChan, errorsChan)
		}()
	}

	go func() {
		wg.Wait()
		close(resultsChan)
		close(errorsChan)
	}()

	for res := range resultsChan {
		result.Results = append(result.Results, res)
		result.Checked++

		if res.UpdateAvailable {
			if res.UpdateApplied {
				result.Updated++
			} else if req.DryRun {
				result.Skipped++
			}
		}

		if res.Error != "" {
			result.Failed++
		}

		if err := s.recordAutoUpdate(ctx, res); err != nil {
			log.Printf("Failed to record auto-update result: %v", err)
		}
	}

	for err := range errorsChan {
		log.Printf("Auto-update error: %v", err)
	}

	result.EndTime = time.Now().Format(time.RFC3339)
	result.Duration = time.Since(startTime).String()
	return result, nil
}

// Refactored from pullImage and restartContainersUsingUpdatedImages
func (s *AutoUpdateService) pullImageWithAuth(ctx context.Context, imageRef string) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	pullOptions := image.PullOptions{}
	authConfig, err := s.getAuthConfigForImage(ctx, imageRef)
	if err != nil {
		log.Printf("Warning: Failed to get auth config for image %s: %v", imageRef, err)
	} else if authConfig != nil {
		authJSON, err := json.Marshal(authConfig)
		if err != nil {
			return fmt.Errorf("failed to marshal auth config: %w", err)
		}
		pullOptions.RegistryAuth = base64.URLEncoding.EncodeToString(authJSON)
	}

	reader, err := dockerClient.ImagePull(ctx, imageRef, pullOptions)
	if err != nil {
		// Log image pull failure event
		metadata := models.JSON{
			"action":   "auto_pull_failed",
			"imageRef": imageRef,
			"error":    err.Error(),
		}
		if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImagePull, "", imageRef, systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
			log.Printf("Failed to log image pull failure event: %v", logErr)
		}
		return fmt.Errorf("failed to pull image %s: %w", imageRef, err)
	}
	defer reader.Close()

	if _, err := io.Copy(io.Discard, reader); err != nil {
		return fmt.Errorf("failed to complete image pull: %w", err)
	}

	// Log successful image pull event
	metadata := models.JSON{
		"action":   "auto_pull_success",
		"imageRef": imageRef,
	}
	if logErr := s.eventService.LogImageEvent(ctx, models.EventTypeImagePull, "", imageRef, systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
		log.Printf("Failed to log image pull success event: %v", logErr)
	}

	log.Printf("Successfully pulled image: %s", imageRef)
	return nil
}

func (s *AutoUpdateService) restartContainersUsingImages(ctx context.Context, updatedImages map[string]string) ([]dto.AutoUpdateResourceResult, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: false})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	var results []dto.AutoUpdateResourceResult

	for _, cnt := range containers {
		containerJSON, err := dockerClient.ContainerInspect(ctx, cnt.ID)
		if err != nil {
			continue
		}

		containerImageRef := containerJSON.Config.Image
		var newImageRef string
		var found bool

		for oldImageRef, updatedImageRef := range updatedImages {
			if s.imageMatches(containerImageRef, oldImageRef) {
				newImageRef = updatedImageRef
				found = true
				break
			}
		}

		if !found {
			continue
		}

		containerName := s.getContainerName(cnt)
		result := dto.AutoUpdateResourceResult{
			ResourceID:   cnt.ID,
			ResourceName: containerName,
			ResourceType: "container",
			Status:       "checked",
			OldImages:    map[string]string{"main": containerImageRef},
			NewImages:    map[string]string{"main": newImageRef},
		}

		s.mutex.Lock()
		if s.updatingContainers[cnt.ID] {
			s.mutex.Unlock()
			result.Status = "skipped"
			result.Error = "Already updating"
			results = append(results, result)
			continue
		}
		s.updatingContainers[cnt.ID] = true
		s.mutex.Unlock()

		if err := s.updateContainerWithLatestImage(ctx, cnt, containerJSON, newImageRef); err != nil {
			result.Status = "failed"
			result.Error = fmt.Sprintf("Failed to restart container: %v", err)
		} else {
			result.Status = "updated"
			result.UpdateAvailable = true
			result.UpdateApplied = true
			log.Printf("Successfully restarted container %s with updated image %s", containerName, newImageRef)
		}

		s.mutex.Lock()
		delete(s.updatingContainers, cnt.ID)
		s.mutex.Unlock()

		results = append(results, result)
	}

	return results, nil
}

// Helper method to check if container image matches updated image
func (s *AutoUpdateService) imageMatches(containerImage, updatedImage string) bool {
	containerBase := strings.Split(containerImage, "@")[0]
	updatedBase := strings.Split(updatedImage, "@")[0]

	containerRepo := strings.Split(containerBase, ":")[0]
	updatedRepo := strings.Split(updatedBase, ":")[0]

	return containerRepo == updatedRepo
}

func (s *AutoUpdateService) checkContainers(
	ctx context.Context,
	req dto.AutoUpdateCheckDto,
	results chan<- dto.AutoUpdateResourceResult,
	errors chan<- error,
) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		errors <- fmt.Errorf("failed to connect to Docker: %w", err)
		return
	}
	defer dockerClient.Close()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: false})
	if err != nil {
		errors <- fmt.Errorf("failed to list containers: %w", err)
		return
	}

	for _, cnt := range containers {
		if len(req.ResourceIds) > 0 && !slices.Contains(req.ResourceIds, cnt.ID) {
			continue
		}

		if !s.isContainerEligibleForUpdate(cnt) {
			continue
		}

		result := s.checkSingleContainer(ctx, cnt, req.DryRun)
		results <- result
	}
}

func (s *AutoUpdateService) checkSingleContainer(
	ctx context.Context,
	cnt container.Summary,
	dryRun bool,
) dto.AutoUpdateResourceResult {
	containerName := s.getContainerName(cnt)

	result := dto.AutoUpdateResourceResult{
		ResourceID:   cnt.ID,
		ResourceName: containerName,
		ResourceType: "container",
		Status:       "checked",
		OldImages:    make(map[string]string),
		NewImages:    make(map[string]string),
	}

	s.mutex.Lock()
	if s.updatingContainers[cnt.ID] {
		s.mutex.Unlock()
		result.Status = "skipped"
		result.Error = "Already updating"
		return result
	}
	s.updatingContainers[cnt.ID] = true
	s.mutex.Unlock()

	defer func() {
		s.mutex.Lock()
		delete(s.updatingContainers, cnt.ID)
		s.mutex.Unlock()
	}()

	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("Failed to connect to Docker: %v", err)
		return result
	}
	defer dockerClient.Close()

	containerJSON, err := dockerClient.ContainerInspect(ctx, cnt.ID)
	if err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("Failed to inspect container: %v", err)
		return result
	}

	imageRef := containerJSON.Config.Image
	result.OldImages["main"] = fmt.Sprintf("%s@%s", imageRef, cnt.ImageID)

	updateResult, err := s.imageUpdateService.CheckImageUpdate(ctx, imageRef)
	if err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("Failed to check for updates: %v", err)
		return result
	}

	if updateResult.Error != "" {
		result.Status = "failed"
		result.Error = updateResult.Error
		return result
	}

	result.UpdateAvailable = updateResult.HasUpdate
	if updateResult.HasUpdate {
		newImageRef := imageRef
		if updateResult.UpdateType == "tag" && updateResult.LatestVersion != "" {
			newImageRef = s.constructImageRefWithTag(imageRef, updateResult.LatestVersion)
		}
		result.NewImages["main"] = newImageRef

		// Get auto update setting when needed
		autoUpdateEnabled := s.settingsService.GetBoolSetting(ctx, "autoUpdateEnabled", false)

		if !dryRun && autoUpdateEnabled {
			if err := s.updateContainerWithLatestImage(ctx, cnt, containerJSON, newImageRef); err != nil {
				result.Status = "failed"
				result.Error = fmt.Sprintf("Failed to update container: %v", err)
				return result
			}
			result.UpdateApplied = true
			result.Status = "updated"
		} else {
			result.Status = "update_available"
		}
	} else {
		result.Status = "up_to_date"
	}

	return result
}

func (s *AutoUpdateService) updateContainerWithLatestImage(
	ctx context.Context,
	cnt container.Summary,
	containerJSON container.InspectResponse,
	newImageRef string,
) error {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	containerName := s.getContainerName(cnt)
	log.Printf("Pulling latest image %s for container %s", newImageRef, containerName)

	pullOptions := image.PullOptions{}

	authConfig, err := s.getAuthConfigForImage(ctx, newImageRef)
	if err != nil {
		log.Printf("Warning: Failed to get auth config for image %s: %v", newImageRef, err)
	} else if authConfig != nil {
		authJSON, err := json.Marshal(authConfig)
		if err != nil {
			return fmt.Errorf("failed to marshal auth config: %w", err)
		}
		pullOptions.RegistryAuth = base64.URLEncoding.EncodeToString(authJSON)
	}

	reader, err := dockerClient.ImagePull(ctx, newImageRef, pullOptions)
	if err != nil {
		// Log container update failure event
		metadata := models.JSON{
			"action":   "auto_update_failed",
			"oldImage": containerJSON.Config.Image,
			"newImage": newImageRef,
			"error":    err.Error(),
			"step":     "image_pull",
		}
		if logErr := s.eventService.LogContainerEvent(ctx, models.EventTypeContainerUpdate, cnt.ID, containerName, systemUser.ID, systemUser.Username, "0", metadata); logErr != nil {
			log.Printf("Failed to log container update failure event: %v", logErr)
		}
		return fmt.Errorf("failed to pull image %s: %w", newImageRef, err)
	}
	defer reader.Close()

	if _, err := io.Copy(io.Discard, reader); err != nil {
		return fmt.Errorf("failed to complete image pull: %w", err)
	}

	// Log container stop event
	stopMetadata := models.JSON{
		"action": "auto_update_stop",
		"reason": "updating_image",
	}
	if logErr := s.eventService.LogContainerEvent(ctx, models.EventTypeContainerStop, cnt.ID, containerName, systemUser.ID, systemUser.Username, "0", stopMetadata); logErr != nil {
		log.Printf("Failed to log container stop event: %v", logErr)
	}

	if err := dockerClient.ContainerStop(ctx, cnt.ID, container.StopOptions{}); err != nil {
		return fmt.Errorf("failed to stop container: %w", err)
	}

	if err := dockerClient.ContainerRemove(ctx, cnt.ID, container.RemoveOptions{}); err != nil {
		return fmt.Errorf("failed to remove old container: %w", err)
	}

	// Log container delete event
	deleteMetadata := models.JSON{
		"action": "auto_update_delete",
		"reason": "replacing_with_updated_image",
	}
	if logErr := s.eventService.LogContainerEvent(ctx, models.EventTypeContainerDelete, cnt.ID, containerName, systemUser.ID, systemUser.Username, "0", deleteMetadata); logErr != nil {
		log.Printf("Failed to log container delete event: %v", logErr)
	}

	containerJSON.Config.Image = newImageRef

	resp, err := dockerClient.ContainerCreate(
		ctx,
		containerJSON.Config,
		containerJSON.HostConfig,
		&network.NetworkingConfig{
			EndpointsConfig: containerJSON.NetworkSettings.Networks,
		},
		nil,
		containerJSON.Name,
	)
	if err != nil {
		return fmt.Errorf("failed to create new container: %w", err)
	}

	// Log container create event
	createMetadata := models.JSON{
		"action":     "auto_update_create",
		"oldImage":   containerJSON.Config.Image,
		"newImage":   newImageRef,
		"newImageId": resp.ID,
	}
	if logErr := s.eventService.LogContainerEvent(ctx, models.EventTypeContainerCreate, resp.ID, containerName, systemUser.ID, systemUser.Username, "0", createMetadata); logErr != nil {
		log.Printf("Failed to log container create event: %v", logErr)
	}

	if err := dockerClient.ContainerStart(ctx, resp.ID, container.StartOptions{}); err != nil {
		return fmt.Errorf("failed to start new container: %w", err)
	}

	// Log container start event
	startMetadata := models.JSON{
		"action":     "auto_update_start",
		"oldImage":   containerJSON.Config.Image,
		"newImage":   newImageRef,
		"newImageId": resp.ID,
	}
	if logErr := s.eventService.LogContainerEvent(ctx, models.EventTypeContainerStart, resp.ID, containerName, systemUser.ID, systemUser.Username, "0", startMetadata); logErr != nil {
		log.Printf("Failed to log container start event: %v", logErr)
	}

	log.Printf("Successfully updated container %s with image %s", containerName, newImageRef)
	return nil
}

// Helper method to construct image reference with new tag - KEEPING THIS FUNCTION
func (s *AutoUpdateService) constructImageRefWithTag(imageRef, newTag string) string {
	parts := strings.Split(imageRef, ":")
	if len(parts) > 1 {
		// Replace the tag part
		parts[len(parts)-1] = newTag
		return strings.Join(parts, ":")
	}
	// If no tag, append the new tag
	return imageRef + ":" + newTag
}

func (s *AutoUpdateService) checkStacks(
	ctx context.Context,
	req dto.AutoUpdateCheckDto,
	results chan<- dto.AutoUpdateResourceResult,
	errors chan<- error,
) {
	stacks, err := s.stackService.ListStacks(ctx)
	if err != nil {
		errors <- fmt.Errorf("failed to list stacks: %w", err)
		return
	}

	for _, stack := range stacks {
		if len(req.ResourceIds) > 0 && !slices.Contains(req.ResourceIds, stack.ID) {
			continue
		}

		if !s.isStackEligibleForUpdate(ctx, stack) {
			continue
		}

		result := s.checkSingleStack(ctx, stack, req.DryRun)
		results <- result
	}
}

// Update checkSingleStack to remove settings parameter
func (s *AutoUpdateService) checkSingleStack(
	ctx context.Context,
	stack models.Stack,
	dryRun bool,
) dto.AutoUpdateResourceResult {
	result := dto.AutoUpdateResourceResult{
		ResourceID:   stack.ID,
		ResourceName: stack.Name,
		ResourceType: "stack",
		Status:       "checked",
		OldImages:    make(map[string]string),
		NewImages:    make(map[string]string),
		Details:      make(map[string]interface{}),
	}

	s.mutex.Lock()
	if s.updatingStacks[stack.ID] {
		s.mutex.Unlock()
		result.Status = "skipped"
		result.Error = "Already updating"
		return result
	}
	s.updatingStacks[stack.ID] = true
	s.mutex.Unlock()

	defer func() {
		s.mutex.Lock()
		delete(s.updatingStacks, stack.ID)
		s.mutex.Unlock()
	}()

	services, err := s.stackService.GetStackServices(ctx, stack.ID)
	if err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("Failed to get stack services: %v", err)
		return result
	}

	for _, svc := range services {
		if svc.Image != "" {
			result.OldImages[svc.Name] = svc.Image
		}
	}

	hasUpdates, imageUpdates, err := s.checkStackImagesForUpdates(ctx, stack)
	if err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("Failed to check for updates: %v", err)
		return result
	}

	result.UpdateAvailable = hasUpdates
	if hasUpdates {
		for svcName, newImage := range imageUpdates {
			result.NewImages[svcName] = newImage
		}

		if !dryRun {
			if err := s.updateStack(ctx, stack); err != nil {
				result.Status = "failed"
				result.Error = fmt.Sprintf("Failed to update stack: %v", err)
				return result
			}
			result.UpdateApplied = true
			result.Status = "updated"
		} else {
			result.Status = "update_available"
		}
	} else {
		result.Status = "up_to_date"
	}

	return result
}

func (s *AutoUpdateService) updateStack(
	ctx context.Context,
	stack models.Stack,
) error {
	log.Printf("Updating stack: %s", stack.Name)

	// Log stack update start event
	updateMetadata := models.JSON{
		"action": "auto_update_start",
		"reason": "image_updates_available",
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackUpdate, stack.ID, stack.Name, systemUser.ID, systemUser.Username, "0", updateMetadata); logErr != nil {
		log.Printf("Failed to log stack update start event: %v", logErr)
	}

	log.Printf("Pulling latest images for stack: %s", stack.Name)
	if err := s.stackService.PullStackImages(ctx, stack.ID); err != nil {
		log.Printf("Warning: Failed to pull some images: %v", err)
		// Log image pull warning
		pullWarningMetadata := models.JSON{
			"action": "auto_update_pull_warning",
			"error":  err.Error(),
		}
		if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackUpdate, stack.ID, stack.Name, systemUser.ID, systemUser.Username, "0", pullWarningMetadata); logErr != nil {
			log.Printf("Failed to log stack pull warning event: %v", logErr)
		}
	}

	log.Printf("Redeploying stack: %s", stack.Name)
	if err := s.stackService.RedeployStack(ctx, stack.ID, nil, nil, systemUser); err != nil {
		// Log stack update failure event
		failureMetadata := models.JSON{
			"action": "auto_update_failed",
			"error":  err.Error(),
		}
		if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackUpdate, stack.ID, stack.Name, systemUser.ID, systemUser.Username, "0", failureMetadata); logErr != nil {
			log.Printf("Failed to log stack update failure event: %v", logErr)
		}
		return fmt.Errorf("failed to redeploy stack: %w", err)
	}

	// Log stack update success event
	successMetadata := models.JSON{
		"action": "auto_update_success",
	}
	if logErr := s.eventService.LogStackEvent(ctx, models.EventTypeStackUpdate, stack.ID, stack.Name, systemUser.ID, systemUser.Username, "0", successMetadata); logErr != nil {
		log.Printf("Failed to log stack update success event: %v", logErr)
	}

	log.Printf("Successfully updated stack: %s", stack.Name)
	return nil
}

func (s *AutoUpdateService) checkImageForUpdate(
	ctx context.Context,
	imageRef string,
) (bool, string, error) {
	if s.isDigestBasedImage(imageRef) {
		return false, "", nil
	}

	registryUtils := utils.NewRegistryUtils()
	registry, repository, tag, err := registryUtils.SplitImageReference(imageRef)
	if err != nil {
		return false, "", fmt.Errorf("failed to parse image reference: %w", err)
	}

	authURL, err := registryUtils.CheckAuth(ctx, registry)
	if err != nil {
		return false, "", fmt.Errorf("failed to check registry auth: %w", err)
	}

	var token string
	if authURL != "" {
		authConfig, err := s.getAuthConfigForImage(ctx, imageRef)
		if err != nil {
			log.Printf("Warning: Failed to get auth config for image %s: %v", imageRef, err)
		}

		var creds *utils.RegistryCredentials
		if authConfig != nil {
			creds = &utils.RegistryCredentials{
				Username: authConfig.Username,
				Token:    authConfig.Password,
			}
		}

		token, err = registryUtils.GetToken(ctx, authURL, repository, creds)
		if err != nil {
			return false, "", fmt.Errorf("failed to get registry token: %w", err)
		}
	}

	remoteDigest, err := registryUtils.GetLatestDigest(ctx, registry, repository, tag, token)
	if err != nil {
		return false, "", fmt.Errorf("failed to get remote digest: %w", err)
	}

	localDigest, err := s.getImageDigest(ctx, imageRef)
	if err != nil {
		return false, "", fmt.Errorf("failed to get local digest: %w", err)
	}

	hasUpdate := localDigest != remoteDigest
	if hasUpdate {
		log.Printf("Update available for %s: %s -> %s", imageRef, localDigest[:12], remoteDigest[:12])
	}

	return hasUpdate, remoteDigest, nil
}

func (s *AutoUpdateService) getImageDigest(ctx context.Context, imageRef string) (string, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	imageInfo, err := dockerClient.ImageInspect(ctx, imageRef)
	if err != nil {
		return "", fmt.Errorf("failed to inspect image: %w", err)
	}

	for _, digest := range imageInfo.RepoDigests {
		if strings.Contains(digest, "@sha256:") {
			parts := strings.Split(digest, "@")
			if len(parts) == 2 {
				return parts[1], nil
			}
		}
	}

	return imageInfo.ID, nil
}

func (s *AutoUpdateService) isContainerEligibleForUpdate(cnt container.Summary) bool {
	if cnt.State != "running" {
		return false
	}

	if s.isPartOfStack(cnt.Labels) {
		return false
	}

	return s.hasAutoUpdateLabel(cnt.Labels)
}

func (s *AutoUpdateService) isStackEligibleForUpdate(ctx context.Context, stack models.Stack) bool {
	if stack.Status != models.StackStatusRunning && stack.Status != models.StackStatusPartiallyRunning {
		return false
	}

	eligible, err := s.stackHasAutoUpdateLabel(ctx, stack)
	if err != nil {
		log.Printf("Error checking stack eligibility: %v", err)
		return false
	}

	return eligible
}

func (s *AutoUpdateService) stackHasAutoUpdateLabel(ctx context.Context, stack models.Stack) (bool, error) {
	composeContent, _, err := s.stackService.GetStackContent(ctx, stack.ID)
	if err != nil {
		return false, err
	}

	var composeData map[string]interface{}
	if err := yaml.Unmarshal([]byte(composeContent), &composeData); err != nil {
		return false, err
	}

	services, ok := composeData["services"].(map[string]interface{})
	if !ok {
		return false, nil
	}

	for _, service := range services {
		if s.serviceHasAutoUpdateLabel(service) {
			return true, nil
		}
	}

	return false, nil
}

func (s *AutoUpdateService) serviceHasAutoUpdateLabel(service interface{}) bool {
	serviceMap, ok := service.(map[string]interface{})
	if !ok {
		return false
	}

	labels, ok := serviceMap["labels"].(map[string]interface{})
	if !ok {
		if labelsList, ok := serviceMap["labels"].([]interface{}); ok {
			for _, label := range labelsList {
				if labelStr, ok := label.(string); ok {
					if strings.HasPrefix(labelStr, "arcane.auto-update=") && strings.Contains(labelStr, "true") {
						return true
					}
				}
			}
		}
		return false
	}

	if autoUpdate, exists := labels["arcane.auto-update"]; exists {
		if autoUpdateStr, ok := autoUpdate.(string); ok {
			return strings.ToLower(autoUpdateStr) == "true"
		}
	}

	return false
}

func (s *AutoUpdateService) recordAutoUpdate(ctx context.Context, result dto.AutoUpdateResourceResult) error {
	record := &models.AutoUpdateRecord{
		ID:              uuid.New().String(),
		ResourceID:      result.ResourceID,
		ResourceType:    result.ResourceType,
		ResourceName:    result.ResourceName,
		Status:          models.AutoUpdateStatus(result.Status),
		StartTime:       time.Now(),
		UpdateAvailable: result.UpdateAvailable,
		UpdateApplied:   result.UpdateApplied,
	}

	if result.Error != "" {
		record.Error = &result.Error
		if result.Details == nil {
			result.Details = make(map[string]interface{})
		}
		result.Details["errorType"] = s.categorizeError(result.Error)
		result.Details["timestamp"] = time.Now().Format(time.RFC3339)
	}

	if len(result.OldImages) > 0 {
		oldImagesJSON := make(models.JSON)
		for k, v := range result.OldImages {
			oldImagesJSON[k] = v
		}
		record.OldImageVersions = oldImagesJSON
	}

	if len(result.NewImages) > 0 {
		newImagesJSON := make(models.JSON)
		for k, v := range result.NewImages {
			newImagesJSON[k] = v
		}
		record.NewImageVersions = newImagesJSON
	}

	if len(result.Details) > 0 {
		detailsJSON := make(models.JSON)
		for k, v := range result.Details {
			detailsJSON[k] = v
		}
		record.Details = detailsJSON
	}

	endTime := time.Now()
	record.EndTime = &endTime

	if err := s.db.WithContext(ctx).Create(record).Error; err != nil {
		return fmt.Errorf("failed to record auto-update: %w", err)
	}

	return nil
}

// Helper method to categorize errors for better notification handling
func (s *AutoUpdateService) categorizeError(errorMsg string) string {
	errorMsg = strings.ToLower(errorMsg)

	switch {
	case strings.Contains(errorMsg, "no matching manifest"):
		return "platform_incompatible"
	case strings.Contains(errorMsg, "manifest unknown"):
		return "image_not_found"
	case strings.Contains(errorMsg, "unauthorized"):
		return "authentication_failed"
	case strings.Contains(errorMsg, "forbidden"):
		return "permission_denied"
	case strings.Contains(errorMsg, "timeout"):
		return "network_timeout"
	case strings.Contains(errorMsg, "connection refused"):
		return "registry_unavailable"
	case strings.Contains(errorMsg, "failed to pull"):
		return "pull_failed"
	case strings.Contains(errorMsg, "failed to restart"):
		return "restart_failed"
	default:
		return "unknown"
	}
}

func (s *AutoUpdateService) GetAutoUpdateHistory(ctx context.Context, limit int) ([]models.AutoUpdateRecord, error) {
	var records []models.AutoUpdateRecord

	query := s.db.WithContext(ctx).Order("start_time DESC")
	if limit > 0 {
		query = query.Limit(limit)
	}

	if err := query.Find(&records).Error; err != nil {
		return nil, fmt.Errorf("failed to get auto-update history: %w", err)
	}

	return records, nil
}

func (s *AutoUpdateService) GetUpdateStatus() map[string]interface{} {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	containerIds := make([]string, 0, len(s.updatingContainers))
	for id := range s.updatingContainers {
		containerIds = append(containerIds, id)
	}

	stackIds := make([]string, 0, len(s.updatingStacks))
	for id := range s.updatingStacks {
		stackIds = append(stackIds, id)
	}

	return map[string]interface{}{
		"updatingContainers": len(s.updatingContainers),
		"updatingStacks":     len(s.updatingStacks),
		"containerIds":       containerIds,
		"stackIds":           stackIds,
	}
}

func (s *AutoUpdateService) extractImageReferences(composeContent string) map[string]string {
	images := make(map[string]string)

	var composeData map[string]interface{}
	if err := yaml.Unmarshal([]byte(composeContent), &composeData); err != nil {
		return images
	}

	services, ok := composeData["services"].(map[string]interface{})
	if !ok {
		return images
	}

	for serviceName, service := range services {
		serviceMap, ok := service.(map[string]interface{})
		if !ok {
			continue
		}

		if imageVal, exists := serviceMap["image"]; exists {
			if imageStr, ok := imageVal.(string); ok {
				images[serviceName] = strings.TrimSpace(imageStr)
			}
		}
	}

	return images
}

func (s *AutoUpdateService) isDigestBasedImage(imageRef string) bool {
	return strings.Contains(imageRef, "@sha256:")
}

func (s *AutoUpdateService) isPartOfStack(labels map[string]string) bool {
	if labels == nil {
		return false
	}

	if projectName, exists := labels["com.docker.compose.project"]; exists && projectName != "" {
		return true
	}

	if stackName, exists := labels["arcane.stack"]; exists && stackName != "" {
		return true
	}

	return false
}

func (s *AutoUpdateService) hasAutoUpdateLabel(labels map[string]string) bool {
	if labels == nil {
		return false
	}

	if autoUpdate, exists := labels["arcane.auto-update"]; exists {
		return strings.ToLower(autoUpdate) == "true"
	}

	return false
}

func (s *AutoUpdateService) getContainerName(cnt container.Summary) string {
	if len(cnt.Names) > 0 {
		name := cnt.Names[0]
		if strings.HasPrefix(name, "/") {
			return name[1:]
		}
		return name
	}
	return cnt.ID[:12]
}

func (s *AutoUpdateService) getAuthConfigForImage(ctx context.Context, imageRef string) (*registry.AuthConfig, error) {
	registryDomain, err := utils.ExtractRegistryDomain(imageRef)
	if err != nil {
		return nil, fmt.Errorf("failed to extract domain: %w", err)
	}
	normalizedImageDomain := s.normalizeRegistryURL(registryDomain)

	registries, err := s.registryService.GetAllRegistries(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list registries: %w", err)
	}

	for _, reg := range registries {
		normalizedRegURL := s.normalizeRegistryURL(reg.URL)
		if normalizedRegURL == normalizedImageDomain {
			decryptedToken, err := utils.Decrypt(reg.Token)
			if err != nil {
				log.Printf("Failed to decrypt token for registry %s: %v", reg.URL, err)
				continue
			}

			return &registry.AuthConfig{
				Username: reg.Username,
				Password: decryptedToken,
			}, nil
		}
	}

	return nil, nil
}

func (s *AutoUpdateService) normalizeRegistryURL(url string) string {
	url = strings.TrimSpace(url)
	url = strings.ToLower(url)
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")
	url = strings.TrimSuffix(url, "/")

	if url == "docker.io" || url == "registry-1.docker.io" || url == "index.docker.io" {
		return "docker.io"
	}

	return url
}

func (s *AutoUpdateService) checkStackImagesForUpdates(ctx context.Context, stack models.Stack) (bool, map[string]string, error) {
	composeContent, _, err := s.stackService.GetStackContent(ctx, stack.ID)
	if err != nil {
		return false, nil, err
	}

	images := s.extractImageReferences(composeContent)
	hasUpdates := false
	imageUpdates := make(map[string]string)

	services, err := s.stackService.GetStackServices(ctx, stack.ID)
	if err != nil {
		return false, nil, fmt.Errorf("failed to get stack services: %w", err)
	}

	serviceImageIDs := make(map[string]string)
	for _, svc := range services {
		if svc.Image != "" {
			currentImageID, err := s.getImageDigest(ctx, svc.Image)
			if err != nil {
				log.Printf("Warning: Failed to get current image digest for service %s: %v", svc.Name, err)
				continue
			}
			serviceImageIDs[svc.Name] = currentImageID
		}
	}

	for serviceName, imageRef := range images {
		if s.isDigestBasedImage(imageRef) {
			continue
		}

		hasUpdate, newDigest, err := s.checkImageForUpdate(ctx, imageRef)
		if err != nil {
			log.Printf("Error checking updates for %s in stack %s: %v", imageRef, stack.Name, err)
			continue
		}

		if hasUpdate {
			hasUpdates = true
			imageUpdates[serviceName] = fmt.Sprintf("%s@%s", imageRef, newDigest)
		}
	}

	return hasUpdates, imageUpdates, nil
}

func (s *AutoUpdateService) GetRecentErrors(ctx context.Context, since time.Time) ([]models.AutoUpdateRecord, error) {
	var records []models.AutoUpdateRecord

	err := s.db.WithContext(ctx).
		Where("start_time >= ? AND error IS NOT NULL", since).
		Order("start_time DESC").
		Find(&records).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get recent auto-update errors: %w", err)
	}

	return records, nil
}

func (s *AutoUpdateService) GetErrorSummary(ctx context.Context, since time.Time) (map[string]int, error) {
	var results []struct {
		ErrorType string `json:"error_type"`
		Count     int    `json:"count"`
	}

	err := s.db.WithContext(ctx).
		Model(&models.AutoUpdateRecord{}).
		Select("JSON_EXTRACT(details, '$.errorType') as error_type, COUNT(*) as count").
		Where("start_time >= ? AND error IS NOT NULL", since).
		Group("JSON_EXTRACT(details, '$.errorType')").
		Scan(&results).Error

	if err != nil {
		return nil, fmt.Errorf("failed to get error summary: %w", err)
	}

	summary := make(map[string]int)
	for _, result := range results {
		summary[result.ErrorType] = result.Count
	}

	return summary, nil
}
