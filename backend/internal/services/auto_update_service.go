package services

import (
	"context"
	"fmt"
	"log"
	"slices"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
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
	registryService    *ContainerRegistryService
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
	registryService *ContainerRegistryService,
) *AutoUpdateService {
	return &AutoUpdateService{
		db:                 db,
		dockerService:      dockerService,
		settingsService:    settingsService,
		containerService:   containerService,
		stackService:       stackService,
		imageService:       imageService,
		registryService:    registryService,
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

	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get settings: %w", err)
	}

	if !settings.AutoUpdate && !req.ForceUpdate {
		result.Skipped = 1
		result.EndTime = time.Now().Format(time.RFC3339)
		result.Duration = time.Since(startTime).String()
		return result, nil
	}

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
			defer func() {
				if r := recover(); r != nil {
					log.Printf("Panic in container check goroutine: %v", r)
					errorsChan <- fmt.Errorf("container check panic: %v", r)
				}
				wg.Done()
			}()
			s.checkContainers(ctx, req, settings, resultsChan, errorsChan)
		}()
	}

	if checkType == "all" || checkType == "stacks" {
		wg.Add(1)
		go func() {
			defer func() {
				if r := recover(); r != nil {
					log.Printf("Panic in stack check goroutine: %v", r)
					errorsChan <- fmt.Errorf("stack check panic: %v", r)
				}
				wg.Done()
			}()
			s.checkStacks(ctx, req, settings, resultsChan, errorsChan)
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

		s.recordAutoUpdate(ctx, res)
	}

	for err := range errorsChan {
		log.Printf("Auto-update error: %v", err)
	}

	result.EndTime = time.Now().Format(time.RFC3339)
	result.Duration = time.Since(startTime).String()

	return result, nil
}

func (s *AutoUpdateService) checkContainers(
	ctx context.Context,
	req dto.AutoUpdateCheckDto,
	settings *models.Settings,
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

		result := s.checkSingleContainer(ctx, cnt, settings, req.DryRun)
		results <- result
	}
}

func (s *AutoUpdateService) checkSingleContainer(
	ctx context.Context,
	cnt container.Summary,
	settings *models.Settings,
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

	hasUpdate, newImageID, err := s.checkImageForUpdate(ctx, imageRef, cnt.ImageID, settings)
	if err != nil {
		result.Status = "failed"
		result.Error = fmt.Sprintf("Failed to check for updates: %v", err)
		return result
	}

	result.UpdateAvailable = hasUpdate
	if hasUpdate {
		result.NewImages["main"] = fmt.Sprintf("%s@%s", imageRef, newImageID)

		if !dryRun {
			if err := s.updateContainer(ctx, cnt, containerJSON, settings); err != nil {
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

func (s *AutoUpdateService) checkStacks(
	ctx context.Context,
	req dto.AutoUpdateCheckDto,
	settings *models.Settings,
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

		result := s.checkSingleStack(ctx, stack, settings, req.DryRun)
		results <- result
	}
}

func (s *AutoUpdateService) checkSingleStack(
	ctx context.Context,
	stack models.Stack,
	settings *models.Settings,
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

	hasUpdates, imageUpdates, err := s.checkStackImagesForUpdates(ctx, stack, settings)
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
			if err := s.updateStack(ctx, stack, settings); err != nil {
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

func (s *AutoUpdateService) updateContainer(
	ctx context.Context,
	cnt container.Summary,
	containerJSON container.InspectResponse,
	settings *models.Settings,
) error {
	log.Printf("Updating container: %s", s.getContainerName(cnt))

	if err := s.containerService.StopContainer(ctx, cnt.ID); err != nil {
		return fmt.Errorf("failed to stop container: %w", err)
	}

	if err := s.containerService.DeleteContainer(ctx, cnt.ID, false, false); err != nil {
		return fmt.Errorf("failed to remove container: %w", err)
	}

	config := containerJSON.Config
	hostConfig := containerJSON.HostConfig
	networkingConfig := &network.NetworkingConfig{
		EndpointsConfig: containerJSON.NetworkSettings.Networks,
	}

	containerName := strings.TrimPrefix(containerJSON.Name, "/")

	newContainer, err := s.containerService.CreateContainer(ctx, config, hostConfig, networkingConfig, containerName)
	if err != nil {
		return fmt.Errorf("failed to create new container: %w", err)
	}

	if err := s.containerService.StartContainer(ctx, newContainer.ID); err != nil {
		return fmt.Errorf("failed to start new container: %w", err)
	}

	log.Printf("Successfully updated container: %s", s.getContainerName(cnt))
	return nil
}

func (s *AutoUpdateService) updateStack(
	ctx context.Context,
	stack models.Stack,
	settings *models.Settings,
) error {
	log.Printf("Updating stack: %s", stack.Name)

	log.Printf("Pulling latest images for stack: %s", stack.Name)
	if err := s.stackService.PullStackImages(ctx, stack.ID); err != nil {
		log.Printf("Warning: Failed to pull some images: %v", err)
	}

	log.Printf("Redeploying stack: %s", stack.Name)
	if err := s.stackService.RedeployStack(ctx, stack.ID, nil, nil); err != nil {
		return fmt.Errorf("failed to redeploy stack: %w", err)
	}

	log.Printf("Successfully updated stack: %s", stack.Name)
	return nil
}

func (s *AutoUpdateService) checkImageForUpdate(
	ctx context.Context,
	imageRef string,
	currentImageID string,
	settings *models.Settings,
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
			// Continue without authentication - may work for public registries
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

func (s *AutoUpdateService) checkStackImagesForUpdates(ctx context.Context, stack models.Stack, settings *models.Settings) (bool, map[string]string, error) {
	composeContent, _, err := s.stackService.GetStackContent(ctx, stack.ID)
	if err != nil {
		return false, nil, err
	}

	images := s.extractImageReferences(composeContent)
	hasUpdates := false
	imageUpdates := make(map[string]string)

	// Get current service information to retrieve actual image IDs
	services, err := s.stackService.GetStackServices(ctx, stack.ID)
	if err != nil {
		return false, nil, fmt.Errorf("failed to get stack services: %w", err)
	}

	// Create a map of service name to current image ID for quick lookup
	serviceImageIDs := make(map[string]string)
	for _, svc := range services {
		if svc.Image != "" {
			// Extract the current image ID from the service
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

		// Get the current image ID for this service, or use empty string if not found
		currentImageID := serviceImageIDs[serviceName]

		hasUpdate, newDigest, err := s.checkImageForUpdate(ctx, imageRef, currentImageID, settings)
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
