package api

import (
	"bytes"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/ofkm/arcane-backend/internal/dto"
	"github.com/ofkm/arcane-backend/internal/models"
	"github.com/ofkm/arcane-backend/internal/services"
)

const LOCAL_DOCKER_ENVIRONMENT_ID = "0"

type EnvironmentHandler struct {
	environmentService *services.EnvironmentService
	containerService   *services.ContainerService
	imageService       *services.ImageService
	networkService     *services.NetworkService
	volumeService      *services.VolumeService
	stackService       *services.StackService
}

func NewEnvironmentHandler(
	environmentService *services.EnvironmentService,
	containerService *services.ContainerService,
	imageService *services.ImageService,
	networkService *services.NetworkService,
	volumeService *services.VolumeService,
	stackService *services.StackService,
) *EnvironmentHandler {
	return &EnvironmentHandler{
		environmentService: environmentService,
		containerService:   containerService,
		imageService:       imageService,
		networkService:     networkService,
		volumeService:      volumeService,
		stackService:       stackService,
	}
}

func (h *EnvironmentHandler) routeRequest(c *gin.Context, endpoint string) {
	environmentID := c.Param("id")

	if environmentID == LOCAL_DOCKER_ENVIRONMENT_ID {
		h.handleLocalRequest(c, endpoint)
		return
	}

	h.handleRemoteRequest(c, environmentID, endpoint)
}

func (h *EnvironmentHandler) handleLocalRequest(c *gin.Context, endpoint string) {
	if h.handleContainerEndpoints(c, endpoint) {
		return
	}
	if h.handleImageEndpoints(c, endpoint) {
		return
	}
	if h.handleNetworkEndpoints(c, endpoint) {
		return
	}
	if h.handleVolumeEndpoints(c, endpoint) {
		return
	}
	if h.handleStackEndpoints(c, endpoint) {
		return
	}

	c.JSON(http.StatusNotFound, gin.H{
		"success": false,
		"error":   "Endpoint not found",
	})
}

