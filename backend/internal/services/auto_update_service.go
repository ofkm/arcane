package services

import (
	"bufio"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"regexp"
	"strings"
	"sync"
	"time"

	"github.com/docker/docker/api/types/container"
	"github.com/docker/docker/api/types/image"
	"github.com/docker/docker/api/types/network"
	"github.com/docker/docker/api/types/registry"
	"gopkg.in/yaml.v3"

	"github.com/ofkm/arcane-backend/internal/models"
)

type AutoUpdateService struct {
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

type UpdateResult struct {
	Checked   int           `json:"checked"`
	Updated   int           `json:"updated"`
	Skipped   int           `json:"skipped"`
	Errors    []UpdateError `json:"errors"`
	StartTime time.Time     `json:"start_time"`
	EndTime   time.Time     `json:"end_time"`
	Duration  string        `json:"duration"`
}

type UpdateError struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	Type     string `json:"type"` // "container" or "stack"
	Error    string `json:"error"`
	ImageRef string `json:"image_ref,omitempty"`
}

type RegistryCredentials struct {
	URL      string `json:"url"`
	Username string `json:"username"`
	Password string `json:"password"`
}

func NewAutoUpdateService(dockerService *DockerClientService, settingsService *SettingsService,
	containerService *ContainerService, stackService *StackService, imageService *ImageService,
	registryService *ContainerRegistryService) *AutoUpdateService {
	return &AutoUpdateService{
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

// CheckAndUpdateContainers checks and updates eligible containers
func (s *AutoUpdateService) CheckAndUpdateContainers(ctx context.Context) (*UpdateResult, error) {
	startTime := time.Now()
	result := &UpdateResult{
		StartTime: startTime,
		Errors:    []UpdateError{},
	}

	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get settings: %w", err)
	}

	if !settings.AutoUpdate {
		result.EndTime = time.Now()
		result.Duration = result.EndTime.Sub(result.StartTime).String()
		return result, nil
	}

	log.Println("Starting container auto-update check...")

	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	containers, err := dockerClient.ContainerList(ctx, container.ListOptions{All: true})
	if err != nil {
		return nil, fmt.Errorf("failed to list containers: %w", err)
	}

	var eligibleContainers []container.Summary
	for _, container := range containers {
		containerName := s.getContainerName(container)

		if container.State != "running" {
			continue
		}

		if s.hasAutoUpdateLabel(container.Labels) {
			if s.isPartOfStack(container.Labels) {
				log.Printf("Skipping container %s - part of a stack, will be updated via stack update", containerName)
				continue
			}

			eligibleContainers = append(eligibleContainers, container)
		}
	}

	result.Checked = len(eligibleContainers)
	log.Printf("Found %d standalone containers eligible for auto-update", len(eligibleContainers))

	for _, container := range eligibleContainers {
		containerID := container.ID
		containerName := s.getContainerName(container)

		s.mutex.RLock()
		isUpdating := s.updatingContainers[containerID]
		s.mutex.RUnlock()

		if isUpdating {
			log.Printf("Container %s is already being updated, skipping", containerName)
			result.Skipped++
			continue
		}

		s.mutex.Lock()
		s.updatingContainers[containerID] = true
		s.mutex.Unlock()

		func() {
			defer func() {
				s.mutex.Lock()
				delete(s.updatingContainers, containerID)
				s.mutex.Unlock()
			}()

			log.Printf("Checking container for updates: %s", containerName)

			updateAvailable, err := s.checkContainerForUpdate(ctx, container, settings)
			if err != nil {
				log.Printf("Error checking container %s: %v", containerName, err)
				result.Errors = append(result.Errors, UpdateError{
					ID:       containerID,
					Name:     containerName,
					Type:     "container",
					Error:    err.Error(),
					ImageRef: container.Image,
				})
				return
			}

			if updateAvailable {
				log.Printf("Update available for container %s, recreating...", containerName)

				if err := s.recreateStandaloneContainer(ctx, container); err != nil {
					log.Printf("Error recreating container %s: %v", containerName, err)
					result.Errors = append(result.Errors, UpdateError{
						ID:       containerID,
						Name:     containerName,
						Type:     "container",
						Error:    fmt.Sprintf("Failed to recreate: %v", err),
						ImageRef: container.Image,
					})
					return
				}

				log.Printf("Successfully updated container %s", containerName)
				result.Updated++
			} else {
				log.Printf("Container %s is up-to-date", containerName)
			}
		}()
	}

	result.EndTime = time.Now()
	result.Duration = result.EndTime.Sub(result.StartTime).String()

	log.Printf("Container auto-update completed: %d checked, %d updated, %d skipped, %d errors",
		result.Checked, result.Updated, result.Skipped, len(result.Errors))

	return result, nil
}

func (s *AutoUpdateService) recreateStandaloneContainer(ctx context.Context, container container.Summary) error {
	containerName := s.getContainerName(container)

	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	containerJSON, err := dockerClient.ContainerInspect(ctx, container.ID)
	if err != nil {
		return fmt.Errorf("failed to inspect container: %w", err)
	}

	log.Printf("Stopping container %s...", containerName)
	if err := s.containerService.StopContainer(ctx, container.ID); err != nil {
		return fmt.Errorf("failed to stop container: %w", err)
	}

	log.Printf("Removing container %s...", containerName)
	if err := s.containerService.DeleteContainer(ctx, container.ID, false, false); err != nil {
		return fmt.Errorf("failed to remove container: %w", err)
	}

	config := containerJSON.Config
	hostConfig := containerJSON.HostConfig
	networkingConfig := &network.NetworkingConfig{
		EndpointsConfig: containerJSON.NetworkSettings.Networks,
	}

	log.Printf("Creating new container %s with updated image...", containerName)
	_, err = s.containerService.CreateContainer(ctx, config, hostConfig, networkingConfig, containerName)
	if err != nil {
		return fmt.Errorf("failed to create new container: %w", err)
	}

	return nil
}

// isPartOfStack checks if a container is part of a Docker Compose stack
func (s *AutoUpdateService) isPartOfStack(labels map[string]string) bool {
	if labels == nil {
		return false
	}

	_, hasComposeProject := labels["com.docker.compose.project"]
	_, hasComposeService := labels["com.docker.compose.service"]

	return hasComposeProject || hasComposeService
}

// CheckAndUpdateStacks checks and updates eligible stacks
func (s *AutoUpdateService) CheckAndUpdateStacks(ctx context.Context) (*UpdateResult, error) {
	startTime := time.Now()
	result := &UpdateResult{
		StartTime: startTime,
		Errors:    []UpdateError{},
	}

	settings, err := s.settingsService.GetSettings(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get settings: %w", err)
	}

	if !settings.AutoUpdate {
		result.EndTime = time.Now()
		result.Duration = result.EndTime.Sub(result.StartTime).String()
		return result, nil
	}

	log.Println("Starting stack auto-update check...")

	stacks, err := s.stackService.ListStacks(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to list stacks: %w", err)
	}

	var eligibleStacks []models.Stack
	for _, stack := range stacks {
		if stack.Status != "running" && stack.Status != "partially running" {
			continue
		}

		eligible, err := s.isStackEligibleForAutoUpdate(ctx, stack)
		if err != nil {
			log.Printf("Error checking stack %s eligibility: %v", stack.Name, err)
			continue
		}

		if eligible {
			eligibleStacks = append(eligibleStacks, stack)
		}
	}

	result.Checked = len(eligibleStacks)
	log.Printf("Found %d stacks eligible for auto-update", len(eligibleStacks))

	for _, stack := range eligibleStacks {
		stackID := stack.ID
		stackName := stack.Name

		s.mutex.RLock()
		isUpdating := s.updatingStacks[stackID]
		s.mutex.RUnlock()

		if isUpdating {
			log.Printf("Stack %s is already being updated, skipping", stackName)
			result.Skipped++
			continue
		}

		s.mutex.Lock()
		s.updatingStacks[stackID] = true
		s.mutex.Unlock()

		func() {
			defer func() {
				s.mutex.Lock()
				delete(s.updatingStacks, stackID)
				s.mutex.Unlock()
			}()

			log.Printf("Checking stack for updates: %s", stackName)

			updateAvailable, err := s.checkStackForUpdate(ctx, stack, settings)
			if err != nil {
				log.Printf("Error checking stack %s: %v", stackName, err)
				result.Errors = append(result.Errors, UpdateError{
					ID:    stackID,
					Name:  stackName,
					Type:  "stack",
					Error: err.Error(),
				})
				return
			}

			if updateAvailable {
				log.Printf("Updates available for stack %s, stopping, pulling images and redeploying...", stackName)

				log.Printf("Stopping stack %s...", stackName)
				if err := s.stackService.StopStack(ctx, stackID); err != nil {
					log.Printf("Error stopping stack %s: %v", stackName, err)
					result.Errors = append(result.Errors, UpdateError{
						ID:    stackID,
						Name:  stackName,
						Type:  "stack",
						Error: fmt.Sprintf("Failed to stop stack: %v", err),
					})
					return
				}

				log.Printf("Pulling updated images for stack %s...", stackName)
				if err := s.pullStackImages(ctx, stack, settings); err != nil {
					log.Printf("Error pulling images for stack %s: %v", stackName, err)
					result.Errors = append(result.Errors, UpdateError{
						ID:    stackID,
						Name:  stackName,
						Type:  "stack",
						Error: fmt.Sprintf("Failed to pull images: %v", err),
					})
					return
				}

				log.Printf("Deploying stack %s with updated images...", stackName)
				if err := s.stackService.DeployStack(ctx, stackID); err != nil {
					log.Printf("Error redeploying stack %s: %v", stackName, err)
					result.Errors = append(result.Errors, UpdateError{
						ID:    stackID,
						Name:  stackName,
						Type:  "stack",
						Error: fmt.Sprintf("Failed to redeploy: %v", err),
					})
					return
				}

				log.Printf("Successfully updated stack %s", stackName)
				result.Updated++
			} else {
				log.Printf("Stack %s is up-to-date", stackName)
			}
		}()
	}

	result.EndTime = time.Now()
	result.Duration = result.EndTime.Sub(result.StartTime).String()

	log.Printf("Stack auto-update completed: %d checked, %d updated, %d skipped, %d errors",
		result.Checked, result.Updated, result.Skipped, len(result.Errors))

	return result, nil
}

// pullStackImages pulls all images for a stack before redeployment
func (s *AutoUpdateService) pullStackImages(ctx context.Context, stack models.Stack, settings *models.Settings) error {
	composeContent, _, err := s.stackService.GetStackContent(ctx, stack.ID)
	if err != nil {
		return fmt.Errorf("failed to get stack content: %w", err)
	}

	imageRefs := s.extractImageReferences(composeContent)
	if len(imageRefs) == 0 {
		return nil
	}

	log.Printf("Pulling %d images for stack %s", len(imageRefs), stack.Name)

	for _, imageRef := range imageRefs {
		if s.isDigestBasedImage(imageRef) {
			log.Printf("Skipping digest-based image: %s", imageRef)
			continue
		}

		log.Printf("Pulling image: %s", imageRef)
		if err := s.pullImageWithAuth(ctx, imageRef, settings); err != nil {
			log.Printf("Warning: Failed to pull image %s: %v", imageRef, err)
		}
	}

	return nil
}

// pullImageWithAuth pulls an image using appropriate registry credentials
func (s *AutoUpdateService) pullImageWithAuth(ctx context.Context, imageRef string, settings *models.Settings) error {
	registryHost := s.extractRegistryHost(imageRef)
	var authConfig *registry.AuthConfig

	registries, err := s.getEnabledRegistries(ctx)
	if err != nil {
		log.Printf("Warning: Failed to get registry credentials: %v", err)
	} else if len(registries) > 0 {
		for _, reg := range registries {
			if s.isRegistryMatch(reg.URL, registryHost) {
				decryptedToken, err := s.registryService.GetDecryptedToken(ctx, reg.ID)
				if err != nil {
					log.Printf("ERROR: Failed to decrypt token for registry %s: %v", reg.URL, err)
					continue
				}

				authConfig = &registry.AuthConfig{
					Username:      reg.Username,
					Password:      decryptedToken,
					ServerAddress: s.normalizeRegistryURL(reg.URL),
				}
				break
			}
		}
	}

	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	pullOptions := image.PullOptions{}
	if authConfig != nil {
		authBytes, err := json.Marshal(authConfig)
		if err != nil {
			return fmt.Errorf("failed to marshal auth config: %w", err)
		}
		pullOptions.RegistryAuth = base64.URLEncoding.EncodeToString(authBytes)
	}

	reader, err := dockerClient.ImagePull(ctx, imageRef, pullOptions)
	if err != nil {
		if strings.Contains(err.Error(), "not found") {
			return fmt.Errorf("image not found: %s - please verify the image exists and you have access", imageRef)
		} else if strings.Contains(err.Error(), "unauthorized") {
			return fmt.Errorf("authentication failed for %s - please verify your credentials", imageRef)
		} else if strings.Contains(err.Error(), "denied") {
			return fmt.Errorf("access denied for %s - please verify your permissions", imageRef)
		}

		return fmt.Errorf("failed to pull image %s: %w", imageRef, err)
	}
	defer reader.Close()

	if err := s.consumeDockerResponse(reader); err != nil {
		return fmt.Errorf("error during image pull: %w", err)
	}

	return nil
}

// getEnabledRegistries gets enabled container registries from the database
func (s *AutoUpdateService) getEnabledRegistries(ctx context.Context) ([]models.ContainerRegistry, error) {
	registries, err := s.registryService.GetEnabledRegistries(ctx)
	if err != nil {
		log.Printf("Failed to get registry credentials from database: %v", err)
		return []models.ContainerRegistry{}, nil
	}

	return registries, nil
}

// consumeDockerResponse consumes the Docker API response stream
func (s *AutoUpdateService) consumeDockerResponse(reader io.ReadCloser) error {
	scanner := bufio.NewScanner(reader)
	for scanner.Scan() {
		var response map[string]interface{}
		if err := json.Unmarshal(scanner.Bytes(), &response); err != nil {
			continue
		}

		if errorMsg, exists := response["error"]; exists {
			return fmt.Errorf("docker operation failed: %v", errorMsg)
		}
	}

	return scanner.Err()
}

// checkContainerForUpdate checks if a container has an image update available
func (s *AutoUpdateService) checkContainerForUpdate(ctx context.Context, container container.Summary, settings *models.Settings) (bool, error) {
	containerName := s.getContainerName(container)

	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return false, fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	containerJSON, err := dockerClient.ContainerInspect(ctx, container.ID)
	if err != nil {
		return false, fmt.Errorf("failed to inspect container: %w", err)
	}

	imageRef := containerJSON.Config.Image
	log.Printf("Container %s is using image: %s", containerName, imageRef)

	if s.isDigestBasedImage(imageRef) {
		log.Printf("Skipping digest-based image for container %s: %s", containerName, imageRef)
		return false, nil
	}

	currentImageID := container.ImageID
	log.Printf("Container %s current image ID: %s", containerName, currentImageID)

	log.Printf("Pulling same tag for container %s: %s", containerName, imageRef)
	if err := s.pullImageWithAuth(ctx, imageRef, settings); err != nil {
		return false, fmt.Errorf("failed to pull image %s: %w", imageRef, err)
	}

	newImageID, err := s.getImageID(ctx, imageRef)
	if err != nil {
		return false, fmt.Errorf("failed to get image ID after pull: %w", err)
	}

	log.Printf("Container %s after pull image ID: %s", containerName, newImageID)

	hasUpdate := newImageID != currentImageID
	if hasUpdate {
		log.Printf("Update detected for container %s: %s -> %s (same tag: %s)", containerName, currentImageID, newImageID, imageRef)
	} else {
		log.Printf("Container %s is up-to-date (tag: %s)", containerName, imageRef)
	}

	return hasUpdate, nil
}

// checkStackForUpdate checks if a stack has any image updates available
func (s *AutoUpdateService) checkStackForUpdate(ctx context.Context, stack models.Stack, settings *models.Settings) (bool, error) {
	composeContent, _, err := s.stackService.GetStackContent(ctx, stack.ID)
	if err != nil {
		return false, fmt.Errorf("failed to get stack content: %w", err)
	}

	if composeContent == "" {
		return false, fmt.Errorf("stack has no compose content")
	}

	imageRefs := s.extractImageReferences(composeContent)
	if len(imageRefs) == 0 {
		log.Printf("No images found in stack %s", stack.Name)
		return false, nil
	}

	log.Printf("Checking %d images for stack %s", len(imageRefs), stack.Name)

	for _, imageRef := range imageRefs {
		if s.isDigestBasedImage(imageRef) {
			log.Printf("Skipping digest-based image in stack %s: %s", stack.Name, imageRef)
			continue
		}

		hasUpdate, err := s.checkImageForUpdate(ctx, imageRef, settings)
		if err != nil {
			log.Printf("Error checking image %s in stack %s: %v", imageRef, stack.Name, err)
			continue
		}

		if hasUpdate {
			log.Printf("Update found for image %s in stack %s", imageRef, stack.Name)
			return true, nil
		}
	}

	return false, nil
}

// checkImageForUpdate checks if a single image has an update available
func (s *AutoUpdateService) checkImageForUpdate(ctx context.Context, imageRef string, settings *models.Settings) (bool, error) {
	currentImageID, err := s.getImageID(ctx, imageRef)
	if err != nil {
		log.Printf("Image %s not found locally, considering as new", imageRef)
		currentImageID = ""
	}

	log.Printf("Pulling image: %s", imageRef)
	if err := s.pullImageWithAuth(ctx, imageRef, settings); err != nil {
		return false, fmt.Errorf("failed to pull image %s: %w", imageRef, err)
	}

	newImageID, err := s.getImageID(ctx, imageRef)
	if err != nil {
		return false, fmt.Errorf("failed to get image ID after pull: %w", err)
	}

	if currentImageID == "" {
		log.Printf("New image pulled: %s", imageRef)
		return true, nil
	}

	hasUpdate := newImageID != currentImageID
	if hasUpdate {
		log.Printf("Image updated: %s (%s -> %s)", imageRef, currentImageID, newImageID)
	}

	return hasUpdate, nil
}

// hasAutoUpdateLabel checks if labels contain auto-update flag
func (s *AutoUpdateService) hasAutoUpdateLabel(labels map[string]string) bool {
	if labels == nil {
		return false
	}

	value, exists := labels["arcane.auto-update"]
	return exists && value == "true"
}

// isStackEligibleForAutoUpdate checks if a stack is eligible for auto-update
func (s *AutoUpdateService) isStackEligibleForAutoUpdate(ctx context.Context, stack models.Stack) (bool, error) {
	composeContent, _, err := s.stackService.GetStackContent(ctx, stack.ID)
	if err != nil {
		return false, fmt.Errorf("failed to get stack content: %w", err)
	}

	if composeContent == "" {
		return false, nil
	}

	var composeData map[string]interface{}
	if err := yaml.Unmarshal([]byte(composeContent), &composeData); err != nil {
		return false, fmt.Errorf("failed to parse compose file: %w", err)
	}

	services, ok := composeData["services"].(map[string]interface{})
	if !ok {
		return false, nil
	}

	for serviceName, service := range services {
		if s.serviceHasAutoUpdateLabel(service) {
			log.Printf("Found auto-update label in service %s of stack %s", serviceName, stack.Name)
			return true, nil
		}
	}

	return false, nil
}

// serviceHasAutoUpdateLabel checks if a service has auto-update label
func (s *AutoUpdateService) serviceHasAutoUpdateLabel(service interface{}) bool {
	serviceMap, ok := service.(map[string]interface{})
	if !ok {
		return false
	}

	labels, ok := serviceMap["labels"]
	if !ok {
		return false
	}

	switch labelsType := labels.(type) {
	case []interface{}:
		for _, label := range labelsType {
			if labelStr, ok := label.(string); ok {
				if labelStr == "arcane.stack.auto-update=true" {
					return true
				}
			}
		}
	case map[string]interface{}:
		if value, exists := labelsType["arcane.stack.auto-update"]; exists {
			if valueStr, ok := value.(string); ok && valueStr == "true" {
				return true
			}
			if valueBool, ok := value.(bool); ok && valueBool {
				return true
			}
		}
	}

	return false
}

// extractImageReferences extracts all image references from compose content
func (s *AutoUpdateService) extractImageReferences(composeContent string) []string {
	var composeData map[string]interface{}
	if err := yaml.Unmarshal([]byte(composeContent), &composeData); err != nil {
		log.Printf("Error parsing compose content: %v", err)
		return []string{}
	}

	var images []string
	services, ok := composeData["services"].(map[string]interface{})
	if !ok {
		return images
	}

	for _, service := range services {
		serviceMap, ok := service.(map[string]interface{})
		if !ok {
			continue
		}

		if imageVal, exists := serviceMap["image"]; exists {
			if imageStr, ok := imageVal.(string); ok {
				images = append(images, strings.TrimSpace(imageStr))
			}
		}
	}

	return s.removeDuplicates(images)
}

// extractRegistryHost extracts the registry hostname from an image reference
func (s *AutoUpdateService) extractRegistryHost(imageRef string) string {
	parts := strings.Split(imageRef, "@")
	if len(parts) > 1 {
		imageRef = parts[0]
	}

	parts = strings.Split(imageRef, ":")
	if len(parts) > 1 {
		imageRef = parts[0]
	}

	parts = strings.Split(imageRef, "/")

	if len(parts) == 1 {
		return "docker.io"
	}

	firstPart := parts[0]
	if strings.Contains(firstPart, ".") || strings.Contains(firstPart, ":") {
		return firstPart
	}

	return "docker.io"
}

// isRegistryMatch checks if a credential URL matches a registry host
func (s *AutoUpdateService) isRegistryMatch(credURL, registryHost string) bool {
	normalizedCred := s.normalizeRegistryForComparison(credURL)
	normalizedHost := s.normalizeRegistryForComparison(registryHost)

	return normalizedCred == normalizedHost
}

// normalizeRegistryForComparison normalizes registry URLs for comparison
func (s *AutoUpdateService) normalizeRegistryForComparison(url string) string {
	url = strings.TrimPrefix(url, "https://")
	url = strings.TrimPrefix(url, "http://")
	url = strings.TrimSuffix(url, "/")

	if url == "docker.io" || url == "registry-1.docker.io" || url == "index.docker.io" {
		return "docker.io"
	}

	return url
}

// normalizeRegistryURL normalizes registry URL for Docker client
func (s *AutoUpdateService) normalizeRegistryURL(url string) string {
	normalized := s.normalizeRegistryForComparison(url)
	if normalized == "docker.io" {
		return "https://index.docker.io/v1/"
	}

	// For other registries, return raw hostname without protocol
	result := strings.TrimPrefix(url, "https://")
	result = strings.TrimPrefix(result, "http://")
	result = strings.TrimSuffix(result, "/")

	return result
}

// isDigestBasedImage checks if an image reference uses a digest
func (s *AutoUpdateService) isDigestBasedImage(imageRef string) bool {
	matched, _ := regexp.MatchString(`@sha256:[a-f0-9]{64}`, imageRef)
	return matched
}

// getImageID gets the ID of a local image
func (s *AutoUpdateService) getImageID(ctx context.Context, imageRef string) (string, error) {
	dockerClient, err := s.dockerService.CreateConnection(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to connect to Docker: %w", err)
	}
	defer dockerClient.Close()

	images, err := dockerClient.ImageList(ctx, image.ListOptions{})
	if err != nil {
		return "", fmt.Errorf("failed to list images: %w", err)
	}

	for _, img := range images {
		for _, tag := range img.RepoTags {
			if tag == imageRef {
				return img.ID, nil
			}
		}
	}

	return "", fmt.Errorf("image not found: %s", imageRef)
}

// getContainerName gets a friendly name for a container
func (s *AutoUpdateService) getContainerName(container container.Summary) string {
	if len(container.Names) > 0 {
		name := container.Names[0]
		if strings.HasPrefix(name, "/") {
			return name[1:]
		}
		return name
	}
	return container.ID[:12]
}

// removeDuplicates removes duplicate strings from a slice
func (s *AutoUpdateService) removeDuplicates(items []string) []string {
	seen := make(map[string]bool)
	var result []string

	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}

	return result
}

// GetUpdateStatus returns the current update status
func (s *AutoUpdateService) GetUpdateStatus() map[string]interface{} {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	return map[string]interface{}{
		"updating_containers": len(s.updatingContainers),
		"updating_stacks":     len(s.updatingStacks),
		"container_ids":       s.getKeys(s.updatingContainers),
		"stack_ids":           s.getKeys(s.updatingStacks),
	}
}

// getKeys returns the keys of a map
func (s *AutoUpdateService) getKeys(m map[string]bool) []string {
	keys := make([]string, 0, len(m))
	for k := range m {
		keys = append(keys, k)
	}
	return keys
}