func (h *EnvironmentHandler) handleContainerEndpoints(c *gin.Context, endpoint string) bool {
	containerHandler := NewContainerHandler(h.containerService, h.imageService)

	switch {
	case endpoint == "/containers" && c.Request.Method == http.MethodGet:
		containerHandler.List(c)
		return true
	case endpoint == "/containers" && c.Request.Method == http.MethodPost:
		containerHandler.Create(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/start"):
		containerHandler.Start(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/stop"):
		containerHandler.Stop(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/restart"):
		containerHandler.Restart(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/pull"):
		containerHandler.PullImage(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/logs"):
		containerHandler.GetLogs(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/stats/stream"):
		containerHandler.GetStatsStream(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && strings.HasSuffix(endpoint, "/stats"):
		containerHandler.GetStats(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && c.Request.Method == http.MethodGet:
		containerHandler.GetByID(c)
		return true
	case strings.HasPrefix(endpoint, "/containers/") && c.Request.Method == http.MethodDelete:
		containerHandler.Delete(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) handleImageEndpoints(c *gin.Context, endpoint string) bool {
	imageHandler := NewImageHandler(h.imageService, nil)

	switch {
	case endpoint == "/images" && c.Request.Method == http.MethodGet:
		imageHandler.List(c)
		return true
	case endpoint == "/images/pull" && c.Request.Method == http.MethodPost:
		imageHandler.Pull(c)
		return true
	case endpoint == "/images/prune" && c.Request.Method == http.MethodPost:
		imageHandler.Prune(c)
		return true
	case strings.HasPrefix(endpoint, "/images/") && c.Request.Method == http.MethodGet:
		imageHandler.GetByID(c)
		return true
	case strings.HasPrefix(endpoint, "/images/") && c.Request.Method == http.MethodDelete:
		imageHandler.Remove(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) handleNetworkEndpoints(c *gin.Context, endpoint string) bool {
	networkHandler := NewNetworkHandler(h.networkService)

	switch {
	case endpoint == "/networks" && c.Request.Method == http.MethodGet:
		networkHandler.List(c)
		return true
	case endpoint == "/networks" && c.Request.Method == http.MethodPost:
		networkHandler.Create(c)
		return true
	case strings.HasPrefix(endpoint, "/networks/") && c.Request.Method == http.MethodGet:
		networkHandler.GetByID(c)
		return true
	case strings.HasPrefix(endpoint, "/networks/") && c.Request.Method == http.MethodDelete:
		networkHandler.Remove(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) handleVolumeEndpoints(c *gin.Context, endpoint string) bool {
	volumeHandler := NewVolumeHandler(h.volumeService)

	switch {
	case endpoint == "/volumes" && c.Request.Method == http.MethodGet:
		volumeHandler.List(c)
		return true
	case endpoint == "/volumes" && c.Request.Method == http.MethodPost:
		volumeHandler.Create(c)
		return true
	case endpoint == "/volumes/prune" && c.Request.Method == http.MethodPost:
		volumeHandler.Prune(c)
		return true
	case strings.HasPrefix(endpoint, "/volumes/") && strings.HasSuffix(endpoint, "/usage"):
		volumeHandler.GetUsage(c)
		return true
	case strings.HasPrefix(endpoint, "/volumes/") && c.Request.Method == http.MethodGet:
		volumeHandler.GetByName(c)
		return true
	case strings.HasPrefix(endpoint, "/volumes/") && c.Request.Method == http.MethodDelete:
		volumeHandler.Remove(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) handleStackEndpoints(c *gin.Context, endpoint string) bool {
	stackHandler := NewStackHandler(h.stackService)

	switch {
	case endpoint == "/stacks" && c.Request.Method == http.MethodGet:
		stackHandler.ListStacks(c)
		return true
	case endpoint == "/stacks" && c.Request.Method == http.MethodPost:
		stackHandler.CreateStack(c)
		return true
	case endpoint == "/stacks/convert" && c.Request.Method == http.MethodPost:
		stackHandler.ConvertDockerRun(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/deploy"):
		stackHandler.DeployStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/start"):
		stackHandler.StartStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/stop"):
		stackHandler.StopStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/restart"):
		stackHandler.RestartStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/services"):
		stackHandler.GetStackServices(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/pull"):
		stackHandler.PullImages(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/redeploy"):
		stackHandler.RedeployStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/down"):
		stackHandler.DownStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/destroy"):
		stackHandler.DestroyStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && strings.HasSuffix(endpoint, "/logs/stream"):
		stackHandler.GetStackLogsStream(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && c.Request.Method == http.MethodGet:
		stackHandler.GetStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && c.Request.Method == http.MethodPut:
		stackHandler.UpdateStack(c)
		return true
	case strings.HasPrefix(endpoint, "/stacks/") && c.Request.Method == http.MethodDelete:
		stackHandler.DeleteStack(c)
		return true
	}
	return false
}

func (h *EnvironmentHandler) handleRemoteRequest(c *gin.Context, environmentID string, endpoint string) {
	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Environment not found",
		})
		return
	}

	if !environment.Enabled {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Environment is disabled",
		})
		return
	}

	client := &http.Client{Timeout: 30 * time.Second}
	url := environment.ApiUrl + "/api" + endpoint

	var reqBody io.Reader
	if c.Request.Body != nil {
		bodyBytes, err := io.ReadAll(c.Request.Body)
		if err == nil && len(bodyBytes) > 0 {
			reqBody = bytes.NewBuffer(bodyBytes)
		}
	}

	req, err := http.NewRequestWithContext(c.Request.Context(), c.Request.Method, url, reqBody)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create request",
		})
		return
	}

	skipHeaders := map[string]struct{}{
		"Host":           {},
		"Content-Length": {},
		"Connection":     {},
	}

	for key, values := range c.Request.Header {
		upperKey := http.CanonicalHeaderKey(key)
		if _, skip := skipHeaders[upperKey]; skip {
			continue
		}
		if strings.HasPrefix(upperKey, "X-Forwarded-") {
			continue
		}
		if upperKey == "Authorization" {
			if auth := c.GetHeader("Authorization"); auth != "" {
				req.Header.Set("Authorization", auth)
			}
			continue
		}
		for _, value := range values {
			req.Header.Add(key, value)
		}
	}

	req.Header.Set("X-Forwarded-For", c.ClientIP())
	req.Header.Set("X-Forwarded-Host", c.Request.Host)
	req.Header.Set("X-Forwarded-Proto", c.Request.URL.Scheme)

	for key, values := range c.Request.URL.Query() {
		for _, value := range values {
			q := req.URL.Query()
			q.Add(key, value)
			req.URL.RawQuery = q.Encode()
		}
	}

	resp, err := client.Do(req)
	if err != nil {
		_ = h.environmentService.UpdateEnvironmentStatus(c.Request.Context(), environmentID, "offline")
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Failed to connect to environment: %v", err),
		})
		return
	}
	defer resp.Body.Close()

	_ = h.environmentService.UpdateEnvironmentHeartbeat(c.Request.Context(), environmentID)

	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to read response",
		})
		return
	}

	for key, values := range resp.Header {
		for _, value := range values {
			c.Header(key, value)
		}
	}

	c.Status(resp.StatusCode)
	_, _ = c.Writer.Write(responseBody)
}

func (h *EnvironmentHandler) CreateEnvironment(c *gin.Context) {
	var req dto.CreateEnvironmentDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format: " + err.Error(),
		})
		return
	}

	environment := &models.Environment{
		Hostname:    req.Hostname,
		ApiUrl:      req.ApiUrl,
		Description: req.Description,
		Enabled:     true,
	}

	if req.Enabled != nil {
		environment.Enabled = *req.Enabled
	}

	createdEnvironment, err := h.environmentService.CreateEnvironment(c.Request.Context(), environment)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to create environment: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success":     true,
		"environment": createdEnvironment,
		"message":     "Environment created successfully",
	})
}

func (h *EnvironmentHandler) ListEnvironments(c *gin.Context) {
	environments, err := h.environmentService.ListEnvironments(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to fetch environments",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"environments": environments,
		"count":        len(environments),
	})
}

func (h *EnvironmentHandler) GetEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	environment, err := h.environmentService.GetEnvironmentByID(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"error":   "Environment not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"environment": environment,
	})
}

func (h *EnvironmentHandler) UpdateEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	var req dto.UpdateEnvironmentDto
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "Invalid request format: " + err.Error(),
		})
		return
	}

	updates := make(map[string]interface{})
	if req.Hostname != nil {
		updates["hostname"] = *req.Hostname
	}
	if req.ApiUrl != nil {
		updates["api_url"] = *req.ApiUrl
	}
	if req.Description != nil {
		updates["description"] = *req.Description
	}
	if req.Enabled != nil {
		updates["enabled"] = *req.Enabled
	}

	if len(updates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "No fields to update",
		})
		return
	}

	updatedEnvironment, err := h.environmentService.UpdateEnvironment(c.Request.Context(), environmentID, updates)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update environment: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":     true,
		"environment": updatedEnvironment,
		"message":     "Environment updated successfully",
	})
}

func (h *EnvironmentHandler) DeleteEnvironment(c *gin.Context) {
	environmentID := c.Param("id")

	err := h.environmentService.DeleteEnvironment(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to delete environment: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Environment deleted successfully",
	})
}

func (h *EnvironmentHandler) TestConnection(c *gin.Context) {
	environmentID := c.Param("id")

	status, err := h.environmentService.TestConnection(c.Request.Context(), environmentID)

	response := dto.TestConnectionDto{
		Status: status,
	}

	if err != nil {
		response.Message = func() *string { s := err.Error(); return &s }()
	}

	httpStatus := http.StatusOK
	if status == "error" {
		httpStatus = http.StatusServiceUnavailable
	}

	c.JSON(httpStatus, response)
}

func (h *EnvironmentHandler) UpdateHeartbeat(c *gin.Context) {
	environmentID := c.Param("id")

	err := h.environmentService.UpdateEnvironmentHeartbeat(c.Request.Context(), environmentID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "Failed to update heartbeat",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Heartbeat updated successfully",
	})
}

func (h *EnvironmentHandler) GetContainers(c *gin.Context) {
	h.routeRequest(c, "/containers")
}

func (h *EnvironmentHandler) GetImages(c *gin.Context) {
	h.routeRequest(c, "/images")
}

func (h *EnvironmentHandler) GetNetworks(c *gin.Context) {
	h.routeRequest(c, "/networks")
}

func (h *EnvironmentHandler) GetVolumes(c *gin.Context) {
	h.routeRequest(c, "/volumes")
}

func (h *EnvironmentHandler) GetStacks(c *gin.Context) {
	h.routeRequest(c, "/stacks")
}

func (h *EnvironmentHandler) CreateNetwork(c *gin.Context) {
	h.routeRequest(c, "/networks")
}

func (h *EnvironmentHandler) CreateVolume(c *gin.Context) {
	h.routeRequest(c, "/volumes")
}

func (h *EnvironmentHandler) CreateStack(c *gin.Context) {
	h.routeRequest(c, "/stacks")
}

// Containers

func (h *EnvironmentHandler) GetContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID)
}

func (h *EnvironmentHandler) StartContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/start")
}

func (h *EnvironmentHandler) StopContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/stop")
}

func (h *EnvironmentHandler) CreateContainer(c *gin.Context) {
	h.routeRequest(c, "/containers")
}

func (h *EnvironmentHandler) PullContainerImage(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/pull")
}

func (h *EnvironmentHandler) RestartContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/restart")
}

func (h *EnvironmentHandler) RemoveContainer(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID)
}

func (h *EnvironmentHandler) GetContainerLogs(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/logs")
}

func (h *EnvironmentHandler) GetContainerStats(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/stats")
}

func (h *EnvironmentHandler) GetContainerStatsStream(c *gin.Context) {
	containerID := c.Param("containerId")
	h.routeRequest(c, "/containers/"+containerID+"/stats/stream")
}

// End Containers

// Images

func (h *EnvironmentHandler) GetImage(c *gin.Context) {
	imageID := c.Param("imageId")
	h.routeRequest(c, "/images/"+imageID)
}

func (h *EnvironmentHandler) RemoveImage(c *gin.Context) {
	imageID := c.Param("imageId")
	h.routeRequest(c, "/images/"+imageID)
}

func (h *EnvironmentHandler) PullImage(c *gin.Context) {
	h.routeRequest(c, "/images/pull")
}

func (h *EnvironmentHandler) PruneImages(c *gin.Context) {
	h.routeRequest(c, "/images/prune")
}

// End Images

func (h *EnvironmentHandler) GetNetwork(c *gin.Context) {
	networkID := c.Param("networkId")
	h.routeRequest(c, "/networks/"+networkID)
}

func (h *EnvironmentHandler) RemoveNetwork(c *gin.Context) {
	networkID := c.Param("networkId")
	h.routeRequest(c, "/networks/"+networkID)
}

func (h *EnvironmentHandler) GetVolume(c *gin.Context) {
	volumeName := c.Param("volumeName")
	h.routeRequest(c, "/volumes/"+volumeName)
}

func (h *EnvironmentHandler) RemoveVolume(c *gin.Context) {
	volumeName := c.Param("volumeName")
	h.routeRequest(c, "/volumes/"+volumeName)
}

func (h *EnvironmentHandler) PruneVolumes(c *gin.Context) {
	h.routeRequest(c, "/volumes/prune")
}

func (h *EnvironmentHandler) GetStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId)
}

func (h *EnvironmentHandler) StartStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/start")
}

func (h *EnvironmentHandler) UpdateStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId)
}

func (h *EnvironmentHandler) DeleteStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId)
}

func (h *EnvironmentHandler) StopStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/stop")
}

func (h *EnvironmentHandler) RestartStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/restart")
}

func (h *EnvironmentHandler) GetStackLogs(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/logs")
}

func (h *EnvironmentHandler) GetVolumeUsage(c *gin.Context) {
	h.routeRequest(c, "/volumes/"+c.Param("volumeName")+"/usage")
}

func (h *EnvironmentHandler) DeployStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/deploy")
}

func (h *EnvironmentHandler) GetStackServices(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/services")
}

func (h *EnvironmentHandler) PullStackImages(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/pull")
}

func (h *EnvironmentHandler) RedeployStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/redeploy")
}

func (h *EnvironmentHandler) DownStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/down")
}

func (h *EnvironmentHandler) DestroyStack(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/destroy")
}

func (h *EnvironmentHandler) GetStackLogsStream(c *gin.Context) {
	stackId := c.Param("stackId")
	h.routeRequest(c, "/stacks/"+stackId+"/logs/stream")
}

func (h *EnvironmentHandler) ConvertDockerRun(c *gin.Context) {
	h.routeRequest(c, "/stacks/convert")
}
